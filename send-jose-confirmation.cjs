#!/usr/bin/env node

// Direct test script to send confirmation email to Jose using the same environment
// Using environment variables directly from the system
const { default: sgMail } = require('@sendgrid/mail');
const QRCode = require('qrcode');

async function sendJoseConfirmation() {
  console.log('🧪 Sending confirmation email to Jose...');
  
  // Initialize SendGrid
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'The Treasury 1929 <info@thetreasury1929.com>';
  
  if (!SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in environment');
    return;
  }

  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✓ SendGrid initialized');

  try {
    // Generate QR code for Jose's booking
    const qrData = `BOOKING:16:35:jose@sahuaroworks.com`;
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#2c3e50',
        light: '#ffffff'
      }
    });

    // Event date formatting
    const eventDateObj = new Date('2025-08-14T00:00:00.000Z');
    const eventDateFormatted = eventDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Time display: Guest Arrival 5:45 PM, show starts 6:30 PM
    const showTime = "6:30 PM";
    const arrivalTime = "5:45 PM";
    const timeDisplay = `Guest Arrival ${arrivalTime}, show starts ${showTime}`;

    const emailContent = {
      to: 'jose@sahuaroworks.com',
      from: FROM_EMAIL,
      subject: `Your Dinner Concert Ticket Confirmation – The Treasury 1929`,
      attachments: [
        {
          content: qrCodeBuffer.toString('base64'),
          filename: `qrcode-16.png`,
          type: 'image/png',
          disposition: 'inline',
          content_id: `qrcode16`
        }
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Dear Guest,</p>
          
          <p>Thank you for your purchase! We're excited to welcome you to an intimate evening of live music and dining at The Treasury 1929.</p>
          
          <p>Your ticket is confirmed for the upcoming Dinner Concert. Please be sure to bring and show the QR code below at the door on the day of the event for entry:</p>
          
          <!-- FULL DIGITAL TICKET -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #6c757d;">
            <h2 style="color: #2c3e50; margin-top: 0; text-align: center;">🎫 YOUR DIGITAL TICKET</h2>
            
            <table style="width: 100%; margin: 15px 0;">
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Event:</td>
                <td style="padding: 5px 0;">Pianist Sophia Su in Concert with Clarinetist</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Date:</td>
                <td style="padding: 5px 0;">${eventDateFormatted}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Time:</td>
                <td style="padding: 5px 0;">${timeDisplay}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Table:</td>
                <td style="padding: 5px 0;">Table #11 (Main Floor)</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Party Size:</td>
                <td style="padding: 5px 0;">3 guests</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 5px 0;">Guests:</td>
                <td style="padding: 5px 0;">Jose Santos, Maria Rodriguez, Carlos Thompson</td>
              </tr>
            </table>
            
            <!-- QR CODE -->
            <div style="text-align: center; margin: 20px 0;">
              <img src="cid:qrcode16" alt="QR Code for Check-in" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white;" />
              <p style="margin: 10px 0; font-size: 14px; color: #6c757d;">Show this QR code at the door for entry</p>
            </div>
          </div>

          <h3 style="color: #2c3e50;">Your Menu Selections</h3>
          <ul>
            <li><strong>Jose Santos:</strong> Caesar Salad, Chicken Marsala, Tiramisu</li>
            <li><strong>Maria Rodriguez:</strong> Mixed Green Salad, Eggplant Lasagna, Creme Brulee</li>
            <li><strong>Carlos Thompson:</strong> Grape & Walnut Salad, Penne & Sausage, Chocolate Molten Cake</li>
          </ul>

          <h3 style="color: #2c3e50;">Wine Selections</h3>
          <ul>
            <li>Sterling Cabernet (1 bottle)</li>
            <li>Twenty Acres Chardonnay (1 bottle)</li>
          </ul>

          <p style="margin-top: 30px;">We look forward to welcoming you to The Treasury 1929!</p>
          
          <p>Warm regards,<br/>
          <strong>The Treasury 1929 Team</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          
          <p style="font-size: 12px; color: #6c757d; text-align: center;">
            📍 2 E Congress St, Ste 100 | 📞 (520) 734-3937<br/>
            www.thetreasury1929.com/dinnerconcerts
          </p>
        </div>
      `
    };

    await sgMail.send(emailContent);
    console.log('✅ Confirmation email sent successfully to jose@sahuaroworks.com');
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
  }
}

sendJoseConfirmation();