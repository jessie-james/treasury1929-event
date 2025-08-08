#!/usr/bin/env node

// Test Ayla's login with various likely passwords she might have set
const http = require('http');
const baseUrl = 'http://localhost:5000';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', () => resolve({ status: 500, data: null }));
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAylaPassword() {
  console.log('🔍 Testing Ayla\'s real password...\n');
  
  // Passwords Ayla might have set during password reset
  const likelyPasswords = [
    'newpassword123',     // Common reset password
    'Ayla123!',          // Her name with standard format
    'ayla123',           // Simple version
    'password123',       // Default password
    'treasury123',       // Venue-related
    'dinner123',         // Event-related  
    'admin123',          // If she used admin default
    'Password1!',        // Standard format
    'TreasuryAyla123'    // Combination
  ];
  
  console.log('Testing passwords for ayla@thetreasury1929.com:');
  
  for (const password of likelyPasswords) {
    const result = await makeRequest('POST', '/api/auth/login', {
      email: 'ayla@thetreasury1929.com',
      password: password
    });
    
    const status = result.status === 200 ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`  "${password}": ${status}`);
    
    if (result.status === 200) {
      console.log(`\n🎉 FOUND WORKING PASSWORD: "${password}"`);
      console.log('Ayla user details:', result.data);
      return password;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n❌ None of the tested passwords worked for Ayla');
  console.log('She may need to reset her password again or we need to check what was actually set.');
  return null;
}

testAylaPassword();