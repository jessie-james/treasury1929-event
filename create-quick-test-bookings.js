// Create 10 test bookings quickly to demonstrate PDF functionality
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createQuickTestBookings() {
  try {
    await client.connect();
    console.log('🎫 Creating 10 quick test bookings for PDF demo...\n');

    // Create test users first
    const testUsers = [];
    for (let i = 1; i <= 10; i++) {
      const userData = {
        email: `testuser${i}@example.com`,
        firstName: `Test${i}`,
        lastName: `User`,
        role: 'customer'
      };
      
      const userResult = await client.query(`
        INSERT INTO users (email, first_name, last_name, role, created_at, password) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET 
          first_name = EXCLUDED.first_name
        RETURNING id
      `, [userData.email, userData.firstName, userData.lastName, userData.role, new Date(), 'temp_password']);
      
      testUsers.push(userResult.rows[0].id);
    }

    // Sample food data
    const saladNames = ['Caesar Salad', 'Mixed Green Salad', 'Grape & Walnut Salad'];
    const entreeNames = ['Chicken Marsala', 'Eggplant Lasagna', 'Penne & Sausage', 'Branzino', 'Crab Stuffed Chicken'];
    const dessertNames = ['Creme Brulee', 'Tiramisu', 'Chocolate Molten Cake'];
    const wineNames = ['Sterling Cabernet', 'Twenty Acres Chardonnay', 'Yealands Sauvignon Blanc'];

    // Create bookings
    for (let i = 0; i < 10; i++) {
      const tableNumber = i + 1;
      const partySize = Math.floor(Math.random() * 4) + 1; // 1-4 people
      const userId = testUsers[i];

      // Generate order tracking
      const orders = [];
      
      // Individual guest orders
      for (let g = 1; g <= partySize; g++) {
        orders.push({
          orderId: `ORD-${Date.now()}-${i}-${g}`,
          guestName: `Guest ${g}`,
          tableNumber: tableNumber,
          orderItems: [
            { type: 'salad', itemName: saladNames[Math.floor(Math.random() * saladNames.length)], quantity: 1 },
            { type: 'entree', itemName: entreeNames[Math.floor(Math.random() * entreeNames.length)], quantity: 1 },
            { type: 'dessert', itemName: dessertNames[Math.floor(Math.random() * dessertNames.length)], quantity: 1 }
          ],
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // Table wine service
      orders.push({
        orderId: `ORD-${Date.now()}-${i}-WINE`,
        guestName: 'Table Service',
        tableNumber: tableNumber,
        orderItems: [
          { type: 'wine', itemName: wineNames[Math.floor(Math.random() * wineNames.length)], quantity: 1 }
        ],
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      const orderTracking = {
        totalOrders: orders.length,
        status: 'active',
        createdAt: new Date().toISOString(),
        orders
      };

      await client.query(`
        INSERT INTO bookings (
          event_id, 
          user_id, 
          customer_email, 
          table_id, 
          party_size, 
          status,
          "orderTracking",
          created_at,
          seat_numbers,
          food_selections,
          wine_selections,
          stripe_payment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        35, // event_id
        userId,
        `testuser${i + 1}@example.com`,
        300 + i, // table_id - use different range to avoid conflicts
        partySize,
        'confirmed',
        JSON.stringify(orderTracking),
        new Date(),
        `{${[1, 2, 3, 4].slice(0, partySize).join(',')}}`,
        JSON.stringify([]), // food_selections
        JSON.stringify([]), // wine_selections
        `test_payment_${Date.now()}_${i}` // stripe_payment_id
      ]);

      console.log(`✓ Created booking ${i + 1}: Table ${tableNumber}, ${partySize} guests, ${orders.length} orders`);
    }

    console.log('\n✅ Successfully created 10 test bookings!');
    console.log('🍽️ Each booking includes:');
    console.log('  • Individual guest food orders (salad, entree, dessert)');
    console.log('  • Table wine service');
    console.log('  • Complete order tracking data');
    console.log('\n📊 Ready to test PDF generation!');

    await client.end();
    
  } catch (error) {
    console.error('❌ Test creation failed:', error);
    await client.end();
  }
}

createQuickTestBookings();