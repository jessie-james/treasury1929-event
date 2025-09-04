// PDF generation service for kitchen and server reports
import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface OrderItem {
  type: string;
  name: string;
  quantity: number;
  dietary?: string[];
}

interface GuestOrder {
  guestName: string;
  guestNumber: number;
  items: OrderItem[];
  status?: string;
  orderTracking?: boolean;
}

interface BookingOrder {
  bookingId: number;
  tableNumber: number;
  tableZone: string;
  partySize: number;
  customerEmail: string;
  status: string;
  guestOrders: GuestOrder[];
  totalGuests: number;
  hasOrders: boolean;
}

export class PDFGenerator {
  
  // Generate Kitchen-focused PDF: Food type summaries and preparation lists
  static generateKitchenReport(orders: BookingOrder[], res: Response) {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="kitchen-orders-report.pdf"');
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('KITCHEN ORDERS REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Food type summaries
    const foodSummary = this.calculateFoodSummary(orders);
    
    // Salads Section
    doc.fontSize(16).font('Helvetica-Bold').text('SALADS PREPARATION LIST', { underline: true });
    doc.moveDown(0.5);
    
    Object.entries(foodSummary.salads).forEach(([item, count]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${item}: ${count} portions`);
    });
    doc.moveDown(1);

    // Entrees Section
    doc.fontSize(16).font('Helvetica-Bold').text('ENTREES PREPARATION LIST', { underline: true });
    doc.moveDown(0.5);
    
    Object.entries(foodSummary.entrees).forEach(([item, count]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${item}: ${count} portions`);
    });
    doc.moveDown(1);

    // Desserts Section
    doc.fontSize(16).font('Helvetica-Bold').text('DESSERTS PREPARATION LIST', { underline: true });
    doc.moveDown(0.5);
    
    Object.entries(foodSummary.desserts).forEach(([item, count]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${item}: ${count} portions`);
    });
    doc.moveDown(1);

    // Wine Section
    doc.fontSize(16).font('Helvetica-Bold').text('WINE SERVICE LIST', { underline: true });
    doc.moveDown(0.5);
    
    Object.entries(foodSummary.wines).forEach(([item, count]) => {
      doc.fontSize(12).font('Helvetica-Bold').text(`${item}: ${count} bottles`);
    });
    doc.moveDown(2);

    // Detailed order breakdown by course timing
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').text('COURSE-BY-COURSE SERVICE TIMING', { align: 'center' });
    doc.moveDown(1);

    // Course 1: Salads
    doc.fontSize(14).font('Helvetica-Bold').text('COURSE 1: SALADS (Serve at 6:30 PM)');
    doc.moveDown(0.5);
    
    const saladsByTable = this.groupOrdersByTable(orders, 'salad');
    Object.entries(saladsByTable).forEach(([tableNum, items]) => {
      doc.fontSize(10).font('Helvetica').text(`Table ${tableNum}:`);
      items.forEach(item => {
        doc.fontSize(9).text(`  • ${item.name} (${item.guestName})`);
      });
    });
    doc.moveDown(1);

    // Course 2: Entrees
    doc.fontSize(14).font('Helvetica-Bold').text('COURSE 2: ENTREES (Serve at 7:15 PM)');
    doc.moveDown(0.5);
    
    const entreesByTable = this.groupOrdersByTable(orders, 'entree');
    Object.entries(entreesByTable).forEach(([tableNum, items]) => {
      doc.fontSize(10).font('Helvetica').text(`Table ${tableNum}:`);
      items.forEach(item => {
        doc.fontSize(9).text(`  • ${item.name} (${item.guestName})`);
      });
    });
    doc.moveDown(1);

    // Course 3: Desserts
    doc.fontSize(14).font('Helvetica-Bold').text('COURSE 3: DESSERTS (Serve at 8:30 PM)');
    doc.moveDown(0.5);
    
    const dessertsByTable = this.groupOrdersByTable(orders, 'dessert');
    Object.entries(dessertsByTable).forEach(([tableNum, items]) => {
      doc.fontSize(10).font('Helvetica').text(`Table ${tableNum}:`);
      items.forEach(item => {
        doc.fontSize(9).text(`  • ${item.name} (${item.guestName})`);
      });
    });

    doc.end();
  }

  // Generate Server-focused PDF: Table assignments and guest details
  static generateServerReport(orders: BookingOrder[], res: Response) {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="server-orders-report.pdf"');
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('SERVER ORDERS REPORT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary stats
    doc.fontSize(14).font('Helvetica-Bold').text('EVENT SUMMARY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Total Tables: ${orders.length}`);
    doc.text(`Total Guests: ${orders.reduce((sum, order) => sum + order.partySize, 0)}`);
    doc.text(`Tables with Food Orders: ${orders.filter(order => order.hasOrders).length}`);
    doc.moveDown(1);

    // Table-by-table breakdown
    doc.fontSize(16).font('Helvetica-Bold').text('TABLE ASSIGNMENTS & ORDERS', { underline: true });
    doc.moveDown(1);

    orders.forEach(order => {
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
         .text(`TABLE ${order.tableNumber} (${order.partySize} guests) - ${order.tableZone}`);
      doc.fontSize(10).font('Helvetica').text(`Contact: ${order.customerEmail}`);
      doc.fontSize(10).text(`Status: ${order.status.toUpperCase()}`);
      doc.moveDown(0.3);

      // Guest details
      if (order.hasOrders) {
        order.guestOrders.forEach(guest => {
          if (guest.guestName === 'Table Service') {
            doc.fontSize(10).font('Helvetica-Bold').text('🍷 Wine Service:');
            guest.items.forEach(item => {
              doc.fontSize(9).font('Helvetica').text(`  • ${item.name}`);
            });
          } else {
            doc.fontSize(10).font('Helvetica-Bold').text(`👤 ${guest.guestName}:`);
            guest.items.forEach(item => {
              doc.fontSize(9).font('Helvetica').text(`  ${item.type}: ${item.name}`);
            });
          }
        });
      } else {
        doc.fontSize(10).font('Helvetica').text('No food orders placed');
      }
      
      doc.moveDown(0.8);
      
      // Add page break every 8 tables to prevent overflow
      if (orders.indexOf(order) > 0 && orders.indexOf(order) % 8 === 0) {
        doc.addPage();
      }
    });

    // Service notes page
    doc.addPage();
    doc.fontSize(18).font('Helvetica-Bold').text('SERVICE NOTES & TIMING', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Service Timeline:');
    doc.fontSize(11).font('Helvetica');
    doc.text('• 5:45 PM - Guest Arrival & Seating');
    doc.text('• 6:30 PM - Salad Course Service');
    doc.text('• 7:15 PM - Entree Course Service');
    doc.text('• 8:30 PM - Dessert Course Service');
    doc.text('• 9:00 PM - Coffee & Final Service');
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Special Dietary Notes:');
    doc.fontSize(11).font('Helvetica');
    doc.text('• All desserts include berries on the side');
    doc.text('• Check for allergies: dairy, gluten, eggs');
    doc.text('• Vegetarian options clearly marked');
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Wine Service Protocol:');
    doc.fontSize(11).font('Helvetica');
    doc.text('• Present wine menu after salad service');
    doc.text('• Serve wine before entree course');
    doc.text('• Refill water glasses between courses');

    doc.end();
  }

  // Helper method to calculate food summaries
  private static calculateFoodSummary(orders: BookingOrder[]) {
    const summary = {
      salads: {} as Record<string, number>,
      entrees: {} as Record<string, number>,
      desserts: {} as Record<string, number>,
      wines: {} as Record<string, number>
    };

    orders.forEach(order => {
      order.guestOrders.forEach(guest => {
        guest.items.forEach(item => {
          const type = item.type.toLowerCase();
          const name = item.name;
          const quantity = item.quantity || 1;

          if (type === 'salad') {
            summary.salads[name] = (summary.salads[name] || 0) + quantity;
          } else if (type === 'entree') {
            summary.entrees[name] = (summary.entrees[name] || 0) + quantity;
          } else if (type === 'dessert') {
            summary.desserts[name] = (summary.desserts[name] || 0) + quantity;
          } else if (type === 'wine') {
            summary.wines[name] = (summary.wines[name] || 0) + quantity;
          }
        });
      });
    });

    return summary;
  }

  // Helper method to group orders by table for course timing
  private static groupOrdersByTable(orders: BookingOrder[], courseType: string) {
    const grouped: Record<string, Array<{name: string, guestName: string}>> = {};

    orders.forEach(order => {
      order.guestOrders.forEach(guest => {
        guest.items.forEach(item => {
          if (item.type.toLowerCase() === courseType.toLowerCase()) {
            const tableKey = order.tableNumber.toString();
            if (!grouped[tableKey]) {
              grouped[tableKey] = [];
            }
            grouped[tableKey].push({
              name: item.name,
              guestName: guest.guestName
            });
          }
        });
      });
    });

    return grouped;
  }
}