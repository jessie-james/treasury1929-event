#!/usr/bin/env node

// Debug session and deserialization issues
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
            cookies: res.headers['set-cookie'] || [],
            headers: res.headers
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data: responseData, 
            cookies: res.headers['set-cookie'] || [],
            headers: res.headers
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

async function debugSession() {
  console.log('🔍 Debugging Session and User Deserialization...\n');
  
  try {
    // Step 1: Login and capture session
    console.log('Step 1: Login and capture session details...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'ayla@thetreasury1929.com',
      password: 'ayla123'
    });
    
    console.log(`Login status: ${loginResponse.status}`);
    console.log(`Login data:`, loginResponse.data);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed, cannot continue session debugging');
      return;
    }
    
    const sessionCookie = loginResponse.cookies.join('; ');
    console.log(`Session cookie: ${sessionCookie.substring(0, 80)}...`);
    
    // Step 2: Immediate auth check
    console.log('\nStep 2: Immediate authentication check...');
    const immediateCheck = await makeRequest('GET', '/api/auth/me', null, sessionCookie);
    console.log(`Immediate auth check: ${immediateCheck.status}`);
    console.log(`Response:`, immediateCheck.data);
    
    // Step 3: Wait and check again (session persistence)
    console.log('\nStep 3: Wait 2 seconds and check session persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const delayedCheck = await makeRequest('GET', '/api/auth/me', null, sessionCookie);
    console.log(`Delayed auth check: ${delayedCheck.status}`);
    console.log(`Response:`, delayedCheck.data);
    
    // Step 4: Try alternative user endpoint
    console.log('\nStep 4: Try alternative /api/user endpoint...');
    const userCheck = await makeRequest('GET', '/api/user', null, sessionCookie);
    console.log(`User endpoint check: ${userCheck.status}`);
    console.log(`Response:`, userCheck.data);
    
    // Step 5: Try a protected route (user bookings)
    console.log('\nStep 5: Test protected route access...');
    const bookingsCheck = await makeRequest('GET', '/api/user/bookings', null, sessionCookie);
    console.log(`Bookings check: ${bookingsCheck.status}`);
    console.log(`Response:`, bookingsCheck.data);
    
    console.log('\n🔍 SESSION DEBUG ANALYSIS:');
    
    if (loginResponse.status === 200 && immediateCheck.status === 401) {
      console.log('❌ CRITICAL ISSUE: Login succeeds but immediate auth check fails');
      console.log('   This indicates passport session serialization/deserialization failure');
    }
    
    if (immediateCheck.status === 200 && delayedCheck.status === 401) {
      console.log('❌ SESSION PERSISTENCE ISSUE: Auth works immediately but fails after delay');
      console.log('   This indicates session store problems');
    }
    
    if (immediateCheck.status === 401 && delayedCheck.status === 401) {
      console.log('❌ COMPLETE AUTH FAILURE: Session never works');
      console.log('   This indicates middleware order or passport configuration issues');
    }
    
    if (immediateCheck.status === 200 && delayedCheck.status === 200 && bookingsCheck.status === 401) {
      console.log('❌ ROUTE PROTECTION ISSUE: Auth works but protected routes reject authenticated users');
      console.log('   This indicates middleware order in route registration');
    }
    
    if (immediateCheck.status === 200 && delayedCheck.status === 200 && bookingsCheck.status === 200) {
      console.log('✅ AUTHENTICATION FULLY WORKING');
    }
    
  } catch (error) {
    console.error('❌ Session debug failed:', error.message);
  }
}

debugSession();