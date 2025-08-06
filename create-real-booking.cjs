// Create a real booking for the user to test the complete flow
const fetch = require('node-fetch');

async function createRealBooking() {
  console.log('Creating a real booking for you...\n');
  
  try {
    // Get available event and tables
    const eventsRes = await fetch('http://localhost:5000/api/events');
    const events = await eventsRes.json();
    const event = events.find(e => e.id === 35) || events[0];
    
    const venueRes = await fetch(`http://localhost:5000/api/events/${event.id}/venue-layouts`);
    const venues = await venueRes.json();
    const availableTable = venues[0].tables.find(t => t.status === 'available');
    
    const foodRes = await fetch('http://localhost:5000/api/food-options');
    const foodOptions = await foodRes.json();
    
    const salads = foodOptions.filter(f => f.type === 'salad');
    const entrees = foodOptions.filter(f => f.type === 'entree');  
    const desserts = foodOptions.filter(f => f.type === 'dessert');
    const wines = foodOptions.filter(f => f.type === 'wine_bottle');
    
    console.log(`Selected event: ${event.title}`);
    console.log(`Selected table: ${availableTable.tableNumber} (capacity: ${availableTable.capacity})`);
    
    // Create booking directly in database using storage
    const { storage } = await import('./server/storage.js');
    
    const bookingData = {
      eventId: event.id,
      tableId: availableTable.id,
      partySize: 2,
      guestNames: ['Your Guest 1', 'Your Guest 2'],
      foodSelections: [
        {
          salad: salads[0]?.id,
          entree: entrees[0]?.id,
          dessert: desserts[0]?.id
        },
        {
          salad: salads[1]?.id || salads[0]?.id,
          entree: entrees[1]?.id || entrees[0]?.id,
          dessert: desserts[1]?.id || desserts[0]?.id
        }
      ],
      wineSelections: [
        { wine: wines[0]?.id },
        { wine: wines[1]?.id || wines[0]?.id }
      ],
      customerEmail: 'jose@sahuaroworks.com',
      stripePaymentId: 'test_booking_' + Date.now(),
      totalAmount: 13000,
      status: 'confirmed'
    };
    
    // Create the booking
    const booking = await storage.createBooking(bookingData);
    console.log(`\n✅ Booking created successfully: ID #${booking.id}`);
    
    // Send confirmation email
    const { EmailService } = await import('./server/email-service.js');
    const emailService = new EmailService();
    
    // Get full booking details with related data
    const fullBooking = await storage.getBookingById(booking.id);
    
    if (fullBooking) {
      await emailService.sendBookingConfirmation({
        booking: fullBooking,
        event: fullBooking.event,
        table: fullBooking.table,
        venue: fullBooking.venue || { name: 'The Treasury 1929' }
      });
      
      console.log('✅ Confirmation email sent to jose@sahuaroworks.com');
      console.log('\nBooking Summary:');
      console.log(`- Event: ${event.title}`);
      console.log(`- Date: ${new Date(event.date).toLocaleDateString()}`);
      console.log(`- Table: ${availableTable.tableNumber}`);
      console.log(`- Guests: 2`);
      console.log(`- Email: jose@sahuaroworks.com`);
      console.log(`- Total: $130.00`);
      console.log(`\nCheck your email for the confirmation with QR code!`);
    } else {
      console.log('⚠️ Could not retrieve full booking details for email');
    }
    
  } catch (error) {
    console.error('❌ Failed to create booking:', error.message);
    console.error('Stack:', error.stack);
  }
}

createRealBooking();