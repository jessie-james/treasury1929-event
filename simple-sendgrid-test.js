#!/usr/bin/env node
// Simple test using existing test patterns

console.log('\n🔧 SIMPLE SENDGRID TEST');
console.log('Testing email system using existing patterns...\n');

async function testEmailSystem() {
  try {
    // Use the same pattern as other working test files
    const sgMail = (await import('@sendgrid/mail')).default;
    
    // Initialize SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW;
    
    if (!sendgridApiKey) {
      console.log('❌ SENDGRID_API_KEY_NEW not found');
      return false;
    }
    
    console.log('✅ SendGrid API key found');
    sgMail.setApiKey(sendgridApiKey);
    console.log('✅ SendGrid initialized');
    
    // Test email content
    const testEmail = {
      to: 'jose@sahuaroworks.com',
      from: 'The Treasury 1929 <info@thetreasury1929.com>',
      subject: 'EMAIL SYSTEM DIAGNOSTIC TEST - Treasury 1929',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🔧 Email System Diagnostic Test</h2>
          <p>This is a test email to verify the SendGrid configuration.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Phoenix Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' })}</p>
          <p>If you receive this email, SendGrid is working correctly!</p>
        </div>
      `
    };
    
    console.log('📧 Sending test email...');
    console.log(`   From: ${testEmail.from}`);
    console.log(`   To: ${testEmail.to}`);
    
    const result = await sgMail.send(testEmail);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('   📧 Check jose@sahuaroworks.com');
    console.log('   🎯 SendGrid configuration is working');
    
    return true;
    
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.body);
    }
    return false;
  }
}

testEmailSystem().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ SENDGRID IS WORKING - Emails should reach customers');
  } else {
    console.log('❌ SENDGRID HAS ISSUES - Customers NOT getting emails');
  }
}).catch(error => {
  console.error('Test execution failed:', error);
});