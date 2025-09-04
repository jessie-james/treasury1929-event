import { formatInTimeZone } from 'date-fns-tz';

// Phoenix, Arizona timezone (America/Phoenix - no DST)
export const PHOENIX_TZ = 'America/Phoenix';

/**
 * Format a date in Phoenix timezone for display
 */
export function formatPhoenixDate(date: Date | string, format: string = 'EEEE, MMMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, PHOENIX_TZ, format);
}

/**
 * Format a time in Phoenix timezone for display
 */
export function formatPhoenixTime(date: Date | string, format: string = 'h:mm a'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, PHOENIX_TZ, format);
}

/**
 * Format a complete date and time in Phoenix timezone
 */
export function formatPhoenixDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateFormatted = formatInTimeZone(dateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
  const timeFormatted = formatInTimeZone(dateObj, PHOENIX_TZ, 'h:mm a');
  return `${dateFormatted} at ${timeFormatted}`;
}

/**
 * Calculate and format arrival time (45 minutes before event) in Phoenix timezone
 */
export function formatEventTimes(eventDate: Date | string): {
  eventDate: string;
  showTime: string;
  arrivalTime: string;
  timeDisplay: string;
} {
  const eventDateObj = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  
  // Format event date in Phoenix timezone
  const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
  
  // Format show time in Phoenix timezone
  const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');
  
  // Calculate arrival time (45 minutes before show) in Phoenix timezone
  const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
  const arrivalTimeFormatted = formatInTimeZone(arrivalTime, PHOENIX_TZ, 'h:mm a');
  
  const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
  
  return {
    eventDate: eventDateFormatted,
    showTime,
    arrivalTime: arrivalTimeFormatted,
    timeDisplay
  };
}

/**
 * Simple Phoenix date formatting for lists and cards
 */
export function formatPhoenixDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, PHOENIX_TZ, 'MMM d, yyyy');
}

/**
 * Phoenix date formatting for forms (YYYY-MM-DD format)
 */
export function formatPhoenixDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, PHOENIX_TZ, 'yyyy-MM-dd');
}