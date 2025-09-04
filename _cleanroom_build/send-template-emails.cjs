// Send actual Treasury 1929 email templates
const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY not found');
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'The Treasury 1929 <info@thetreasury1929.com>';
const TO_EMAIL = 'jose@sahuaroworks.com';

async function sendTemplateEmails() {
  console.log('🎭 Sending Treasury 1929 Template-Based Emails to jose@sahuaroworks.com...\n');
  
  try {
    // 1. Booking Confirmation (Your Template)
    console.log('1. Sending Booking Confirmation Template...');
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: 'Your Dinner Concert Ticket Confirmation – The Treasury 1929',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Jose,</p>
          
          <p>Thank you for your purchase! We're excited to welcome you to an intimate evening of live music and dining at The Treasury 1929.</p>
          
          <p>Your ticket is confirmed for the upcoming Dinner Concert. Please be sure to bring and show the QR code below at the door on the day of the event for entry:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #2c3e50; margin-top: 0;">Digital Check-in Code</h3>
            <div style="background-color: white; padding: 15px; border-radius: 8px; display: inline-block;">
              <p style="font-family: monospace; font-size: 16px; margin: 0; color: #2c3e50;">📲 TREASURY-12345-AUG14-DEMO</p>
            </div>
            <p style="color: #666; margin-top: 15px; font-size: 14px;">Show this code at the venue for quick check-in</p>
          </div>
          
          <p>To view your profile and menu selections, please visit: www.thetreasury1929.com</p>
          
          <p>We look forward to sharing a memorable evening with you.</p>
          
          <p>If you'd like to receive updates about future Dinner Concert Series dates and exclusive invites, just reply to this email and let us know you'd like to be added to our mailing list.</p>
          
          <p>Warm regards,<br><br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3937<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com</p>
          </div>
        </div>
      `
    });
    console.log('✅ Booking Confirmation Template sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. Customer Cancellation/Refund (Your Template)
    console.log('2. Sending Customer Cancellation Template...');
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: 'Your Dinner Concert Ticket Cancellation & Refund Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Jose,</p>
          
          <p>We've processed your cancellation request for the Dinner Concert at The Treasury 1929, and your refund is now underway.</p>
          
          <p>Please note: Refund timing may vary depending on your bank or card issuer, but it can typically be expected within 7–10 business days.</p>
          
          <p>While we're sorry you won't be joining us this time, we hope you'll consider choosing a future date that better fits your schedule. We'd love to welcome you to a performance soon and share the unique experience our Dinner Concert Series offers.</p>
          
          <p>If you'd like to be notified of upcoming concert dates, feel free to reply to this email and ask to be added to our mailing list.</p>
          
          <p>Warm regards,<br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3937<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com</p>
          </div>
        </div>
      `
    });
    console.log('✅ Customer Cancellation Template sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Venue Cancellation (Your Template) 
    console.log('3. Sending Venue Cancellation Template...');
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: 'Important Update: Dinner Concert Cancellation & Full Refund',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Jose,</p>
          
          <p>We regret to inform you that due to unforeseen circumstances, we must cancel the upcoming Dinner Concert at The Treasury 1929 for which you had purchased tickets.</p>
          
          <p>Please accept our sincere apologies for any inconvenience this may cause. We understand how disappointing this is, and we truly appreciate your understanding.</p>
          
          <p>You will receive a full refund for your tickets and any additional purchases associated with your reservation. Refunds are processed promptly, though they may take 7–10 business days to appear in your account depending on your bank or card issuer.</p>
          
          <p>We sincerely hope you'll consider rebooking for another date in our Dinner Concert Series. To view upcoming events and make a new reservation, please visit:</p>
          <p>👉 <strong>www.thetreasury1929.com</strong></p>
          
          <p>If you'd like to be notified of future concert dates and special invitations, just reply to this email and let us know you'd like to join our mailing list.</p>
          
          <p>Thank you again for your understanding. We look forward to welcoming you to The Treasury 1929 very soon.</p>
          
          <p>Warm regards,<br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3979<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com</p>
          </div>
        </div>
      `
    });
    console.log('✅ Venue Cancellation Template sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Password Reset/Welcome (Your Template)
    console.log('4. Sending Password Reset/Welcome Template...');
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: 'Welcome to The Treasury 1929 – Set Your Password to Get Started',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Jose,</p>
          
          <p>Welcome to The Treasury 1929! We're excited to have you as part of our Dinner Concert community.</p>
          
          <p>To complete the setup of your account and access your profile, please take a moment to set your password by clicking the link below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.thetreasury1929.com/reset-password?token=demo_token_12345" style="background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              🔐 Reset/Set Your Password
            </a>
          </div>

          <p>Once your password is set, you'll be able to:</p>
          <ul>
            <li>View and manage your upcoming reservations</li>
            <li>Receive exclusive updates on new concert dates</li>
            <li>Customize your preferences for future events</li>
          </ul>

          <p>If you didn't request this setup or have any questions, feel free to reach out to us anytime.</p>
          
          <p>We look forward to hosting you soon!</p>
          
          <p>Warm regards,<br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3979<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com</p>
          </div>
        </div>
      `
    });
    console.log('✅ Password Reset/Welcome Template sent\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 5. Event Reminder (System Generated)
    console.log('5. Sending Event Reminder Template...');
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      subject: 'Tomorrow: Your Dinner Concert at The Treasury 1929 🎭',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Jose,</p>
          
          <p>We're excited to welcome you tomorrow evening for the Dinner Concert at The Treasury 1929!</p>
          
          <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">Your Reservation Details:</h3>
            <p><strong>Event:</strong> Pianist Sophia Su in Concert with Clarinetist</p>
            <p><strong>Date:</strong> Thursday, August 14, 2025 at 07:00 PM</p>
            <p><strong>Table:</strong> Demo Table 1</p>
            <p><strong>Party Size:</strong> 2 people</p>
          </div>

          <p><strong>Important Reminders:</strong></p>
          <ul>
            <li>Please arrive 15 minutes before the event start time</li>
            <li>Bring a photo ID for check-in verification</li>
            <li>Have your booking confirmation ready</li>
            <li>Don't forget to bring your QR code for quick entry</li>
          </ul>
          
          <p>We can't wait to share this intimate musical experience with you tomorrow!</p>
          
          <p>Warm regards,<br>The Treasury 1929 Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
            <p>📍 2 E Congress St, Ste 100<br>
            📞 (520) 734-3937<br>
            📧 info@thetreasury1929.com<br>
            🌐 www.thetreasury1929.com</p>
          </div>
        </div>
      `
    });
    console.log('✅ Event Reminder Template sent\n');
    
    console.log('🎉 All Treasury 1929 template-based emails sent successfully!');
    console.log('\nCheck jose@sahuaroworks.com for:');
    console.log('• Your Booking Confirmation Template');
    console.log('• Your Customer Cancellation Template'); 
    console.log('• Your Venue Cancellation Template');
    console.log('• Your Password Reset/Welcome Template');
    console.log('• System Event Reminder Template');
    console.log('\nAll sent from: The Treasury 1929 <info@thetreasury1929.com>');
    
  } catch (error) {
    console.error('❌ Error sending template emails:', error);
  }
}

sendTemplateEmails();