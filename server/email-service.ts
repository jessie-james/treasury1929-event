import sgMail from '@sendgrid/mail';
import { Booking, Event, User, Table, Venue } from '@shared/schema';

// Initialize SendGrid
let emailInitialized = false;

function initializeEmail() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('⚠️  SENDGRID_API_KEY not found. Email service disabled.');
    return false;
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    emailInitialized = true;
    console.log('✓ SendGrid email service initialized');
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
  private static FROM_EMAIL = process.env.FROM_EMAIL || 'jose@sahuaroworks.com';
  private static ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jose@sahuaroworks.com';

  static async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    if (!emailInitialized) {
      console.log('📧 Email service not initialized - skipping booking confirmation');
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

      const guestList = booking.guestNames && booking.guestNames.length > 0 
        ? booking.guestNames.join(', ') 
        : 'Guest names not provided';

      const emailContent = {
        to: booking.customerEmail,
        from: this.FROM_EMAIL,
        subject: `Booking Confirmation - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50; text-align: center;">Booking Confirmed! 🎉</h1>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #34495e; margin-top: 0;">Event Details</h2>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date & Time:</strong> ${eventDate}</p>
              <p><strong>Venue:</strong> ${venue.name}</p>
              <p><strong>Table:</strong> ${table.tableNumber} (${table.floor} floor)</p>
              <p><strong>Party Size:</strong> ${booking.partySize} people</p>
              <p><strong>Guests:</strong> ${guestList}</p>
            </div>

            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">Booking Reference</h3>
              <p style="font-size: 18px; font-weight: bold; color: #2c3e50;">#{booking.id}</p>
              <p style="font-size: 14px; color: #666;">Please keep this reference number for your records.</p>
            </div>

            ${booking.notes ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">Special Notes</h4>
              <p style="color: #856404;">${booking.notes}</p>
            </div>
            ` : ''}

            <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">Important Information</h3>
              <ul style="color: #0c5460;">
                <li>Please arrive 15 minutes before the event start time</li>
                <li>Bring a photo ID for check-in</li>
                <li>Contact us if you need to make any changes</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666;">Need help? Contact us at ${this.ADMIN_EMAIL}</p>
              <p style="color: #666; font-size: 14px;">Thank you for choosing ${venue.name}!</p>
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