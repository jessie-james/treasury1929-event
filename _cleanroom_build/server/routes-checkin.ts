// PHASE 2: Check-in QoL improvements with search functionality
import express from 'express';
import { storage } from './storage';
import { normalizeString, normalizeName } from './utils/strings';

const router = express.Router();

/**
 * GET /api/checkin/search?q=<lastOrBookingId>
 * Find bookings by last name or booking id for the current event
 */
router.get('/search', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role === 'customer') {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const { q: query, eventId } = req.query;

    if (!query || !eventId) {
      return res.status(400).json({ 
        error: 'Query parameter "q" and "eventId" are required' 
      });
    }

    const searchTerm = normalizeString(query as string).toLowerCase();
    const targetEventId = parseInt(eventId as string);

    if (isNaN(targetEventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Get all bookings for the event
    const eventBookings = await storage.getBookingsByEventId(targetEventId);
    
    // Filter to only confirmed/reserved/comp bookings
    const activeBookings = eventBookings.filter(booking => 
      ['confirmed', 'reserved', 'comp'].includes(booking.status)
    );

    // Search by booking ID or last name
    const matches = [];

    for (const booking of activeBookings) {
      let isMatch = false;

      // Check if search term matches booking ID
      if (booking.id.toString() === searchTerm) {
        isMatch = true;
      }
      
      // Check if search term matches any guest names (last name)
      if (!isMatch && booking.guestNames && Array.isArray(booking.guestNames)) {
        for (const guestName of booking.guestNames) {
          const normalizedGuestName = normalizeName(guestName).toLowerCase();
          const nameParts = normalizedGuestName.split(' ');
          const lastName = nameParts[nameParts.length - 1];
          
          if (lastName.includes(searchTerm) || normalizedGuestName.includes(searchTerm)) {
            isMatch = true;
            break;
          }
        }
      }

      // Check customer email as fallback
      if (!isMatch && booking.customerEmail) {
        const emailParts = booking.customerEmail.toLowerCase().split('@')[0];
        if (emailParts.includes(searchTerm)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        // Get table details
        const table = await storage.getTableById(booking.tableId);
        
        matches.push({
          bookingId: booking.id,
          customerEmail: booking.customerEmail,
          partySize: booking.partySize,
          guestNames: booking.guestNames || [],
          tableNumber: table?.tableNumber || booking.tableId,
          tableFloor: table?.floor || 'main',
          status: booking.status,
          checkedIn: booking.checkedIn || false,
          checkedInAt: booking.checkedInAt,
          notes: booking.notes,
          // Purchaser info for display
          purchaserName: booking.guestNames && booking.guestNames.length > 0 
            ? normalizeName(booking.guestNames[0])
            : 'Guest',
          createdAt: booking.createdAt
        });
      }
    }

    // Sort by creation date (newest first) and check-in status
    matches.sort((a, b) => {
      // Prioritize non-checked-in bookings
      if (a.checkedIn !== b.checkedIn) {
        return a.checkedIn ? 1 : -1;
      }
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({
      searchTerm: query,
      eventId: targetEventId,
      matches,
      totalMatches: matches.length
    });

  } catch (error) {
    console.error('Error searching bookings:', error);
    res.status(500).json({ error: 'Failed to search bookings' });
  }
});

/**
 * POST /api/checkin/confirm
 * Mark a booking as checked in
 */
router.post('/confirm', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role === 'customer') {
      return res.status(403).json({ error: 'Staff access required' });
    }

    const { bookingId, eventId } = req.body;

    if (!bookingId || !eventId) {
      return res.status(400).json({ 
        error: 'bookingId and eventId are required' 
      });
    }

    // Get the booking
    const booking = await storage.getBooking(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.eventId !== eventId) {
      return res.status(400).json({ error: 'Booking does not belong to this event' });
    }

    if (!['confirmed', 'reserved', 'comp'].includes(booking.status)) {
      return res.status(400).json({ error: 'Only confirmed/reserved/comp bookings can be checked in' });
    }

    // Update booking with check-in info
    await storage.updateBooking(bookingId, {
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: req.user.id
    });

    // Get updated booking with table info for response
    const table = await storage.getTableById(booking.tableId);

    res.json({
      success: true,
      booking: {
        id: booking.id,
        purchaserName: booking.guestNames && booking.guestNames.length > 0 
          ? normalizeName(booking.guestNames[0])
          : 'Guest',
        tableNumber: table?.tableNumber || booking.tableId,
        partySize: booking.partySize,
        checkedInAt: new Date(),
        checkedInBy: req.user.id
      }
    });

  } catch (error) {
    console.error('Error confirming check-in:', error);
    res.status(500).json({ error: 'Failed to confirm check-in' });
  }
});

export default router;