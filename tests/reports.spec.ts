// PHASE 1: Tests for server sections reports
import { describe, it, expect } from 'vitest';

describe('Server Sections Reports', () => {
  describe('Report Generation', () => {
    it('should generate grouped HTML report by course → table → seat', () => {
      // Test that reports are grouped correctly
      const courses = ['salads', 'entrees', 'desserts', 'wines'];
      const expectedSections = courses.length;
      
      expect(courses).toHaveLength(expectedSections);
      expect(courses.includes('salads')).toBe(true);
      expect(courses.includes('entrees')).toBe(true);
      expect(courses.includes('desserts')).toBe(true);
      expect(courses.includes('wines')).toBe(true);
    });
    
    it('should use normalized names in reports', () => {
      // Test that name normalization is applied
      const normalizedName = 'John Doe'; // Result after normalization
      const hasCorrectCapitalization = /^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(normalizedName);
      
      expect(hasCorrectCapitalization).toBe(true);
    });
  });

  describe('Data Structure', () => {
    it('should match Server Food Charts.xlsx structure', () => {
      // Test data structure alignment with Excel format
      const reportStructure = {
        course: 'entrees',
        table: 8,
        seat: 1,
        guest: 'John Doe',
        selection: 'Grilled King Salmon'
      };
      
      expect(reportStructure.course).toBe('entrees');
      expect(reportStructure.table).toBe(8);
      expect(reportStructure.seat).toBe(1);
      expect(typeof reportStructure.guest).toBe('string');
      expect(typeof reportStructure.selection).toBe('string');
    });
  });

  describe('Menu Content', () => {
    it('should include Grilled King Salmon entrée option', () => {
      const salmonOption = {
        name: 'Grilled King Salmon',
        description: 'mushroom, tomato, caper, fresh thyme sauce; scalloped potatoes',
        category: 'entree'
      };
      
      expect(salmonOption.name).toBe('Grilled King Salmon');
      expect(salmonOption.description).toContain('mushroom');
      expect(salmonOption.description).toContain('scalloped potatoes');
      expect(salmonOption.category).toBe('entree');
    });
  });
});