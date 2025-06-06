import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export function BookingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2 text-orange-600">
            <XCircle className="h-6 w-6" />
            <span>Payment Cancelled</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">Booking Not Completed</h3>
            <p className="text-sm text-orange-700">
              Your payment was cancelled and no booking has been created.
            </p>
          </div>

          <p className="text-gray-600">
            No charges have been made to your payment method. You can try booking again at any time.
          </p>

          <div className="space-y-2">
            <Button 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Try Booking Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}