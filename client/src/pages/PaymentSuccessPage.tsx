import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Download, ArrowRight, ArrowLeft, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import type { Booking, Event, FoodOption } from "@/../../shared/schema";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string } | string[];
};

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // On component mount, check URL parameters for information
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const bookingIdParam = urlParams.get('booking_id');
    
    if (bookingIdParam) {
      // We have the booking ID from the URL
      setBookingId(parseInt(bookingIdParam));
      setBookingReference(bookingIdParam);
    } else if (sessionId) {
      // Fallback: fetch from user bookings API if no booking ID in URL
      fetch('/api/user/bookings', { credentials: 'include' })
        .then(response => response.json())
        .then(bookings => {
          if (bookings && bookings.length > 0) {
            // Get the most recent booking (should be the one just created)
            const recentBooking = bookings[0];
            setBookingId(recentBooking.id);
            setBookingReference(recentBooking.id.toString());
          }
        })
        .catch(error => {
          console.error('Error fetching bookings:', error);
        });
    } else {
      // Last resort: if no session ID and no booking ID, try to get the most recent booking
      fetch('/api/user/bookings', { credentials: 'include' })
        .then(response => response.json())
        .then(bookings => {
          if (bookings && bookings.length > 0) {
            // Get the most recent booking
            const recentBooking = bookings[0];
            setBookingId(recentBooking.id);
            setBookingReference(recentBooking.id.toString());
          }
        })
        .catch(error => {
          console.error('Error fetching bookings:', error);
        });
    }
  }, []);

  // Fetch booking details if we have a booking ID
  const { data: booking, isLoading } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const response = await fetch(`/api/bookings/${bookingId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!bookingId,
  });

  // Fetch food options for displaying food selections
  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  // Generate QR code when booking is loaded
  useEffect(() => {
    if (booking && !qrCodeUrl) {
      generateQRCode(booking.id);
    }
  }, [booking, qrCodeUrl]);

  const generateQRCode = async (bookingId: number) => {
    try {
      // Just the booking ID number - exactly what the scanner expects
      const qrData = bookingId.toString();
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRTicket = async (booking: any) => {
    try {
      // Create a canvas to compose the ticket
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size - larger to accommodate food selections
      canvas.width = 400;
      canvas.height = 900;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Event Ticket', canvas.width / 2, 50);

      // Event title
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#7c3aed'; // Primary color
      ctx.fillText(booking.event.title, canvas.width / 2, 90);

      // Event details
      ctx.font = '14px Arial';
      ctx.fillStyle = '#374151'; // Gray-700
      ctx.fillText(`${format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}`, canvas.width / 2, 120);

      // Booking details
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280'; // Gray-500
      ctx.fillText(`Booking #${booking.id}`, canvas.width / 2, 150);

      // Table and party info
      if (booking.table?.tableNumber) {
        ctx.fillText(`Table ${booking.table.tableNumber} • ${booking.partySize} guests`, canvas.width / 2, 170);
      } else {
        ctx.fillText(`${booking.partySize} guests`, canvas.width / 2, 170);
      }

      let currentY = 200;

      // Food selections with comprehensive display
      if (booking.foodSelections && booking.foodSelections.length > 0) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#374151';
        ctx.fillText('Food Selections:', canvas.width / 2, currentY);
        currentY += 25;

        ctx.font = '11px Arial';
        ctx.fillStyle = '#6b7280';
        booking.foodSelections.forEach((selection, index) => {
          // Handle both object and array formats for guestNames
          let guestName = `Guest ${index + 1}`;
          if (booking.guestNames) {
            if (Array.isArray(booking.guestNames)) {
              guestName = booking.guestNames[index] || `Guest ${index + 1}`;
            } else if (typeof booking.guestNames === 'object') {
              // guestNames is stored as {"1": "NAME1", "2": "NAME2", ...}
              guestName = booking.guestNames[String(index + 1)] || `Guest ${index + 1}`;
            }
          }
          
          const saladItem = foodOptions?.find(item => item.id === selection.salad);
          const entreeItem = foodOptions?.find(item => item.id === selection.entree);
          const dessertItem = foodOptions?.find(item => item.id === selection.dessert);
          
          // Guest name header
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#374151';
          ctx.fillText(`${guestName}:`, canvas.width / 2, currentY);
          currentY += 18;
          
          // Food selections
          ctx.font = '11px Arial';
          ctx.fillStyle = '#6b7280';
          if (saladItem) {
            ctx.fillText(`Salad: ${saladItem.name}`, canvas.width / 2, currentY);
            currentY += 15;
          }
          if (entreeItem) {
            ctx.fillText(`Entree: ${entreeItem.name}`, canvas.width / 2, currentY);
            currentY += 15;
          }
          if (dessertItem) {
            ctx.fillText(`Dessert: ${dessertItem.name}`, canvas.width / 2, currentY);
            currentY += 15;
          }
          currentY += 10;
        });
        currentY += 10;
      }

      // Wine selections
      if (booking.wineSelections && booking.wineSelections.length > 0) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#374151';
        ctx.fillText('Wine Selections:', canvas.width / 2, currentY);
        currentY += 25;

        ctx.font = '11px Arial';
        ctx.fillStyle = '#6b7280';
        booking.wineSelections.forEach((selection, index) => {
          // Handle both object and array formats for guestNames
          let guestName = `Guest ${index + 1}`;
          if (booking.guestNames) {
            if (Array.isArray(booking.guestNames)) {
              guestName = booking.guestNames[index] || `Guest ${index + 1}`;
            } else if (typeof booking.guestNames === 'object') {
              // guestNames is stored as {"1": "NAME1", "2": "NAME2", ...}
              guestName = booking.guestNames[String(index + 1)] || `Guest ${index + 1}`;
            }
          }
          
          const wineItem = foodOptions?.find(item => item.id === selection.wine);
          
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#374151';
          ctx.fillText(`${guestName}:`, canvas.width / 2, currentY);
          currentY += 18;
          
          ctx.font = '11px Arial';
          ctx.fillStyle = '#6b7280';
          if (wineItem) {
            ctx.fillText(`Wine: ${wineItem.name}`, canvas.width / 2, currentY);
            currentY += 15;
          }
          currentY += 10;
        });
        currentY += 10;
      }

      // QR Code
      if (qrCodeUrl) {
        const qrImg = new Image();
        qrImg.onload = () => {
          // Position QR code
          const qrSize = 150;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = Math.max(currentY + 20, canvas.height - 220);
          
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          
          // Instructions
          ctx.font = '12px Arial';
          ctx.fillStyle = '#374151';
          ctx.fillText('Show this QR code at venue entrance', canvas.width / 2, qrY + qrSize + 30);
          
          // Download the ticket
          const link = document.createElement('a');
          link.download = `ticket-${booking.id}-${booking.event.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImg.src = qrCodeUrl;
      }
    } catch (error) {
      console.error('Error downloading ticket:', error);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto my-12 px-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Button>
      </div>
      
      <Card className="border-green-100 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
          <CardDescription className="text-lg">
            Thank you for your purchase
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Booking confirmation */}
          <div className="text-center py-2">
            <p className="text-gray-600">
              Your payment has been processed successfully. 
            </p>
            
            <div className="mt-6 bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-800 text-sm">
              <p>A confirmation email has been sent to your registered email address.</p>
              <p className="mt-2">Please keep your booking reference for your records.</p>
            </div>
          </div>

          {/* Show loading state */}
          {isLoading && bookingId && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading your booking details...</p>
            </div>
          )}

          {/* Fallback booking confirmed message if booking data fails to load */}
          {!booking && !isLoading && bookingId && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50 text-center">
              <h3 className="text-lg font-semibold mb-2 text-green-800">Booking Confirmed!</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Booking ID:</span>
                  <div className="bg-white p-2 rounded border mt-1 font-mono text-xs">
                    #{bookingId}
                  </div>
                </div>
                <p className="text-green-700">Your booking has been confirmed. You can view full details in your dashboard.</p>
              </div>
            </div>
          )}

          {/* Full Ticket Display - Matching Customer Dashboard Format */}
          {booking && !isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Table {booking.tableId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.partySize} guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-muted-foreground" />
                  <span>Booking #{booking.id}</span>
                </div>
              </div>

              {booking.guestNames && (
                <div>
                  <h4 className="font-medium mb-2">Guest Names:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Array.isArray(booking.guestNames) ? (
                      booking.guestNames.map((name, index) => (
                        <div key={index} className="flex justify-between">
                          <span>Guest {index + 1}:</span>
                          <span className="font-medium">{name}</span>
                        </div>
                      ))
                    ) : (
                      Object.entries(booking.guestNames).map(([seatNumber, name]) => (
                        <div key={seatNumber} className="flex justify-between">
                          <span>Guest {seatNumber}:</span>
                          <span className="font-medium">{name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {booking.foodSelections && booking.foodSelections.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Food Selections:</h4>
                  <div className="text-sm space-y-1">
                    {booking.foodSelections.map((selection, index) => {
                      const guestName = booking.guestNames 
                        ? Array.isArray(booking.guestNames) 
                          ? booking.guestNames[index] || `Guest ${index + 1}`
                          : booking.guestNames[index + 1] || `Guest ${index + 1}`
                        : `Guest ${index + 1}`;
                      const saladItem = foodOptions?.find(item => item.id === selection.salad);
                      const entreeItem = foodOptions?.find(item => item.id === selection.entree);
                      const dessertItem = foodOptions?.find(item => item.id === selection.dessert);
                      
                      return (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          <span className="font-medium">{guestName}:</span>
                          {saladItem && <span className="ml-2 block">Salad: {saladItem.name}</span>}
                          {entreeItem && <span className="ml-2 block">Entree: {entreeItem.name}</span>}
                          {dessertItem && <span className="ml-2 block">Dessert: {dessertItem.name}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {booking.wineSelections && booking.wineSelections.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Wine Selections:</h4>
                  <div className="text-sm space-y-1">
                    {booking.wineSelections.map((selection, index) => {
                      const guestName = booking.guestNames 
                        ? Array.isArray(booking.guestNames) 
                          ? booking.guestNames[index] || `Guest ${index + 1}`
                          : booking.guestNames[index + 1] || `Guest ${index + 1}`
                        : `Guest ${index + 1}`;
                      const wineItem = foodOptions?.find(item => item.id === selection.wine);
                      
                      return (
                        <div key={index} className="p-2 bg-purple-50 rounded">
                          <span className="font-medium">{guestName}:</span>
                          {wineItem && <span className="ml-2 block">Wine: {wineItem.name}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Complete Ticket Display - Matching Customer Dashboard */}
              <div className="mt-6 p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Ticket className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Your Ticket</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <h5 className="text-lg font-bold text-primary mb-2">{booking.event.title}</h5>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Table {booking.tableId}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.partySize} guests
                      </div>
                    </div>
                  </div>

                  {/* QR Code - always visible */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded border-2 border-gray-200">
                      <div className="text-xs text-center mb-2 font-medium">Booking #{booking.id}</div>
                      <div className="flex justify-center">
                        {qrCodeUrl ? (
                          <img 
                            src={qrCodeUrl} 
                            alt="Entry QR Code" 
                            className="w-32 h-32"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-center mt-2 font-medium">{booking.event.title}</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => downloadQRTicket(booking)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Ticket
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Show this QR code at the venue entrance
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          {booking && (
            <Button 
              variant="default" 
              size="lg"
              className="w-full flex items-center justify-center"
              onClick={() => {
                // Trigger download via the TicketQRCode component
                const downloadBtn = document.querySelector('.download-ticket-btn') as HTMLButtonElement;
                if (downloadBtn) {
                  downloadBtn.click();
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Ticket
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/my-bookings')}
            className="w-full flex items-center justify-center"
            variant="outline"
          >
            View My Bookings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}