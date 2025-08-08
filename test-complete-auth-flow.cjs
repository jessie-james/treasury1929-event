#!/usr/bin/env node

// Complete authentication flow test for Ayla's scenario
const http = require('http');
const baseUrl = 'http://localhost:5000';

async function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
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

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testCompleteAuthFlow() {
  console.log('🧪 Testing Complete Authentication Flow (Ayla\'s Scenario)...\n');
  
  try {
    // 1. Test user registration (if account doesn't exist)
    console.log('1. Testing user registration...');
    const registerResponse = await makeRequest('POST', '/api/auth/register', {
      email: 'test.ayla@thetreasury1929.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    });
    
    console.log(`   ✓ Registration: ${registerResponse.status === 201 ? 'SUCCESS' : registerResponse.status === 409 ? 'USER EXISTS' : 'FAILED'}`);
    if (registerResponse.status !== 201 && registerResponse.status !== 409) {
      console.log(`   ⚠️  Registration error: ${registerResponse.data.message || 'Unknown'}`);
    }
    
    // 2. Test login with correct password
    console.log('\n2. Testing login with correct password...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test.ayla@thetreasury1929.com',
      password: 'TestPassword123!'
    });
    
    console.log(`   ✓ Login: ${loginResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    let sessionCookie = '';
    if (loginResponse.status === 200 && loginResponse.cookies.length > 0) {
      sessionCookie = loginResponse.cookies.join('; ');
      console.log(`   ✓ Session cookie received: ${sessionCookie.substring(0, 50)}...`);
    } else {
      console.log(`   ⚠️  Login error: ${loginResponse.data.message || 'Unknown'}`);
    }
    
    // 3. Test login with wrong password (Ayla's scenario)
    console.log('\n3. Testing login with wrong password (simulating Ayla\'s issue)...');
    const wrongLoginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test.ayla@thetreasury1929.com',
      password: 'WrongPassword123!'
    });
    
    console.log(`   ✓ Wrong password login: ${wrongLoginResponse.status === 401 ? 'CORRECTLY REJECTED' : 'UNEXPECTED RESULT'}`);
    if (wrongLoginResponse.status !== 401) {
      console.log(`   ⚠️  Unexpected response: ${wrongLoginResponse.data.message || 'Unknown'}`);
    }
    
    // 4. Test password reset request
    console.log('\n4. Testing password reset request...');
    const resetRequestResponse = await makeRequest('POST', '/api/auth/forgot-password', {
      email: 'test.ayla@thetreasury1929.com'
    });
    
    console.log(`   ✓ Password reset request: ${resetRequestResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    if (resetRequestResponse.status !== 200) {
      console.log(`   ⚠️  Reset request error: ${resetRequestResponse.data.message || 'Unknown'}`);
    }
    
    // 5. Test session validation while logged in
    console.log('\n5. Testing session validation...');
    const sessionResponse = await makeRequest('GET', '/api/auth/me', null, sessionCookie);
    
    console.log(`   ✓ Session validation: ${sessionResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    if (sessionResponse.status === 200) {
      console.log(`   ✓ User authenticated as: ${sessionResponse.data.email}`);
      console.log(`   ✓ User ID: ${sessionResponse.data.id}`);
    } else {
      console.log(`   ⚠️  Session error: ${sessionResponse.data.message || 'Unknown'}`);
    }
    
    // 6. Test booking creation while authenticated (the part where Ayla got NaN error)
    console.log('\n6. Testing booking creation while authenticated...');
    const bookingResponse = await makeRequest('POST', '/api/bookings', {
      eventId: 35,
      tableId: 286, // Table 1 on Main Floor
      partySize: 1,
      customerEmail: 'test.ayla@thetreasury1929.com',
      guestNames: ['Test Ayla User'],
      foodSelections: [{ salad: 1, entree: 5, dessert: 9 }],
      wineSelections: [{ wine: 11 }],
      notes: 'Auth flow test booking'
    }, sessionCookie);
    
    console.log(`   ✓ Authenticated booking: ${bookingResponse.status === 201 ? 'SUCCESS' : 'FAILED'}`);
    if (bookingResponse.status === 201) {
      console.log(`   ✓ Booking ID: ${bookingResponse.data.id}`);
      console.log(`   ✓ Email should be sent to: ${bookingResponse.data.customerEmail}`);
    } else {
      console.log(`   ⚠️  Booking error: ${bookingResponse.data.message || 'Unknown'}`);
    }
    
    // 7. Test accessing user's bookings
    console.log('\n7. Testing user bookings access...');
    const userBookingsResponse = await makeRequest('GET', '/api/user/bookings', null, sessionCookie);
    
    console.log(`   ✓ User bookings: ${userBookingsResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    if (userBookingsResponse.status === 200) {
      console.log(`   ✓ Found ${userBookingsResponse.data.length} bookings for user`);
    } else {
      console.log(`   ⚠️  User bookings error: ${userBookingsResponse.data.message || 'Unknown'}`);
    }
    
    // 8. Test logout
    console.log('\n8. Testing logout...');
    const logoutResponse = await makeRequest('POST', '/api/auth/logout', null, sessionCookie);
    
    console.log(`   ✓ Logout: ${logoutResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    
    // 9. Test accessing protected resource after logout
    console.log('\n9. Testing access after logout...');
    const postLogoutResponse = await makeRequest('GET', '/api/user/bookings', null, sessionCookie);
    
    console.log(`   ✓ Post-logout access: ${postLogoutResponse.status === 401 ? 'CORRECTLY BLOCKED' : 'SECURITY ISSUE'}`);
    
    console.log('\n📊 AUTHENTICATION FLOW ANALYSIS:');
    
    const issues = [];
    if (registerResponse.status !== 201 && registerResponse.status !== 409) issues.push('Registration problems');
    if (loginResponse.status !== 200) issues.push('Login system failures');
    if (wrongLoginResponse.status !== 401) issues.push('Password validation issues');
    if (resetRequestResponse.status !== 200) issues.push('Password reset problems');
    if (sessionResponse.status !== 200) issues.push('Session management issues');
    if (bookingResponse.status !== 201) issues.push('Authenticated booking failures');
    if (userBookingsResponse.status !== 200) issues.push('User data access problems');
    if (logoutResponse.status !== 200) issues.push('Logout system issues');
    if (postLogoutResponse.status !== 401) issues.push('Security vulnerabilities');
    
    if (issues.length === 0) {
      console.log('✅ ALL AUTHENTICATION SYSTEMS WORKING CORRECTLY');
      console.log('\n🎯 CONCLUSION: Auth flow is functional - Ayla\'s issue was likely:');
      console.log('   • NaN display bug (now fixed)');
      console.log('   • Email service configuration (now fixed)');
      console.log('   • Possible browser session issues');
    } else {
      console.log('❌ AUTHENTICATION ISSUES FOUND:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Auth flow test failed:', error.message);
  }
}

testCompleteAuthFlow();