import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { formatInTimeZone } from 'date-fns-tz';

interface BookingData {
  id: string | number;
  customerEmail: string;
  partySize: number;
  status: string;
  notes?: string;
  stripePaymentId?: string;
  createdAt: Date | string;
  guestNames?: string[];
}

interface EventData {
  id: string;
  title: string;
  date: Date;
  description: string;
}

interface TableData {
  id: string;
  tableNumber: number;
  floor: string;
  capacity: number;
}

interface VenueData {
  id: string;
  name: string;
  address: string;
}

interface EmailConfirmationData {
  booking: BookingData;
  event: EventData;
  table: TableData;
  venue: VenueData;
}

class EmailServiceClass {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.SENDGRID_API_KEY_NEW;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
      console.log('✓ SendGrid email service initialized');
    } else {
      console.log('⚠️ SendGrid API key not found - email service disabled');
    }
  }

  async ensureEmailReady(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Email service not initialized - check SENDGRID_API_KEY_NEW');
    }
  }

  async sendBookingConfirmation(data: EmailConfirmationData): Promise<boolean> {
    try {
      await this.ensureEmailReady();
      
      // Create Date object from the event date and format it using Phoenix timezone
      const eventDateObj = new Date(data.event.date);
      const eventDate = formatInTimeZone(eventDateObj, 'America/Phoenix', 'EEEE, MMMM d, yyyy');
      
      // Treasury events have standard times: Doors 5:45 PM, Concert 6:30 PM
      const doorsTime = '5:45 PM';
      const showTime = '6:30 PM';
      
      // Generate QR code containing the booking ID
      const qrCodeBuffer = await QRCode.toBuffer(data.booking.id.toString(), {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c3e50',
          light: '#ffffff'
        }
      });

      // Construct the email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; border-bottom: 2px solid #8B4513; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #8B4513; margin: 0; font-size: 32px;">The Treasury 1929</h1>
            <h2 style="color: #666; margin: 10px 0 0 0; font-size: 24px;">Digital Ticket</h2>
          </div>

          <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #8B4513; margin-top: 0; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Event Information</h3>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Event:</strong> ${data.event.title}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Date:</strong> ${eventDate}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Time:</strong> Doors: ${doorsTime} • Concert: ${showTime}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Venue:</strong> ${data.venue.name}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Address:</strong> 2 E Congress St, Ste 100</p>
          </div>

          <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #8B4513; margin-top: 0; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Reservation Details</h3>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Booking ID:</strong> ${data.booking.id}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Table:</strong> Table ${data.table.tableNumber}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Party Size:</strong> ${data.booking.partySize} guests</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Guest Email:</strong> ${data.booking.customerEmail}</p>
            ${data.booking.notes ? `<p style="margin: 8px 0; font-size: 16px;"><strong>Special Notes:</strong> ${data.booking.notes}</p>` : ''}
          </div>

          ${(() => {
            // Handle guest names - support both array and object formats
            let guestNames: string[] = [];
            if (Array.isArray(data.booking.guestNames)) {
              guestNames = data.booking.guestNames;
            } else if (data.booking.guestNames && typeof data.booking.guestNames === 'object') {
              guestNames = Object.values(data.booking.guestNames) as string[];
            }
            
            if (guestNames.length > 0) {
              return `
                <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="color: #8B4513; margin-top: 0; font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Guest Names</h3>
                  ${guestNames.map((name, index) => 
                    name && typeof name === 'string' 
                      ? `<p style="margin: 8px 0; font-size: 16px;"><strong>Guest ${index + 1}:</strong> ${name}</p>`
                      : ''
                  ).join('')}
                </div>
              `;
            }
            return '';
          })()}

          <div style="text-align: center; margin: 30px 0; padding: 25px; background: #f0f8ff; border-radius: 8px;">
            <h3 style="color: #27ae60; margin-top: 0; font-size: 18px;">QR Code Check-in</h3>
            <img src="cid:qrcode${data.booking.id}" alt="Booking QR Code" style="width: 150px; height: 150px; border: 2px solid #ddd;" />
            <p style="font-size: 14px; color: #666; margin: 15px 0 0 0;">Scan this QR code at the venue for quick check-in</p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Important:</strong> Please arrive by ${doorsTime} to allow time for seating and drink service before the performance begins. 
              If you need to make changes to your reservation, please contact us at 
              <a href="mailto:info@thetreasury1929.com" style="color: #8B4513;">info@thetreasury1929.com</a> 
              or call (520) 734-3979.
            </p>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
            <p style="margin: 5px 0;">The Treasury 1929</p>
            <p style="margin: 5px 0;">2 E Congress St, Ste 100</p>
            <p style="margin: 5px 0;">(520) 734-3979</p>
            <p style="margin: 15px 0 5px 0;">www.thetreasury1929.com/dinnerconcerts</p>
            <p style="margin: 5px 0;">Thank you for choosing us for your special evening!</p>
          </div>
        </div>
      `;

      const msg = {
        to: data.booking.customerEmail,
        from: {
          email: 'noreply@thetreasury1929.com',
          name: 'The Treasury 1929'
        },
        subject: `Booking Confirmation - ${data.event.title}`,
        html: htmlContent,
        attachments: [
          {
            content: qrCodeBuffer.toString('base64'),
            filename: 'qrcode.png',
            type: 'image/png',
            disposition: 'inline',
            content_id: `qrcode${data.booking.id}`
          }
        ]
      };

      const result = await this.sendEmail(msg);
      return result;
    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error);
      return false;
    }
  }

  private async sendEmail(msg: any): Promise<boolean> {
    try {
      await sgMail.send(msg);
      console.log(`✓ Email sent to ${msg.to}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error);
      return false;
    }
  }

  // Placeholder methods for backward compatibility
  async sendCancellationEmail(data: any): Promise<boolean> {
    console.log('📧 Cancellation email would be sent (not implemented)');
    return true;
  }

  async sendVenueCancellationEmail(data: any): Promise<boolean> {
    console.log('📧 Venue cancellation email would be sent (not implemented)');
    return true;
  }

  async sendEventReminder(data: any): Promise<boolean> {
    console.log('📧 Event reminder email would be sent (not implemented)');
    return true;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      await this.ensureEmailReady();
      
      // Use the correct public-facing deployment URL
      const baseUrl = process.env.REPLIT_URL || 'https://venue-master-remix.replit.app';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log(`📧 Generated password reset URL: ${resetUrl}`);

      const emailContent = {
        to: email,
        from: {
          email: 'noreply@thetreasury1929.com',
          name: 'The Treasury 1929'
        },
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

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
              <p>📍 2 E Congress St, Ste 100<br>
              📞 (520) 734-3937<br>
              📧 info@thetreasury1929.com<br>
              🌐 www.thetreasury1929.com/dinnerconcerts</p>
            </div>
          </div>
        `
      };

      const result = await this.sendEmail(emailContent);
      if (result) {
        console.log(`✓ Password reset email sent to ${email}`);
      } else {
        console.log(`✗ Failed to send password reset email to ${email}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }
}

export const EmailService = new EmailServiceClass();