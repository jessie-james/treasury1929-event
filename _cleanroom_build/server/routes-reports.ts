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

    // Get table details with venue information
    const tablesMap: Record<number, any> = {};
    for (const tableId of tableIds) {
      const table = await storage.getTableById(tableId);
      if (table) {
        const venue = await storage.getVenueById(table.venueId);
        tablesMap[tableId] = {
          ...table,
          venueName: venue?.name || 'Main Floor'
        };
      }
    }

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
              seatNumber: guestIndex + 1,
              allergens: selection.allergens || [],
              dietaryRestrictions: selection.dietaryRestrictions || [],
              notes: selection.notes || '',
              tableInfo: tablesMap[tableNumber]
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

    // Generate HTML report with enhanced table information
    const html = generateServerSectionsHTML(event, sections, tableIds, tablesMap);
    
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
function generateServerSectionsHTML(event: any, sections: any, tableIds: number[], tablesMap: Record<number, any>): string {
  const eventDate = formatInTimeZone(event.date, 'America/Phoenix', 'EEEE, MMMM d, yyyy');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Food Charts - ${event.title}</title>
      <style>
        body { 
          font-family: 'Helvetica Neue', Arial, sans-serif; 
          margin: 15px; 
          font-size: 13px;
          line-height: 1.5;
          color: #1a1a1a;
        }
        .header { 
          text-align: center; 
          margin-bottom: 25px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 12px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 6px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .event-title { 
          font-size: 24px; 
          font-weight: 700; 
          margin-bottom: 8px;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        .event-date { 
          font-size: 14px; 
          color: #666;
        }
        .section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
          page-break-after: always;
        }
        .section-title { 
          font-size: 18px; 
          font-weight: 700; 
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); 
          color: white;
          padding: 12px 16px;
          margin-bottom: 20px;
          text-transform: uppercase;
          border-radius: 6px;
          letter-spacing: 1px;
          box-shadow: 0 3px 6px rgba(37,99,235,0.2);
        }
        .table-group { 
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 10px;
        }
        .table-header { 
          font-weight: 600; 
          font-size: 16px;
          margin-bottom: 12px;
          color: #0f172a;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 10px 14px;
          border-radius: 8px;
          border: 2px solid #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .guest-item { 
          margin: 6px 0;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #64748b;
          font-size: 14px;
          transition: background-color 0.2s ease;
        }
        .guest-item:hover {
          background: #f1f5f9;
        }
        .wine-item {
          margin: 6px 0;
          padding: 10px 14px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid #f59e0b;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(245,158,11,0.1);
        }
        .no-selections { 
          color: #999; 
          font-style: italic;
        }
        @media print {
          body { 
            margin: 8mm; 
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            background: #f8fafc !important;
            box-shadow: none !important;
          }
          .section { 
            page-break-after: auto; 
            margin-bottom: 20px;
          }
          .section-title {
            background: #2563eb !important;
            color: white !important;
            box-shadow: none !important;
          }
          .table-group { 
            page-break-inside: avoid;
            margin-bottom: 15px;
          }
          .table-header {
            background: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
          }
          .guest-item {
            background: #f8fafc !important;
            border-left: 2px solid #64748b !important;
          }
          .wine-item {
            background: #fef3c7 !important;
            border: 1px solid #f59e0b !important;
          }
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

      ${generateSectionHTML('Salad/Appetizer', sections.salads, tableIds, tablesMap)}
      ${generateSectionHTML('Entrée', sections.entrees, tableIds, tablesMap)}  
      ${generateSectionHTML('Dessert', sections.desserts, tableIds, tablesMap)}
      ${generateWineSectionHTML('Wine Selections', sections.wines, tableIds, tablesMap)}

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
function generateSectionHTML(sectionTitle: string, sectionData: any, tableIds: number[], tablesMap: Record<number, any>): string {
  let html = `<div class="section">
    <div class="section-title">${sectionTitle}</div>`;

  let hasContent = false;

  for (const tableId of tableIds) {
    const tableData = sectionData[tableId];
    if (tableData && tableData.length > 0) {
      hasContent = true;
      const table = tablesMap[tableId];
      const partySize = tableData.length;
      const venueName = table?.venueName || 'Main Floor';
      
      html += `
        <div class="table-group">
          <div class="table-header">TABLE ${tableId} — Party ${partySize} — ${venueName}</div>
          <div style="font-size: 11px; margin-bottom: 8px; color: #666; font-weight: normal;">
            Seat | Guest Name | Allergens/Dietary | Selection | Wine | Notes
          </div>`;
      
      tableData.forEach((item: any) => {
        const allergensText = item.allergens?.length > 0 ? item.allergens.join(', ') : 'None';
        const dietaryText = item.dietaryRestrictions?.length > 0 ? item.dietaryRestrictions.join(', ') : 'None';
        const allergensDisplay = allergensText === 'None' && dietaryText === 'None' ? 'None' : `${allergensText} / ${dietaryText}`.replace('None / ', '').replace(' / None', '');
        
        html += `
          <div class="guest-item" style="display: grid; grid-template-columns: 40px 1fr 1fr 1fr 1fr 1fr; gap: 8px; align-items: center; padding: 4px 8px;">
            <span style="font-weight: bold;">${item.seatNumber}</span>
            <span>${item.guestName}</span>
            <span style="font-size: 10px;">${allergensDisplay}</span>
            <span>${item.selection}</span>
            <span style="color: #8B4513;">See wine section</span>
            <span style="font-size: 10px; font-style: italic;">${item.notes || '—'}</span>
          </div>`;
      });
      
      html += '</div>';
    }
  }

  if (!hasContent) {
    html += '<div class="no-selections">No selections for this section</div>';
  } else {
    // Add course summary footer
    let totalGuests = 0;
    for (const tableId of tableIds) {
      const tableData = sectionData[tableId];
      if (tableData && tableData.length > 0) {
        totalGuests += tableData.length;
      }
    }
    html += `
      <div style="margin-top: 15px; padding: 8px; background: #f8f9fa; border-top: 2px solid #dee2e6; font-weight: bold; text-align: center;">
        ${sectionTitle} Summary: ${totalGuests} guest(s) across ${tableIds.length} table(s)
      </div>`;
  }

  html += '</div>';
  return html;
}

/**
 * Generate HTML for wine section (table-based)
 */
function generateWineSectionHTML(sectionTitle: string, sectionData: any, tableIds: number[], tablesMap: Record<number, any>): string {
  let html = `<div class="section">
    <div class="section-title">${sectionTitle}</div>`;

  let hasContent = false;

  for (const tableId of tableIds) {
    const tableData = sectionData[tableId];
    if (tableData && tableData.length > 0) {
      hasContent = true;
      const table = tablesMap[tableId];
      const venueName = table?.venueName || 'Main Floor';
      
      // Calculate wine totals for this table
      let totalBottles = 0;
      tableData.forEach((item: any) => {
        totalBottles += (item.quantity || 1);
      });
      
      html += `
        <div class="table-group">
          <div class="table-header">TABLE ${tableId} — Wine Selections — ${venueName}</div>`;
      
      tableData.forEach((item: any) => {
        html += `
          <div class="wine-item">
            ${item.quantity || 1} bottle(s) × ${item.selection}
          </div>`;
      });
      
      html += `
          <div style="margin-top: 8px; padding: 4px; background: #fff3cd; font-weight: bold; border-left: 3px solid #8B4513;">
            Table Total: ${totalBottles} bottle(s)
          </div>
        </div>`;
    }
  }

  if (!hasContent) {
    html += '<div class="no-selections">No wine selections</div>';
  } else {
    // Add wine summary footer
    let totalBottles = 0;
    let totalTables = 0;
    for (const tableId of tableIds) {
      const tableData = sectionData[tableId];
      if (tableData && tableData.length > 0) {
        totalTables++;
        tableData.forEach((item: any) => {
          totalBottles += (item.quantity || 1);
        });
      }
    }
    html += `
      <div style="margin-top: 15px; padding: 8px; background: #fff3cd; border-top: 2px solid #8B4513; font-weight: bold; text-align: center;">
        Wine Summary: ${totalBottles} bottle(s) total across ${totalTables} table(s)
      </div>`;
  }

  html += '</div>';
  return html;
}

export default router;