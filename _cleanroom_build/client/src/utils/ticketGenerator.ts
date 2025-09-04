import { format } from 'date-fns';
import { formatPhoenixDate } from '@/lib/timezone';

interface TicketOptions {
  booking: {
    id: number;
    event: {
      title: string;
      date: string | Date;
    };
    partySize: number;
    tableId?: number;
    table?: { tableNumber: string };
    foodSelections?: any[];
    wineSelections?: any[];
    guestNames?: { [seatNumber: number]: string } | string[];
  };
  qrCodeUrl: string;
  foodOptions?: any[];
}

export const generateTicketCanvas = async (options: TicketOptions): Promise<HTMLCanvasElement> => {
  const { booking, qrCodeUrl, foodOptions } = options;
  
  // Calculate dynamic height based on content
  const calculateRequiredHeight = () => {
    let baseHeight = 400; // Base height for header, event details, etc.
    
    // Add height for guest names
    if (booking.partySize && booking.partySize > 0) {
      baseHeight += 25; // "Guest Names:" header
      baseHeight += (booking.partySize * 15) + 20; // Each guest name + spacing
    }
    
    // Add height for food selections
    if (booking.foodSelections && booking.foodSelections.length > 0) {
      baseHeight += 25; // "Food Selections:" header
      const foodLinesPerGuest = 4; // Guest name + salad + entree + dessert
      baseHeight += (booking.foodSelections.length * foodLinesPerGuest * 12) + (booking.foodSelections.length * 8) + 15; // Lines + guest spacing + section spacing
    }
    
    // Add height for wine selections
    if (booking.wineSelections && booking.wineSelections.length > 0) {
      baseHeight += 25; // "Wine Selections:" header
      baseHeight += (booking.wineSelections.length * 15) + 10; // Each wine + spacing
    }
    
    // Add height for QR code and contact info
    baseHeight += 150 + 15 + 30; // QR code + instruction + spacing
    baseHeight += 80; // Contact information section
    
    return Math.max(800, baseHeight); // Minimum 800px, or calculated height
  };
  
  // Create a canvas to compose the ticket
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size - dynamic height based on content
  canvas.width = 450;
  canvas.height = calculateRequiredHeight();

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  let currentY = 30;

  // Load and draw Treasury 1929 logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      logoImg.onload = () => {
        // Draw logo at the top center
        const logoWidth = 150;
        const logoHeight = 60;
        const logoX = (canvas.width - logoWidth) / 2;
        ctx.drawImage(logoImg, logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 20;
        resolve(null);
      };
      logoImg.onerror = () => {
        // If logo fails to load, just continue without it
        console.warn('Could not load Treasury 1929 logo');
        resolve(null);
      };
      logoImg.src = '/assets/treasury-logo.png';
    });
  } catch (error) {
    console.warn('Error loading logo:', error);
    currentY += 20; // Just add some space
  }

  // Title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Event Ticket', canvas.width / 2, currentY);
  currentY += 30;

  // Event title - with text wrapping for long titles
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#7c3aed'; // Primary color
  const maxLineWidth = canvas.width - 40; // Leave 20px margin on each side
  const titleLines = wrapText(ctx, booking.event.title, maxLineWidth);
  
  titleLines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, currentY + (index * 22));
  });
  currentY += (titleLines.length * 22) + 15;

  // Event details
  ctx.font = '14px Arial';
  ctx.fillStyle = '#374151'; // Gray-700
  // Use Phoenix timezone formatting to match email and confirmation page
  ctx.fillText(`${formatPhoenixDate(booking.event.date, "EEEE, MMMM d, yyyy")}`, canvas.width / 2, currentY);
  currentY += 20;
  
  // Add doors and concert timing
  ctx.font = '12px Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Doors: 5:45 PM • Concert: 6:30 PM', canvas.width / 2, currentY);
  currentY += 30;

  // Booking details
  ctx.font = '12px Arial';
  ctx.fillStyle = '#6b7280'; // Gray-500
  ctx.fillText(`Booking #${booking.id}`, canvas.width / 2, currentY);
  currentY += 20;

  // Table and party info - ONLY use customer-facing tableNumber, never internal IDs
  if (booking.table?.tableNumber) {
    const tableNumber = booking.table.tableNumber;
    
    // Validate table number is in expected range (floor: 1-32, mezzanine: 201-207)
    if (typeof tableNumber !== 'number') {
      throw new Error(`[TICKET] Missing customer table label for booking ${booking.id}`);
    }
    
    const isValidLabel = (tableNumber >= 1 && tableNumber <= 32) || (tableNumber >= 201 && tableNumber <= 207);
    if (!isValidLabel) {
      console.warn('[TABLE] Suspicious table label', { tableNumber, bookingId: booking.id });
    }
    
    ctx.fillText(`Table ${tableNumber} • ${booking.partySize} guests`, canvas.width / 2, currentY);
  } else {
    ctx.fillText(`${booking.partySize} ${booking.partySize === 1 ? 'ticket' : 'tickets'}`, canvas.width / 2, currentY);
  }
  currentY += 30;

  // Guest names - handle both object and array formats
  const guestNamesArray = Array.isArray(booking.guestNames) 
    ? booking.guestNames 
    : booking.guestNames && typeof booking.guestNames === 'object' 
      ? Object.values(booking.guestNames) 
      : [];
  
  if (guestNamesArray.length > 0) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#374151';
    ctx.fillText('Guest Names:', canvas.width / 2, currentY);
    currentY += 20;

    ctx.font = '12px Arial';
    ctx.fillStyle = '#6b7280';
    guestNamesArray.forEach((name: any, index: number) => {
      if (name && typeof name === 'string') {
        ctx.fillText(`${index + 1}. ${name}`, canvas.width / 2, currentY);
        currentY += 15;
      }
    });
    currentY += 10;
  }

  // Food selections - handle the actual booking structure
  if (booking.foodSelections && booking.foodSelections.length > 0) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#374151';
    ctx.fillText('Food Selections:', canvas.width / 2, currentY);
    currentY += 20;

    ctx.font = '10px Arial';
    ctx.fillStyle = '#6b7280';
    
    booking.foodSelections.forEach((selection: any, index: number) => {
      const guestNumber = (index + 1).toString();
      const guestName = booking.guestNames && typeof booking.guestNames === 'object' 
        ? (booking.guestNames as any)[guestNumber] || `Guest ${index + 1}`
        : `Guest ${index + 1}`;
      
      // Find food items by their IDs
      const saladItem = foodOptions?.find(item => item.id === selection.salad);
      const entreeItem = foodOptions?.find(item => item.id === selection.entree);
      const dessertItem = foodOptions?.find(item => item.id === selection.dessert);
      
      ctx.fillText(`${guestName}:`, canvas.width / 2, currentY);
      currentY += 12;
      
      if (saladItem) {
        ctx.fillText(`  Salad: ${saladItem.name}`, canvas.width / 2, currentY);
        currentY += 12;
      }
      if (entreeItem) {
        ctx.fillText(`  Entree: ${entreeItem.name}`, canvas.width / 2, currentY);
        currentY += 12;
      }
      if (dessertItem) {
        ctx.fillText(`  Dessert: ${dessertItem.name}`, canvas.width / 2, currentY);
        currentY += 12;
      }
      currentY += 8; // Space between guests
    });
    currentY += 15;
  }

  // Wine selections - table-based selections
  if (booking.wineSelections && booking.wineSelections.length > 0) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#374151';
    ctx.fillText(`Table ${booking.table?.tableNumber || 'TBD'} Wine Selections:`, canvas.width / 2, currentY);
    currentY += 20;

    ctx.font = '10px Arial';
    ctx.fillStyle = '#6b7280';
    
    booking.wineSelections.forEach((selection: any) => {
      // Handle both old format (wine ID) and new format (wine object)
      let wineName = '';
      let quantity = selection.quantity || 1;
      
      if (selection.name) {
        // New format: selection has name, price, quantity
        wineName = selection.name;
      } else if (selection.wine) {
        // Old format: selection has wine ID
        const wineItem = foodOptions?.find(item => item.id === selection.wine);
        wineName = wineItem?.name || 'Unknown Wine';
      } else if (selection.id) {
        // Format with direct ID reference
        const wineItem = foodOptions?.find(item => item.id === selection.id);
        wineName = wineItem?.name || 'Unknown Wine';
      }
      
      if (wineName) {
        ctx.fillText(`${quantity}x ${wineName}`, canvas.width / 2, currentY);
        currentY += 15;
      }
    });
    currentY += 10;
  }

  // QR Code
  if (qrCodeUrl) {
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = () => {
        // Position QR code
        const qrSize = 150;
        const qrX = (canvas.width - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, currentY, qrSize, qrSize);
        currentY += qrSize + 15;
        
        // Instructions
        ctx.font = '12px Arial';
        ctx.fillStyle = '#374151';
        ctx.fillText('Show this QR code at venue entrance', canvas.width / 2, currentY);
        currentY += 30;
        resolve(null);
      };
      qrImg.src = qrCodeUrl;
    });
  }

  // Contact Information at the bottom
  currentY += 20; // Add some extra space before contact info
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('The Treasury 1929', canvas.width / 2, currentY);
  currentY += 18;
  
  ctx.font = '10px Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('2 E Congress St, Tucson, AZ 85701', canvas.width / 2, currentY);
  currentY += 15;
  ctx.fillText('(520) 528-5270', canvas.width / 2, currentY);

  return canvas;
};

// Helper function to wrap text to fit within a given width
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

export const downloadTicket = async (options: TicketOptions) => {
  try {
    const canvas = await generateTicketCanvas(options);
    
    // Download the ticket
    const link = document.createElement('a');
    link.download = `ticket-${options.booking.id}-${options.booking.event.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (error) {
    console.error('Error downloading ticket:', error);
  }
};