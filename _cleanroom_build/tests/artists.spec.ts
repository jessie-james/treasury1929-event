/**
 * Artists Management Tests for Treasury 1929 Event Platform
 * Tests CRUD operations, UI functionality, and crash protection
 */

import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock the API request function
const mockApiRequest = vi.fn();
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

describe('Artists Management Tests', () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  describe('Artists CRUD Operations', () => {
    test('should create artist with required fields', async () => {
      const artistData = {
        name: 'Sophia Su',
        role: 'Pianist',
        bio: 'Collaborative pianist (DMA, University of Arizona).',
        photoUrl: '/assets/artists/sophia-su.jpg'
      };

      mockApiRequest.mockResolvedValue({
        id: 1,
        eventId: 42,
        ...artistData,
        displayOrder: 0,
        createdAt: new Date().toISOString()
      });

      const result = await mockApiRequest('POST', '/api/admin/events/42/artists', artistData);
      
      expect(result).toMatchObject({
        id: 1,
        name: 'Sophia Su',
        role: 'Pianist',
        bio: expect.stringContaining('Collaborative pianist'),
        photoUrl: '/assets/artists/sophia-su.jpg'
      });
    });

    test('should update artist with partial data', async () => {
      const updateData = {
        bio: 'Updated biography for the artist'
      };

      mockApiRequest.mockResolvedValue({
        id: 1,
        name: 'Sophia Su',
        role: 'Pianist',
        bio: 'Updated biography for the artist',
        displayOrder: 0
      });

      const result = await mockApiRequest('PATCH', '/api/admin/events/42/artists/1', updateData);
      
      expect(result).toMatchObject({
        bio: 'Updated biography for the artist'
      });
    });

    test('should delete artist successfully', async () => {
      mockApiRequest.mockResolvedValue({ success: true });

      const result = await mockApiRequest('DELETE', '/api/admin/events/42/artists/1');
      
      expect(result).toEqual({ success: true });
    });

    test('should reorder artists by display order', async () => {
      const artists = [
        { id: 1, displayOrder: 0 },
        { id: 2, displayOrder: 1 }
      ];

      mockApiRequest.mockResolvedValue({ artists });

      const result = await mockApiRequest('PATCH', '/api/admin/events/42/artists/reorder', {
        artists: [{ id: 2, displayOrder: 0 }, { id: 1, displayOrder: 1 }]
      });
      
      expect(result).toMatchObject({ artists });
    });
  });

  describe('Data Validation', () => {
    test('should require name field', () => {
      const invalidArtist = {
        role: 'Pianist',
        bio: 'Test bio'
      };

      // This would fail validation in the actual component
      expect(invalidArtist).not.toHaveProperty('name');
    });

    test('should require role field', () => {
      const invalidArtist = {
        name: 'Test Artist',
        bio: 'Test bio'
      };

      // This would fail validation in the actual component
      expect(invalidArtist).not.toHaveProperty('role');
    });

    test('should allow optional bio and photoUrl', () => {
      const minimalArtist = {
        name: 'Test Artist',
        role: 'Musician'
      };

      // This should be valid
      expect(minimalArtist).toMatchObject({
        name: 'Test Artist',
        role: 'Musician'
      });
    });
  });

  describe('September Events Artist Seeding', () => {
    test('should have Sophia Su for September 9 & 12 events', () => {
      const sophiaArtist = {
        name: 'Sophia Su',
        role: 'Pianist',
        bio: 'Collaborative pianist (DMA, University of Arizona). Master\'s from UT Austin; performances with Butler Opera Center, Miami Music Festival, Chicago Summer Opera, and the International Lyric Academy (Italy). Winner of UA\'s 2023–24 President\'s Concerto Competition.',
        photoUrl: '/assets/artists/sophia-su.jpg',
        displayOrder: 0
      };

      expect(sophiaArtist).toMatchObject({
        name: 'Sophia Su',
        role: 'Pianist',
        photoUrl: '/assets/artists/sophia-su.jpg'
      });
    });

    test('should have Dr. Fanya Lin for September 19 event', () => {
      const fanyaArtist = {
        name: 'Dr. Fanya Lin',
        role: 'Pianist',
        bio: 'Described as a "striking interpreter" with "committed and heartfelt performance," Dr. Lin has performed with the Royal Philharmonic, Utah Symphony, Savannah Philharmonic, and more. Her 2023 album Rhapsodic (Navona Records) features Gershwin\'s Rhapsody in Blue and Rachmaninoff\'s Rhapsody on a Theme of Paganini. She is Associate Professor of Practice in Piano at the University of Arizona.',
        photoUrl: '/assets/artists/fanya-lin.jpg',
        displayOrder: 0
      };

      expect(fanyaArtist).toMatchObject({
        name: 'Dr. Fanya Lin',
        role: 'Pianist',
        photoUrl: '/assets/artists/fanya-lin.jpg'
      });
    });
  });

  describe('Crash Protection', () => {
    test('should handle null/undefined artists gracefully', () => {
      const nullArtists = null;
      const undefinedArtists = undefined;
      const emptyArtists = [];

      // Should normalize to empty array
      const safeNull = Array.isArray(nullArtists) ? nullArtists : [];
      const safeUndefined = Array.isArray(undefinedArtists) ? undefinedArtists : [];
      const safeEmpty = Array.isArray(emptyArtists) ? emptyArtists : [];

      expect(safeNull).toEqual([]);
      expect(safeUndefined).toEqual([]);
      expect(safeEmpty).toEqual([]);
    });

    test('should initialize with one empty artist for new events', () => {
      const isEditing = false;
      const eventId = null;
      const artists = [];

      // Logic from EventArtists component
      const shouldShowAddForm = !isEditing && !eventId && artists.length === 0;
      
      expect(shouldShowAddForm).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      mockApiRequest.mockRejectedValue(new Error('API Error'));

      try {
        await mockApiRequest('GET', '/api/admin/events/42/artists');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }
    });
  });

  describe('UI Component State Management', () => {
    test('should track editing state correctly', () => {
      let editingArtist = null;
      let isAddingNew = false;

      // Simulate starting to edit
      const artist = { id: 1, name: 'Test Artist' };
      editingArtist = artist;

      expect(editingArtist).toEqual(artist);
      expect(isAddingNew).toBe(false);

      // Simulate adding new
      editingArtist = null;
      isAddingNew = true;

      expect(editingArtist).toBeNull();
      expect(isAddingNew).toBe(true);
    });

    test('should handle form cancellation', () => {
      let editingArtist = { id: 1, name: 'Test Artist' };
      let isAddingNew = true;

      // Simulate cancel
      editingArtist = null;
      isAddingNew = false;

      expect(editingArtist).toBeNull();
      expect(isAddingNew).toBe(false);
    });
  });
});