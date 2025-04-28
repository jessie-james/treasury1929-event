import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TicketQRCodeProps {
  bookingId: number;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

export function TicketQRCode({ 
  bookingId, 
  size = 200, 
  bgColor = "#ffffff", 
  fgColor = "#000000" 
}: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    // Function to generate a QR code
    const generateQRCode = async () => {
      if (!canvasRef.current) return;
      
      try {
        // Use the QRCode.js library dynamically
        const QRCode = (await import('qrcode')).default;
        
        // Convert booking ID to string and create QR code
        const bookingIdString = bookingId.toString();
        
        // Generate QR code on canvas
        await QRCode.toCanvas(canvasRef.current, bookingIdString, {
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor
          }
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        
        // Fallback: Draw text if QR code generation fails
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = fgColor;
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Booking ID: ${bookingId}`, size / 2, size / 2);
        }
      }
    };
    
    generateQRCode();
  }, [bookingId, size, bgColor, fgColor]);
  
  return (
    <Card className="w-full max-w-xs mx-auto">
      <CardContent className="p-4 flex justify-center">
        <canvas 
          ref={canvasRef} 
          width={size} 
          height={size}
          className="max-w-full h-auto"
        />
      </CardContent>
    </Card>
  );
}