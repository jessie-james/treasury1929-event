import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ArrowLeft, Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import type { Booking, Event, FoodOption } from "@/../../shared/schema";
import { downloadTicket as downloadTicketWithLogo } from "@/utils/ticketGenerator";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string };
};

export default function TicketDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/ticket/:bookingId');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const bookingId = params?.bookingId ? parseInt(params.bookingId) : null;

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
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

  const downloadTicket = async (booking: EnrichedBooking) => {
    if (!qrCodeUrl) {
      console.error('QR code not available for download');
      return;
    }

    await downloadTicketWithLogo({
      booking,
      qrCodeUrl,
      foodOptions
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto my-12 px-4">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to My Tickets
          </Button>
        </div>
        <div className="text-center">Loading ticket details...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container max-w-2xl mx-auto my-12 px-4">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to My Tickets
          </Button>
        </div>
        <div className="text-center text-red-500">
          Unable to load ticket details. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto my-12 px-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Tickets
        </Button>
      </div>

      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Your Ticket</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Event Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">{booking.event.title}</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </div>
              {booking.tableId && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Table {booking.tableId}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {booking.partySize} {booking.tableId ? 'guests' : 'tickets'}
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            {booking.tableId && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Table {booking.tableId}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{booking.partySize} {booking.tableId ? 'guests' : 'tickets'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-muted-foreground" />
              <span>Booking #{booking.id}</span>
            </div>
          </div>

          {/* Guest Names */}
          {booking.guestNames && Array.isArray(booking.guestNames) && booking.guestNames.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Guest Names:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {booking.guestNames.map((name, index) => (
                  <div key={index} className="flex justify-between">
                    <span>Guest {index + 1}:</span>
                    <span className="font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wine Selections */}
          {booking.wineSelections && booking.wineSelections.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Wine Selections:</h4>
              <div className="text-sm space-y-1">
                {booking.wineSelections.map((selection, index) => {
                  const guestName = booking.guestNames && Array.isArray(booking.guestNames) && booking.guestNames[index] 
                    ? booking.guestNames[index] 
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

          {/* Food Selections */}
          {booking.foodSelections && booking.foodSelections.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Food Selections:</h4>
              <div className="text-sm space-y-1">
                {booking.foodSelections.map((selection, index) => {
                  const guestName = booking.guestNames && Array.isArray(booking.guestNames) && booking.guestNames[index] 
                    ? booking.guestNames[index] 
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

          {/* QR Code Section */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-primary" />
              <h4 className="text-lg font-semibold">Entry QR Code</h4>
            </div>
            
            <div className="text-center space-y-4">
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
                  onClick={() => downloadTicket(booking)}
                  className="flex items-center gap-2"
                  disabled={!qrCodeUrl}
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
        </CardContent>
      </Card>
    </div>
  );
}