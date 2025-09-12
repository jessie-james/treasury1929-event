import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { format, formatInTimeZone } from 'date-fns-tz';

interface User {
  email: string;
  firstName?: string;
}

interface BookingEmailData {
  booking: {
    id: number | string; // Allow both for flexibility during type migration
    customerEmail: string;
    partySize: number;
    status: string;
    notes?: string;
    stripePaymentId?: string;
    createdAt: Date | string; // Allow both Date and ISO string
    guestNames?: string[];
  };
  event: {
    id: number | string; // Allow both for flexibility
    title: string;
    date: Date | string; // Allow both Date and ISO string
    description: string;
  };
  table: {
    id: number | string; // Allow both for flexibility
    tableNumber: number;
    floor: string;
    capacity: number;
  };
  venue: {
    id: number | string; // Allow both for flexibility
    name: string;
    address?: string;
  };
}

let emailInitialized = false;

// Centralized email initialization and error handling
export function initializeEmailService(): void {
  const key = process.env.SENDGRID_API_KEY_NEW;
  if (!key) {
    console.error('[EMAIL] Missing SENDGRID_API_KEY_NEW - Treasury account key required');
    emailInitialized = false;
    return;
  }
  
  try {
    sgMail.setApiKey(key);
    emailInitialized = true;
    console.info('[EMAIL] SendGrid initialized successfully with Treasury key');
  } catch (err) {
    emailInitialized = false;
    console.error('[EMAIL] Initialization error:', serializeEmailError(err));
  }
}

export function ensureEmailReady(): void {
  if (!emailInitialized) {
    throw new Error('EMAIL_NOT_INITIALIZED - call initializeEmailService() first');
  }
}

export async function sendEmail(msg: sgMail.MailDataRequired): Promise<any> {
  // RUNTIME SAFETY GUARD: Never send real emails outside production
  const isProd = process.env.NODE_ENV === 'production';
  const suppress = process.env.EMAIL_SUPPRESS_OUTBOUND === 'true';

  if (!isProd || suppress) {
    console.log('[EMAIL] SUPPRESSED', { 
      isProd, 
      suppress, 
      to: typeof msg.to === 'string' ? msg.to : 'multiple recipients',
      subject: msg.subject 
    });
    return { ok: true, suppressed: true };
  }

  ensureEmailReady();
  try {
    const [res] = await sgMail.send(msg);
    console.debug('[EMAIL] Sent successfully', { 
      status: res.statusCode, 
      to: typeof msg.to === 'string' ? msg.to : 'multiple',
      messageId: res.headers?.['x-message-id']
    });
    return res;
  } catch (err: any) {
    const serializedError = serializeEmailError(err);
    console.error('[EMAIL] Send failed:', serializedError);
    throw new Error(`EMAIL_SEND_FAILED:${serializedError.code ?? 'UNKNOWN'}`);
  }
}

function serializeEmailError(err: any): any {
  return {
    code: err?.code,
    message: err?.message,
    responseBody: err?.response?.body,
    status: err?.response?.statusCode,
    timestamp: new Date().toISOString()
  };
}

export class EmailService {
  private static readonly FROM_EMAIL = 'The Treasury 1929 <info@thetreasury1929.com>';
  private static readonly ADMIN_EMAIL = 'info@thetreasury1929.com';

  static async initialize(): Promise<void> {
    // Use the centralized initialization
    initializeEmailService();
  }

  static async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    try {
      ensureEmailReady(); // Throw error if not initialized instead of silent skip
      
      const { booking, event, table, venue } = data;
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Use consistent event timing: Doors at 5:45 PM, Concert at 6:30 PM
      const timeDisplay = 'Guest Arrival 5:45 PM, show starts 6:30 PM';
      
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
        subject: 'Your Dinner Concert Ticket Confirmation – The Treasury 1929',
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

            ${booking.guestNames && booking.guestNames.length > 0 ? `
            <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Guest Names</h3>
              ${booking.guestNames.map((name, index) => `<p><strong>Guest ${index + 1}:</strong> ${name}</p>`).join('')}
            </div>
            ` : ''}

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

      await sendEmail(emailContent);
      console.log(`✓ Booking confirmation sent to ${booking.customerEmail} (RESTORED)`);
      
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
        
        await sendEmail(adminEmailContent);
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
      
      // All events are in Phoenix, Arizona timezone (America/Phoenix - no DST)
      const PHOENIX_TZ = 'America/Phoenix';
      const eventDateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
      
      // Format date in Phoenix timezone
      const eventDateFormatted = formatInTimeZone(eventDateObj, PHOENIX_TZ, 'EEEE, MMMM d, yyyy');
      
      // Use consistent event timing: Doors at 5:45 PM, Concert at 6:30 PM
      const timeDisplay = 'Guest Arrival 5:45 PM, show starts 6:30 PM';
      
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
        subject: 'Tomorrow: Your Dinner Concert at The Treasury 1929',
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

      await sendEmail(emailContent);
      console.log(`✓ Event reminder sent to ${booking.customerEmail} (RESTORED)`);
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
    try {
      ensureEmailReady();
      // Use the correct public-facing deployment URL
      const baseUrl = process.env.REPLIT_URL || 'https://venue-master-remix.replit.app';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log(`📧 Generated password reset URL: ${resetUrl}`);

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

      await sendEmail(emailContent);
      console.log(`✓ Password reset email sent to ${email}`);
      return true;

    } catch (error) {
      console.error('✗ CRITICAL: Failed to send password reset email');
      console.error('  Email:', email);
      console.error('  Error Details:', error);
      return false;
    }
  }
}