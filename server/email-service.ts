import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { format, formatInTimeZone } from 'date-fns-tz';

interface User {
  email: string;
  firstName?: string;
}

interface BookingEmailData {
  booking: {
    id: number;
    customerEmail: string;
    partySize: number;
    status: string;
    notes?: string;
    stripePaymentId?: string;
    createdAt: Date;
    guestNames?: string[];
  };
  event: {
    id: number;
    title: string;
    date: Date;
    description: string;
  };
  table: {
    id: number;
    tableNumber: number;
    floor: string;
    capacity: number;
  };
  venue: {
    id: number;
    name: string;
    address?: string;
  };
}

let emailInitialized = false;

export class EmailService {
  private static readonly FROM_EMAIL = 'The Treasury 1929 <info@thetreasury1929.com>';
  private static readonly ADMIN_EMAIL = 'info@thetreasury1929.com';

  static async initialize(): Promise<void> {
    // Try Treasury account key first, then fallback to main account
    const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW || process.env.SENDGRID_API_KEY;
    
    if (!sendgridApiKey) {
      console.log('⚠️  No SENDGRID_API_KEY or SENDGRID_API_KEY_NEW found - email service disabled');
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
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = new Date(event.date);
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Format show time in Phoenix timezone
      const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');
      
      // Calculate arrival time (45 minutes before show) in Phoenix timezone
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = formatInTimeZone(arrivalTime, PHOENIX_TZ, 'h:mm a');
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      
      // Generate QR code using simple booking ID format expected by scanner
      const qrData = booking.id.toString();
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
              
              <!-- PDF download button removed as requested -->
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
      
      // Send admin copy for monitoring and verification
      try {
        const adminEmailContent = {
          ...emailContent,
          to: this.ADMIN_EMAIL,
          subject: `[ADMIN COPY] Customer Booking Confirmation - ${booking.customerEmail}`,
          html: `
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
              <h3 style="color: #1565c0; margin-top: 0;">📋 Admin Copy - Customer Email Sent Successfully</h3>
              <p><strong>Customer Email:</strong> ${booking.customerEmail}</p>
              <p><strong>Booking ID:</strong> #${booking.id}</p>
              <p><strong>Payment ID:</strong> ${booking.stripePaymentId || 'N/A'}</p>
              <p style="color: #1565c0;">This email confirms the customer received the booking confirmation below.</p>
            </div>
            ${emailContent.html}
          `
        };
        
        await sgMail.send(adminEmailContent);
        console.log(`✓ Admin copy sent to ${this.ADMIN_EMAIL} for booking ${booking.id}`);
      } catch (adminEmailError) {
        console.error(`⚠️ Failed to send admin copy (customer email was successful):`, adminEmailError);
        // Don't fail the whole process if admin copy fails
      }
      
      return true;

    } catch (error) {
      console.error('✗ CRITICAL: Failed to send booking confirmation email');
      console.error('  Booking ID:', data.booking.id);
      console.error('  Customer Email:', data.booking.customerEmail);
      console.error('  Event:', data.event.title);
      console.error('  Error Details:', error);
      
      // Log to admin logs if possible
      try {
        // Don't import storage here to avoid circular dependency
        console.error('  Timestamp:', new Date().toISOString());
        console.error('  Phoenix Time:', formatInTimeZone(new Date(), 'America/Phoenix', 'yyyy-MM-dd HH:mm:ss'));
      } catch (logError) {
        console.error('  Additional logging failed:', logError);
      }
      
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
      
      // All events are in Phoenix, Arizona timezone
      const eventDateObj = new Date(event.date);
      const eventDateFormatted = eventDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // The event date contains the show start time  
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
      
      // Generate QR code using simple booking ID format expected by scanner
      const qrData = booking.id.toString();
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
              
              <!-- PDF download button removed as requested -->
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
      console.error('✗ CRITICAL: Failed to send event reminder email');
      console.error('  Booking ID:', data.booking.id);
      console.error('  Customer Email:', data.booking.customerEmail);
      console.error('  Event:', data.event.title);
      console.error('  Error Details:', error);
      console.error('  Timestamp:', new Date().toISOString());
      return false;
    }
  }



  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping password reset');
      return false;
    }

    try {
      // Use the correct public-facing deployment URL
      const baseUrl = process.env.REPLIT_URL || 'https://venue-master-remix.replit.app';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log(`📧 Generated password reset URL: ${resetUrl}`);

      const emailContent = {
        to: email,
        from: this.FROM_EMAIL,
        subject: `Reset Your Password - The Treasury 1929`,
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
      console.error('✗ CRITICAL: Failed to send password reset email');
      console.error('  Email:', email);
      console.error('  Error Details:', error);
      console.error('  Timestamp:', new Date().toISOString());
      return false;
    }
  }

  static async sendCancellationEmail(data: BookingEmailData, refundAmountCents: number): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping customer cancellation');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = new Date(event.date);
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Format show time in Phoenix timezone
      const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');
      
      // Calculate arrival time (45 minutes before show) in Phoenix timezone
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = formatInTimeZone(arrivalTime, PHOENIX_TZ, 'h:mm a');
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      const refundAmount = (refundAmountCents / 100).toFixed(2);

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Your Dinner Concert Ticket Cancellation & Refund Confirmation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Guest,</p>
            
            <p>We have successfully processed your cancellation request for your dinner concert reservation at The Treasury 1929.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">📋 Cancelled Reservation Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDateFormatted}</p>
              <p><strong>Time:</strong> ${timeDisplay}</p>
              <p><strong>Table:</strong> ${table.tableNumber}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Booking Reference:</strong> #${booking.id}</p>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">💰 Refund Information</h3>
              <p><strong>Refund Amount:</strong> $${refundAmount}</p>
              <p><strong>Processing Time:</strong> 7-10 business days</p>
              <p><strong>Refund Method:</strong> Original payment method</p>
              <p style="margin-top: 15px; color: #155724;">Your refund is being processed and will appear on your statement within 7-10 business days. You'll receive a separate confirmation from your bank or credit card company once the refund is complete.</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #155724; margin: 0;"><strong>Have Questions?</strong> If you have any questions about your cancellation or refund, please contact us at (520) 734-3937 or reply to this email.</p>
            </div>
            
            <p>We're sorry we won't see you for this event, but we hope to welcome you to The Treasury 1929 in the future. Keep an eye on our upcoming dinner concerts at <a href="https://www.thetreasury1929.com/dinnerconcerts" style="color: #2c3e50;">www.thetreasury1929.com/dinnerconcerts</a>.</p>
            
            <p>Thank you for choosing The Treasury 1929.</p>
            
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
      console.log(`✓ Customer cancellation email sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send customer cancellation email:', error);
      return false;
    }
  }

  static async sendVenueCancellationEmail(data: BookingEmailData, refundAmountCents: number): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping venue cancellation');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = new Date(event.date);
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Format show time in Phoenix timezone
      const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');
      
      // Calculate arrival time (45 minutes before show) in Phoenix timezone
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = formatInTimeZone(arrivalTime, PHOENIX_TZ, 'h:mm a');
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      const refundAmount = (refundAmountCents / 100).toFixed(2);

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: 'Important Update: Dinner Concert Cancellation & Full Refund',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Valued Guest,</p>
            
            <p>We regret to inform you that due to unforeseen circumstances, we must cancel the following dinner concert event at The Treasury 1929:</p>
            
            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin-top: 0;">🎭 Cancelled Event Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDateFormatted}</p>
              <p><strong>Time:</strong> ${timeDisplay}</p>
              <p><strong>Table:</strong> ${table.tableNumber}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Booking Reference:</strong> #${booking.id}</p>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">💰 Full Refund Guaranteed</h3>
              <p><strong>Refund Amount:</strong> $${refundAmount} (Full Amount)</p>
              <p><strong>Processing Time:</strong> 7-10 business days</p>
              <p><strong>Refund Method:</strong> Original payment method</p>
              <p style="margin-top: 15px; color: #155724;">We will process your full refund immediately. You'll receive a separate confirmation from your bank or credit card company once the refund is complete.</p>
            </div>
            
            <p>We sincerely apologize for this inconvenience and any disappointment this may cause. We understand how much you were looking forward to this evening, and we share in that disappointment.</p>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c3e50;">
              <h3 style="color: #2c3e50; margin-top: 0;">🎵 Future Events</h3>
              <p>We'd love to welcome you to a future dinner concert! We have several exciting performances planned throughout the year. Please visit <a href="https://www.thetreasury1929.com/dinnerconcerts" style="color: #2c3e50;">www.thetreasury1929.com/dinnerconcerts</a> to see our upcoming events.</p>
              <p>As an apology for this inconvenience, please mention "RAINCHECK2025" when booking your next dinner concert, and we'll ensure you receive priority seating selection.</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;"><strong>Questions or Concerns?</strong> Please don't hesitate to contact us at (520) 734-3937. Our team is standing by to assist you with any questions about your refund or future bookings.</p>
            </div>
            
            <p>Thank you for your understanding and continued support of The Treasury 1929. We look forward to providing you with an exceptional dining and entertainment experience in the near future.</p>
            
            <p>With sincere apologies,<br>The Treasury 1929 Team</p>
            
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
      console.log(`✓ Venue cancellation email sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send venue cancellation email:', error);
      return false;
    }
  }

  // Send refund notification email for automatic Stripe refunds
  static async sendRefundNotification(data: any): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping refund notification');
      return false;
    }

    try {
      const { booking, event, table, venue, refund } = data;
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = new Date(event.date);
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Format show time in Phoenix timezone
      const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');
      
      // Calculate arrival time (45 minutes before show) in Phoenix timezone
      const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
      const arrivalTimeFormatted = formatInTimeZone(arrivalTime, PHOENIX_TZ, 'h:mm a');
      
      const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
      const refundAmount = ((refund.amount || 0) / 100).toFixed(2);

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: 'Refund Processed - Your Dinner Concert Reservation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
            <p>Dear Guest,</p>
            
            <p>We are writing to inform you that a refund has been processed for your dinner concert reservation at The Treasury 1929.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0;">📋 Original Reservation Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDateFormatted}</p>
              <p><strong>Time:</strong> ${timeDisplay}</p>
              <p><strong>Table:</strong> ${table.tableNumber}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Booking Reference:</strong> #${booking.id}</p>
            </div>
            
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0;">💰 Refund Information</h3>
              <p><strong>Refund Amount:</strong> $${refundAmount}</p>
              <p><strong>Reason:</strong> ${refund.reason}</p>
              <p><strong>Processing Time:</strong> 7-10 business days</p>
              <p><strong>Refund Method:</strong> Original payment method</p>
              <p><strong>Reference ID:</strong> ${refund.refundId}</p>
            </div>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #0c5460; margin: 0;">Your table has been released and is now available for other guests. If you would like to make a new reservation for this or another event, please visit our booking page.</p>
            </div>
            
            <p>If you have any questions about this refund or need assistance with future bookings, please don't hesitate to contact us at (520) 734-3937.</p>
            
            <p>We hope to welcome you to The Treasury 1929 again soon for another unforgettable evening of music and dining.</p>
            
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
      console.log(`✓ Refund notification email sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send refund notification email:', error);
      return false;
    }
  }

  static async sendAdminBookingNotification(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping admin notification');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = new Date(event.date);
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Format show time in Phoenix timezone
      const showTime = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'h:mm a');

      const emailContent = {
        to: this.ADMIN_EMAIL,
        from: this.FROM_EMAIL,
        subject: `New Booking Alert - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🎵 New Booking Alert</h1>
            </div>
            
            <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e40af; margin-top: 0;">Booking Details</h2>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.id}</p>
                <p style="margin: 5px 0;"><strong>Customer:</strong> ${booking.customerEmail}</p>
                <p style="margin: 5px 0;"><strong>Party Size:</strong> ${booking.partySize} guests</p>
                <p style="margin: 5px 0;"><strong>Table:</strong> ${table.tableNumber} (${table.floor})</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${booking.status}</p>
                ${booking.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${booking.notes}</p>` : ''}
              </div>
              
              <h3 style="color: #1e40af;">Event Information</h3>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Event:</strong> ${event.title}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateFormatted}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${showTime}</p>
                <p style="margin: 5px 0;"><strong>Venue:</strong> ${venue.name}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">Booking created: ${format(booking.createdAt, 'PPpp')}</p>
              </div>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Admin booking notification sent for booking ${booking.id}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send admin booking notification:', error);
      return false;
    }
  }
}