import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Music, Calendar, MapPin, Users, Image, Info, Link2, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  venue?: string;
  location?: string; // Venue location address
  notes?: string; // Additional ticket notes
  showShareButton?: boolean; // Whether to show share button
  showAdditionalInfo?: boolean; // Whether to show additional event information
}

export function TicketQRCode({ 
  bookingId, 
  size = 180, 
  bgColor = "#ffffff", 
  fgColor = "#000000",
  eventTitle,
  eventDate,
  tableId,
  seatNumbers = [],
  status,
  containerSelector,
  venue = "The Treasury 1929",
  location = "1929 Wabash Street, Chicago, IL 60605",
  notes,
  showShareButton = false,
  showAdditionalInfo = false
}: TicketQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrComponentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  
  useEffect(() => {
    // Function to generate a QR code
    const generateQRCode = async () => {
      if (!canvasRef.current) return;
      
      try {
        // Use the QRCode.js library dynamically
        const QRCode = (await import('qrcode')).default;
        
        // Create a more detailed data string with booking information
        const ticketData = JSON.stringify({
          id: bookingId,
          event: eventTitle,
          date: eventDate,
          table: tableId,
          seats: seatNumbers,
          venue: venue,
          status: status,
          location: location
        });
        
        // Generate QR code on canvas
        await QRCode.toCanvas(canvasRef.current, ticketData, {
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor
          },
          errorCorrectionLevel: 'H' // Higher error correction for better scanning
        });
        
        setQrGenerated(true);
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
          setQrGenerated(true);
        }
      }
    };
    
    generateQRCode();
  }, [bookingId, size, bgColor, fgColor, eventTitle, eventDate, tableId, seatNumbers]);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date TBD";
    try {
      return format(new Date(dateString), "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return dateString;
    }
  };
  
  const getStatusBadge = () => {
    if (!status) return null;
    
    const variants: Record<string, string> = {
      confirmed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      canceled: "bg-red-100 text-red-800 border-red-200",
      refunded: "bg-gray-100 text-gray-800 border-gray-200",
      checked_in: "bg-blue-100 text-blue-800 border-blue-200"
    };
    
    const statusClass = variants[status.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";
    
    return (
      <Badge className={`${statusClass} ml-2 capitalize`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };
  
  const formatSeats = (seats: number[] = []) => {
    if (!seats.length) return "No seats assigned";
    return seats.length === 1 
      ? `Seat #${seats[0]}` 
      : `Seats #${seats.join(', #')}`;
  };
  
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Determine what to capture - either the entire ticket container or the enhanced ticket card
      const elementToCapture = containerSelector 
        ? document.querySelector(containerSelector)
        : qrComponentRef.current;
      
      if (!elementToCapture) {
        console.error("Element to capture not found");
        setIsDownloading(false);
        return;
      }
      
      // Temporarily hide action buttons before capturing
      const actionButtons = document.querySelectorAll('.ticket-action-btn');
      actionButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      
      try {
        // Use html2canvas to capture the selected element without the action buttons
        const canvas = await html2canvas(elementToCapture as HTMLElement, {
          backgroundColor: bgColor,
          scale: 2, // Higher resolution for better quality
          logging: false,
          useCORS: true, // Allow cross-origin images
          allowTaint: true // Allow potentially tainted images
        });
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create download link with formatted filename
        const link = document.createElement('a');
        link.href = dataUrl;
        
        // Create a more descriptive filename
        const formattedEventName = eventTitle 
          ? eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase() 
          : '';
        
        const filename = `ticket-${venue.replace(/\s+/g, '-').toLowerCase()}-${bookingId}${formattedEventName ? `-${formattedEventName}` : ''}.png`;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        // Always restore action buttons visibility after capturing
        actionButtons.forEach(btn => {
          (btn as HTMLElement).style.display = '';
        });
      }
    } catch (error) {
      console.error("Error downloading ticket:", error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to share ticket
  const handleShare = async () => {
    if (typeof navigator === 'undefined' || !('share' in navigator)) {
      console.warn("Web Share API not supported");
      return;
    }
    
    try {
      // Create a blob from the canvas
      const elementToCapture = containerSelector 
        ? document.querySelector(containerSelector) 
        : qrComponentRef.current;
        
      if (!elementToCapture) {
        console.error("Element to capture not found");
        return;
      }
      
      // Temporarily hide action buttons before capturing
      const actionButtons = document.querySelectorAll('.ticket-action-btn');
      actionButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      
      try {
        const canvas = await html2canvas(elementToCapture as HTMLElement, {
          backgroundColor: bgColor,
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else throw new Error("Failed to create blob");
          }, 'image/png');
        });
        
        // Create file for sharing
        const formattedEventName = eventTitle 
          ? eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase() 
          : '';
          
        const filename = `ticket-${venue.replace(/\s+/g, '-').toLowerCase()}-${bookingId}${formattedEventName ? `-${formattedEventName}` : ''}.png`;
        const file = new File([blob], filename, { type: 'image/png' });
        
        // Share content
        await navigator.share({
          title: `${venue} - ${eventTitle || 'Event'} Ticket`,
          text: `My ticket for ${eventTitle || 'the event'} at ${venue} on ${formatDate(eventDate)}`,
          files: [file]
        });
      } finally {
        // Always restore action buttons visibility
        actionButtons.forEach(btn => {
          (btn as HTMLElement).style.display = '';
        });
      }
    } catch (error) {
      console.error("Error sharing ticket:", error);
      
      // Fallback for devices that don't support file sharing
      if (error instanceof TypeError && error.message.includes('files')) {
        try {
          await navigator.share({
            title: `${venue} - ${eventTitle || 'Event'} Ticket`,
            text: `My ticket for ${eventTitle || 'the event'} at ${venue} on ${formatDate(eventDate)}`
          });
        } catch (fallbackError) {
          console.error("Fallback sharing failed:", fallbackError);
        }
      }
    }
  };
  
  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border-2" ref={qrComponentRef}>
      <CardHeader className="p-4 pb-2 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="text-white">
          <div className="text-xs uppercase tracking-wider font-bold mb-1 opacity-80">
            {venue}
          </div>
          <h3 className="text-xl font-bold truncate">
            {eventTitle || "Event Ticket"}
          </h3>
          <div className="flex items-center text-xs mt-1 opacity-90">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(eventDate)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-3">
        <div className="flex">
          <div className="flex-1 pr-3">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> SEATING
                </div>
                <div className="text-sm font-medium">
                  Table {tableId}
                </div>
                <div className="text-xs text-gray-600">
                  {formatSeats(seatNumbers)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <Info className="h-3 w-3 mr-1" /> BOOKING INFO
                </div>
                <div className="text-sm flex items-center">
                  <span className="font-medium">#{bookingId}</span>
                  {getStatusBadge()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Beverages will be available for purchase at the event
                </div>
              </div>
            </div>
            
            {showAdditionalInfo && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" /> VENUE LOCATION
                </div>
                <div className="text-xs text-gray-600">
                  {location}
                </div>
              </div>
            )}
            
            {notes && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  <Info className="h-3 w-3 mr-1" /> NOTES
                </div>
                <div className="text-xs text-gray-600">
                  {notes}
                </div>
              </div>
            )}
            
            <Separator className="my-3" />
            
            <div className="text-xs text-center text-gray-500">
              Present this QR code at the venue entrance
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="border rounded-md p-1 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <canvas 
                      ref={canvasRef} 
                      width={size} 
                      height={size}
                      className="max-w-full h-auto"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>QR code contains your ticket information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between p-3 pt-0 bg-gray-50 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 ticket-action-btn"
          onClick={handleDownload}
          disabled={isDownloading || !qrGenerated}
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download"}
        </Button>
        
        {showShareButton && typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 ticket-action-btn"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}