// PHASE 0: Name normalization utility

/**
 * Strip BOM (Byte Order Mark), control characters, normalize to NFC, and trim whitespace
 * Apply on user/guest inputs, booking creation (webhook & admin), reports, and email templates
 */
export function normalizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Strip BOM (U+FEFF) at the beginning
  let normalized = input.replace(/^\uFEFF/, '');
  
  // Remove control characters except newlines, tabs, and carriage returns
  // Control characters are U+0000-U+001F and U+007F-U+009F
  normalized = normalized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  
  // Normalize to NFC (Canonical Decomposition followed by Canonical Composition)
  normalized = normalized.normalize('NFC');
  
  // Trim whitespace
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Normalize user/guest names for consistent storage and display
 */
export function normalizeName(name: string | null | undefined): string {
  const normalized = normalizeString(name);
  
  // Additional name-specific processing
  if (!normalized) {
    return '';
  }
  
  // Convert to title case for names
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize email addresses (keep lowercase)
 */
export function normalizeEmail(email: string | null | undefined): string {
  const normalized = normalizeString(email);
  return normalized.toLowerCase();
}

/**
 * Normalize text content for reports and email templates
 */
export function normalizeTextContent(content: string | null | undefined): string {
  return normalizeString(content);
}