#!/usr/bin/env node

import fetch from 'node-fetch';

async function testEmailSystem() {
  console.log('🧪 Testing email system with test booking...\n');

  try {
    // First, check if we need authentication
    const sessionResponse = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!sessionResponse.ok) {
      console.log('🔐 Need to log in first...');
      
      // Try to log in as jose@sahuaroworks.com
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jose@sahuaroworks.com',
          password: 'password123' // This might need to be adjusted
        }),
        credentials: 'include'
      });
      
      if (!loginResponse.ok) {
        console.log('❌ Login failed. Let\'s try creating a test user first...');
        
        // Create a test user if needed
        const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'jose@sahuaroworks.com',
            password: 'password123',
            firstName: 'Jose',
            lastName: 'Test'
          }),
          credentials: 'include'
        });
        
        console.log('✅ User created, proceeding with email test...');
      } else {
        console.log('✅ Logged in successfully');
      }
    } else {
      console.log('✅ Already authenticated');
    }

    // Create a test booking that will trigger email
    console.log('📧 Creating test booking to trigger email...');
    
    const testBookingData = {
      eventId: 35, // Using the event we can see in the logs
      tableId: 286, // Table 1 from the logs
      selectedSeats: [1, 2], // 2 guests
      guestNames: ['Jose Santos', 'Test Guest'],
      foodSelections: [
        { guest: 'Jose Santos', salad: 'Mixed Green Salad', entree: 'Chicken Marsala', dessert: 'Creme Brulee' },
        { guest: 'Test Guest', salad: 'Caesar Salad', entree: 'Branzino', dessert: 'Chocolate Custard Cake' }
      ],
      paymentMethod: 'direct', // This will bypass Stripe for testing
      userId: 1 // Will be overridden by authenticated user
    };

    const bookingResponse = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBookingData),
      credentials: 'include'
    });

    const result = await bookingResponse.json();
    
    if (bookingResponse.ok) {
      console.log('✅ Test booking created successfully!');
      console.log(`📨 Booking ID: ${result.booking?.id}`);
      console.log('📧 Confirmation email should have been sent to jose@sahuaroworks.com');
      console.log('\n🎯 CHECK YOUR EMAIL INBOX NOW!');
      console.log('📧 Email subject should be: "[TEST] Your Dinner Concert Ticket Confirmation – The Treasury 1929"');
    } else {
      console.log('❌ Booking creation failed:', result);
      console.log('❌ Email test could not be completed');
    }

  } catch (error) {
    console.error('❌ Error during email test:', error);
  }
}

testEmailSystem();