// Direct script to test email service with proper imports
import { EmailService } from './server/email-service.js';

const targetEmail = 'jose@sahuaroworks.com';

// REAL booking data from our test booking ID 16
const mockBookingData = {
  booking: {
    id: 16,
    customerEmail: targetEmail,
    partySize: 3,
    guestNames: ["Jose Santos", "Maria Rodriguez", "Carlos Thompson"],
    notes: "Anniversary celebration - randomized test booking",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    stripePaymentId: "pi_test_" + Math.random().toString(36).substring(2, 26),
    foodSelections: [
      {"guestIndex": 0, "salad": {"name": "Caesar Salad", "id": 39}, "entree": {"name": "Chicken Marsala", "id": 42}, "dessert": {"name": "Tiramisu", "id": 46}},
      {"guestIndex": 1, "salad": {"name": "Mixed Green Salad", "id": 40}, "entree": {"name": "Eggplant Lasagna", "id": 44}, "dessert": {"name": "Creme Brulee", "id": 45}},
      {"guestIndex": 2, "salad": {"name": "Grape & Walnut Salad", "id": 41}, "entree": {"name": "Penne & Sausage", "id": 43}, "dessert": {"name": "Chocolate Molten Cake", "id": 47}}
    ],
    wineSelections: [
      {"name": "Sterling Cabernet", "id": 24, "quantity": 1}, 
      {"name": "Twenty Acres Chardonnay", "id": 29, "quantity": 1}
    ]
  },
  event: {
    id: 35,
    title: "Pianist Sophia Su in Concert with Clarinetist",
    date: new Date('2025-08-14T19:00:00').toISOString()
  },
  table: {
    id: 296,
    tableNumber: 11,
    floor: "Main Floor"
  },
  venue: {
    id: 4,
    name: "Main Floor"
  }
};

async function sendAllDemoEmails() {
  console.log(`🚀 Sending all 5 email templates to ${targetEmail}...\n`);

  try {
    // 1. Booking Confirmation
    console.log('1. Sending Booking Confirmation...');
    await EmailService.sendBookingConfirmation(mockBookingData);
    console.log('✅ Booking Confirmation sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // 2. Customer Cancellation
    console.log('2. Sending Customer Cancellation...');
    await EmailService.sendCancellationEmail(mockBookingData, 8500);
    console.log('✅ Customer Cancellation sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // 3. Venue Cancellation
    console.log('3. Sending Venue Cancellation...');
    await EmailService.sendVenueCancellationEmail(mockBookingData, 8500);
    console.log('✅ Venue Cancellation sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // 4. Event Reminder
    console.log('4. Sending Event Reminder...');
    await EmailService.sendEventReminder(mockBookingData);
    console.log('✅ Event Reminder sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // 5. Password Reset/Welcome
    console.log('5. Sending Password Reset/Welcome...');
    await EmailService.sendPasswordResetEmail(targetEmail, "demo_token_12345");
    console.log('✅ Password Reset/Welcome sent\n');
    
    console.log('🎉 All 5 email templates sent successfully!');
    console.log('\nCheck jose@sahuaroworks.com for:');
    console.log('• Booking Confirmation Email');
    console.log('• Customer Cancellation & Refund Email');
    console.log('• Venue Cancellation & Refund Email');
    console.log('• Event Reminder Email');
    console.log('• Password Reset/Welcome Email');
    console.log('\nAll sent from: The Treasury 1929 <info@thetreasury1929.com>');
    
  } catch (error) {
    console.error('❌ Error sending demo emails:', error);
  }
}

// Run the demo
sendAllDemoEmails();