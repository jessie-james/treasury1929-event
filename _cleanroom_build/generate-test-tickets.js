// Generate 100 test bookings with diverse food orders for kitchen/server PDF testing
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Sample data pools for realistic test generation
const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Jacob', 'Sofia', 'Logan', 'Avery', 'Jackson'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

// Food item IDs from the database
const saladIds = [23, 24, 25]; // Caesar, Mixed Green, Grape & Walnut
const entreeIds = [26, 27, 28, 29, 30]; // Chicken Marsala, Eggplant Lasagna, Penne & Sausage, Branzino, Crab Stuffed Chicken
const dessertIds = [45, 46, 47]; // Creme Brulee, Tiramisu, Chocolate Molten Cake
const wineIds = [31, 32, 33, 34]; // Various wines

const saladNames = ['Caesar Salad', 'Mixed Green Salad', 'Grape & Walnut Salad'];
const entreeNames = ['Chicken Marsala', 'Eggplant Lasagna', 'Penne & Sausage', 'Branzino', 'Crab Stuffed Chicken'];
const dessertNames = ['Creme Brulee', 'Tiramisu', 'Chocolate Molten Cake'];
const wineNames = ['Yealands Sauvignon Blanc', 'Matanza Creek Sauvignon Blanc', 'Sterling Cabernet', 'Twenty Acres Chardonnay'];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${getRandomItem(domains)}`;
}

function generateGuestNames(partySize) {
  const names = {};
  for (let i = 1; i <= partySize; i++) {
    names[i] = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
  }
  return names;
}

function generateFoodSelections(partySize) {
  const selections = [];
  for (let i = 0; i < partySize; i++) {
    selections.push({
      salad: getRandomItem(saladIds),
      entree: getRandomItem(entreeIds),
      dessert: getRandomItem(dessertIds)
    });
  }
  return selections;
}

function generateOrderTracking(guestNames, partySize) {
  const orders = [];
  
  // Generate individual guest orders
  for (let i = 1; i <= partySize; i++) {
    const guestName = guestNames[i];
    const saladChoice = getRandomItem(saladNames);
    const entreeChoice = getRandomItem(entreeNames);
    const dessertChoice = getRandomItem(dessertNames);
    
    orders.push({
      orderId: `ORD-${Date.now()}-${i}`,
      guestName,
      tableNumber: null, // Will be set later
      orderItems: [
        { type: 'salad', itemName: saladChoice, quantity: 1 },
        { type: 'entree', itemName: entreeChoice, quantity: 1 },
        { type: 'dessert', itemName: dessertChoice, quantity: 1 }
      ],
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }
  
  // Add table wine service (random 1-3 wines per table)
  const wineCount = Math.floor(Math.random() * 3) + 1;
  const wineItems = [];
  for (let i = 0; i < wineCount; i++) {
    wineItems.push({
      type: 'wine',
      itemName: getRandomItem(wineNames),
      quantity: 1
    });
  }
  
  if (wineItems.length > 0) {
    orders.push({
      orderId: `ORD-${Date.now()}-WINE`,
      guestName: 'Table Service',
      tableNumber: null,
      orderItems: wineItems,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }
  
  return {
    totalOrders: orders.length,
    status: 'active',
    createdAt: new Date().toISOString(),
    orders
  };
}

async function generateTestTickets() {
  try {
    await client.connect();
    console.log('🎫 Generating 100 test tickets...\n');

    // Generate simple table data for testing
    const availableTables = [];
    for (let i = 1; i <= 32; i++) {
      availableTables.push({
        table_number: i,
        table_id: 296 + i - 1,
        capacity: i % 3 === 0 ? 2 : (i % 3 === 1 ? 4 : 6)
      });
    }
    
    console.log(`✓ Generated ${availableTables.length} tables for testing`);

    let successCount = 0;
    const batchSize = 10;
    
    for (let batch = 0; batch < 10; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const ticketNum = batch * batchSize + i + 1;
        const table = availableTables[Math.floor(Math.random() * availableTables.length)];
        const partySize = Math.min(Math.floor(Math.random() * table.capacity) + 1, table.capacity);
        
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const email = generateRandomEmail(firstName, lastName);
        const guestNames = generateGuestNames(partySize);
        const foodSelections = generateFoodSelections(partySize);
        const orderTracking = generateOrderTracking(guestNames, partySize);
        
        // Update table numbers in order tracking
        orderTracking.orders.forEach(order => {
          order.tableNumber = table.table_number;
        });

        const insertPromise = client.query(`
          INSERT INTO bookings (
            event_id, 
            user_id, 
            customer_email, 
            table_id, 
            party_size, 
            status,
            guest_names,
            food_selections,
            "orderTracking",
            created_at,
            seat_numbers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          35, // event_id
          null, // user_id (guest booking)
          email,
          table.table_id,
          partySize,
          'confirmed',
          JSON.stringify(guestNames),
          JSON.stringify(foodSelections),
          JSON.stringify(orderTracking),
          new Date(),
`{${[1, 2, 3, 4].slice(0, partySize).join(',')}}` // seat_numbers array as PostgreSQL array
        ]);
        
        promises.push(insertPromise);
      }
      
      try {
        await Promise.all(promises);
        successCount += batchSize;
        console.log(`✓ Batch ${batch + 1}/10 completed (${successCount}/100 tickets)`);
      } catch (error) {
        console.error(`❌ Batch ${batch + 1} failed:`, error.message);
      }
    }

    console.log(`\n✅ Successfully generated ${successCount}/100 test tickets!`);
    console.log('🍽️ Each ticket includes:');
    console.log('  • Random guest names and email addresses');
    console.log('  • Complete 3-course meal selections (salad, entree, dessert)');
    console.log('  • Random wine selections per table');
    console.log('  • Proper order tracking for kitchen/server processing');
    console.log('\n📊 Ready for PDF report generation testing!');

    await client.end();
    
  } catch (error) {
    console.error('❌ Test generation failed:', error);
    await client.end();
  }
}

generateTestTickets();