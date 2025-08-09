import { format } from 'date-fns';

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
    guestNames?: { [seatNumber: number]: string } | string[];
  };
  qrCodeUrl: string;
  foodOptions?: any[];
}

export const generateTicketCanvas = async (options: TicketOptions): Promise<HTMLCanvasElement> => {
  const { booking, qrCodeUrl, foodOptions } = options;
  
  // Create a canvas to compose the ticket
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size - optimized for readability
  canvas.width = 450;
  canvas.height = 800; // Increased height to accommodate logo and contact info

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

  // Event title
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#7c3aed'; // Primary color
  ctx.fillText(booking.event.title, canvas.width / 2, currentY);
  currentY += 30;

  // Event details
  ctx.font = '14px Arial';
  ctx.fillStyle = '#374151'; // Gray-700
  const eventDate = booking.event.date instanceof Date ? booking.event.date : new Date(booking.event.date);
  ctx.fillText(`${format(eventDate, "EEEE, MMMM d, yyyy")}`, canvas.width / 2, currentY);
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
        ? booking.guestNames[guestNumber] || `Guest ${index + 1}`
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

  // Wine selections - handle the actual booking structure
  if (booking.wineSelections && booking.wineSelections.length > 0) {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#374151';
    ctx.fillText('Wine Selections:', canvas.width / 2, currentY);
    currentY += 20;

    ctx.font = '10px Arial';
    ctx.fillStyle = '#6b7280';
    
    booking.wineSelections.forEach((selection: any, index: number) => {
      const guestNumber = (index + 1).toString();
      const guestName = booking.guestNames && typeof booking.guestNames === 'object' 
        ? booking.guestNames[guestNumber] || `Guest ${index + 1}`
        : `Guest ${index + 1}`;
      
      // Find wine item by ID
      const wineItem = foodOptions?.find(item => item.id === selection.wine);
      
      ctx.fillText(`${guestName}:`, canvas.width / 2, currentY);
      currentY += 12;
      
      if (wineItem) {
        ctx.fillText(`  Wine: ${wineItem.name}`, canvas.width / 2, currentY);
        currentY += 12;
      }
      currentY += 8; // Space between guests
    });
    currentY += 15;
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
  const bottomY = canvas.height - 60;
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('The Treasury 1929', canvas.width / 2, bottomY);
  
  ctx.font = '10px Arial';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('2 E Congress St, Tucson, AZ 85701', canvas.width / 2, bottomY + 15);
  ctx.fillText('(520) 528-5270', canvas.width / 2, bottomY + 30);

  return canvas;
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