// PHASE 1: Admin booking routes for manual reservations and management
import express from 'express';
import { storage } from './storage';
import { AvailabilitySync } from './availability-sync';
import { EmailService } from './email-service';
import { normalizeString, normalizeName, normalizeEmail } from './utils/strings';
import { writeGuard } from './middleware/write-guard';
import { getStripe } from './stripe';

const router = express.Router();

/**
 * POST /api/admin/bookings/reserve
 * Create unpaid booking with full data; status:'reserved'|'comp', total_paid_cents=0
 */
router.post('/reserve', writeGuard, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      eventId,
      tableId,
      partySize,
      guestNames,
      customerEmail,
      notes,
      status, // 'reserved' or 'comp'
      foodSelections,
      wineSelections
    } = req.body;

    // Validate required fields
    if (!eventId || !tableId || !partySize || !customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventId, tableId, partySize, customerEmail' 
      });
    }

    // Validate status
    if (!['reserved', 'comp'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either "reserved" or "comp"' 
      });
    }

    // Normalize input data
    const normalizedEmail = normalizeEmail(customerEmail);
    const normalizedGuestNames = (guestNames || []).map((name: string) => normalizeName(name));
    const normalizedNotes = normalizeString(notes);

    // Check table availability
    const isTableAvailable = await AvailabilitySync.isTableAvailable(eventId, tableId);
    if (!isTableAvailable) {
      return res.status(400).json({ error: 'Table is not available' });
    }

    // Create the reservation
    const booking = await storage.createBooking({
      eventId,
      userId: req.user.id, // Admin user creating the booking
      tableId,
      partySize,
      guestNames: normalizedGuestNames,
      customerEmail: normalizedEmail,
      notes: normalizedNotes,
      status,
      totalPaidCents: 0, // Unpaid reservation
      bookingType: 'manual',
      foodSelections: foodSelections || [],
      wineSelections: wineSelections || []
    });

    // Sync availability
    await AvailabilitySync.syncEventAvailability(eventId);

    // Send confirmation email if not suppressed
    try {
      const event = await storage.getEventById(eventId);
      const table = await storage.getTableById(tableId);
      const venue = await storage.getVenueById(event?.venueId || 1);

      if (event && table && venue) {
        await EmailService.sendBookingConfirmation({
          booking: {
            id: booking.id,
            customerEmail: normalizedEmail,
            partySize,
            status,
            notes: normalizedNotes,
            createdAt: new Date()
          },
          event: {
            id: event.id,
            title: event.title,
            date: event.date,
            description: event.description || ''
          },
          table,
          venue: {
            id: venue.id,
            name: venue.name,
            address: '2 E Congress St, Tucson, AZ 85701'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send reservation confirmation email:', emailError);
      // Don't fail the booking creation
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        status,
        totalPaidCents: 0,
        bookingType: 'manual'
      }
    });

  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * POST /api/admin/bookings/manual
 * Same as reserve - create manual booking (default status: 'reserved')
 */
router.post('/manual', writeGuard, async (req, res) => {
  // Redirect to reserve with default status
  req.body.status = req.body.status || 'reserved';
  // Manually handle the redirect by calling the reserve logic
  req.url = '/api/admin/bookings/reserve';
  req.method = 'POST';
  return router.stack[0].handle(req, res, () => {});
});

/**
 * POST /api/admin/bookings/:id/paylink
 * Create Stripe Checkout session for exact seats/amount
 */
router.post('/:id/paylink', writeGuard, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const bookingId = parseInt(req.params.id);
    const booking = await storage.getBooking(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'reserved') {
      return res.status(400).json({ error: 'Payment link can only be created for reserved bookings' });
    }

    const event = await storage.getEventById(booking.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Calculate amount based on event pricing
    const pricePerGuest = event.ticketPrice || event.basePrice || 13000; // cents
    const partySize = booking.partySize || 1; // Handle null case
    const totalAmount = pricePerGuest * partySize;

    const stripe = getStripe();
    
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - Table ${booking.tableId}`,
            description: `${booking.partySize} guests`
          },
          unit_amount: pricePerGuest
        },
        quantity: partySize
      }],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/booking-canceled`,
      metadata: {
        bookingId: bookingId.toString(),
        eventId: booking.eventId.toString(),
        isAdminPaylink: 'true'
      }
    });

    res.json({
      success: true,
      paymentUrl: session.url,
      sessionId: session.id,
      amount: totalAmount
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

/**
 * POST /api/admin/bookings/:id/mark-paid-offline
 * Mark booking as confirmed and set total_paid_cents
 */
router.post('/:id/mark-paid-offline', writeGuard, async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const bookingId = parseInt(req.params.id);
    const { amountPaidCents, paymentMethod = 'offline' } = req.body;

    if (!amountPaidCents || amountPaidCents <= 0) {
      return res.status(400).json({ error: 'Valid payment amount required' });
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status and payment info
    await storage.updateBooking(bookingId, {
      status: 'confirmed',
      totalPaidCents: amountPaidCents,
      stripePaymentId: `offline_${Date.now()}`, // Track as offline payment
      lastModified: new Date(),
      modifiedBy: req.user.id
    });

    // Send confirmation email
    try {
      const event = await storage.getEventById(booking.eventId);
      const table = await storage.getTableById(booking.tableId);
      const venue = await storage.getVenueById(event?.venueId || 1);

      if (event && table && venue) {
        await EmailService.sendBookingConfirmation({
          booking: {
            id: booking.id,
            customerEmail: booking.customerEmail,
            partySize: booking.partySize || 1,
            status: 'confirmed',
            notes: booking.notes || undefined,
            stripePaymentId: `offline_${Date.now()}`,
            createdAt: booking.createdAt,
            guestNames: booking.guestNames || []
          },
          event: {
            id: event.id,
            title: event.title,
            date: event.date,
            description: event.description || ''
          },
          table,
          venue: {
            id: venue.id,
            name: venue.name,
            address: '2 E Congress St, Tucson, AZ 85701'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the operation
    }

    res.json({
      success: true,
      booking: {
        id: bookingId,
        status: 'confirmed',
        totalPaidCents: amountPaidCents,
        paymentMethod
      }
    });

  } catch (error) {
    console.error('Error marking booking as paid:', error);
    res.status(500).json({ error: 'Failed to mark booking as paid' });
  }
});

export default router;