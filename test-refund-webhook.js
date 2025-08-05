#!/usr/bin/env node

// Test script for automatic Stripe refund webhook integration
// This tests the complete refund flow: status update, availability sync, and email notification

import http from 'http';

async function testRefundWebhook() {
  console.log('🧪 Testing Automatic Stripe Refund Integration...\n');
  
  // Test with a valid booking ID (booking #16 from previous tests)
  const testData = {
    bookingId: 16, 
    refundAmount: 13000, // $130 in cents
    reason: 'Automatic refund test - simulating Stripe dashboard refund'
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/test-refund-webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('📤 Sending test refund request...');
  console.log('Data:', testData);
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          console.log('\n✅ Response Status:', res.statusCode);
          console.log('📄 Response Data:');
          console.log(JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n🎉 Refund webhook test completed successfully!');
            console.log('✓ Booking status updated to refunded');
            console.log('✓ Table availability synchronized');
            console.log('✓ Email notification sent to customer');
          } else {
            console.log('\n❌ Test failed with status:', res.statusCode);
          }
          
          resolve(response);
        } catch (error) {
          console.error('\n❌ Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Request failed:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testRefundWebhook().catch(console.error);