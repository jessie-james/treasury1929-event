// PHASE 1: Server reports with sections and name normalization
import express from 'express';
import { storage } from './storage';
import { normalizeString, normalizeName } from './utils/strings';
import { formatInTimeZone } from 'date-fns-tz';

const router = express.Router();

/**
 * POST /api/reports/server-sections
 * Generate printable HTML grouped course → table → seat for selected tables
 * Based on data structure from "Server Food Charts.xlsx"
 */
router.post('/server-sections', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { eventId, tableIds } = req.body;

    if (!eventId || !Array.isArray(tableIds) || tableIds.length === 0) {
      return res.status(400).json({ 
        error: 'eventId and tableIds array are required' 
      });
    }

    // Get event details
    const event = await storage.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get bookings for selected tables
    const allBookings = await storage.getBookingsByEventId(eventId);
    const bookings = allBookings.filter(booking => tableIds.includes(booking.tableId));
    
    // Group data by course → table → seat
    const sections: {
      salads: Record<number, any[]>;
      entrees: Record<number, any[]>;
      desserts: Record<number, any[]>;
      wines: Record<number, any[]>;
    } = {
      salads: {},
      entrees: {},
      desserts: {},
      wines: {}
    };

    for (const booking of bookings) {
      if (!['confirmed', 'reserved', 'comp'].includes(booking.status)) {
        continue; // Skip non-active bookings
      }

      const tableNumber = booking.tableId;
      const guestNames = (booking.guestNames || []).map((name: string) => normalizeName(name));
      const foodSelections = booking.foodSelections || [];
      const wineSelections = booking.wineSelections || [];

      // Process food selections by course
      foodSelections.forEach((selection: any, guestIndex: number) => {
        const guestName = guestNames[guestIndex] || `Guest ${guestIndex + 1}`;
        
        // Group by course type
        const courseTypes = ['salads', 'entrees', 'desserts'] as const;
        courseTypes.forEach(course => {
          if (selection[course]) {
            if (!sections[course][tableNumber]) {
              sections[course][tableNumber] = [];
            }
            
            sections[course][tableNumber].push({
              guestName: normalizeString(guestName),
              selection: normalizeString(selection[course]),
              seatNumber: guestIndex + 1
            });
          }
        });
      });

      // Process wine selections (table-based)
      if (wineSelections && wineSelections.length > 0) {
        if (!sections.wines[tableNumber]) {
          sections.wines[tableNumber] = [];
        }
        
        wineSelections.forEach((wine: any) => {
          sections.wines[tableNumber].push({
            selection: normalizeString(wine.name || wine.wine),
            quantity: wine.quantity || 1,
            type: wine.type || 'bottle'
          });
        });
      }
    }

    // Generate HTML report
    const html = generateServerSectionsHTML(event, sections, tableIds);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Error generating server sections report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * Generate HTML for server sections report
 */
function generateServerSectionsHTML(event: any, sections: any, tableIds: number[]): string {
  const eventDate = formatInTimeZone(event.date, 'America/Phoenix', 'EEEE, MMMM d, yyyy');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Food Charts - ${event.title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          font-size: 12px;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        .event-title { 
          font-size: 18px; 
          font-weight: bold; 
          margin-bottom: 5px;
        }
        .event-date { 
          font-size: 14px; 
          color: #666;
        }
        .section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 16px; 
          font-weight: bold; 
          background: #f0f0f0; 
          padding: 8px;
          margin-bottom: 15px;
          text-transform: uppercase;
          border-left: 4px solid #333;
        }
        .table-group { 
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 10px;
        }
        .table-header { 
          font-weight: bold; 
          font-size: 14px;
          margin-bottom: 8px;
          color: #333;
        }
        .guest-item { 
          margin: 3px 0;
          padding: 2px 5px;
          background: #f9f9f9;
        }
        .wine-item {
          margin: 3px 0;
          padding: 2px 5px;
          background: #fff3cd;
          font-weight: bold;
        }
        .no-selections { 
          color: #999; 
          font-style: italic;
        }
        @media print {
          body { margin: 10px; }
          .section { page-break-after: auto; }
          .table-group { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="event-title">${normalizeString(event.title)}</div>
        <div class="event-date">${eventDate}</div>
        <div style="margin-top: 10px; font-size: 12px;">
          Server Food Charts - Tables: ${tableIds.join(', ')}
        </div>
      </div>

      ${generateSectionHTML('Salads', sections.salads, tableIds)}
      ${generateSectionHTML('Entrees', sections.entrees, tableIds)}  
      ${generateSectionHTML('Desserts', sections.desserts, tableIds)}
      ${generateWineSectionHTML('Wine Selections', sections.wines, tableIds)}

      <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
        Generated: ${formatInTimeZone(new Date(), 'America/Phoenix', 'EEEE, MMMM d, yyyy HH:mm:ss')} (Phoenix Time)
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for a food section (salads, entrees, desserts)
 */
function generateSectionHTML(sectionTitle: string, sectionData: any, tableIds: number[]): string {
  let html = `<div class="section">
    <div class="section-title">${sectionTitle}</div>`;

  let hasContent = false;

  for (const tableId of tableIds) {
    const tableData = sectionData[tableId];
    if (tableData && tableData.length > 0) {
      hasContent = true;
      html += `
        <div class="table-group">
          <div class="table-header">Table ${tableId}</div>`;
      
      tableData.forEach((item: any) => {
        html += `
          <div class="guest-item">
            Seat ${item.seatNumber}: ${item.guestName} → ${item.selection}
          </div>`;
      });
      
      html += '</div>';
    }
  }

  if (!hasContent) {
    html += '<div class="no-selections">No selections for this section</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Generate HTML for wine section (table-based)
 */
function generateWineSectionHTML(sectionTitle: string, sectionData: any, tableIds: number[]): string {
  let html = `<div class="section">
    <div class="section-title">${sectionTitle}</div>`;

  let hasContent = false;

  for (const tableId of tableIds) {
    const tableData = sectionData[tableId];
    if (tableData && tableData.length > 0) {
      hasContent = true;
      html += `
        <div class="table-group">
          <div class="table-header">Table ${tableId}</div>`;
      
      tableData.forEach((item: any) => {
        html += `
          <div class="wine-item">
            ${item.quantity}x ${item.selection} (${item.type})
          </div>`;
      });
      
      html += '</div>';
    }
  }

  if (!hasContent) {
    html += '<div class="no-selections">No wine selections</div>';
  }

  html += '</div>';
  return html;
}

export default router;