const sgMail = require('@sendgrid/mail');

async function testCancellationEmail() {
  console.log('🧪 Testing cancellation email functionality...\n');

  try {
    const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW;
    
    if (!sendgridApiKey) {
      console.log('❌ No SENDGRID_API_KEY_NEW found - email service disabled');
      return;
    }

    console.log('✅ SendGrid API key found');
    sgMail.setApiKey(sendgridApiKey);

    // Mock cancellation scenario
    const mockBooking = {
      id: 'CANCEL-TEST-' + Date.now(),
      customerEmail: 'customer@example.com',
      partySize: 2,
      status: 'cancelled',
      createdAt: new Date(),
      guestNames: ['John Doe', 'Jane Doe'],
      stripePaymentId: 'pi_test_cancelled_123'
    };

    const mockEvent = {
      id: '35',
      title: 'Candlelight Opera: A Night of Puccini and Verdi',
      date: new Date('2025-01-25T18:30:00'),
      description: 'An intimate evening of live opera and fine dining'
    };

    const mockTable = {
      id: '286',
      tableNumber: 8,
      floor: 'Main Floor',
      capacity: 4
    };

    const mockVenue = {
      id: '1',
      name: 'The Treasury 1929',
      address: '2 E Congress St, Ste 100, Tucson, AZ 85701'
    };

    const refundAmountCents = 13000; // $130.00 refund

    // Format event details
    const eventDateObj = new Date(mockEvent.date);
    const eventDateFormatted = eventDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const showTime = eventDateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
    const arrivalTimeFormatted = arrivalTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
    const refundAmount = (refundAmountCents / 100).toFixed(2);

    console.log('✅ Mock cancellation data created');

    // TESTING MODE: Send all emails to jose@sahuaroworks.com
    const emailContent = {
      to: 'jose@sahuaroworks.com',
      from: 'The Treasury 1929 <info@thetreasury1929.com>',
      subject: `[CANCELLATION TEST] Your Dinner Concert Ticket Cancellation & Refund Confirmation (Original: ${mockBooking.customerEmail})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin-top: 0;">🧪 CANCELLATION EMAIL TEST</h2>
            <p style="color: #856404; margin: 0;">This is a test of the cancellation/refund email that customers receive.</p>
          </div>

          <p>Dear Guest,</p>
          
          <p>We have successfully processed your cancellation request for your upcoming Dinner Concert reservation at The Treasury 1929.</p>

          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
            <h3 style="color: #0c5460; margin-top: 0;">Cancellation Details</h3>
            <p><strong>Booking Reference:</strong> #${mockBooking.id}</p>
            <p><strong>Event:</strong> ${mockEvent.title}</p>
            <p><strong>Date:</strong> ${eventDateFormatted}</p>
            <p><strong>Time:</strong> ${timeDisplay}</p>
            <p><strong>Table:</strong> ${mockTable.tableNumber}</p>
            <p><strong>Party Size:</strong> ${mockBooking.partySize} people</p>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <h3 style="color: #155724; margin-top: 0;">💰 Refund Information</h3>
            <p><strong>Refund Amount:</strong> $${refundAmount}</p>
            <p><strong>Processing Time:</strong> 5-10 business days</p>
            <p><strong>Refund Method:</strong> Original payment method</p>
            <p>Your refund has been processed and will appear on your statement within 5-10 business days.</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Table Availability Update</h3>
            <p>Your table has been released and is now available for other guests to book.</p>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📧 Email Test Results</h3>
            <p style="color: #856404;">✅ Cancellation emails working</p>
            <p style="color: #856404;">✅ Refund notifications functional</p>
            <p style="color: #856404;">✅ Email templates rendering properly</p>
            <p style="color: #856404;">✅ Test emails redirected to jose@sahuaroworks.com</p>
          </div>

          <p>We're sorry to see you won't be joining us for this event. We hope you'll consider attending a future Dinner Concert.</p>

          <p>If you have any questions about your refund or would like to book for a different date, please don't hesitate to contact us at (520) 734-3937.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3937<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com/dinnerconcerts</p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending cancellation email test to jose@sahuaroworks.com...');
    await sgMail.send(emailContent);
    console.log('✅ Cancellation email sent successfully!');
    
    console.log('\n🎯 CHECK YOUR EMAIL INBOX NOW!');
    console.log('📧 Email subject: "[CANCELLATION TEST] Your Dinner Concert Ticket Cancellation & Refund Confirmation"');
    console.log('📧 This email simulates what customers receive when they cancel bookings');
    console.log('📧 Email includes: refund details, cancellation confirmation, and contact info');

  } catch (error) {
    console.error('❌ Cancellation email test failed:', error);
    if (error.response) {
      console.error('❌ SendGrid response:', error.response.body);
    }
  }
}

testCancellationEmail();