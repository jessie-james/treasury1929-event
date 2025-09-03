// PHASE 0: Tests for name normalization utility
import { describe, it, expect } from 'vitest';
import { normalizeString, normalizeName, normalizeEmail, normalizeTextContent } from '../server/utils/strings';

describe('String Normalization', () => {
  describe('normalizeString', () => {
    it('should strip BOM characters', () => {
      const input = '\uFEFFHello World';
      expect(normalizeString(input)).toBe('Hello World');
    });

    it('should remove control characters', () => {
      const input = 'Hello\u0001\u0008World\u001F';
      expect(normalizeString(input)).toBe('HelloWorld');
    });

    it('should preserve valid whitespace', () => {
      const input = 'Hello\tWorld\nNew Line';
      expect(normalizeString(input)).toBe('Hello\tWorld\nNew Line');
    });

    it('should normalize to NFC', () => {
      const input = 'Café'; // Using combining characters
      const result = normalizeString(input);
      expect(result).toBe('Café');
      expect(result.length).toBe(4); // NFC normalized
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(normalizeString(input)).toBe('Hello World');
    });

    it('should handle null and undefined', () => {
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
      expect(normalizeString('')).toBe('');
    });
  });

  describe('normalizeName', () => {
    it('should convert to title case', () => {
      expect(normalizeName('john doe')).toBe('John Doe');
      expect(normalizeName('MARY SMITH')).toBe('Mary Smith');
      expect(normalizeName('alice johnson')).toBe('Alice Johnson');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeName('john  doe')).toBe('John  Doe');
    });

    it('should handle single names', () => {
      expect(normalizeName('madonna')).toBe('Madonna');
    });
  });

  describe('normalizeEmail', () => {
    it('should convert to lowercase', () => {
      expect(normalizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
    });

    it('should handle edge cases', () => {
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('normalizeTextContent', () => {
    it('should normalize text content properly', () => {
      const input = '\uFEFF  Some content with\u0001bad chars  ';
      expect(normalizeTextContent(input)).toBe('Some content withbad chars');
    });
  });
});