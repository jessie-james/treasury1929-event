import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';

interface User {
  email: string;
  firstName?: string;
}

interface BookingEmailData {
  booking: {
    id: string;
    customerEmail: string;
    partySize: number;
    status: string;
    notes?: string;
    stripePaymentId?: string;
    createdAt: Date;
    guestNames?: string[];
  };
  event: {
    id: string;
    title: string;
    date: Date;
    description: string;
  };
  table: {
    id: string;
    tableNumber: number;
    floor: string;
    capacity: number;
  };
  venue: {
    id: string;
    name: string;
    address: string;
  };
}

let emailInitialized = false;

export class EmailService {
  private static readonly FROM_EMAIL = 'The Treasury 1929 <info@thetreasury1929.com>';
  private static readonly ADMIN_EMAIL = 'admin@venue.com';

  static async initialize(): Promise<void> {
    const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW || process.env.SENDGRID_API_KEY;
    
    if (!sendgridApiKey) {
      console.log('⚠️  No SendGrid API key found - email service disabled');
      return;
    }
    
    try {
      sgMail.setApiKey(sendgridApiKey);
      emailInitialized = true;
      console.log('✓ SendGrid email service initialized (FIXED)');
    } catch (error) {
      console.error('✗ Failed to initialize SendGrid:', error);
    }
  }

  static async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping booking confirmation');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      
      // Format event date and time correctly
      const eventDateObj = new Date(event.date);
      const eventDateFormatted = eventDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Create time display: Guest Arrival 5:45 PM, show starts 6:30 PM
      const showTime = eventDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Calculate arrival time (45 minutes before show)
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = arrivalTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      
      // Generate QR code as attachment for better email client compatibility
      const qrData = `BOOKING:${booking.id}:${event.id}:${booking.customerEmail}`;
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c3e50',
          light: '#ffffff'
        }
      });

      const guestList = booking.guestNames && booking.guestNames.length > 0 
        ? booking.guestNames.join(', ') 
        : 'Guest names not provided';

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Your Dinner Concert Ticket Confirmation – The Treasury 1929`,
        attachments: [
          {
            content: qrCodeBuffer.toString('base64'),
            filename: `qrcode-${booking.id}.png`,
            type: 'image/png',
            disposition: 'inline',
            content_id: `qrcode${booking.id}`
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
              <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 18px; font-weight: bold; color: #2c3e50; margin: 5px 0;">${event.title}</p>
                <p style="font-size: 16px; color: #495057; margin: 5px 0;">${eventDateFormatted}</p>
                <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">${timeDisplay}</p>
                <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">Table ${table.tableNumber} • ${booking.partySize} Guests</p>
              </div>
              
              <!-- QR CODE SECTION - USING ATTACHMENT -->
              <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 15px 0;">
                <h3 style="color: #27ae60; margin-top: 0;">QR Code Check-in</h3>
                <img src="cid:qrcode${booking.id}" alt="QR Code for Booking ${booking.id}" style="width: 150px; height: 150px; border: 1px solid #dee2e6; border-radius: 8px;" />
                <p style="color: #666; margin-top: 15px; font-size: 14px;">Scan this QR code at the venue for quick check-in</p>
                <p style="font-family: monospace; font-size: 12px; margin: 10px 0; color: #666;">Booking ID: ${booking.id}</p>
              </div>
              
              <!-- DOWNLOAD BUTTON -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/download-ticket/${booking.id}" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  📥 Download PDF Ticket
                </a>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">Save to your phone for easy access</p>
              </div>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">Event Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDateFormatted}</p>
              <p><strong>Time:</strong> ${timeDisplay}</p>
              <p><strong>Table:</strong> ${table.tableNumber}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Booking Reference:</strong> #${booking.id}</p>
            </div>

            ${booking.notes ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Special Notes</h4>
              <p style="color: #856404;">${booking.notes}</p>
            </div>
            ` : ''}

            <p>We look forward to sharing a memorable evening with you.</p>
            
            <p>If you'd like to receive updates about future Dinner Concert Series dates and exclusive invites, just reply to this email and let us know you'd like to be added to our mailing list.</p>
            
            <p>Warm regards,<br><br>The Treasury 1929 Team</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              <p>📍 2 E Congress St, Ste 100<br>
              📞 (520) 734-3937<br>
              📧 info@thetreasury1929.com<br>
              🌐 www.thetreasury1929.com/dinnerconcerts</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Booking confirmation sent to ${booking.customerEmail} (FIXED)`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send booking confirmation:', error);
      return false;
    }
  }

  static async sendEventReminder(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping event reminder');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      
      // Format event date and time correctly
      const eventDateObj = new Date(event.date);
      const eventDateFormatted = eventDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Create time display: Guest Arrival 5:45 PM, show starts 6:30 PM
      const showTime = eventDateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Calculate arrival time (45 minutes before show)
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = arrivalTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      
      // Generate QR code as attachment
      const qrData = `BOOKING:${booking.id}:${event.id}:${booking.customerEmail}`;
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c3e50',
          light: '#ffffff'
        }
      });

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Tomorrow: Your Dinner Concert at The Treasury 1929`,
        attachments: [
          {
            content: qrCodeBuffer.toString('base64'),
            filename: `qrcode-reminder-${booking.id}.png`,
            type: 'image/png',
            disposition: 'inline',
            content_id: `qrcodereminder${booking.id}`
          }
        ],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Guest,</p>
            
            <p>Tomorrow is the day! We're excited to welcome you to The Treasury 1929 for an intimate evening of live music and dining.</p>
            
            <p>Here's your digital ticket for quick check-in tomorrow:</p>
            
            <!-- FULL DIGITAL TICKET -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #6c757d;">
              <h2 style="color: #2c3e50; margin-top: 0; text-align: center;">🎫 YOUR DIGITAL TICKET</h2>
              <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 18px; font-weight: bold; color: #2c3e50; margin: 5px 0;">${event.title}</p>
                <p style="font-size: 16px; color: #495057; margin: 5px 0;">${eventDateFormatted}</p>
                <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">${timeDisplay}</p>
                <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">Table ${table.tableNumber} • ${booking.partySize} Guests</p>
              </div>
              
              <!-- QR CODE SECTION - USING ATTACHMENT -->
              <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 15px 0;">
                <h3 style="color: #27ae60; margin-top: 0;">QR Code Check-in</h3>
                <img src="cid:qrcodereminder${booking.id}" alt="QR Code for Booking ${booking.id}" style="width: 150px; height: 150px; border: 1px solid #dee2e6; border-radius: 8px;" />
                <p style="color: #666; margin-top: 15px; font-size: 14px;">Scan this QR code at the venue for quick check-in</p>
                <p style="font-family: monospace; font-size: 12px; margin: 10px 0; color: #666;">Booking ID: ${booking.id}</p>
              </div>
              
              <!-- DOWNLOAD BUTTON -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/download-ticket/${booking.id}" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                  📥 Download PDF Ticket
                </a>
                <p style="color: #666; font-size: 12px; margin-top: 10px;">Save to your phone for easy access</p>
              </div>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">Event Information</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDateFormatted}</p>
              <p><strong>Time:</strong> ${timeDisplay}</p>
              <p><strong>Table:</strong> ${table.tableNumber}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Booking Reference:</strong> #${booking.id}</p>
            </div>
            
            <p>See you tomorrow evening!</p>
            
            <p>Warm regards,<br><br>The Treasury 1929 Team</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              <p>📍 2 E Congress St, Ste 100<br>
              📞 (520) 734-3937<br>
              📧 info@thetreasury1929.com<br>
              🌐 www.thetreasury1929.com/dinnerconcerts</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Event reminder sent to ${booking.customerEmail} (FIXED)`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send event reminder:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping password reset');
      return false;
    }

    try {
      // Use Replit URL in production or localhost in development
      const baseUrl = process.env.REPLIT_URL || 
                      (process.env.REPL_SLUG && process.env.REPL_OWNER 
                        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app` 
                        : 'http://localhost:5000');
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const emailContent = {
        to: email,
        from: this.FROM_EMAIL,
        subject: 'Welcome to The Treasury 1929 – Set Your Password to Get Started',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Guest,</p>
            
            <p>Welcome to The Treasury 1929! We're excited to have you as part of our Dinner Concert community.</p>
            
            <p>To complete the setup of your account and access your profile, please take a moment to set your password by clicking the link below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                🔐 Reset/Set Your Password
              </a>
            </div>

            <p>Once your password is set, you'll be able to:</p>
            <ul>
              <li>View and manage your upcoming reservations</li>
              <li>Receive exclusive updates on new concert dates</li>
              <li>Customize your preferences for future events</li>
            </ul>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">If you didn't request this setup or have any questions, feel free to reach out to us anytime.</p>
            </div>
            
            <p>We look forward to hosting you soon!</p>
            
            <p>Warm regards,<br>The Treasury 1929 Team</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              <p>📍 2 E Congress St, Ste 100<br>
              📞 (520) 734-3937<br>
              📧 info@thetreasury1929.com<br>
              🌐 www.thetreasury1929.com/dinnerconcerts</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Password reset email sent to ${email} (FIXED)`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send password reset email:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping password reset');
      return false;
    }

    try {
      // Use the correct Replit app URL instead of localhost
      const baseUrl = process.env.REPLIT_URL || 
                      (process.env.REPL_SLUG && process.env.REPL_OWNER 
                        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app` 
                        : 'http://localhost:5000');
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const emailContent = {
        to: email,
        from: this.FROM_EMAIL,
        subject: 'Reset Your Password - The Treasury 1929',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Guest,</p>
            
            <p>We received a request to reset your password for your Treasury 1929 account.</p>
            
            <p>To reset your password, please click the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2c3e50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Your Password
              </a>
            </div>

            <p>This link will expire in 1 hour for security purposes.</p>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            
            <p>If you have any questions, please contact us at (520) 734-3937.</p>
            
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

      await sgMail.send(emailContent);
      console.log(`✓ Password reset email sent to ${email}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send password reset email:', error);
      return false;
    }
  }
}