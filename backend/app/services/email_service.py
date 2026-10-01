import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

def get_company_email_config(company_settings_or_dict: Optional[dict] = None) -> dict:
    """Extract email configuration from company settings with fallback to environment variables."""
    email_cfg = (company_settings_or_dict or {}).get("email") or {}
    host = email_cfg.get("smtp_host") or settings.SMTP_HOST
    port = int(email_cfg.get("smtp_port") or settings.SMTP_PORT or 587)
    user = email_cfg.get("smtp_user") or settings.SMTP_USER
    password = email_cfg.get("smtp_password") or settings.SMTP_PASSWORD
    from_email = email_cfg.get("from_email") or settings.EMAILS_FROM_EMAIL or "info.truesunenergy@gmail.com"
    from_name = email_cfg.get("from_name") or settings.EMAILS_FROM_NAME or "True Sun Energy"
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
            f"True Sun Energy CRM SaaS Automation"
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
                                                    True Sun <span style="color: #FEC426;">Energy</span>
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
                                    &copy; 2026 True Sun Energy Pvt Ltd &bull; Mangrol, Gujarat &bull; Support: +91 99740 45095
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

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        # Dispatch via SMTP
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if use_tls:
                    try:
                        server.starttls()
                    except Exception:
                        pass
                server.login(smtp_user, smtp_password)
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
) -> tuple[bool, str]:
    """Test SMTP handshake and dispatch a verification email."""
    try:
        if not host or not user or not password:
            return False, "SMTP Host, Username, and Password are all required."

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "[True Sun Energy CRM] SMTP Configuration Test Successful"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        test_html = f"""
        <div style="font-family: Arial, sans-serif; background: #080f0a; padding: 32px 16px; color: #f1f5f9;">
            <div style="max-width: 520px; margin: auto; background: #0f1a12; border: 1px solid #1e3423; border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff;">True Sun <span style="color: #FEC426;">Energy</span></span>
                </div>
                <h3 style="color: #10b981; margin: 0 0 12px 0; font-size: 18px;">&check; SMTP Test Email Successful!</h3>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                    Congratulations! Your SMTP email server configuration in <strong>True Sun Energy CRM</strong> has been successfully verified.
                </p>
                <div style="background: #132417; border: 1px solid #1e3423; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 12px; color: #cbd5e1;">
                    <p style="margin: 3px 0;"><strong>SMTP Server:</strong> {host}:{port}</p>
                    <p style="margin: 3px 0;"><strong>Sender:</strong> {from_name} &lt;{from_email}&gt;</p>
                    <p style="margin: 3px 0;"><strong>Security:</strong> {"SSL (Port 465)" if port == 465 else ("STARTTLS Enabled" if use_tls else "Standard")}</p>
                </div>
                <p style="color: #64748b; font-size: 11px; margin: 0;">
                    Automated lead assignment notifications and customer proposal emails will now be sent using this server.
                </p>
            </div>
        </div>
        """
        msg.attach(MIMEText("True Sun Energy CRM SMTP configuration test successful!", "plain", "utf-8"))
        msg.attach(MIMEText(test_html, "html", "utf-8"))

        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(user, password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                if use_tls:
                    server.starttls()
                server.login(user, password)
                server.sendmail(from_email, [to_email], msg.as_string())

        return True, f"Test email sent successfully to {to_email}!"

    except smtplib.SMTPAuthenticationError as auth_err:
        err_msg = auth_err.smtp_error.decode() if isinstance(auth_err.smtp_error, bytes) else str(auth_err)
        return False, f"Authentication Failed: {err_msg}. If using Gmail, make sure to generate and use a 16-character Google App Password."
    except Exception as e:
        return False, f"SMTP Connection Failed: {str(e)}"
