/**
 * SolarFlow CRM - Standardized Indian Standard Time (IST) Date & Time Utilities
 * Timezone: Asia/Kolkata (UTC+05:30)
 * Date Format: DD-MM-YYYY
 * Time Format: hh:mm AM/PM
 */

export const APP_TIMEZONE = 'Asia/Kolkata';

export type DateInput = string | number | Date | null | undefined;

/**
 * Parses any date representation into a valid JavaScript Date object.
 * If a naive ISO or SQL datetime string is provided (without timezone offset Z or +/-),
 * it safely interprets it in Asia/Kolkata (+05:30) to prevent browser-local timezone skew.
 */
export function parseToISTDate(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    let s = input.trim();
    if (!s) return null;

    // Check if it's already an ISO string with timezone offset (Z, +05:30, -04:00, etc.)
    const hasTimezone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(s);
    if (!hasTimezone) {
      // Normalize 'YYYY-MM-DD HH:mm:ss' to 'YYYY-MM-DDTHH:mm:ss+05:30'
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
        s = s.replace(' ', 'T') + '+05:30';
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        // Date only 'YYYY-MM-DD'
        s = `${s}T00:00:00+05:30`;
      }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Format date in Indian standard format: DD-MM-YYYY
 * Example: '03-10-2026'
 */
export function formatISTDate(input: DateInput, fallback: string = '-'): string {
  const d = parseToISTDate(input);
  if (!d) return fallback;

  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);

  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '1970';

  return `${day}-${month}-${year}`;
}

/**
 * Format date with short month for badges/cards: DD Mon YYYY
 * Example: '03 Oct 2026'
 */
export function formatISTDateShort(input: DateInput, fallback: string = '-'): string {
  const d = parseToISTDate(input);
  if (!d) return fallback;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format time in 12-hour format with AM/PM
 * Example: '11:45 AM'
 */
export function formatISTTime(input: DateInput, fallback: string = '-'): string {
  const d = parseToISTDate(input);
  if (!d) return fallback;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d).toUpperCase();
}

/**
 * Format date and time in standard Indian format: DD-MM-YYYY, hh:mm AM/PM
 * Example: '03-10-2026, 11:45 AM'
 */
export function formatISTDateTime(input: DateInput, fallback: string = '-'): string {
  const d = parseToISTDate(input);
  if (!d) return fallback;

  return `${formatISTDate(d)}, ${formatISTTime(d)}`;
}

/**
 * Relative time description relative to current Indian Standard Time.
 * Example: 'Just now', '15m ago', '2h ago', 'Yesterday at 10:30 AM', '02-10-2026'
 */
export function formatISTRelative(input: DateInput): string {
  const d = parseToISTDate(input);
  if (!d) return '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60 && diffSec >= -5) return 'Just now';
  if (diffMin < 60 && diffMin > 0) return `${diffMin}m ago`;
  if (diffHour < 24 && diffHour > 0) return `${diffHour}h ago`;
  if (diffDays === 1) return `Yesterday at ${formatISTTime(d)}`;
  if (diffDays < 7 && diffDays > 1) return `${diffDays}d ago`;

  return formatISTDateTime(d);
}

/**
 * Get current date string in YYYY-MM-DD for IST (safe for HTML <input type="date"> and day comparison)
 */
export function getISTTodayString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Get YYYY-MM-DD string in IST for any date (ideal for calendar key matching)
 */
export function getISTDateKey(input: DateInput): string {
  const d = parseToISTDate(input);
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Get current datetime string in YYYY-MM-DDTHH:mm for IST (safe for HTML <input type="datetime-local">)
 */
export function getISTNowString(offsetMinutes: number = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60000);

  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  let hour = parts.find((p) => p.type === 'hour')?.value || '00';
  if (hour === '24') hour = '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts a date or datetime-local input string into an ISO string with explicit timezone representation
 */
export function toISTIsoString(input: string | Date | null | undefined): string | undefined {
  if (!input) return undefined;
  if (input instanceof Date) {
    return input.toISOString();
  }
  const s = input.trim();
  if (!s) return undefined;
  if (/[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(s)) {
    return new Date(s).toISOString();
  }
  // Local input YYYY-MM-DDTHH:mm or YYYY-MM-DD
  if (s.includes('T')) {
    const full = s.length === 16 ? `${s}:00+05:30` : `${s}+05:30`;
    return new Date(full).toISOString();
  }
  return new Date(`${s}T00:00:00+05:30`).toISOString();
}
