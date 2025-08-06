import { storage } from './server/storage.js';
import { EmailService } from './server/email-service.js';

// Create a real booking directly using the database
async function createDirectBooking() {
  console.log('Creating your real booking...\n');
  
  try {
    // Create booking data
    const bookingData = {
      eventId: 35, // Pianist Sophia Su concert
      tableId: 286, // Table 1 on Main Floor (4-seat capacity)
      partySize: 2,
      guestNames: ['Your Guest 1', 'Your Guest 2'],
      foodSelections: [
        {
          salad: 39,  // Mixed Green Salad
          entree: 42, // Chicken Marsala  
          dessert: 45 // Creme Brulee
        },
        {
          salad: 40,  // Caesar Salad
          entree: 43, // Penne & Sausage
          dessert: 46 // Tiramisu
        }
      ],
      wineSelections: [
        { wine: 23 }, // Sterling Cabernet Sauvignon
        { wine: 24 }  // Coppola Claret
      ],
      customerEmail: 'jose@sahuaroworks.com',
      stripePaymentId: 'test_' + Date.now(),
      totalAmount: 13000, // $130.00
      status: 'confirmed'
    };
    
    console.log('Creating booking with data:', {
      event: 'Pianist Sophia Su Concert',
      table: 'Table 1 (Main Floor)',
      guests: bookingData.guestNames,
      email: bookingData.customerEmail
    });
    
    // Create the booking
    const booking = await storage.createBooking(bookingData);
    console.log(`✅ Booking created: ID #${booking.id}`);
    
    // Get full booking details for email
    const fullBooking = await storage.getBookingById(booking.id);
    
    if (fullBooking) {
      console.log('📧 Sending confirmation email...');
      
      // Initialize email service
      const emailService = new EmailService();
      
      // Send confirmation email
      await emailService.sendBookingConfirmation({
        booking: fullBooking,
        event: fullBooking.event,
        table: fullBooking.table,
        venue: fullBooking.venue || { name: 'The Treasury 1929' }
      });
      
      console.log('✅ SUCCESS! Confirmation email sent to jose@sahuaroworks.com');
      console.log('\n📋 Your Booking Details:');
      console.log(`   Booking ID: #${booking.id}`);
      console.log(`   Event: ${fullBooking.event.title}`);
      console.log(`   Date: ${new Date(fullBooking.event.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })}`);
      console.log(`   Table: ${fullBooking.table?.tableNumber || 'Table 1'}`);
      console.log(`   Party Size: ${booking.partySize} guests`);
      console.log(`   Total: $130.00`);
      console.log(`   Email: ${booking.customerEmail}`);
      console.log('\n🎉 Check your email for the full confirmation with QR code ticket!');
      
    } else {
      console.log('⚠️  Booking created but could not retrieve details for email');
    }
    
  } catch (error) {
    console.error('❌ Failed to create booking:', error);
    console.error('Error details:', error.message);
  }
}

// Run the booking creation
createDirectBooking();