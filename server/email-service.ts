import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';
import { format } from 'date-fns';

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

  async sendBookingConfirmation(data: EmailConfirmationData): Promise<boolean> {
    if (!this.initialized) {
      console.log('📧 Email service not initialized - skipping email');
      return false;
    }

    try {
      // Generate QR code for the booking
      const qrData = JSON.stringify({
        bookingId: data.booking.id,
        eventId: data.event.id,
        date: data.event.date,
        status: data.booking.status
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);

      // Format the event date
      const eventDate = format(new Date(data.event.date), 'EEEE, MMMM d, yyyy');
      const eventTime = format(new Date(data.event.date), 'h:mm a');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmation - The Treasury 1929</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8B4513; margin-bottom: 10px;">The Treasury 1929</h1>
            <h2 style="color: #4a4a4a; margin-top: 0;">Booking Confirmation</h2>
          </div>

          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #8B4513;">Event Details</h3>
            <p><strong>Event:</strong> ${data.event.title}</p>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Time:</strong> ${eventTime}</p>
            <p><strong>Venue:</strong> ${data.venue.name}</p>
            <p><strong>Address:</strong> ${data.venue.address}</p>
          </div>

          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #8B4513;">Booking Information</h3>
            <p><strong>Booking ID:</strong> ${data.booking.id}</p>
            <p><strong>Table:</strong> ${data.table.tableNumber} (${data.table.floor})</p>
            <p><strong>Party Size:</strong> ${data.booking.partySize} guests</p>
            <p><strong>Status:</strong> ${data.booking.status}</p>
            ${data.booking.notes ? `<p><strong>Special Notes:</strong> ${data.booking.notes}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <img src="${qrCodeDataUrl}" alt="Booking QR Code" style="max-width: 200px; height: auto;" />
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Please present this QR code at check-in
            </p>
          </div>

          <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Important:</strong> Please arrive 15 minutes before the event start time. 
              If you need to make changes to your booking, please contact us at 
              <a href="mailto:info@thetreasury1929.com">info@thetreasury1929.com</a> 
              or call (520) 123-4567.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
            <p>The Treasury 1929 • ${data.venue.address}</p>
            <p>Thank you for choosing us for your special evening!</p>
          </div>
        </body>
        </html>
      `;

      const msg = {
        to: data.booking.customerEmail,
        from: {
          email: 'noreply@thetreasury1929.com',
          name: 'The Treasury 1929'
        },
        subject: `Booking Confirmation - ${data.event.title}`,
        html: htmlContent,
      };

      await sgMail.send(msg);
      console.log(`✓ Booking confirmation email sent to ${data.booking.customerEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error);
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

  async sendPasswordResetEmail(data: any): Promise<boolean> {
    console.log('📧 Password reset email would be sent (not implemented)');
    return true;
  }
}

export const EmailService = new EmailServiceClass();