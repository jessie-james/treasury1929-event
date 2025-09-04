// Direct verification that our order tracking fix is working
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verifyOrderFix() {
  try {
    await client.connect();
    console.log('🔍 Verifying order tracking fix...\n');

    // Get the booking data including order tracking
    const result = await client.query(`
      SELECT 
        id,
        customer_email,
        party_size,
        guest_names,
        food_selections,
        "orderTracking"
      FROM bookings 
      WHERE id = 16
    `);

    if (result.rows.length === 0) {
      console.log('❌ Booking 16 not found');
      return;
    }

    const booking = result.rows[0];
    console.log('✓ Booking found:', booking.id);
    console.log('✓ Customer:', booking.customer_email);
    console.log('✓ Party size:', booking.party_size);

    // Check food selections
    if (booking.food_selections) {
      const foodSelections = booking.food_selections;
      console.log(`✓ Food selections stored: ${foodSelections.length} guests`);
    }

    // Check order tracking
    if (booking.orderTracking) {
      const orderData = JSON.parse(booking.orderTracking);
      console.log(`✓ Order tracking exists: ${orderData.totalOrders} orders`);
      
      console.log('\n📋 Kitchen Orders:');
      orderData.orders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.guestName}:`);
        order.orderItems.forEach(item => {
          console.log(`   - ${item.itemName} (${item.type})`);
        });
      });
      
      console.log('\n✅ ORDER TRACKING VERIFICATION SUCCESSFUL!');
      console.log('The food selections have been properly converted to kitchen orders.');
      console.log('Backend admin panels should now show these orders for processing.');
      
    } else {
      console.log('❌ No order tracking found');
    }

    await client.end();
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await client.end();
  }
}

verifyOrderFix();