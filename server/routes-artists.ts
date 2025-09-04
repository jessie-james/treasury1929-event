// PHASE 1: Event Artists CRUD routes (Part B)
import express from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { upload, saveImage, removeImages, validateImageFile } from './lib/upload';

const router = express.Router();

// Validation schemas
const createArtistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"), 
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  displayOrder: z.number().optional().default(0)
});

const updateArtistSchema = createArtistSchema.partial();

/**
 * GET /api/admin/events/:eventId/artists
 * Get all artists for a specific event
 */
router.get('/admin/events/:eventId/artists', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const artists = await storage.getEventArtists(eventId);
    res.json(artists);

  } catch (error) {
    console.error('Error fetching event artists:', error);
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

/**
 * POST /api/admin/events/:eventId/artists
 * Create a new artist for an event
 */
router.post('/admin/events/:eventId/artists', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Validate input
    const validation = createArtistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.flatten()
      });
    }

    const artistData = {
      ...validation.data,
      eventId
    };

    const artist = await storage.createEventArtist(artistData);
    res.status(201).json(artist);

  } catch (error) {
    console.error('Error creating event artist:', error);
    res.status(500).json({ error: 'Failed to create artist' });
  }
});

/**
 * PATCH /api/admin/events/:eventId/artists/:id
 * Update an existing artist
 */
router.patch('/admin/events/:eventId/artists/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const eventId = parseInt(req.params.eventId);
    const artistId = parseInt(req.params.id);
    
    if (isNaN(eventId) || isNaN(artistId)) {
      return res.status(400).json({ error: 'Invalid event or artist ID' });
    }

    // Validate input
    const validation = updateArtistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.flatten()
      });
    }

    const artist = await storage.updateEventArtist(artistId, validation.data);
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json(artist);

  } catch (error) {
    console.error('Error updating event artist:', error);
    res.status(500).json({ error: 'Failed to update artist' });
  }
});

/**
 * DELETE /api/admin/events/:eventId/artists/:id
 * Delete an artist from an event
 */
router.delete('/admin/events/:eventId/artists/:id', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const eventId = parseInt(req.params.eventId);
    const artistId = parseInt(req.params.id);
    
    if (isNaN(eventId) || isNaN(artistId)) {
      return res.status(400).json({ error: 'Invalid event or artist ID' });
    }

    const success = await storage.deleteEventArtist(artistId);
    if (!success) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting event artist:', error);
    res.status(500).json({ error: 'Failed to delete artist' });
  }
});

/**
 * PATCH /api/admin/events/:eventId/artists/reorder
 * Bulk update display order for artists
 */
router.patch('/admin/events/:eventId/artists/reorder', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    const { artists } = req.body;
    if (!Array.isArray(artists)) {
      return res.status(400).json({ error: 'Artists array is required' });
    }

    // Validate each artist update
    const updates = artists.map((artist: any, index: number) => {
      if (!artist.id || typeof artist.id !== 'number') {
        throw new Error(`Invalid artist ID at position ${index}`);
      }
      return {
        id: artist.id,
        displayOrder: index
      };
    });

    // Update display orders
    const results = [];
    for (const update of updates) {
      const artist = await storage.updateEventArtist(update.id, { 
        displayOrder: update.displayOrder 
      });
      if (artist) {
        results.push(artist);
      }
    }

    res.json({ artists: results });

  } catch (error) {
    console.error('Error reordering event artists:', error);
    res.status(500).json({ error: 'Failed to reorder artists' });
  }
});

/**
 * Write guard helper - Check if artist's event is protected
 */
async function checkArtistWriteProtection(artistId: number): Promise<boolean> {
  const protectedEventIds = process.env.PROTECT_EVENT_IDS || '';
  
  if (!protectedEventIds) {
    return false; // No protection enabled
  }
  
  const protectedIds = protectedEventIds
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (protectedIds.length === 0) {
    return false;
  }
  
  // Get artist to check their eventId
  const artist = await storage.getEventArtistById(artistId);
  if (!artist) {
    return false; // Artist doesn't exist, let the main route handle the 404
  }
  
  return protectedIds.includes(artist.eventId.toString());
}

/**
 * POST /api/admin/artists/:artistId/photo
 * Upload photo for an artist
 */
router.post('/admin/artists/:artistId/photo', upload.single('file'), async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const artistId = parseInt(req.params.artistId);
    if (isNaN(artistId)) {
      return res.status(400).json({ error: 'Invalid artist ID' });
    }

    // Check write protection
    if (await checkArtistWriteProtection(artistId)) {
      return res.status(403).json({
        error: 'Event Protected',
        message: `This artist belongs to a protected event. Contact administrator for changes.`
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      validateImageFile(req.file);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid file' });
    }

    // Save image
    const result = await saveImage({
      buffer: req.file.buffer,
      subdir: 'artists',
      id: artistId
    });

    // Update artist photo URL in database
    const updatedArtist = await storage.updateEventArtist(artistId, { 
      photoUrl: result.photoUrl 
    });

    if (!updatedArtist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({ 
      ok: true, 
      photoUrl: result.photoUrl, 
      thumbUrl: result.thumbUrl 
    });

  } catch (error) {
    console.error('Error uploading artist photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * DELETE /api/admin/artists/:artistId/photo
 * Remove photo for an artist
 */
router.delete('/admin/artists/:artistId/photo', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const artistId = parseInt(req.params.artistId);
    if (isNaN(artistId)) {
      return res.status(400).json({ error: 'Invalid artist ID' });
    }

    // Check write protection
    if (await checkArtistWriteProtection(artistId)) {
      return res.status(403).json({
        error: 'Event Protected',
        message: `This artist belongs to a protected event. Contact administrator for changes.`
      });
    }

    // Remove images from filesystem
    try {
      await removeImages('artists', artistId);
    } catch (error) {
      console.error('Error removing artist images:', error);
      // Continue with database update even if file removal fails
    }

    // Update artist photo URL in database
    const updatedArtist = await storage.updateEventArtist(artistId, { 
      photoUrl: null 
    });

    if (!updatedArtist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('Error removing artist photo:', error);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

export default router;