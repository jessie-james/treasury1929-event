// Send Athena's exact confirmation email to jose@sahuaroworks.com for review
import { EmailService } from './email-service.ts';

// Athena's actual booking data from database
const athenaBookingData = {
  booking: {
    id: 139,
    customerEmail: 'athena@thetreasury1929.com', // Her original email in booking data
    partySize: 2,
    guestNames: ['Athena Aden', 'Ayla'],
    notes: '',
    status: 'confirmed',
    createdAt: '2025-08-07T00:13:04.576865Z',
    stripePaymentId: 'pi_3RtHS5EOOtiAoFkb1cx9v8e1',
    foodSelections: [
      {guestIndex: 0, guestName: 'Athena Aden', salad: {name: 'Caesar Salad', id: 39}, entree: {name: 'Penne & Sausage', id: 43}, dessert: {name: 'Tiramisu', id: 46}},
      {guestIndex: 1, guestName: 'Ayla', salad: {name: 'Grape & Walnut Salad', id: 41}, entree: {name: 'Penne & Sausage', id: 43}, dessert: {name: 'Tiramisu', id: 46}}
    ],
    wineSelections: [] // No wine selections for this booking
  },
  event: {
    id: 35,
    title: 'Pianist Sophia Su in Concert with Clarinetist',
    date: '2025-08-14T18:30:00.000Z' // 6:30 PM - correct time
  },
  table: {
    id: 321,
    tableNumber: 4,
    floor: 'Main Floor'
  },
  venue: {
    id: 5,
    name: 'Main Floor'
  }
};

async function sendAthenaEmailToJose() {
  try {
    console.log('🎫 Sending Athena\'s confirmation email to jose@sahuaroworks.com for review...');
    
    await EmailService.initialize();
    
    // Create a copy of the booking data but override the email to send to Jose
    const emailDataForJose = {
      ...athenaBookingData,
      booking: {
        ...athenaBookingData.booking,
        customerEmail: 'jose@sahuaroworks.com' // Send to Jose instead
      }
    };
    
    const result = await EmailService.sendBookingConfirmation(emailDataForJose);
    
    if (result) {
      console.log('✅ Athena\'s confirmation email sent to jose@sahuaroworks.com!');
      console.log('📧 Email contains Athena\'s actual booking details:');
      console.log('   - Booking ID: 139');
      console.log('   - Event: Pianist Sophia Su Concert on Thursday, August 14, 2025');  
      console.log('   - Time: Guest Arrival 5:45 PM, show starts 6:30 PM');
      console.log('   - Table 4 reservation for party of 2 guests');
      console.log('   - Guest names: Athena Aden, Ayla');
      console.log('   - Food selections:');
      console.log('     * Athena Aden: Caesar Salad → Penne & Sausage → Tiramisu');
      console.log('     * Ayla: Grape & Walnut Salad → Penne & Sausage → Tiramisu');
      console.log('   - No wine selections (customer did not order wine)');
      console.log('   - QR Code for check-in included');
      console.log('');
      console.log('🎯 This is exactly what athena@thetreasury1929.com should have received!');
    } else {
      console.log('⚠️ Email service not initialized - check SENDGRID_API_KEY_NEW');
    }
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error.message);
  }
}

sendAthenaEmailToJose();