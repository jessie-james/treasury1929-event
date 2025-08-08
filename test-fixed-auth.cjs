#!/usr/bin/env node

// Test booking creation with all required fields
const http = require('http');
const baseUrl = 'http://localhost:5000';

async function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookies
      }
    };

    const req = http.request(url, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ 
            status: res.statusCode, 
            data: parsed, 
            cookies: res.headers['set-cookie'] || []
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data: responseData, 
            cookies: res.headers['set-cookie'] || []
          });
        }
      });
    });

    req.on('error', () => resolve({ status: 500, data: null, cookies: [] }));
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFixedBooking() {
  console.log('🎯 Testing COMPLETE booking creation...');
  
  // Step 1: Login
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    email: 'ayla@thetreasury1929.com',
    password: 'ayla123'
  });
  
  if (loginResponse.status !== 200) {
    console.log('❌ Login failed');
    return;
  }
  
  console.log('✅ Ayla authenticated');
  const sessionCookie = loginResponse.cookies.join('; ');
  
  // Step 2: Test main booking endpoint with complete data
  console.log('\n🔄 Testing /api/bookings endpoint...');
  
  const mainBookingData = {
    eventId: 35,
    tableId: 300,
    partySize: 2,
    paymentMethod: "direct",
    guestNames: ["Ayla Arreguin", "Test Guest"],
    foodSelections: [
      { guest: "Ayla Arreguin", selection: "chicken" },
      { guest: "Test Guest", selection: "vegetarian" }
    ]
  };
  
  const mainResponse = await makeRequest('POST', '/api/bookings', mainBookingData, sessionCookie);
  console.log(`Main endpoint: ${mainResponse.status} - ${JSON.stringify(mainResponse.data)}`);
  
  // Step 3: Test alternative endpoint with complete data
  console.log('\n🔄 Testing /api/create-booking endpoint...');
  
  const altBookingData = {
    eventId: 35,
    tableId: 301, // Different table
    partySize: 2,
    stripePaymentId: `test-direct-${Date.now()}`,
    customerEmail: "ayla@thetreasury1929.com",
    guestNames: ["Ayla Arreguin", "Test Guest 2"],
    foodSelections: [
      { guest: "Ayla Arreguin", selection: "fish" },
      { guest: "Test Guest 2", selection: "vegetarian" }
    ]
  };
  
  const altResponse = await makeRequest('POST', '/api/create-booking', altBookingData, sessionCookie);
  console.log(`Alt endpoint: ${altResponse.status} - ${JSON.stringify(altResponse.data)}`);
  
  // Step 4: Check if either booking was successful
  if (mainResponse.status === 200 || altResponse.status === 200) {
    console.log('\n✅ SUCCESS! Booking creation is now working!');
    
    // Verify by checking user bookings
    const bookingsResponse = await makeRequest('GET', '/api/user/bookings', null, sessionCookie);
    if (bookingsResponse.status === 200) {
      console.log(`✅ User now has ${bookingsResponse.data.length} total bookings`);
    }
  } else {
    console.log('\n❌ Both endpoints still failing');
  }
}

testFixedBooking();