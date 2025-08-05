#!/usr/bin/env node

// Direct test script to send confirmation email to Jose
import { EmailService } from './server/email-service.js';

async function testJoseEmail() {
  console.log('🧪 Testing confirmation email for Jose...');
  
  try {
    const emailSent = await EmailService.sendBookingConfirmation({
      booking: {
        id: 16,
        customerEmail: 'jose@sahuaroworks.com',
        guestNames: ['Jose Santos', 'Maria Rodriguez', 'Carlos Thompson'],
        partySize: 3,
        foodSelections: [
          { salad: { id: 39, name: 'Caesar Salad' }, entree: { id: 42, name: 'Chicken Marsala' }, dessert: { id: 46, name: 'Tiramisu' }, guestIndex: 0 },
          { salad: { id: 40, name: 'Mixed Green Salad' }, entree: { id: 44, name: 'Eggplant Lasagna' }, dessert: { id: 45, name: 'Creme Brulee' }, guestIndex: 1 },
          { salad: { id: 41, name: 'Grape & Walnut Salad' }, entree: { id: 43, name: 'Penne & Sausage' }, dessert: { id: 47, name: 'Chocolate Molten Cake' }, guestIndex: 2 }
        ],
        wineSelections: [
          { id: 24, name: 'Sterling Cabernet', quantity: 1 },
          { id: 29, name: 'Twenty Acres Chardonnay', quantity: 1 }
        ]
      },
      event: {
        id: 35,
        title: 'Pianist Sophia Su in Concert with Clarinetist',
        date: '2025-08-14T00:00:00.000Z',
        description: 'Dinner Concert Series Premiere: An Evening of Fine Dining and Live Music\nPresented at The Treasury 1929'
      },
      table: {
        id: 296,
        tableNumber: 11
      },
      venue: {
        name: 'Main Floor'
      }
    });

    if (emailSent) {
      console.log('✅ Confirmation email sent successfully to jose@sahuaroworks.com');
    } else {
      console.log('❌ Failed to send confirmation email (service not initialized or error)');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
}

testJoseEmail();