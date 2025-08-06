import fetch from 'node-fetch';

// Test complete booking flow end-to-end
async function testCompleteBookingFlow() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🚀 Starting Complete Booking Flow Test...\n');

  try {
    // Step 1: Create test user account
    console.log('1. Creating test user account...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.booking@example.com',
        password: 'TestPass123!',
        name: 'Test Booking User'
      })
    });

    if (!registerResponse.ok) {
      console.log('   User might already exist, trying login...');
    } else {
      console.log('   ✅ User account created');
    }

    // Step 2: Login to get session
    console.log('2. Logging in user...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.booking@example.com',
        password: 'TestPass123!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    // Extract session cookie
    const cookies = loginResponse.headers.get('set-cookie') || '';
    console.log('   ✅ User logged in successfully');

    // Step 3: Get available events
    console.log('3. Fetching available events...');
    const eventsResponse = await fetch(`${baseUrl}/api/events`, {
      headers: { 'Cookie': cookies }
    });
    
    const events = await eventsResponse.json();
    const testEvent = events.find(e => e.id === 35) || events[0];
    
    if (!testEvent) {
      throw new Error('No events available for testing');
    }
    console.log(`   ✅ Using event: ${testEvent.title} (ID: ${testEvent.id})`);

    // Step 4: Get venue layouts and available tables
    console.log('4. Getting venue layouts and tables...');
    const venueResponse = await fetch(`${baseUrl}/api/events/${testEvent.id}/venue-layouts`, {
      headers: { 'Cookie': cookies }
    });
    
    const venueLayouts = await venueResponse.json();
    const availableTables = venueLayouts[0]?.tables?.filter(t => t.status === 'available') || [];
    
    if (availableTables.length === 0) {
      throw new Error('No available tables found');
    }
    
    const testTable = availableTables[0];
    console.log(`   ✅ Selected table ${testTable.tableNumber} (capacity: ${testTable.capacity})`);

    // Step 5: Get food options
    console.log('5. Loading food options...');
    const foodResponse = await fetch(`${baseUrl}/api/food-options`, {
      headers: { 'Cookie': cookies }
    });
    
    const foodOptions = await foodResponse.json();
    const salads = foodOptions.filter(f => f.type === 'salad');
    const entrees = foodOptions.filter(f => f.type === 'entree');
    const desserts = foodOptions.filter(f => f.type === 'dessert');
    const wines = foodOptions.filter(f => f.type === 'wine_bottle');
    
    console.log(`   ✅ Found ${foodOptions.length} food options`);

    // Step 6: Create booking with all details
    console.log('6. Creating complete booking...');
    
    const guestNames = ['Test Guest 1', 'Test Guest 2'];
    const foodSelections = [
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
    ];
    
    const wineSelections = [
      { wine: wines[0]?.id },
      { wine: wines[1]?.id || wines[0]?.id }
    ];

    const bookingData = {
      eventId: testEvent.id,
      tableId: testTable.id,
      partySize: 2,
      guestNames,
      foodSelections,
      wineSelections,
      totalAmount: 13000, // $130.00
      customerEmail: 'test.booking@example.com'
    };

    const bookingResponse = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify(bookingData)
    });

    if (!bookingResponse.ok) {
      const error = await bookingResponse.text();
      throw new Error(`Booking failed: ${bookingResponse.status} - ${error}`);
    }

    const booking = await bookingResponse.json();
    console.log(`   ✅ Booking created successfully: ID #${booking.id}`);

    // Step 7: Trigger email confirmation
    console.log('7. Sending confirmation email...');
    const emailResponse = await fetch(`${baseUrl}/api/resend-confirmation`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies 
      },
      body: JSON.stringify({ bookingId: booking.id })
    });

    if (emailResponse.ok) {
      console.log('   ✅ Confirmation email sent successfully');
    } else {
      console.log('   ⚠️ Email sending failed, but booking was created');
    }

    // Step 8: Verify booking was saved properly
    console.log('8. Verifying booking data...');
    const verifyResponse = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      headers: { 'Cookie': cookies }
    });

    if (verifyResponse.ok) {
      const savedBooking = await verifyResponse.json();
      console.log('   ✅ Booking verification successful:');
      console.log(`      - Event: ${savedBooking.event?.title}`);
      console.log(`      - Table: ${savedBooking.table?.tableNumber}`);
      console.log(`      - Guests: ${savedBooking.guestNames?.length || 0}`);
      console.log(`      - Food selections: ${savedBooking.foodSelections?.length || 0}`);
      console.log(`      - Wine selections: ${savedBooking.wineSelections?.length || 0}`);
      console.log(`      - Status: ${savedBooking.status}`);
    }

    console.log('\n🎉 COMPLETE BOOKING FLOW TEST SUCCESSFUL!');
    console.log(`📋 Booking Details:`);
    console.log(`   - Booking ID: #${booking.id}`);
    console.log(`   - Event: ${testEvent.title}`);
    console.log(`   - Table: ${testTable.tableNumber}`);
    console.log(`   - Email: test.booking@example.com`);
    console.log(`   - Total Amount: $130.00`);
    
  } catch (error) {
    console.error('❌ BOOKING FLOW TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCompleteBookingFlow();