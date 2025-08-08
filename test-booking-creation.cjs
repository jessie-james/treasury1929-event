#!/usr/bin/env node

// Test booking creation with proper authentication
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

async function testBookingCreation() {
  console.log('Testing booking creation with authenticated session...');
  
  // Step 1: Login as Ayla
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    email: 'ayla@thetreasury1929.com',
    password: 'ayla123'
  });
  
  if (loginResponse.status !== 200) {
    console.log('Login failed, cannot test booking');
    return;
  }
  
  console.log('✓ Ayla authenticated successfully');
  const sessionCookie = loginResponse.cookies.join('; ');
  
  // Step 2: Get venue layout to find available table
  const layoutResponse = await makeRequest('GET', '/api/events/35/venue-layouts', null, sessionCookie);
  
  if (layoutResponse.status !== 200) {
    console.log('Failed to get venue layout');
    return;
  }
  
  const venues = layoutResponse.data;
  let availableTable = null;
  
  for (const venue of venues) {
    const available = venue.tables.find(table => table.status === 'available');
    if (available) {
      availableTable = available;
      console.log(`✓ Found available table ${available.tableNumber} (ID: ${available.id})`);
      break;
    }
  }
  
  if (!availableTable) {
    console.log('No available tables found');
    return;
  }
  
  // Step 3: Attempt booking creation with complete data
  console.log('Testing booking creation...');
  
  const bookingData = {
    eventId: 35,
    tableId: availableTable.id,
    partySize: 2,
    guestNames: ["Ayla Arreguin", "Test Guest"],
    customerEmail: "ayla@thetreasury1929.com",
    selectedVenue: venues[0].displayName,
    foodSelections: [
      { guest: "Ayla Arreguin", selection: "chicken" },
      { guest: "Test Guest", selection: "vegetarian" }
    ],
    notes: "Test booking via API"
  };
  
  console.log('Booking data:', JSON.stringify(bookingData, null, 2));
  
  const bookingResponse = await makeRequest('POST', '/api/bookings', bookingData, sessionCookie);
  
  console.log(`\nBooking response status: ${bookingResponse.status}`);
  console.log('Response data:', JSON.stringify(bookingResponse.data, null, 2));
  
  if (bookingResponse.status === 200 || bookingResponse.status === 201) {
    console.log('✓ Booking creation successful!');
  } else {
    console.log('✗ Booking creation failed');
    
    // Try alternative booking endpoint
    console.log('\nTrying alternative booking endpoint...');
    const altResponse = await makeRequest('POST', '/api/create-booking', bookingData, sessionCookie);
    console.log(`Alternative endpoint status: ${altResponse.status}`);
    console.log('Alternative response:', JSON.stringify(altResponse.data, null, 2));
  }
}

testBookingCreation();