import sgMail from '@sendgrid/mail';
import { Booking, Event, User, Table, Venue } from '@shared/schema';

// Initialize SendGrid
let emailInitialized = false;

function initializeEmail() {
  // Prioritize new SendGrid API key over legacy key
  const sendgridApiKey = process.env.SENDGRID_API_KEY_NEW || process.env.SENDGRID_API_KEY;
  
  if (!sendgridApiKey) {
    console.error('⚠️  SENDGRID_API_KEY_NEW or SENDGRID_API_KEY not found. Email service disabled.');
    return false;
  }

  try {
    sgMail.setApiKey(sendgridApiKey);
    emailInitialized = true;
    const keySource = process.env.SENDGRID_API_KEY_NEW ? "NEW" : "OLD";
    console.log(`✓ SendGrid email service initialized (${keySource})`);
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize SendGrid:', error);
    return false;
  }
}

// Initialize on startup
initializeEmail();

export interface BookingEmailData {
  booking: Booking;
  event: Event;
  table: Table;
  venue: Venue;
  user?: User;
}

export class EmailService {
  private static FROM_EMAIL = 'The Treasury 1929 <info@thetreasury1929.com>';
  private static ADMIN_EMAIL = 'info@thetreasury1929.com';

  static async sendBookingConfirmation(data: BookingEmailData, qrCodeData?: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping booking confirmation');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      const guestName = booking.guestNames && booking.guestNames.length > 0 
        ? booking.guestNames[0] 
        : 'Valued Guest';

      // Generate QR code placeholder if not provided
      const qrCode = qrCodeData || `TT29-${booking.id}-${event.id}`;
      
      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: 'Your Dinner Concert Ticket Confirmation – The Treasury 1929',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <p style="margin-bottom: 20px;">Dear ${guestName},</p>
            
            <p style="margin-bottom: 20px;">Thank you for your purchase! We're excited to welcome you to an intimate evening of live music and dining at The Treasury 1929.</p>
            
            <p style="margin-bottom: 20px;">Your ticket is confirmed for the upcoming Dinner Concert. Please be sure to bring and show the QR code below at the door on the day of the event for entry:</p>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
              <p style="font-size: 18px; margin-bottom: 10px;">📲 QR Code for Entry</p>
              <div style="background-color: white; padding: 15px; border-radius: 8px; display: inline-block; border: 2px solid #ddd;">
                <p style="font-family: monospace; font-size: 14px; margin: 0; color: #2c3e50;">${qrCode}</p>
              </div>
            </div>
            
            <p style="margin-bottom: 20px;">To view your profile and menu selections, please visit: <a href="${process.env.FRONTEND_URL || 'https://thetreasury1929.com'}" style="color: #2c3e50;">our website</a>.</p>
            
            <p style="margin-bottom: 20px;">We look forward to sharing a memorable evening with you.</p>
            
            <p style="margin-bottom: 30px;">If you'd like to receive updates about future Dinner Concert Series dates and exclusive invites, just reply to this email and let us know you'd like to be added to our mailing list.</p>
            
            <p style="margin-bottom: 10px;">Warm regards,</p>
            <p style="margin-bottom: 30px;"><strong>The Treasury 1929 Team</strong></p>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 14px;">
              <p style="margin: 5px 0;">📍 2 E Congress St, Ste 100</p>
              <p style="margin: 5px 0;">📞 (520) 734-3937</p>
              <p style="margin: 5px 0;">📧 info@thetreasury1929.com</p>
              <p style="margin: 5px 0;">🌐 www.thetreasury1929.com</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Booking confirmation sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send booking confirmation:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(user: User): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping welcome email');
      return false;
    }

    try {
      const emailContent = {
        to: user.email,
        from: this.FROM_EMAIL,
        subject: 'Welcome to Our Event Platform! 🎊',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50; text-align: center;">Welcome aboard! 🎊</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #34495e; margin-top: 0;">Hello ${user.firstName || 'there'}!</h2>
              <p>Thank you for creating an account with us. You're now ready to book amazing events and experiences.</p>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">What's Next?</h3>
              <ul style="color: #2c3e50;">
                <li>Browse our upcoming events</li>
                <li>Reserve your preferred tables</li>
                <li>Invite friends and family</li>
                <li>Enjoy unforgettable experiences</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">Questions? We're here to help at ${this.ADMIN_EMAIL}</p>
              <p style="color: #666; font-size: 14px;">Welcome to the family! 🎉</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Welcome email sent to ${user.email}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send welcome email:', error);
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
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailContent = {
        to: this.ADMIN_EMAIL,
        from: this.FROM_EMAIL,
        subject: `New Booking Alert - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #e74c3c;">🔔 New Booking Alert</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #34495e; margin-top: 0;">Booking Details</h2>
              <p><strong>Booking ID:</strong> #${booking.id}</p>
              <p><strong>Customer:</strong> ${booking.customerEmail}</p>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Table:</strong> ${table.tableNumber} (${table.floor} floor)</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Status:</strong> ${booking.status}</p>
            </div>

            ${booking.notes ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Customer Notes</h4>
              <p style="color: #856404;">${booking.notes}</p>
            </div>
            ` : ''}

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">Payment Information</h3>
              <p><strong>Stripe Payment ID:</strong> ${booking.stripePaymentId || 'Pending'}</p>
              <p><strong>Booking Time:</strong> ${new Date(booking.createdAt).toLocaleString()}</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">Log in to the admin panel to manage this booking</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Admin notification sent for booking #${booking.id}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send admin notification:', error);
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping password reset');
      return false;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

      const emailContent = {
        to: email,
        from: this.FROM_EMAIL,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Password Reset Request 🔐</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p>You requested to reset your password. Click the button below to create a new password:</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;"><strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">Need help? Contact us at ${this.ADMIN_EMAIL}</p>
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

  // Digital ticket/QR code email for event entry
  static async sendDigitalTicket(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping ticket email');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Generate QR code data (booking ID + verification)
      const qrData = `BOOKING:${booking.id}:${event.id}:${booking.customerEmail}`;
      
      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `🎫 Your Digital Ticket - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50; text-align: center;">🎫 Your Digital Ticket</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #6c757d;">
              <h2 style="color: #34495e; margin-top: 0; text-align: center;">EVENT TICKET</h2>
              <p style="text-align: center; font-size: 18px; font-weight: bold; color: #2c3e50;">${event.title}</p>
              <p style="text-align: center;"><strong>Date:</strong> ${eventDate}</p>
              <p style="text-align: center;"><strong>Venue:</strong> ${venue.name}</p>
              <p style="text-align: center;"><strong>Table:</strong> ${table.tableNumber} (${table.floor} floor)</p>
              <p style="text-align: center;"><strong>Party Size:</strong> ${booking.partySize} people</p>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #27ae60; margin-top: 0;">Digital Check-in Code</h3>
              <div style="background-color: white; padding: 15px; border-radius: 8px; display: inline-block;">
                <p style="font-family: monospace; font-size: 16px; margin: 0; color: #2c3e50;">${qrData}</p>
              </div>
              <p style="color: #27ae60; margin-top: 15px; font-size: 14px;">Show this code at the venue for quick check-in</p>
            </div>

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">Important Information</h3>
              <ul style="color: #0c5460;">
                <li>Please arrive 15 minutes before the event start time</li>
                <li>Bring a photo ID for verification</li>
                <li>This ticket is valid for ${booking.partySize} people</li>
                <li>Contact us if you need to make changes</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">Booking Reference: #${booking.id}</p>
              <p style="color: #666;">Questions? Contact ${this.ADMIN_EMAIL}</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Digital ticket sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send digital ticket:', error);
      return false;
    }
  }

  // Booking cancellation email
  static async sendCancellationEmail(data: BookingEmailData, refundAmount?: number): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping cancellation email');
      return false;
    }

    try {
      const { booking, event } = data;
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Booking Cancelled - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #e74c3c; text-align: center;">Booking Cancelled</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #34495e; margin-top: 0;">Cancelled Booking Details</h2>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${eventDate}</p>
              <p><strong>Booking ID:</strong> #${booking.id}</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
            </div>

            ${refundAmount ? `
            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">Refund Information</h3>
              <p style="color: #155724;"><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(2)}</p>
              <p style="color: #155724;">Your refund will be processed within 5-7 business days to your original payment method.</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">We're sorry to see you go. We hope to welcome you at a future event!</p>
              <p style="color: #666;">Questions? Contact ${this.ADMIN_EMAIL}</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Cancellation email sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send cancellation email:', error);
      return false;
    }
  }

  // Event reminder email (24 hours before)
  static async sendEventReminder(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping reminder email');
      return false;
    }

    try {
      const { booking, event, table, venue } = data;
      const eventDate = new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `🎭 Tomorrow: ${event.title} - Event Reminder`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50; text-align: center;">🎭 Your Event is Tomorrow!</h1>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #856404; margin-top: 0;">Event Reminder</h2>
              <p style="color: #856404;"><strong>Event:</strong> ${event.title}</p>
              <p style="color: #856404;"><strong>Date:</strong> ${eventDate}</p>
              <p style="color: #856404;"><strong>Venue:</strong> ${venue.name}</p>
              <p style="color: #856404;"><strong>Your Table:</strong> ${table.tableNumber} (${table.floor} floor)</p>
            </div>

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">What to Bring</h3>
              <ul style="color: #0c5460;">
                <li>Photo ID for check-in verification</li>
                <li>Your booking confirmation (reference #${booking.id})</li>
                <li>Arrive 15 minutes early for the best experience</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">We can't wait to see you tomorrow!</p>
              <p style="color: #666;">Questions? Contact ${this.ADMIN_EMAIL}</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Event reminder sent to ${booking.customerEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Failed to send event reminder:', error);
      return false;
    }
  }

  // Test email function for setup verification
  static async sendTestEmail(toEmail: string): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - cannot send test email');
      return false;
    }

    try {
      const emailContent = {
        to: toEmail,
        from: this.FROM_EMAIL,
        subject: 'Email Service Test - Success! ✅',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #27ae60; text-align: center;">Email Service Working! ✅</h1>
            <p style="text-align: center;">Your email service is properly configured and ready for production.</p>
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="color: #27ae60; margin: 0;">🎉 Ready for client launch! 🎉</p>
            </div>
          </div>
        `
      };

      await sgMail.send(emailContent);
      console.log(`✓ Test email sent successfully to ${toEmail}`);
      return true;

    } catch (error) {
      console.error('✗ Test email failed:', error);
      return false;
    }
  }
}