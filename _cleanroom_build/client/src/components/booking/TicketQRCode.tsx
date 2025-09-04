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
  eventDate?: string;
  tableId?: number;
  seatNumbers?: number[];
  status?: string;
  containerSelector?: string; // Selector for the entire ticket container
}

export function TicketQRCode({ 
  bookingId, 
  size = 200, 
  bgColor = "#ffffff", 
  fgColor = "#000000",
  eventTitle,
  containerSelector
}: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrComponentRef = useRef<HTMLDivElement>(null);
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
    try {
      setIsDownloading(true);
      
      // Determine what to capture - either the entire ticket container or just the QR code
      const elementToCapture = containerSelector 
        ? document.querySelector(containerSelector)
        : qrComponentRef.current;
      
      if (!elementToCapture) {
        console.error("Element to capture not found");
        setIsDownloading(false);
        return;
      }
      
      // Temporarily hide download buttons before capturing
      const downloadButtons = document.querySelectorAll('.download-ticket-btn');
      downloadButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      
      try {
        // Use html2canvas to capture the selected element without the download button
        const canvas = await html2canvas(elementToCapture as HTMLElement, {
          backgroundColor: bgColor,
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true, // Allow cross-origin images
          allowTaint: true // Allow potentially tainted images
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
      } finally {
        // Always restore download buttons visibility after capturing
        downloadButtons.forEach(btn => {
          (btn as HTMLElement).style.display = '';
        });
      }
    } catch (error) {
      console.error("Error downloading ticket:", error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-xs mx-auto" ref={qrComponentRef}>
      <CardContent className="p-4 flex justify-center">
        <canvas 
          ref={canvasRef} 
          width={size} 
          height={size}
          className="max-w-full h-auto"
        />
      </CardContent>
      {/* Download button removed as requested */}
    </Card>
  );
}