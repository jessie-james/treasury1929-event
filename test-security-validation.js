// Test script to verify QR code security validation
const express = require('express');
const session = require('express-session');
const { apiRequest } = require('./test-utils');

// Test the check-in security validation
async function testSecurityValidation() {
  console.log('=== QR CODE SECURITY VALIDATION TEST ===');
  
  // Test 1: Check-in without event ID should fail
  console.log('\nTest 1: Check-in without event ID');
  try {
    const response = await fetch('http://localhost:5000/api/bookings/1/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 400 && result.message.includes('Event ID is required')) {
      console.log('✅ Test 1 PASSED: Check-in without event ID was rejected');
    } else {
      console.log('❌ Test 1 FAILED: Check-in without event ID should have been rejected');
    }
  } catch (error) {
    console.log('❌ Test 1 ERROR:', error.message);
  }
  
  // Test 2: Check-in with wrong event ID should fail
  console.log('\nTest 2: Check-in with wrong event ID');
  try {
    // Booking 1 belongs to event 19, so trying to check it in for event 16 should fail
    const response = await fetch('http://localhost:5000/api/bookings/1/check-in?eventId=16', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 400 && result.message.includes('different event')) {
      console.log('✅ Test 2 PASSED: Check-in with wrong event ID was rejected');
    } else {
      console.log('❌ Test 2 FAILED: Check-in with wrong event ID should have been rejected');
    }
  } catch (error) {
    console.log('❌ Test 2 ERROR:', error.message);
  }
  
  // Test 3: Check-in with correct event ID should succeed (if authenticated)
  console.log('\nTest 3: Check-in with correct event ID');
  try {
    // Booking 1 belongs to event 19, so this should work if authenticated
    const response = await fetch('http://localhost:5000/api/bookings/1/check-in?eventId=19', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 401) {
      console.log('✅ Test 3 EXPECTED: Authentication required (this is correct)');
    } else if (response.status === 200) {
      console.log('✅ Test 3 PASSED: Check-in with correct event ID succeeded');
    } else {
      console.log('❌ Test 3 FAILED: Unexpected response');
    }
  } catch (error) {
    console.log('❌ Test 3 ERROR:', error.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testSecurityValidation().catch(console.error);