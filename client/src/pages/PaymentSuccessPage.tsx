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
  guestNames?: { [seatNumber: number]: string };
};

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // On component mount, check URL parameters for information
  useEffect(() => {
    // Get payment intent from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentReference = urlParams.get('reference');
    const sessionId = urlParams.get('session_id');
    
    // Set booking reference if available
    if (paymentReference) {
      setBookingReference(paymentReference);
      // Try to parse as booking ID if it's a number
      const parsedId = parseInt(paymentReference);
      if (!isNaN(parsedId)) {
        setBookingId(parsedId);
      }
    } else if (paymentIntent) {
      // Use payment intent ID as fallback reference
      setBookingReference(paymentIntent);
    }
    
    // Note: Payment verification now happens through the standard booking flow
  }, []);

  // Fetch booking details if we have a booking ID
  const { data: booking, isLoading } = useQuery({
    queryKey: ['/api/my-bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const response = await fetch('/api/my-bookings', { credentials: 'include' });
      if (!response.ok) return null;
      const bookings = await response.json();
      return bookings.find((b: any) => b.id === bookingId) || null;
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

      // Set canvas size
      canvas.width = 400;
      canvas.height = 600;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Event Ticket', canvas.width / 2, 40);

      // Event details
      ctx.font = '18px Arial';
      ctx.fillText(booking.event.title, canvas.width / 2, 80);
      
      ctx.font = '14px Arial';
      ctx.fillText(`Date: ${format(new Date(booking.event.date), 'PPP')}`, canvas.width / 2, 110);
      ctx.fillText(`Booking #${booking.id}`, canvas.width / 2, 130);
      ctx.fillText(`Table ${booking.tableId}`, canvas.width / 2, 150);
      ctx.fillText(`Party Size: ${booking.partySize}`, canvas.width / 2, 170);

      // Guest names
      if (booking.guestNames) {
        ctx.fillText('Guests:', canvas.width / 2, 200);
        Object.entries(booking.guestNames).forEach(([seat, name], index) => {
          ctx.fillText(`${name}`, canvas.width / 2, 220 + (index * 20));
        });
      }

      // QR Code
      if (qrCodeUrl) {
        const qrImg = new Image();
        qrImg.onload = () => {
          // Draw QR code
          ctx.drawImage(qrImg, (canvas.width - 150) / 2, 280, 150, 150);
          
          // Instructions
          ctx.font = '12px Arial';
          ctx.fillText('Show this QR code at venue entrance', canvas.width / 2, 460);
          
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
                    {Object.entries(booking.guestNames).map(([seat, name]) => (
                      <div key={seat} className="flex justify-between">
                        <span>Seat {seat}:</span>
                        <span className="font-medium">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {booking.foodSelections && booking.foodSelections.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Food Selections:</h4>
                  <div className="text-sm space-y-1">
                    {booking.foodSelections.map((selection, index) => {
                      const guestName = booking.guestNames ? booking.guestNames[index + 1] : `Guest ${index + 1}`;
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