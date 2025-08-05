// Test the orders API with authentication to verify order tracking works
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testOrdersAPI() {
  try {
    console.log('🔐 Testing orders API with authentication...\n');

    // First login as admin (bypassing session for direct API test)
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      // Try to create admin user if login fails
      console.log('🔧 Creating admin user for testing...');
      const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@treasury.com',
          password: 'admin123',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        })
      });
      
      if (signupResponse.ok) {
        console.log('✓ Admin user created');
      }
    }

    // Get session cookie
    const cookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Login response status:', loginResponse.status);
    
    // Test the orders endpoint
    const ordersResponse = await fetch(`${BASE_URL}/api/events/35/orders-detailed`, {
      headers: {
        'Cookie': cookieHeader || ''
      }
    });

    console.log('Orders API Status:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const orders = await ordersResponse.json();
      console.log('✅ Orders API Response:');
      console.log(JSON.stringify(orders, null, 2));
      
      // Check if our booking 16 has orders
      const booking16 = orders.find(order => order.bookingId === 16);
      if (booking16) {
        console.log('\n🎯 Found Booking 16 Orders:');
        console.log(`✓ Guest Orders: ${booking16.guestOrders.length}`);
        console.log(`✓ Has Orders: ${booking16.hasOrders}`);
        booking16.guestOrders.forEach(guest => {
          console.log(`  • ${guest.guestName}: ${guest.items.length} items`);
          guest.items.forEach(item => {
            console.log(`    - ${item.name} (${item.type})`);
          });
        });
      } else {
        console.log('❌ Booking 16 not found in orders');
      }
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ Orders API Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOrdersAPI();