import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Download, ArrowRight, ArrowLeft, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { formatEventTimes } from '@/lib/timezone';
import QRCode from 'qrcode';
import type { Booking, Event, FoodOption } from "@/../../shared/schema";
import { downloadTicket } from "@/utils/ticketGenerator";

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
      const parsedId = parseInt(bookingIdParam);
      if (!isNaN(parsedId)) {
        setBookingId(parsedId);
        setBookingReference(bookingIdParam);
      }
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
    queryKey: ['/api/user/bookings', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const response = await fetch(`/api/user/bookings/${bookingId}`, { credentials: 'include' });
      if (!response.ok) return null;
      const bookingData = await response.json();
      console.log('🎫 Full booking data:', JSON.stringify(bookingData, null, 2));
      return bookingData;
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
    if (!qrCodeUrl) {
      console.error('QR code not available for download');
      return;
    }

    await downloadTicket({
      booking,
      qrCodeUrl,
      foodOptions
    });
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

          {/* Complete Event Details */}
          {booking && !isLoading && (
            <div className="space-y-6">
              {/* Event Title */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-primary mb-2">{booking.event.title}</h2>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {(() => {
                      try {
                        if (!booking.event?.date) return 'Date TBD';
                        const { eventDate, timeDisplay } = formatEventTimes(booking.event.date);
                        return `${eventDate} at ${timeDisplay}`;
                      } catch (error) {
                        console.error('Date formatting error:', error);
                        return format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a");
                      }
                    })()}
                  </span>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Confirmed
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Table {booking.table?.tableNumber || booking.tableId || 'TBD'}</span>
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

              {/* Guest Names Section */}
              {booking.guestNames && Object.keys(booking.guestNames).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Guest Names:
                  </h4>
                  <div className="space-y-2 text-sm">
                    {typeof booking.guestNames === 'object' && !Array.isArray(booking.guestNames) ? (
                      Object.entries(booking.guestNames).map(([seatNumber, name]: [string, any]) => (
                        <div key={seatNumber} className="flex justify-between">
                          <span className="text-muted-foreground">Guest {seatNumber}:</span>
                          <span className="font-medium">{String(name)}</span>
                        </div>
                      ))
                    ) : Array.isArray(booking.guestNames) ? (
                      booking.guestNames.map((name: string, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-muted-foreground">Guest {index + 1}:</span>
                          <span className="font-medium">{name}</span>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              )}

              {/* Food Selections Section */}
              {booking.foodSelections && booking.foodSelections.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Food Selections:
                  </h4>
                  <div className="space-y-3 text-sm">
                    {booking.foodSelections.map((selection: any, index: number) => {
                      // Get guest name from the object structure
                      const guestNumber = (index + 1).toString();
                      const guestName = booking.guestNames && typeof booking.guestNames === 'object' 
                        ? booking.guestNames[guestNumber] || booking.guestNames[(index + 1)] || `Guest ${index + 1}`
                        : `Guest ${index + 1}`;
                      const saladItem = foodOptions?.find(item => item.id === selection.salad);
                      const entreeItem = foodOptions?.find(item => item.id === selection.entree);
                      const dessertItem = foodOptions?.find(item => item.id === selection.dessert);
                      
                      return (
                        <div key={index} className="p-3 bg-white rounded border">
                          <div className="font-medium text-primary mb-2">{guestName}:</div>
                          <div className="space-y-1 text-xs">
                            {saladItem && (
                              <div>• Salad: {saladItem.name}</div>
                            )}
                            {entreeItem && (
                              <div>• Entree: {entreeItem.name}</div>
                            )}
                            {dessertItem && (
                              <div>• Dessert: {dessertItem.name}</div>
                            )}
                          </div>
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
                    {booking.wineSelections.map((selection: any, index: number) => {
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

              {/* Complete Ticket Display */}
              <div className="mt-6 p-6 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Ticket className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Your Ticket</h4>
                </div>
                
                <div className="space-y-6">
                  <div className="text-center">
                    <h5 className="text-xl font-bold text-primary mb-2">{booking.event.title}</h5>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {(() => {
                          try {
                            if (!booking.event?.date) return 'Date TBD';
                            const { eventDate, timeDisplay } = formatEventTimes(booking.event.date);
                            return `${eventDate} at ${timeDisplay}`;
                          } catch (error) {
                            console.error('Date formatting error:', error);
                            return format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a");
                          }
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Table {booking.table?.tableNumber || booking.tableId || 'TBD'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.partySize} guests
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
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
          {/* Removed the buttons as requested */}
        </CardFooter>
      </Card>
    </div>
  );
}