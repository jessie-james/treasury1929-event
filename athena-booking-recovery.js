#!/usr/bin/env node

/**
 * ATHENA BOOKING RECOVERY SCRIPT
 * 
 * Since Athena's payment pi_3Rso0rEOOtiAoFkb0jKkdke6 was processed but no booking exists,
 * this script helps manually create her booking with the correct details.
 * 
 * Usage: node athena-booking-recovery.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function recoverAthenaBooking() {
  console.log('🏛️  ATHENA BOOKING RECOVERY - The Treasury 1929');
  console.log('='.repeat(50));
  console.log('Payment ID: pi_3Rso0rEOOtiAoFkb0jKkdke6');
  console.log('Customer: Athena (Venue Manager)');
  console.log();

  try {
    // Collect booking details
    const email = await question('Athena\'s email (athena@thetreasury1929.com or athenapadilla@hotmail.com): ');
    const partySize = await question('Party size (number of guests): ');
    const tablePreference = await question('Preferred table number or area: ');
    
    console.log('\n📋 FOOD SELECTIONS');
    console.log('Available options:');
    console.log('Salads: 40=Mixed Green, 41=Caesar, 42=Grape Walnut');
    console.log('Entrees: 43=Chicken Marsala, 44=Branzino, 45=Eggplant, 46=Crab Stuffed Chicken');
    console.log('Desserts: 47=Creme Brulee, 48=Chocolate Custard, 49=Bread Pudding, 50=Tiramisu');
    
    const foodSelections = [];
    for (let i = 1; i <= parseInt(partySize); i++) {
      console.log(`\nGuest ${i} selections:`);
      const salad = await question(`  Salad (40-42): `);
      const entree = await question(`  Entree (43-46): `);
      const dessert = await question(`  Dessert (47-50): `);
      
      foodSelections.push({
        salad: parseInt(salad),
        entree: parseInt(entree),
        dessert: parseInt(dessert)
      });
    }

    console.log('\n🍷 WINE SELECTIONS');
    console.log('Available wines: 51=Sterling Cabernet, 52=Twenty Acres Chardonnay, 53=House Red, 54=House White');
    const wineInput = await question('Wine selections (comma separated, e.g. 51,52): ');
    const wineSelections = wineInput.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));

    const guestNames = [];
    for (let i = 1; i <= parseInt(partySize); i++) {
      const name = await question(`Guest ${i} name: `);
      guestNames.push(name);
    }

    // Create booking payload
    const bookingData = {
      eventId: 35,
      customerEmail: email.trim(),
      partySize: parseInt(partySize),
      guestNames,
      foodSelections,
      wineSelections,
      stripePaymentId: 'pi_3Rso0rEOOtiAoFkb0jKkdke6',
      notes: 'RECOVERED: Athena (venue manager) - payment processed but booking was missing',
      tablePreference: tablePreference.trim()
    };

    console.log('\n📋 BOOKING SUMMARY');
    console.log('='.repeat(30));
    console.log(`Email: ${bookingData.customerEmail}`);
    console.log(`Party Size: ${bookingData.partySize}`);
    console.log(`Guests: ${bookingData.guestNames.join(', ')}`);
    console.log(`Food Selections: ${JSON.stringify(bookingData.foodSelections, null, 2)}`);
    console.log(`Wine Selections: ${bookingData.wineSelections}`);
    console.log(`Payment ID: ${bookingData.stripePaymentId}`);
    console.log(`Table Preference: ${bookingData.tablePreference}`);

    const confirm = await question('\n✅ Create this booking? (y/n): ');
    
    if (confirm.toLowerCase() === 'y') {
      // Make API request to create booking
      const fetch = (await import('node-fetch')).default;
      
      try {
        const response = await fetch('http://localhost:5000/api/admin/recover-booking-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log('\n🎉 SUCCESS! Athena\'s booking has been recovered.');
          console.log(`Booking ID: ${result.bookingId}`);
          console.log(`Table: ${result.tableNumber}`);
          console.log(`Confirmation email sent to: ${bookingData.customerEmail}`);
        } else {
          console.error('\n❌ Error creating booking:', result.message);
          console.log('\n📋 MANUAL BOOKING DATA (save this):');
          console.log(JSON.stringify(bookingData, null, 2));
        }
      } catch (error) {
        console.error('\n❌ Network error:', error.message);
        console.log('\n📋 MANUAL BOOKING DATA (save this):');
        console.log(JSON.stringify(bookingData, null, 2));
      }
    } else {
      console.log('\n📋 MANUAL BOOKING DATA (save this):');
      console.log(JSON.stringify(bookingData, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  recoverAthenaBooking();
}

module.exports = { recoverAthenaBooking };