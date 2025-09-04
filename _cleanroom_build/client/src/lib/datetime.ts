import { formatInTimeZone } from 'date-fns-tz';

const PHX = (import.meta.env.VITE_PHOENIX_TZ as string) || 'America/Phoenix';

/** 
 * Accepts `Date` or strings like "2025-09-10 01:30:00" or ISO; treats space-format as UTC.
 * This fixes timezone parsing issues where DB dates without timezone info get misinterpreted.
 */
export function parseDbToUtc(input: string | Date): Date {
  if (input instanceof Date) return input;
  if (!input) return new Date(NaN);
  
  // If "YYYY-MM-DD HH:mm:ss" (no timezone), treat as UTC and coerce to ISO
  const spaceFmt = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input);
  const iso = spaceFmt ? input.replace(' ', 'T') + 'Z' : input;
  return new Date(iso);
}

/**
 * Format event dates safely in Phoenix timezone
 * Handles DB date strings and ensures consistent Phoenix timezone display
 */
export function formatEventDate(input: string | Date, pattern = "EEE, MMM d 'at' h:mm a") {
  const dt = parseDbToUtc(input);
  if (isNaN(dt.getTime())) {
    console.warn('Invalid date provided to formatEventDate:', input);
    return 'Invalid Date';
  }
  return formatInTimeZone(dt, PHX, pattern);
}

/**
 * Format event date for cards - matches existing EventCard format
 */
export function formatEventDateForCard(input: string | Date): string {
  return formatEventDate(input, "EEEE, MMMM d, yyyy");
}

/**
 * Format event time for display 
 */
export function formatEventTime(input: string | Date): string {
  return formatEventDate(input, "h:mm a");
}