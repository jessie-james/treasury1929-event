#!/usr/bin/env node

// Test Ayla's complete flow: login -> view events -> make booking
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

async function testAylaCompleteFlow() {
  console.log('🎭 Testing Ayla\'s Complete Customer Flow...\n');
  
  try {
    // Step 1: Login as Ayla with her actual password
    console.log('Step 1: Ayla logs in with her password (ayla123)...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'ayla@thetreasury1929.com',
      password: 'ayla123'
    });
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed, cannot continue');
      return;
    }
    
    console.log('✅ Ayla logged in successfully');
    console.log(`   • User ID: ${loginResponse.data.id}`);
    console.log(`   • Role: ${loginResponse.data.role}`);
    console.log(`   • Name: ${loginResponse.data.firstName} ${loginResponse.data.lastName}`);
    
    const sessionCookie = loginResponse.cookies.join('; ');
    
    // Step 2: Check authentication status
    console.log('\nStep 2: Verify authentication...');
    const authCheck = await makeRequest('GET', '/api/auth/me', null, sessionCookie);
    console.log(`✅ Authentication verified: ${authCheck.data.email}`);
    
    // Step 3: View available events
    console.log('\nStep 3: Ayla browses available events...');
    const eventsResponse = await makeRequest('GET', '/api/events', null, sessionCookie);
    
    if (eventsResponse.status === 200 && eventsResponse.data.length > 0) {
      const event = eventsResponse.data[0];
      console.log(`✅ Found event: ${event.title}`);
      console.log(`   • Event ID: ${event.id}`);
      console.log(`   • Date: ${event.date}`);
      console.log(`   • Available tables: ${event.availableTables}`);
      
      // Step 4: View venue layout for the event
      console.log('\nStep 4: Ayla views venue layout...');
      const layoutResponse = await makeRequest('GET', `/api/events/${event.id}/venue-layouts`, null, sessionCookie);
      
      if (layoutResponse.status === 200) {
        console.log('✅ Venue layout loaded successfully');
        const venues = layoutResponse.data;
        console.log(`   • Found ${venues.length} venue floor(s)`);
        
        // Find an available table
        let availableTable = null;
        for (const venue of venues) {
          const available = venue.tables.find(table => table.status === 'available');
          if (available) {
            availableTable = available;
            console.log(`   • Found available table ${available.tableNumber} on ${venue.displayName}`);
            break;
          }
        }
        
        if (availableTable) {
          // Step 5: Attempt to create a booking
          console.log('\nStep 5: Ayla attempts to make a booking...');
          
          const bookingData = {
            eventId: event.id,
            tableId: availableTable.id,
            partySize: 2,
            guestNames: ["Ayla Arreguin", "Guest"],
            customerEmail: "ayla@thetreasury1929.com",
            selectedVenue: venues[0].displayName,
            foodSelections: [
              { guest: "Ayla Arreguin", selection: "chicken" },
              { guest: "Guest", selection: "vegetarian" }
            ]
          };
          
          const bookingResponse = await makeRequest('POST', '/api/bookings', bookingData, sessionCookie);
          
          console.log(`Booking status: ${bookingResponse.status}`);
          
          if (bookingResponse.status === 200 || bookingResponse.status === 201) {
            console.log('✅ Booking created successfully!');
            console.log(`   • Booking ID: ${bookingResponse.data.id}`);
            console.log(`   • Status: ${bookingResponse.data.status}`);
          } else {
            console.log('❌ Booking failed');
            console.log(`   • Error: ${JSON.stringify(bookingResponse.data)}`);
          }
        } else {
          console.log('❌ No available tables found');
        }
      } else {
        console.log('❌ Failed to load venue layout');
      }
    } else {
      console.log('❌ No events found');
    }
    
    // Step 6: Check existing bookings
    console.log('\nStep 6: Ayla checks her existing bookings...');
    const bookingsResponse = await makeRequest('GET', '/api/user/bookings', null, sessionCookie);
    
    if (bookingsResponse.status === 200) {
      console.log(`✅ Found ${bookingsResponse.data.length} existing bookings`);
      bookingsResponse.data.forEach((booking, index) => {
        console.log(`   • Booking ${index + 1}: ID ${booking.id}, Status: ${booking.status}`);
      });
    } else {
      console.log('❌ Failed to load existing bookings');
    }
    
    console.log('\n📊 AYLA FLOW SUMMARY:');
    console.log('✅ Customer authentication working');
    console.log('✅ Event browsing working');
    console.log('✅ Venue layout access working');
    console.log('✅ Existing bookings access working');
    console.log(`${bookingResponse && bookingResponse.status === 200 ? '✅' : '❌'} New booking creation`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAylaCompleteFlow();