// PHASE 0: Backoffice timezone utility
import { formatInTimeZone as fnsFormatInTimeZone } from 'date-fns-tz';

/**
 * Format dates in America/Phoenix timezone for backoffice displays
 * Replaces hardcoded timezone handling throughout backoffice
 */
export function formatInTimeZone(
  date: Date | string | number,
  format: string
): string {
  const PHOENIX_TZ = 'America/Phoenix';
  
  // Ensure we have a Date object
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  return fnsFormatInTimeZone(dateObj, PHOENIX_TZ, format);
}

/**
 * Common date formats for backoffice
 */
export const BACKOFFICE_DATE_FORMATS = {
  SHORT_DATE: 'MM/dd/yyyy',
  LONG_DATE: 'EEEE, MMMM d, yyyy',
  SHORT_DATETIME: 'MM/dd/yyyy HH:mm',
  LONG_DATETIME: 'EEEE, MMMM d, yyyy HH:mm:ss',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY_DATETIME: 'MMM d, yyyy h:mm a'
} as const;

/**
 * Format date for backoffice tables and displays
 */
export function formatBackofficeDate(date: Date | string | number, formatType: keyof typeof BACKOFFICE_DATE_FORMATS = 'DISPLAY_DATETIME'): string {
  return formatInTimeZone(date, BACKOFFICE_DATE_FORMATS[formatType]);
}

/**
 * Get current Phoenix time
 */
export function getPhoenixTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Phoenix" }));
}