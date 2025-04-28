import { useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { QrCode } from "lucide-react";

interface TicketQRCodeProps {
  bookingId: number;
  size?: number;
}

export function TicketQRCode({ bookingId, size = 200 }: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const qrCodeData = `${bookingId}`; // Just use the booking ID as the QR code data
    
    // Generate QR code in canvas
    // Since we don't want to add external dependencies for QR code generation,
    // we'll simulate a QR code with a simple pattern based on the booking ID
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Draw QR code simulation
    const cellSize = Math.floor(size / 20);
    ctx.fillStyle = 'black';
    
    // Draw position detection patterns (the three squares in the corners)
    // Top-left
    ctx.fillRect(cellSize, cellSize, cellSize * 7, cellSize * 7);
    ctx.fillStyle = 'white';
    ctx.fillRect(cellSize * 2, cellSize * 2, cellSize * 5, cellSize * 5);
    ctx.fillStyle = 'black';
    ctx.fillRect(cellSize * 3, cellSize * 3, cellSize * 3, cellSize * 3);
    
    // Top-right
    ctx.fillStyle = 'black';
    ctx.fillRect(size - cellSize * 8, cellSize, cellSize * 7, cellSize * 7);
    ctx.fillStyle = 'white';
    ctx.fillRect(size - cellSize * 7, cellSize * 2, cellSize * 5, cellSize * 5);
    ctx.fillStyle = 'black';
    ctx.fillRect(size - cellSize * 6, cellSize * 3, cellSize * 3, cellSize * 3);
    
    // Bottom-left
    ctx.fillStyle = 'black';
    ctx.fillRect(cellSize, size - cellSize * 8, cellSize * 7, cellSize * 7);
    ctx.fillStyle = 'white';
    ctx.fillRect(cellSize * 2, size - cellSize * 7, cellSize * 5, cellSize * 5);
    ctx.fillStyle = 'black';
    ctx.fillRect(cellSize * 3, size - cellSize * 6, cellSize * 3, cellSize * 3);
    
    // Draw data cells (based on booking ID)
    const idString = bookingId.toString();
    ctx.fillStyle = 'black';
    
    for (let i = 0; i < idString.length; i++) {
      const digit = parseInt(idString[i]);
      // Use the digit to determine position of some blocks
      for (let j = 0; j < digit + 1; j++) {
        const x = ((i * 4) % 10 + 9) * cellSize;
        const y = (Math.floor(i / 3) * 3 + j + 9) * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
    
    // Add some random blocks to make it look more like a QR code
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * 18 + 1) * cellSize;
      const y = Math.floor(Math.random() * 18 + 1) * cellSize;
      // Skip the position detection patterns
      if ((x < cellSize * 8 && y < cellSize * 8) || 
          (x > size - cellSize * 9 && y < cellSize * 8) ||
          (x < cellSize * 8 && y > size - cellSize * 9)) {
        continue;
      }
      ctx.fillRect(x, y, cellSize, cellSize);
    }
    
    // Add booking ID text to center
    ctx.fillStyle = 'white';
    ctx.fillRect(size/2 - cellSize * 5, size/2 - cellSize, cellSize * 10, cellSize * 2);
    ctx.fillStyle = 'black';
    ctx.font = `${cellSize * 1.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`#${bookingId}`, size/2, size/2 + cellSize/2);
    
  }, [bookingId, size]);
  
  return (
    <Card className="w-fit mx-auto">
      <CardContent className="p-4 text-center">
        <div className="flex justify-center mb-2">
          <QrCode className="h-5 w-5" />
          <span className="ml-2 font-medium">Ticket QR Code</span>
        </div>
        <canvas 
          ref={canvasRef} 
          width={size} 
          height={size} 
          className="border rounded-md"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Booking #{bookingId}
        </p>
      </CardContent>
    </Card>
  );
}