import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle, Download, ArrowRight, ArrowLeft } from 'lucide-react';

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  // On component mount, check URL parameters for information
  useEffect(() => {
    // Get payment intent from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentReference = urlParams.get('reference');
    
    // Set booking reference if available
    if (paymentReference) {
      setBookingReference(paymentReference);
    } else if (paymentIntent) {
      // Use payment intent ID as fallback reference
      setBookingReference(paymentIntent);
    }
    
    // Note: Payment verification now happens through the standard booking flow
  }, []);

  return (
    <div className="container max-w-lg mx-auto my-12 px-4">
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
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={() => navigate('/my-bookings')}
            className="w-full flex items-center justify-center"
          >
            View My Bookings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Return to Home
          </Button>
          
          {bookingReference && (
            <Button 
              variant="link"
              className="text-gray-500 text-sm"
              onClick={() => navigate(`/tickets/${bookingReference}`)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Tickets
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}