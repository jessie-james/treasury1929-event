// Test the storage function directly to confirm orders are readable
import { PGMemoryStorage } from './server/storage.js';

async function testStorageOrders() {
  try {
    console.log('🧪 Testing storage function directly...\n');
    
    const storage = new PGMemoryStorage();
    const orders = await storage.getEventOrdersWithDetails(35);
    
    console.log(`✓ Found ${orders.length} booking(s) for event 35`);
    
    const booking16 = orders.find(order => order.bookingId === 16);
    if (booking16) {
      console.log('\n🎯 Booking 16 Details:');
      console.log(`✓ Table: ${booking16.tableNumber}`);
      console.log(`✓ Party Size: ${booking16.partySize}`);
      console.log(`✓ Guest Orders: ${booking16.guestOrders.length}`);
      console.log(`✓ Has Orders: ${booking16.hasOrders}`);
      
      console.log('\n📋 Individual Orders:');
      booking16.guestOrders.forEach((guest, index) => {
        console.log(`${index + 1}. ${guest.guestName}:`);
        guest.items.forEach(item => {
          console.log(`   - ${item.name} (${item.type})`);
        });
      });
      
      console.log('\n✅ STORAGE FUNCTION TEST SUCCESSFUL!');
      console.log('Orders are properly accessible through the storage API.');
      
    } else {
      console.log('❌ Booking 16 not found in storage results');
    }
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

testStorageOrders();