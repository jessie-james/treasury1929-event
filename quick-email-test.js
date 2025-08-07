#!/usr/bin/env node
// Quick test to verify SendGrid is actually working
import { EmailService } from './server/email-service.js';

console.log('\n🧪 Quick SendGrid Test');
console.log('Testing if SendGrid can actually send emails...\n');

async function testSendGridDirectly() {
  try {
    // Initialize email service
    await EmailService.initialize();
    
    // Create minimal test email data
    const testEmailData = {
      booking: {
        id: 'TEST-123',
        customerEmail: 'jose@sahuaroworks.com', // Your email for testing
        partySize: 2,
        status: 'confirmed',
        createdAt: new Date(),
        guestNames: ['Test Guest 1', 'Test Guest 2']
      },
      event: {
        id: '35',
        title: 'SendGrid Test Event',
        date: new Date('2025-08-14T18:30:00.000Z'),
        description: 'Testing SendGrid configuration'
      },
      table: {
        id: '1',
        tableNumber: 5,
        floor: 'Test Floor',
        capacity: 4
      },
      venue: {
        id: '1',
        name: 'Test Venue',
        address: '2 E Congress St, Ste 100'
      }
    };
    
    console.log('📧 Attempting to send test email...');
    console.log(`   To: ${testEmailData.booking.customerEmail}`);
    console.log(`   From: The Treasury 1929 <info@thetreasury1929.com>`);
    
    const emailSent = await EmailService.sendBookingConfirmation(testEmailData);
    
    if (emailSent) {
      console.log('\n✅ SUCCESS: SendGrid test email sent!');
      console.log('   This proves SendGrid configuration is working');
      console.log('   Check your email: jose@sahuaroworks.com');
    } else {
      console.log('\n❌ FAILED: SendGrid test email was not sent');
      console.log('   This indicates a configuration problem');
    }
    
    return emailSent;
    
  } catch (error) {
    console.error('\n💥 ERROR during SendGrid test:', error);
    return false;
  }
}

testSendGridDirectly().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ SendGrid is working - emails should reach customers');
  } else {
    console.log('❌ SendGrid has issues - customers are NOT getting emails');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});