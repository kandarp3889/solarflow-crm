import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

def _send_email_worker(to_email: str, recipient_name: str, subject: str, title: str, message: str, link_url: Optional[str]):
    """Background worker to format and dispatch email via SMTP safely."""
    try:
        if not to_email:
            logger.warning("Cannot send email: recipient email is empty.")
            return

        from_email = settings.EMAILS_FROM_EMAIL or "notifications@solarflowcrm.com"
        from_name = settings.EMAILS_FROM_NAME or "SolarFlow CRM"

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
                                                <div style="display: inline-block; width: 12px; height: 12px; background-color: #FEC426; border-radius: 50%; margin-right: 8px;"></div>
                                                <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">True Sun <span style="color: #FEC426;">Energy</span> CRM</span>
                                            </td>
                                            <td align="right">
                                                <span style="font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                                    CRM Notification
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Main Content Area -->
                            <tr>
                                <td style="padding: 32px;">
                                    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 16px 0;">Hello <strong style="color: #f8fafc;">{recipient_name}</strong>,</p>
                                    
                                    <h2 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 16px 0; line-height: 1.3;">
                                        {title}
                                    </h2>
                                    
                                    <div style="background-color: #142318; border-left: 4px solid #FEC426; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                                        <p style="font-size: 14px; color: #e2e8f0; line-height: 1.6; margin: 0;">
                                            {message}
                                        </p>
                                    </div>
                                    
                                    {action_btn_html}
                                    
                                    <p style="font-size: 12px; color: #64748b; margin: 24px 0 0 0; line-height: 1.5;">
                                        This alert was sent directly to you based on your assigned role and responsibilities for this solar rooftop inquiry.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 20px 32px; background-color: #0b140e; border-top: 1px solid #16281b; text-align: center;">
                                    <p style="font-size: 11px; color: #64748b; margin: 0;">
                                        &copy; 2026 True Sun Energy Private Limited &bull; SolarFlow CRM Automation Engine
                                    </p>
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
        if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
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
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=8) as server:
            try:
                server.starttls()
            except Exception:
                pass  # Server might not require or support STARTTLS
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
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
    link_url: Optional[str] = None
):
    """
    Non-blocking asynchronous dispatch for notification emails.
    Launches a daemon thread to prevent delaying API HTTP response times.
    """
    if not to_email:
        return

    thread = threading.Thread(
        target=_send_email_worker,
        args=(to_email, recipient_name, subject, title, message, link_url),
        daemon=True
    )
    thread.start()
