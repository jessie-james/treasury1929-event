// Direct booking creation script for athena@thetreasury1929.com
import { db } from './server/db.js';
import { bookings } from './shared/schema.js';

async function createAthenaBooking() {
  console.log('Creating missing booking for athena@thetreasury1929.com...');
  
  try {
    const bookingData = {
      eventId: 35,
      tableId: 296, // Table #11 on Main Floor
      userId: null,
      partySize: 2,
      customerEmail: 'athena@thetreasury1929.com',
      stripePaymentId: 'pi_athena_recovery_manual_' + Date.now(),
      stripeSessionId: null,
      amount: 13000, // $130.00
      status: 'confirmed',
      guestNames: JSON.stringify(["Athena", "Guest"]),
      foodSelections: JSON.stringify([
        {"salad": 40, "entree": 44, "dessert": 46},
        {"salad": 41, "entree": 45, "dessert": 47}
      ]),
      wineSelections: JSON.stringify([]),
      selectedVenue: 'Main Floor',
      holdStartTime: new Date(),
      createdAt: new Date()
    };
    
    console.log('Inserting booking data:', bookingData);
    
    const result = await db.insert(bookings).values(bookingData).returning({ id: bookings.id });
    
    console.log('✅ Booking created successfully!');
    console.log('Booking ID:', result[0].id);
    console.log('Customer:', bookingData.customerEmail);
    console.log('Event:', bookingData.eventId);
    console.log('Table:', bookingData.tableId);
    console.log('Party Size:', bookingData.partySize);
    
    return result[0].id;
    
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error;
  }
}

// Run the script
createAthenaBooking()
  .then(bookingId => {
    console.log(`\n🎉 SUCCESS: Booking #${bookingId} created for athena@thetreasury1929.com`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 FAILED:', error.message);
    process.exit(1);
  });