import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Download, ArrowRight, ArrowLeft, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { TicketQRCode } from '@/components/booking/TicketQRCode';
import { format } from 'date-fns';

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);

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
            
            {bookingReference && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-500 mb-1">Booking Reference:</p>
                <p className="font-mono font-medium text-lg">{bookingReference}</p>
              </div>
            )}
            
            <div className="mt-6 bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-800 text-sm">
              <p>A confirmation email has been sent to your registered email address.</p>
              <p className="mt-2">Please keep your booking reference for your records.</p>
            </div>
          </div>

          {/* Ticket Information */}
          {booking && !isLoading && (
            <div className="mt-8 p-6 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Your Ticket</h3>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xl font-bold text-primary mb-2">{booking.event.title}</h4>
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

                {/* Guest Names */}
                {booking.guestNames && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Guest Names:</h5>
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

                {/* QR Code */}
                <div className="flex justify-center mt-6">
                  <TicketQRCode 
                    bookingId={booking.id}
                    eventTitle={booking.event.title}
                    containerSelector=".ticket-container"
                  />
                </div>
                
                <div className="text-center text-sm text-gray-500">
                  Show this QR code at the venue entrance
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