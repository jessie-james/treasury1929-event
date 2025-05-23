import express from 'express';
import cors from 'cors';
import { storage } from './storage';

const apiApp = express();
const API_PORT = 3001; // Different port from main app

// CORS setup for the dedicated API server
apiApp.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

apiApp.use(express.json());

console.log("🚀 Setting up dedicated API server on port", API_PORT);

// Dedicated booking endpoint - no authentication for testing
apiApp.post('/create-booking', async (req, res) => {
  console.log('🟢 DEDICATED API SERVER - NO VITE INTERFERENCE POSSIBLE');
  console.log('📨 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
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

    console.log('🟢 CREATING BOOKING WITH DEDICATED SERVER:', JSON.stringify(bookingData, null, 2));
    const newBooking = await storage.createBooking(bookingData);
    console.log('🟢 DEDICATED SERVER BOOKING CREATED SUCCESSFULLY:', newBooking.id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking
    });
    
  } catch (error) {
    console.log('🔴 DEDICATED SERVER BOOKING ERROR:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      message: 'Booking creation failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Health check for the dedicated API server
apiApp.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'dedicated-api' });
});

apiApp.listen(API_PORT, () => {
  console.log(`🚀 Dedicated API server running on port ${API_PORT}`);
  console.log(`🔗 Booking endpoint: http://localhost:${API_PORT}/create-booking`);
});

export { apiApp };