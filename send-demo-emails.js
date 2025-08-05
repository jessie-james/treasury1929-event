// Direct script to test email service with proper imports
import { EmailService } from './server/email-service.js';

const targetEmail = 'jose@sahuaroworks.com';

// Mock booking data
const mockBookingData = {
  booking: {
    id: 12345,
    customerEmail: targetEmail,
    partySize: 2,
    guestNames: ["Jose"],
    notes: "Celebrating anniversary - Demo Email",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    stripePaymentId: "pi_demo123456"
  },
  event: {
    id: 35,
    title: "Pianist Sophia Su in Concert with Clarinetist",
    date: new Date('2025-08-14T19:00:00').toISOString()
  },
  table: {
    id: 286,
    tableNumber: 1,
    floor: "main"
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