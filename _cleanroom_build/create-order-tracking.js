// Create proper order tracking for the test booking
import pkg from 'pg';
const { Client } = pkg;

// Connect to database
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createOrderTracking() {
  try {
    await client.connect();
    console.log('🔄 Processing food selections into order tracking...\n');

    // Get the booking with food selections
    const bookingResult = await client.query(`
      SELECT id, food_selections, wine_selections, guest_names, party_size, table_id, event_id
      FROM bookings 
      WHERE id = 16
    `);

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookingResult.rows[0];
    console.log('✓ Found booking:', booking.id);

    // Process the food selections into order items
    const foodSelections = booking.food_selections; // Already parsed by pg
    const wineSelections = booking.wine_selections; // Already parsed by pg
    const guestNames = booking.guest_names; // Already parsed by pg

    // Create individual order tracking entries for each guest
    const orderTrackingEntries = [];

    // Process food orders for each guest
    foodSelections.forEach((selection, index) => {
      const guestName = guestNames[index] || `Guest ${index + 1}`;
      
      const orderItems = [];
      
      // Add salad to order
      if (selection.salad) {
        orderItems.push({
          itemId: selection.salad.id,
          itemName: selection.salad.name,
          quantity: 1,
          type: 'salad',
          notes: ''
        });
      }
      
      // Add entree to order
      if (selection.entree) {
        orderItems.push({
          itemId: selection.entree.id,
          itemName: selection.entree.name,
          quantity: 1,
          type: 'entree',
          notes: ''
        });
      }
      
      // Add dessert to order
      if (selection.dessert) {
        orderItems.push({
          itemId: selection.dessert.id,
          itemName: selection.dessert.name,
          quantity: 1,
          type: 'dessert',
          notes: ''
        });
      }

      orderTrackingEntries.push({
        id: Date.now() + index,
        bookingId: booking.id,
        tableId: booking.table_id,
        guestName: guestName,
        orderItems: orderItems,
        eventId: booking.event_id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Add wine orders (shared for the table)
    if (wineSelections && wineSelections.length > 0) {
      const wineOrderItems = wineSelections.map(wine => ({
        itemId: wine.id,
        itemName: wine.name,
        quantity: wine.quantity,
        type: 'wine',
        notes: 'Table service'
      }));

      orderTrackingEntries.push({
        id: Date.now() + 1000,
        bookingId: booking.id,
        tableId: booking.table_id,
        guestName: 'Table Service',
        orderItems: wineOrderItems,
        eventId: booking.event_id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Combine all order tracking into a single JSON structure for the booking
    const combinedOrderTracking = {
      orders: orderTrackingEntries,
      totalOrders: orderTrackingEntries.length,
      createdAt: new Date(),
      status: 'pending'
    };

    // Update the booking with order tracking (using correct column name)
    await client.query(`
      UPDATE bookings 
      SET "orderTracking" = $1
      WHERE id = 16
    `, [JSON.stringify(combinedOrderTracking)]);

    console.log('✅ ORDER TRACKING CREATED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`✓ Total Orders: ${orderTrackingEntries.length}`);
    console.log('✓ Food Orders by Guest:');
    
    orderTrackingEntries.forEach((order, index) => {
      if (order.guestName !== 'Table Service') {
        console.log(`  • ${order.guestName}:`);
        order.orderItems.forEach(item => {
          console.log(`    - ${item.itemName} (${item.type})`);
        });
      }
    });

    if (wineSelections.length > 0) {
      console.log('✓ Wine Orders (Table Service):');
      wineSelections.forEach(wine => {
        console.log(`  • ${wine.name} (${wine.quantity} bottle${wine.quantity > 1 ? 's' : ''})`);
      });
    }

    console.log('\n🍽️ Kitchen orders are now ready for processing!');
    console.log('📊 Orders can be viewed in the admin kitchen dashboard.');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error creating order tracking:', error);
    await client.end();
  }
}

console.log('🚀 Creating kitchen orders from food selections...\n');
createOrderTracking();