const sgMail = require('@sendgrid/mail');
const QRCode = require('qrcode');

async function testDirectEmail() {
  console.log('🧪 Testing email system directly...\n');

  try {
    // Check if SendGrid API key exists
    const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW;
    
    if (!sendgridApiKey) {
      console.log('❌ No SENDGRID_API_KEY_NEW found - email service disabled');
      return;
    }

    console.log('✅ SendGrid API key found');
    sgMail.setApiKey(sendgridApiKey);

    // Generate a test QR code
    const qrData = "TEST-BOOKING-123";
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#2c3e50',
        light: '#ffffff'
      }
    });

    console.log('✅ QR code generated');

    // Create test booking email
    const emailContent = {
      to: 'jose@sahuaroworks.com',
      from: 'The Treasury 1929 <info@thetreasury1929.com>',
      subject: '[EMAIL TEST] Booking Confirmation Test - The Treasury 1929',
      attachments: [
        {
          content: qrCodeBuffer.toString('base64'),
          filename: 'qrcode-test.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'qrcodetest'
        }
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <h1 style="color: #2c3e50;">🧪 EMAIL SYSTEM TEST</h1>
          
          <p>Dear Jose,</p>
          
          <p>This is a test email to verify that the booking confirmation email system is working properly.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #6c757d;">
            <h2 style="color: #2c3e50; margin-top: 0; text-align: center;">🎫 TEST DIGITAL TICKET</h2>
            <div style="text-align: center; margin: 20px 0;">
              <p style="font-size: 18px; font-weight: bold; color: #2c3e50; margin: 5px 0;">Candlelight Opera: A Night of Puccini and Verdi</p>
              <p style="font-size: 16px; color: #495057; margin: 5px 0;">Saturday, January 25, 2025</p>
              <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">Guest Arrival 5:45 PM, show starts 6:30 PM</p>
              <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">Table 1 • 2 Guests</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 15px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">QR Code Check-in</h3>
              <img src="cid:qrcodetest" alt="Test QR Code" style="width: 150px; height: 150px; border: 1px solid #dee2e6; border-radius: 8px;" />
              <p style="color: #666; margin-top: 15px; font-size: 14px;">Scan this QR code at the venue for quick check-in</p>
              <p style="font-family: monospace; font-size: 12px; margin: 10px 0; color: #666;">Booking ID: TEST-BOOKING-123</p>
            </div>
          </div>

          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">Test Results</h3>
            <p>✅ Email service is working properly</p>
            <p>✅ QR code generation is functional</p>
            <p>✅ Email templates are rendering correctly</p>
            <p>✅ Attachment system is operational</p>
          </div>

          <p>If you receive this email, the booking confirmation system is working correctly!</p>
          
          <p>Best regards,<br>The Treasury 1929 Email Test System</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3937<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com/dinnerconcerts</p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending test email to jose@sahuaroworks.com...');
    await sgMail.send(emailContent);
    console.log('✅ Test email sent successfully!');
    console.log('\n🎯 CHECK YOUR EMAIL INBOX NOW!');
    console.log('📧 Email subject: "[EMAIL TEST] Booking Confirmation Test - The Treasury 1929"');
    console.log('📧 Email should contain a QR code and formatted booking details');

  } catch (error) {
    console.error('❌ Email test failed:', error);
    if (error.response) {
      console.error('❌ SendGrid response:', error.response.body);
    }
  }
}

testDirectEmail();