import express from 'express';
import { storage } from './server/storage.js';

const app = express();
app.use(express.json());

app.post('/create-booking', async (req, res) => {
  console.log('🟢 VITE PLUGIN API - BYPASSING VITE CATCH-ALL');
  
  const bookingData = {
    eventId: req.body.eventId,
    userId: req.body.userId,
    tableId: req.body.tableId,
    partySize: req.body.seatNumbers?.length || req.body.partySize || 2,
    customerEmail: req.body.customerEmail,
    stripePaymentId: req.body.stripePaymentId,
    guestNames: req.body.guestNames || [],
    foodSelections: req.body.foodSelections || [],
    status: 'confirmed'
  };

  try {
    console.log('🟢 VITE PLUGIN - CREATING BOOKING:', JSON.stringify(bookingData, null, 2));
    const result = await storage.createBooking(bookingData);
    console.log('🟢 VITE PLUGIN - BOOKING SUCCESS:', result.id);
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, booking: result });
  } catch (error) {
    console.error('🔴 VITE PLUGIN - Booking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export function apiPlugin() {
  return {
    name: 'api-plugin',
    config() {
      return {
        server: {
          proxy: {
            '/api': {} // Tell Vite to let API requests through
          }
        }
      };
    },
    configureServer(server) {
      server.middlewares.use('/api', app);
    }
  };
}