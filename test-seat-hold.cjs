#!/usr/bin/env node
/**
 * Quick test of the seat hold API to debug the 100% failure rate
 */

const https = require('https');

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testSeatHold() {
  console.log('Testing seat hold API...');
  console.log('Target:', BASE_URL);
  
  try {
    // Test 1: Check if the endpoint exists
    console.log('\n1. Testing seat hold creation...');
    const holdResponse = await makeRequest('/api/seat-holds', 'POST', {
      eventId: 15,
      tableId: 1,
      seatNumbers: [1],
      sessionId: 'test-session'
    });
    
    console.log('Hold Response Status:', holdResponse.statusCode);
    console.log('Hold Response Data:', holdResponse.data);
    
    if (holdResponse.statusCode === 200 && holdResponse.data.lockToken) {
      console.log('✅ Seat hold created successfully!');
      
      // Test 2: Try to book with the hold token
      console.log('\n2. Testing booking with hold token...');
      const bookingResponse = await makeRequest('/api/bookings', 'POST', {
        eventId: 15,
        selectedSeats: [1],
        guestInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-0000'
        },
        foodSelections: {
          1: {
            name: 'Test User',
            salad: 1,
            entree: 4,
            dessert: 9
          }
        },
        wineSelections: [],
        holdToken: holdResponse.data.lockToken
      });
      
      console.log('Booking Response Status:', bookingResponse.statusCode);
      console.log('Booking Response Data:', bookingResponse.data);
      
      if (bookingResponse.statusCode === 200) {
        console.log('✅ Booking successful!');
      } else {
        console.log('❌ Booking failed');
      }
    } else {
      console.log('❌ Seat hold failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSeatHold();