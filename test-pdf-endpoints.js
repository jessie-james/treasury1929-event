#!/usr/bin/env node

// Quick test script to verify PDF endpoints are working
import fetch from 'node-fetch';

async function testPDFEndpoints() {
  console.log('🧪 Testing PDF endpoint functionality...\n');
  
  try {
    // Test orders-detailed endpoint
    console.log('📊 Testing orders-detailed endpoint...');
    const ordersResponse = await fetch('http://localhost:5000/api/events/35/orders-detailed');
    console.log(`Status: ${ordersResponse.status}`);
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log(`✅ Orders data retrieved: ${ordersData.length} booking records`);
      if (ordersData.length > 0) {
        console.log(`   First booking: Table ${ordersData[0].tableNumber}, ${ordersData[0].guestOrders?.length || 0} guest orders`);
      }
    } else {
      const errorText = await ordersResponse.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
    console.log('\n🍽️ Testing kitchen report endpoint...');
    const kitchenResponse = await fetch('http://localhost:5000/api/events/35/kitchen-report');
    console.log(`Status: ${kitchenResponse.status}`);
    console.log(`Content-Type: ${kitchenResponse.headers.get('content-type')}`);
    
    if (kitchenResponse.status === 200) {
      console.log('✅ Kitchen PDF report generated successfully');
    } else {
      const errorText = await kitchenResponse.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
    console.log('\n📋 Testing server report endpoint...');
    const serverResponse = await fetch('http://localhost:5000/api/events/35/server-report');
    console.log(`Status: ${serverResponse.status}`);
    console.log(`Content-Type: ${serverResponse.headers.get('content-type')}`);
    
    if (serverResponse.status === 200) {
      console.log('✅ Server PDF report generated successfully');
    } else {
      const errorText = await serverResponse.text();
      console.log(`❌ Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPDFEndpoints();