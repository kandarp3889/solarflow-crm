import errno
import logging
import smtplib
import socket
import ssl
import threading
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional, Tuple

from app.config import settings

logger = logging.getLogger(__name__)


class ResilientSMTP(smtplib.SMTP):
    """
    Subclass of smtplib.SMTP that prioritizes IPv4 over IPv6.
    This resolves the classic Linux/Docker [Errno 101] Network is unreachable error
    where glibc getaddrinfo returns IPv6 addresses first on systems with unrouted IPv6 stacks.
    """
    def _get_socket(self, host, port, timeout):
        err = None
        # 1. Prioritize IPv4 (AF_INET) to prevent Linux ENETUNREACH Errno 101
        try:
            for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
                af, socktype, proto, canonname, sa = res
                sock = None
                try:
                    sock = socket.socket(af, socktype, proto)
                    if timeout is not None:
                        sock.settimeout(timeout)
                    if self.source_address:
                        sock.bind(self.source_address)
                    sock.connect(sa)
                    return sock
                except Exception as e:
                    err = e
                    if sock:
                        sock.close()
        except socket.gaierror:
            pass

        # 2. Fallback to dual-stack/IPv6 if IPv4 resolution did not return any records
        for res in socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM):
            af, socktype, proto, canonname, sa = res
            sock = None
            try:
                sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    sock.settimeout(timeout)
                if self.source_address:
                    sock.bind(self.source_address)
                sock.connect(sa)
                return sock
            except Exception as e:
                err = e
                if sock:
                    sock.close()

        if err is not None:
            raise err
        raise OSError(f"Could not connect to {host}:{port}")


class ResilientSMTP_SSL(smtplib.SMTP_SSL):
    """
    Subclass of smtplib.SMTP_SSL that prioritizes IPv4 over IPv6 with SSL/TLS context wrapping.
    """
    def _get_socket(self, host, port, timeout):
        if self.context is None:
            self.context = ssl.create_default_context()
        err = None

        # 1. Prioritize IPv4
        try:
            for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
                af, socktype, proto, canonname, sa = res
                raw_sock = None
                try:
                    raw_sock = socket.socket(af, socktype, proto)
                    if timeout is not None:
                        raw_sock.settimeout(timeout)
                    if self.source_address:
                        raw_sock.bind(self.source_address)
                    raw_sock.connect(sa)
                    return self.context.wrap_socket(raw_sock, server_hostname=self._host)
                except Exception as e:
                    err = e
                    if raw_sock:
                        raw_sock.close()
        except socket.gaierror:
            pass

        # 2. Fallback to dual-stack/IPv6
        for res in socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM):
            af, socktype, proto, canonname, sa = res
            raw_sock = None
            try:
                raw_sock = socket.socket(af, socktype, proto)
                if timeout is not None:
                    raw_sock.settimeout(timeout)
                if self.source_address:
                    raw_sock.bind(self.source_address)
                raw_sock.connect(sa)
                return self.context.wrap_socket(raw_sock, server_hostname=self._host)
            except Exception as e:
                err = e
                if raw_sock:
                    raw_sock.close()

        if err is not None:
            raise err
        raise OSError(f"Could not connect to {host}:{port}")


def clean_smtp_password(host: str, password: str) -> str:
    """Normalize password; specifically strips whitespace from 16-character Google App Passwords."""
    if not password:
        return ""
    p = password.strip()
    if "gmail" in host.lower() or "google" in host.lower():
        no_spaces = p.replace(" ", "")
        if len(no_spaces) == 16:
            return no_spaces
    return p


def _format_smtp_error(e: Exception, host: str, port: int, user: str) -> str:
    """Format exceptions into human-friendly, actionable diagnostic guidance without exposing secrets."""
    err_str = str(e)
    err_lower = err_str.lower()

    # 1. DNS Resolution Error
    if isinstance(e, socket.gaierror):
        return (
            f"DNS Lookup Failed: Unable to resolve SMTP server '{host}'. "
            f"Please verify that the host name is spelled correctly and that the server has internet access."
        )

    # 2. Network Unreachable / Routing Error (e.g. Linux Errno 101 ENETUNREACH, Windows WSAENETUNREACH)
    is_network_unreachable = (
        isinstance(e, OSError) and (
            getattr(e, 'errno', None) in (101, 10051, getattr(errno, 'ENETUNREACH', 101))
            or "network is unreachable" in err_lower
            or "unreachable network" in err_lower
        )
    )
    if is_network_unreachable:
        return (
            f"SMTP Connection Blocked / Network Unreachable: Unable to establish an outbound TCP connection to '{host}' on port {port} ([Errno 101] Network is unreachable).\n\n"
            f"ROOT CAUSE:\n"
            f"Outbound traffic to SMTP port {port} is restricted by your hosting provider's egress network firewall.\n\n"
            f"HOW TO RESOLVE:\n"
            f"1. If deployed on Render (Free Tier): Render explicitly blocks outbound SMTP ports 25, 465, and 587 on all Free web services to prevent spam. Upgrading your service to the 'Starter' tier ($7/mo) immediately unlocks outbound SMTP access.\n"
            f"2. If deployed on a Cloud VPS (AWS/GCP/DigitalOcean): Ensure your egress firewall / security group allows outbound TCP traffic on port {port}.\n"
            f"3. Supported Cloud Alternative: Use an HTTP/HTTPS-based transactional email API (such as Resend, Brevo, or SendGrid API) over port 443, which is never blocked by cloud hosts."
        )

    # 3. Connection Timeout
    is_timeout = (
        isinstance(e, (socket.timeout, TimeoutError))
        or (isinstance(e, OSError) and getattr(e, 'errno', None) in (110, 10060, getattr(errno, 'ETIMEDOUT', 110)))
        or "timed out" in err_lower
    )
    if is_timeout:
        return (
            f"SMTP Connection Timed Out: The connection attempt to '{host}:{port}' timed out after 10 seconds. "
            f"This usually indicates that the hosting provider or firewall is silently dropping outbound packets on port {port}."
        )

    # 4. Connection Refused
    is_conn_refused = (
        isinstance(e, ConnectionRefusedError)
        or (isinstance(e, OSError) and getattr(e, 'errno', None) in (111, 10061, getattr(errno, 'ECONNREFUSED', 111)))
        or "connection refused" in err_lower
    )
    if is_conn_refused:
        return (
            f"Connection Refused: The server at '{host}' actively refused connection on port {port}. "
            f"Please verify the SMTP port number (port 587 for STARTTLS or port 465 for SSL)."
        )

    # 5. SMTP Authentication Error
    if isinstance(e, smtplib.SMTPAuthenticationError):
        code = getattr(e, 'smtp_code', 535)
        raw_error = getattr(e, 'smtp_error', b'')
        error_text = raw_error.decode(errors='replace') if isinstance(raw_error, bytes) else str(raw_error)

        is_gmail = "gmail" in host.lower() or "google" in host.lower() or "gmail" in user.lower()
        if is_gmail:
            return (
                f"Gmail Authentication Failed ({code}): {error_text.strip() or 'Invalid credentials'}.\n\n"
                f"Google requires a dedicated 16-character App Password for SMTP:\n"
                f"1. Enable 2-Step Verification on your Google Account (myaccount.google.com/security).\n"
                f"2. Visit https://myaccount.google.com/apppasswords and create an App Password named 'SolarFlow CRM'.\n"
                f"3. Copy the 16-character generated password (e.g. 'abcd efgh ijkl mnop') and paste it into the SMTP Password field (spaces are automatically handled).\n"
                f"4. Do NOT use your regular personal Google account password."
            )
        return (
            f"SMTP Authentication Failed ({code}): {error_text.strip() or 'Bad username or password'}. "
            f"Please verify your SMTP username and password."
        )

    # 6. SMTPServerDisconnected
    if isinstance(e, smtplib.SMTPServerDisconnected):
        is_gmail = "gmail" in host.lower() or "google" in host.lower()
        if is_gmail:
            return (
                f"SMTP Server Disconnected: Google's mail server '{host}:{port}' closed the connection unexpectedly.\n\n"
                f"This commonly occurs when:\n"
                f"1. An incorrect or expired Google App Password was provided.\n"
                f"2. Your account has not enabled 2-Step Verification (required for Google App Passwords).\n"
                f"3. Port 587 with STARTTLS is required (or Port 465 with SSL)."
            )
        return (
            f"SMTP Server Disconnected: The mail server '{host}:{port}' unexpectedly closed the connection. "
            f"Please verify credentials and encryption mode."
        )

    # 7. TLS / SSL Negotiation Error
    if isinstance(e, (ssl.SSLError, smtplib.SMTPNotSupportedError)) or "ssl" in err_lower or "tls" in err_lower:
        return (
            f"TLS/SSL Negotiation Failed: {err_str}. "
            f"Please ensure the port and encryption mode match: Port 587 with STARTTLS enabled, or Port 465 with SSL."
        )

    # 8. SMTPSenderRefused / SMTPRecipientsRefused / SMTPDataError
    if isinstance(e, smtplib.SMTPSenderRefused):
        return f"Sender Email Rejected: The SMTP server refused the 'From' address. Make sure '{user}' is authorized to send as this address."
    if isinstance(e, smtplib.SMTPRecipientsRefused):
        return "Recipient Email Rejected: The SMTP server refused the recipient email address."
    if isinstance(e, smtplib.SMTPDataError):
        return f"SMTP Data Error: The server rejected the email content ({err_str})."

    # Default fallback
    return f"SMTP Connection Failed: {err_str}"


def diagnose_smtp_connectivity(host: str = "smtp.gmail.com", port: int = 587) -> Dict[str, Any]:
    """
    Test DNS resolution, IPv4 connectivity, and TCP reachability from the current backend environment.
    Identifies whether the host environment or cloud provider is blocking outbound SMTP ports.
    """
    results: Dict[str, Any] = {
        "host": host,
        "target_port": port,
        "dns_ipv4": [],
        "dns_ipv6": [],
        "tcp_port_587_reachable": False,
        "tcp_port_587_latency_ms": None,
        "tcp_port_587_error": None,
        "tcp_port_465_reachable": False,
        "tcp_port_465_latency_ms": None,
        "tcp_port_465_error": None,
        "is_outbound_blocked": False,
        "recommendations": []
    }

    # 1. Test DNS Resolution
    try:
        ipv4_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        results["dns_ipv4"] = sorted(list(set([x[4][0] for x in ipv4_info])))
    except Exception as e:
        results["dns_ipv4_error"] = str(e)

    try:
        ipv6_info = socket.getaddrinfo(host, port, socket.AF_INET6, socket.SOCK_STREAM)
        results["dns_ipv6"] = sorted(list(set([x[4][0] for x in ipv6_info])))
    except Exception as e:
        results["dns_ipv6_error"] = str(e)

    # 2. Test TCP reachability to port 587
    t0 = time.time()
    try:
        s587 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s587.settimeout(5.0)
        s587.connect((host, 587))
        results["tcp_port_587_latency_ms"] = round((time.time() - t0) * 1000, 2)
        results["tcp_port_587_reachable"] = True
        s587.close()
    except Exception as e:
        results["tcp_port_587_error"] = str(e)

    # 3. Test TCP reachability to port 465
    t1 = time.time()
    try:
        s465 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s465.settimeout(5.0)
        s465.connect((host, 465))
        results["tcp_port_465_latency_ms"] = round((time.time() - t1) * 1000, 2)
        results["tcp_port_465_reachable"] = True
        s465.close()
    except Exception as e:
        results["tcp_port_465_error"] = str(e)

    # Check if outbound SMTP is blocked
    if not results["tcp_port_587_reachable"] and not results["tcp_port_465_reachable"]:
        results["is_outbound_blocked"] = True
        err_msg = results["tcp_port_587_error"] or ""
        if "101" in err_msg or "unreachable" in err_msg.lower():
            results["recommendations"].append(
                "Hosting Egress Block Detected: Your server's hosting provider (e.g. Render Free Tier) drops or rejects outbound connections on SMTP ports 25, 465, and 587."
            )
            results["recommendations"].append(
                "Resolution 1: Upgrade to Render Starter ($7/mo) to unlock outbound SMTP traffic."
            )
            results["recommendations"].append(
                "Resolution 2: Use an HTTPS-based email API (e.g. Resend, Brevo, or SendGrid API) over port 443."
            )
        else:
            results["recommendations"].append(
                f"Connection failed ({err_msg}). Verify security group and firewall outbound rules for ports 587 and 465."
            )
    elif results["tcp_port_587_reachable"]:
        results["recommendations"].append(
            f"Port 587 (STARTTLS) is reachable ({results['tcp_port_587_latency_ms']}ms). You can connect to Gmail using port 587 with STARTTLS."
        )

    return results


def get_company_email_config(company_settings_or_dict: Optional[dict] = None) -> dict:
    """Extract email configuration from company settings with fallback to environment variables."""
    email_cfg = (company_settings_or_dict or {}).get("email") or {}
    host = email_cfg.get("smtp_host") or settings.SMTP_HOST
    port = int(email_cfg.get("smtp_port") or settings.SMTP_PORT or 587)
    user = email_cfg.get("smtp_user") or settings.SMTP_USER
    password = email_cfg.get("smtp_password") or settings.SMTP_PASSWORD
    from_email = email_cfg.get("from_email") or settings.EMAILS_FROM_EMAIL or "info.truesunenergy@gmail.com"
    from_name = email_cfg.get("from_name") or settings.EMAILS_FROM_NAME or "SolarFlow CRM"
    use_tls = email_cfg.get("use_tls", True)
    is_enabled = email_cfg.get("is_enabled", True)
    return {
        "smtp_host": host,
        "smtp_port": port,
        "smtp_user": user,
        "smtp_password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": use_tls,
        "is_enabled": is_enabled
    }


def _send_email_worker(
    to_email: str,
    recipient_name: str,
    subject: str,
    title: str,
    message: str,
    link_url: Optional[str],
    company_settings: Optional[dict] = None
):
    """Background worker to format and dispatch email via SMTP safely."""
    try:
        if not to_email:
            logger.warning("Cannot send email: recipient email is empty.")
            return

        cfg = get_company_email_config(company_settings)
        if not cfg.get("is_enabled"):
            logger.info("Email notifications are disabled in company settings.")
            return

        from_email = cfg["from_email"]
        from_name = cfg["from_name"]
        smtp_host = cfg["smtp_host"]
        smtp_port = cfg["smtp_port"]
        smtp_user = cfg["smtp_user"]
        smtp_password = cfg["smtp_password"]
        use_tls = cfg["use_tls"]

        # Construct Plain Text Body
        text_body = (
            f"Hello {recipient_name},\n\n"
            f"{title}\n"
            f"{'=' * len(title)}\n\n"
            f"{message}\n\n"
            f"View in CRM: {link_url if link_url else 'https://crm.truesunenergy.in'}\n\n"
            f"---\n"
            f"SolarFlow CRM SaaS Automation"
        )

        # Construct Rich HTML Body
        action_btn_html = ""
        if link_url:
            full_url = link_url if link_url.startswith("http") else f"https://crm.truesunenergy.in{link_url}"
            action_btn_html = f"""
            <div style="margin: 28px 0 20px 0;">
                <a href="{full_url}" style="background-color: #106828; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 104, 40, 0.25);">
                    View Details in CRM &rarr;
                </a>
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #080f0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080f0a; padding: 32px 16px;">
                <tr>
                    <td align="center">
                        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0f1a12; border: 1px solid #1e3423; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                            <!-- Header Banner -->
                            <tr>
                                <td style="padding: 24px 32px; background: linear-gradient(135deg, #0e1c12 0%, #132417 100%); border-bottom: 1px solid #1e3423;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td>
                                                <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                                                    SolarFlow <span style="color: #FEC426;">CRM</span>
                                                </span>
                                                <div style="font-size: 11px; color: #10b981; margin-top: 2px; font-weight: 600;">
                                                    Solar Rooftop CRM Automation
                                                </div>
                                            </td>
                                            <td align="right">
                                                <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; color: #FEC426; background-color: rgba(254, 196, 38, 0.12); border: 1px solid rgba(254, 196, 38, 0.25); border-radius: 20px; text-transform: uppercase;">
                                                    Live Alert
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Body Content -->
                            <tr>
                                <td style="padding: 32px;">
                                    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.4;">
                                        {title}
                                    </h3>
                                    <div style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
                                        {message}
                                    </div>

                                    {action_btn_html}

                                    <div style="border-top: 1px solid #1e3423; padding-top: 20px; margin-top: 20px;">
                                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                                            This automated notification was sent to <strong>{to_email}</strong>.
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 20px 32px; background-color: #0a130d; border-top: 1px solid #1e3423; text-align: center; font-size: 11px; color: #475569;">
                                    &copy; 2026 SolarFlow CRM &bull; All Rights Reserved
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        # Check if SMTP credentials configured
        if not smtp_host or not smtp_user or not smtp_password:
            logger.info(
                f"[EMAIL DISPATCH (Local/Sandbox)] To: {to_email} ({recipient_name}) | Subject: {subject} | Message: {message[:120]}..."
            )
            return

        # Prepare MIME Message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg["Reply-To"] = from_email

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        clean_pw = clean_smtp_password(smtp_host, smtp_password)

        # Dispatch via Resilient SMTP
        if smtp_port == 465:
            with ResilientSMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                server.login(smtp_user, clean_pw)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with ResilientSMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                if use_tls:
                    if server.has_extn("starttls"):
                        ssl_ctx = ssl.create_default_context()
                        server.starttls(context=ssl_ctx)
                        server.ehlo()
                server.login(smtp_user, clean_pw)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Successfully delivered notification email to {to_email}")

    except Exception as e:
        logger.warning(f"Failed to send email to {to_email}: {e}")


def send_notification_email(
    to_email: str,
    recipient_name: str,
    subject: str,
    title: str,
    message: str,
    link_url: Optional[str] = None,
    company_settings: Optional[dict] = None
):
    """
    Non-blocking asynchronous dispatch for notification emails.
    Launches a daemon thread to prevent delaying API HTTP response times.
    """
    if not to_email:
        return

    thread = threading.Thread(
        target=_send_email_worker,
        args=(to_email, recipient_name, subject, title, message, link_url, company_settings),
        daemon=True
    )
    thread.start()


def test_smtp_connection(
    host: str,
    port: int,
    user: str,
    password: str,
    from_email: str,
    from_name: str,
    to_email: str,
    use_tls: bool = True
) -> Tuple[bool, str]:
    """Test SMTP handshake and dispatch a verification email."""
    if not host or not user or not password:
        return False, "SMTP Host, Username, and Password are all required before sending a test email."

    clean_password = clean_smtp_password(host, password)
    from_email = (from_email or user).strip()
    from_name = (from_name or "SolarFlow CRM").strip()

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "[SolarFlow CRM] SMTP Configuration Test Successful"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email.strip()
        msg["Reply-To"] = from_email

        test_html = f"""
        <div style="font-family: Arial, sans-serif; background: #080f0a; padding: 32px 16px; color: #f1f5f9;">
            <div style="max-width: 520px; margin: auto; background: #0f1a12; border: 1px solid #1e3423; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff;">SolarFlow <span style="color: #FEC426;">CRM</span></span>
                </div>
                <h3 style="color: #10b981; margin: 0 0 12px 0; font-size: 18px;">&check; SMTP Test Email Successful!</h3>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                    Congratulations! Your SMTP email server configuration in <strong>SolarFlow CRM</strong> has been successfully verified and connected.
                </p>
                <div style="background: #132417; border: 1px solid #1e3423; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 12px; color: #cbd5e1;">
                    <p style="margin: 3px 0;"><strong>SMTP Server:</strong> {host}:{port}</p>
                    <p style="margin: 3px 0;"><strong>Authenticated User:</strong> {user}</p>
                    <p style="margin: 3px 0;"><strong>Sender:</strong> {from_name} &lt;{from_email}&gt;</p>
                    <p style="margin: 3px 0;"><strong>Security Mode:</strong> {"SSL (Port 465)" if port == 465 else ("STARTTLS Enabled" if use_tls else "Standard Plaintext")}</p>
                    <p style="margin: 3px 0;"><strong>Recipient:</strong> {to_email}</p>
                </div>
                <p style="color: #64748b; font-size: 11px; margin: 0;">
                    Automated lead assignment notifications, site survey alerts, and customer quotations will now be dispatched using this SMTP gateway.
                </p>
            </div>
        </div>
        """
        msg.attach(MIMEText("SolarFlow CRM SMTP configuration test successful! Your outgoing email gateway is active.", "plain", "utf-8"))
        msg.attach(MIMEText(test_html, "html", "utf-8"))

        if port == 465:
            with ResilientSMTP_SSL(host, port, timeout=10) as server:
                server.login(user, clean_password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with ResilientSMTP(host, port, timeout=10) as server:
                server.ehlo()
                if use_tls:
                    if server.has_extn("starttls"):
                        ssl_ctx = ssl.create_default_context()
                        server.starttls(context=ssl_ctx)
                        server.ehlo()
                    else:
                        logger.warning(f"SMTP host {host} does not advertise STARTTLS extension.")
                server.login(user, clean_password)
                server.sendmail(from_email, [to_email], msg.as_string())

        return True, f"Test email sent successfully to {to_email}!"

    except Exception as e:
        logger.error(f"SMTP connection test failed for {user}@{host}:{port}: {e}")
        return False, _format_smtp_error(e, host, port, user)
