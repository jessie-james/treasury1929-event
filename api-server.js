import express from 'express';
import cors from 'cors';
import { storage } from './server/storage.js';

const app = express();
const PORT = 3001;

// Enable CORS for your Vite dev server
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));

app.use(express.json());

app.post('/create-booking', async (req, res) => {
  console.log('🟢 DEDICATED API SERVER - NO VITE INTERFERENCE');
  
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
    console.log('🟢 DEDICATED API - CREATING BOOKING:', JSON.stringify(bookingData, null, 2));
    const result = await storage.createBooking(bookingData);
    console.log('🟢 DEDICATED API - BOOKING SUCCESS:', result.id);
    res.json({ success: true, booking: result });
  } catch (error) {
    console.error('🔴 DEDICATED API - Booking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DEDICATED API Server running on port ${PORT}`);
  console.log(`🔗 Booking endpoint: http://localhost:${PORT}/create-booking`);
});