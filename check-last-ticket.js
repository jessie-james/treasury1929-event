
const { PgStorage } = await import('./server/storage.ts');

async function findLastPurchasedTicket() {
  try {
    const storage = new PgStorage();
    
    console.log('🎫 Finding the last purchased ticket...\n');
    
    // Get all bookings ordered by creation date (most recent first)
    const allBookings = await storage.getBookings();
    
    if (!allBookings || allBookings.length === 0) {
      console.log('❌ No bookings found in the system');
      return;
    }
    
    // Sort by creation date descending to get the most recent
    const sortedBookings = allBookings
      .filter(booking => booking.status === 'confirmed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (sortedBookings.length === 0) {
      console.log('❌ No confirmed bookings found');
      return;
    }
    
    const lastBooking = sortedBookings[0];
    
    // Get event details
    const event = await storage.getEventById(lastBooking.eventId);
    const table = await storage.getTableById(lastBooking.tableId);
    
    console.log('📋 LAST PURCHASED TICKET:');
    console.log('========================');
    console.log(`Booking ID: #${lastBooking.id}`);
    console.log(`Customer Email: ${lastBooking.customerEmail}`);
    console.log(`Event: ${event?.title || 'Unknown Event'}`);
    console.log(`Event Date: ${event ? new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }) : 'Unknown'}`);
    console.log(`Table: ${table?.tableNumber || lastBooking.tableId}`);
    console.log(`Party Size: ${lastBooking.partySize} guests`);
    console.log(`Purchase Date: ${new Date(lastBooking.createdAt).toLocaleString()}`);
    console.log(`Status: ${lastBooking.status}`);
    
    if (lastBooking.guestNames && Object.keys(lastBooking.guestNames).length > 0) {
      console.log(`Guests: ${Object.values(lastBooking.guestNames).join(', ')}`);
    }
    
    if (lastBooking.stripePaymentId) {
      console.log(`Payment ID: ${lastBooking.stripePaymentId}`);
    }
    
    if (lastBooking.checkedIn) {
      console.log(`✅ Checked in at: ${new Date(lastBooking.checkedInAt).toLocaleString()}`);
    } else {
      console.log('⏳ Not yet checked in');
    }
    
    // Show food selections if available
    if (lastBooking.foodSelections && Object.keys(lastBooking.foodSelections).length > 0) {
      console.log('\n🍽️ FOOD SELECTIONS:');
      Object.entries(lastBooking.foodSelections).forEach(([guest, selections]) => {
        console.log(`  ${guest}:`);
        Object.entries(selections).forEach(([course, item]) => {
          console.log(`    ${course}: ${item}`);
        });
      });
    }
    
    console.log('\n📊 RECENT BOOKING SUMMARY:');
    console.log(`Total bookings in system: ${allBookings.length}`);
    console.log(`Confirmed bookings: ${sortedBookings.length}`);
    console.log(`Last 5 bookings:`);
    
    sortedBookings.slice(0, 5).forEach((booking, index) => {
      console.log(`  ${index + 1}. #${booking.id} - ${booking.customerEmail} - ${new Date(booking.createdAt).toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error finding last purchased ticket:', error);
    console.error('Stack trace:', error.stack);
  }
}

findLastPurchasedTicket();
