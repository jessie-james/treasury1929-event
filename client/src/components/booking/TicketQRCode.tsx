import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";

interface TicketQRCodeProps {
  bookingId: number;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  eventTitle?: string;
}

export function TicketQRCode({ 
  bookingId, 
  size = 200, 
  bgColor = "#ffffff", 
  fgColor = "#000000",
  eventTitle
}: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
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
  
  const handleDownload = async () => {
    if (!qrContainerRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Use html2canvas to capture the QR code container
      const canvas = await html2canvas(qrContainerRef.current, {
        backgroundColor: bgColor,
        scale: 2 // Higher resolution
      });
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ticket-${bookingId}${eventTitle ? `-${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}` : ''}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading QR code:", error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-xs mx-auto">
      <CardContent className="p-4 flex justify-center" ref={qrContainerRef}>
        <canvas 
          ref={canvasRef} 
          width={size} 
          height={size}
          className="max-w-full h-auto"
        />
      </CardContent>
      <CardFooter className="flex justify-center p-2 pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download QR Ticket"}
        </Button>
      </CardFooter>
    </Card>
  );
}