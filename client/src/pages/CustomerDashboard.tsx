import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Ticket, Check, Clock, X, Calendar, MapPin, Users, QrCode, Download } from "lucide-react";
import type { Booking, Event, FoodOption } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import QRCode from "qrcode";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string };
};

export default function CustomerDashboard() {
  const { data: bookings, isLoading, error } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const [expandedQRCode, setExpandedQRCode] = useState<number | null>(null);
  const [qrCodeUrls, setQrCodeUrls] = useState<{ [key: number]: string }>({});
  
  const toggleQRCode = (bookingId: number) => {
    if (expandedQRCode === bookingId) {
      setExpandedQRCode(null);
    } else {
      setExpandedQRCode(bookingId);
      generateQRCode(bookingId);
    }
  };

  const generateQRCode = async (bookingId: number) => {
    if (qrCodeUrls[bookingId]) return; // Already generated
    
    try {
      const booking = bookings?.find(b => b.id === bookingId);
      if (!booking) return;
      
      // Simple booking ID format that the scanner expects
      const qrData = `BOOKING:${booking.id}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrls(prev => ({ ...prev, [bookingId]: qrCodeDataUrl }));
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
      ctx.fillText(`Table ${booking.table?.tableNumber || 'TBD'}`, canvas.width / 2, 150);
      ctx.fillText(`Party Size: ${booking.partySize}`, canvas.width / 2, 170);

      // Guest names
      if (booking.guestNames) {
        ctx.fillText('Guests:', canvas.width / 2, 200);
        Object.entries(booking.guestNames).forEach(([seat, name], index) => {
          ctx.fillText(`${name}`, canvas.width / 2, 220 + (index * 20));
        });
      }

      // QR Code
      if (qrCodeUrls[booking.id]) {
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
        qrImg.src = qrCodeUrls[booking.id];
      }
    } catch (error) {
      console.error('Error downloading ticket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">My Tickets</h1>
        <div className="text-center">Loading your tickets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">My Tickets</h1>
        <div className="text-center text-red-500">Error loading tickets. Please try again.</div>
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
            <X className="w-3 h-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const sortedBookings = bookings && Array.isArray(bookings) ? 
    [...bookings].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
      return dateB.getTime() - dateA.getTime();
    }) : 
    [];

  return (
    <div>
      <div className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>

        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{booking.event.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleQRCode(booking.id)}
                    className="flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    {expandedQRCode === booking.id ? "Hide QR Code" : "Show QR Code"}
                  </Button>
                  {qrCodeUrls[booking.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRTicket(booking)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Ticket
                    </Button>
                  )}
                </div>

                {expandedQRCode === booking.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Entry QR Code</h4>
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded border">
                          <div className="text-xs text-center mb-2">Booking #{booking.id}</div>
                          <div className="flex justify-center">
                            {qrCodeUrls[booking.id] ? (
                              <img 
                                src={qrCodeUrls[booking.id]} 
                                alt="Entry QR Code" 
                                className="w-32 h-32"
                              />
                            ) : (
                              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-center mt-2">{booking.event.title}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Show this QR code at the venue entrance
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!sortedBookings || sortedBookings.length === 0) && (
            <Alert>
              <Ticket className="h-4 w-4" />
              <AlertTitle>No tickets yet</AlertTitle>
              <AlertDescription>
                You haven't made any bookings yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}