import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BookingSuccessSimple() {
  const [sessionId, setSessionId] = useState<string>('');
  const [bookingData, setBookingData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('session_id');
    
    if (id) {
      setSessionId(id);
      
      // Simple verification without credentials
      fetch(`/api/booking-success?session_id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(htmlContent => {
        // Server returns HTML success page, so we parse for success indicators
        if (htmlContent.includes('Payment Successful') || htmlContent.includes('🎉')) {
          setBookingData({ success: true, html: htmlContent });
        } else {
          setError('Payment verification failed');
        }
      })
      .catch(err => {
        console.error('Verification error:', err);
        setError('Unable to verify payment. Please contact support with your session ID.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
    } else {
      setError('No session ID found');
      setIsVerifying(false);
    }
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <h2 className="text-lg font-semibold">Verifying Payment</h2>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we confirm your booking...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-red-600">Verification Failed</h2>
              <p className="text-sm text-gray-600 text-center">{error}</p>
              {sessionId && (
                <div className="w-full p-3 bg-gray-100 rounded text-xs font-mono break-all">
                  Session ID: {sessionId}
                </div>
              )}
              <Button onClick={() => window.location.href = '/'} variant="outline">
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                Payment Successful!
              </h1>
              <p className="text-gray-600">
                Your booking has been confirmed.
              </p>
            </div>

            {bookingData && (
              <div className="w-full space-y-3">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Booking Details</h3>
                  <p className="text-sm text-green-700">
                    Booking ID: #{bookingData.booking}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-100 rounded text-xs font-mono break-all">
                  <strong>Session ID:</strong><br />
                  {sessionId}
                </div>
              </div>
            )}

            <div className="w-full space-y-2">
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full"
              >
                Back to Events
              </Button>
              <Button 
                onClick={() => window.location.href = '/profile'} 
                variant="outline"
                className="w-full"
              >
                View My Bookings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}