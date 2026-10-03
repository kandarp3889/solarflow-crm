"""
Timezone configuration and utilities for SolarFlow CRM.
Standardized to Asia/Kolkata (Indian Standard Time, UTC+05:30).
"""
from datetime import datetime, date
from typing import Optional, Union
from zoneinfo import ZoneInfo

# Primary application timezone using standard IANA identifier
APP_TIMEZONE_NAME = "Asia/Kolkata"
IST = ZoneInfo(APP_TIMEZONE_NAME)

def get_app_timezone() -> ZoneInfo:
    """Return the application's ZoneInfo instance."""
    return IST

def now_ist() -> datetime:
    """
    Returns the current date & time in Asia/Kolkata as a naive datetime.
    Used for database column defaults and internal ORM comparisons to avoid
    TypeError: can't compare offset-naive and offset-aware datetimes in SQLite/SQLAlchemy.
    """
    return datetime.now(IST).replace(tzinfo=None)

def now_ist_aware() -> datetime:
    """Returns the current date & time in Asia/Kolkata as a timezone-aware datetime."""
    return datetime.now(IST)

def to_ist_aware(dt: Optional[Union[datetime, date, str]]) -> Optional[datetime]:
    """
    Converts any datetime, date, or ISO string to an aware datetime in Asia/Kolkata.
    If naive datetime, assumes it represents wall-clock time in Asia/Kolkata.
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        # Handle string parsing
        try:
            # If naive ISO without offset, parse and attach IST
            cleaned = dt.strip()
            if cleaned.endswith("Z"):
                cleaned = cleaned[:-1] + "+00:00"
            parsed = datetime.fromisoformat(cleaned)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=IST)
            return parsed.astimezone(IST)
        except Exception:
            return None
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=IST)
        return dt.astimezone(IST)
    if isinstance(dt, date):
        return datetime.combine(dt, datetime.min.time(), tzinfo=IST)
    return None

def to_ist_naive(dt: Optional[Union[datetime, date, str]]) -> Optional[datetime]:
    """
    Converts any incoming datetime (aware or naive ISO string) to a naive datetime
    in Asia/Kolkata wall-clock time suitable for database storage and queries.
    """
    aware = to_ist_aware(dt)
    if aware is None:
        return None
    return aware.replace(tzinfo=None)

def serialize_ist(dt: Optional[datetime]) -> Optional[str]:
    """
    Pydantic serializer for datetime objects.
    Ensures that every datetime returned via API responses includes the explicit
    Asia/Kolkata offset (+05:30) so browsers everywhere interpret it unambiguously.
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        # Already serialized
        return dt
    if dt.tzinfo is None:
        # Datetime in DB represents Asia/Kolkata wall clock time
        aware = dt.replace(tzinfo=IST)
    else:
        aware = dt.astimezone(IST)
    return aware.isoformat()

def format_ist_date(dt: Optional[Union[datetime, date]]) -> str:
    """Formats date in standard Indian format: DD-MM-YYYY."""
    if dt is None:
        return ""
    aware = to_ist_aware(dt) if isinstance(dt, datetime) else dt
    if aware is None:
        return ""
    return aware.strftime("%d-%m-%Y")

def format_ist_time(dt: Optional[datetime]) -> str:
    """Formats time in standard 12-hour format: hh:mm AM/PM."""
    if dt is None:
        return ""
    aware = to_ist_aware(dt)
    if aware is None:
        return ""
    return aware.strftime("%I:%M %p")

def format_ist_datetime(dt: Optional[datetime]) -> str:
    """Formats full datetime in standard Indian format: DD-MM-YYYY, hh:mm AM/PM."""
    if dt is None:
        return ""
    aware = to_ist_aware(dt)
    if aware is None:
        return ""
    return aware.strftime("%d-%m-%Y, %I:%M %p")
