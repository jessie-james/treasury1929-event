import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function BookingSuccess() {
  const [location] = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
          const response = await fetch(`/api/payment-success?session_id=${sessionId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          const data = await response.json();

          if (response.ok) {
            setBookingData(data.booking);
          } else {
            setError(data.error || 'Payment verification failed');
          }
        } else {
          setError('Missing payment session information');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setError('Unable to verify payment status');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
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
          <CardHeader>
            <CardTitle className="text-center text-red-600">Payment Issue</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <span>Payment Successful!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Booking Confirmed</h3>
            <p className="text-sm text-green-700">
              Your event booking has been successfully processed.
            </p>
          </div>

          {bookingData && (
            <div className="text-left space-y-2 bg-gray-50 p-4 rounded-lg">
              <p><strong>Booking ID:</strong> {bookingData.id}</p>
              <p><strong>Event ID:</strong> {bookingData.eventId}</p>
              <p><strong>Table:</strong> {bookingData.tableId}</p>
              <p><strong>Party Size:</strong> {bookingData.partySize}</p>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/bookings'}
              className="w-full"
            >
              View My Bookings
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return Home
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            A confirmation email has been sent to your email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}