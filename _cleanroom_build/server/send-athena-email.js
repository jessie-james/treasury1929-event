// Send confirmation email to Athena with randomized food selections
import { EmailService } from './email-service.ts';

// Booking data for Athena with randomized food selections
const bookingData = {
  booking: {
    id: 128,
    customerEmail: 'athena@thetreasury1929.com',
    partySize: 3,
    guestNames: ['Athena Treasury', 'Diana Apollo', 'Marcus Zeus'],
    notes: 'Randomized food selections as requested',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    stripePaymentId: 'pi_athena_randomized_' + Date.now(),
    foodSelections: [
      {guestIndex: 0, guestName: 'Athena Treasury', salad: {name: 'Caesar Salad', id: 39}, entree: {name: 'Eggplant Lasagna (pasta free)', id: 44}, dessert: {name: 'Chocolate Molten Cake', id: 48}},
      {guestIndex: 1, guestName: 'Diana Apollo', salad: {name: 'Grape & Walnut Salad', id: 41}, entree: {name: 'Chicken Marsala', id: 42}, dessert: {name: 'Tiramisu', id: 46}},
      {guestIndex: 2, guestName: 'Marcus Zeus', salad: {name: 'Mixed Green Salad', id: 40}, entree: {name: 'Penne & Sausage', id: 43}, dessert: {name: 'Creme Brulee', id: 45}}
    ],
    wineSelections: [
      {name: 'Belle Glos Pinot Noir', id: 27, quantity: 1},
      {name: 'Twenty Acres Chardonnay', id: 29, quantity: 1}
    ]
  },
  event: {
    id: 35,
    title: 'Pianist Sophia Su in Concert with Clarinetist',
    date: new Date('2025-08-14T18:30:00').toISOString()
  },
  table: {
    id: 286,
    tableNumber: 1,
    floor: 'Main Floor'
  },
  venue: {
    id: 4,
    name: 'Main Floor'
  }
};

async function sendAthenaConfirmation() {
  try {
    console.log('🎫 Sending booking confirmation email to athena@thetreasury1929.com...');
    
    await EmailService.initialize();
    const result = await EmailService.sendBookingConfirmation(bookingData);
    
    if (result) {
      console.log('✅ Confirmation email sent successfully!');
      console.log('📧 Email includes:');
      console.log('   - Complete digital ticket with QR code (Booking ID: 128)');
      console.log('   - Event: Pianist Sophia Su Concert on August 14, 2025 at 6:30 PM');
      console.log('   - Table 1 reservation for party of 3 guests');
      console.log('   - Randomized food selections for all guests:');
      console.log('     * Athena Treasury: Caesar Salad → Eggplant Lasagna (pasta free) → Chocolate Molten Cake');
      console.log('     * Diana Apollo: Grape & Walnut Salad → Chicken Marsala → Tiramisu');
      console.log('     * Marcus Zeus: Mixed Green Salad → Penne & Sausage → Creme Brulee');
      console.log('   - Wine selections: Belle Glos Pinot Noir & Twenty Acres Chardonnay');
      console.log('   - Guest arrival time: 5:45 PM (45 minutes before show)');
    } else {
      console.log('⚠️ Email service not initialized - check SENDGRID_API_KEY_NEW');
    }
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
  }
}

sendAthenaConfirmation();