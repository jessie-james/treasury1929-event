/**
 * Parse an event date string without timezone conversion issues
 * Handles both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" formats
 */
export function parseEventDate(dateString: string | Date | null | undefined): Date {
  // Handle null/undefined dates
  if (!dateString) {
    return new Date();
  }

  if (dateString instanceof Date) {
    return dateString;
  }

  // Handle ISO date strings like "2025-08-28T00:00:00.000Z"
  if (typeof dateString === 'string') {
    try {
      // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
      let datePart: string;
      
      if (dateString.includes('T')) {
        // ISO format: "2025-08-28T00:00:00.000Z"
        datePart = dateString.split('T')[0];
      } else {
        // Simple format: "2025-08-28 00:00:00" or "2025-08-28"
        datePart = dateString.split(' ')[0];
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Validate the date components
      if (isNaN(year) || isNaN(month) || isNaN(day) || 
          year < 1900 || year > 3000 || 
          month < 1 || month > 12 || 
          day < 1 || day > 31) {
        console.warn('Invalid date components:', { year, month, day, original: dateString });
        return new Date();
      }
      
      // Create date in local timezone without time component
      // month is 0-indexed in JavaScript Date constructor
      const date = new Date(year, month - 1, day);
      
      // Check if the created date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created:', dateString);
        return new Date();
      }
      
      return date;
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return new Date();
    }
  }

  // Fallback for any other type
  return new Date();
}