import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Ticket, Check, Clock, X, Calendar, MapPin, Users, QrCode, Download, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import type { Booking, Event, FoodOption } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { downloadTicket } from "@/utils/ticketGenerator";

type EnrichedBooking = Booking & {
  event: Event;
  foodItems: FoodOption[];
  guestNames?: { [seatNumber: number]: string };
};

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();
  const { data: bookings, isLoading, error } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  const [qrCodeUrls, setQrCodeUrls] = useState<{ [key: number]: string }>({});
  
  // Generate QR codes for all bookings when they load
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      bookings.forEach(booking => {
        if (!qrCodeUrls[booking.id]) {
          generateQRCode(booking.id);
        }
      });
    }
  }, [bookings]);

  const generateQRCode = async (bookingId: number) => {
    if (qrCodeUrls[bookingId]) return; // Already generated
    
    try {
      const booking = bookings?.find(b => b.id === bookingId);
      if (!booking) return;
      
      // Just the booking ID number - exactly what the scanner expects
      const qrData = booking.id.toString();
      
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
    const qrCodeUrl = qrCodeUrls[booking.id];
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
    
    // ELDERLY-FRIENDLY: Much larger status badges
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-3 text-xl px-6 py-3">
            <Check className="w-6 h-6" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-3 text-xl px-6 py-3">
            <Clock className="w-6 h-6" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 flex items-center gap-3 text-xl px-6 py-3">
            <X className="w-6 h-6" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xl px-6 py-3">{status}</Badge>;
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
        {/* ELDERLY-FRIENDLY: Much larger navigation and title */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          <Button variant="ghost" size="lg" onClick={() => setLocation('/')} className="text-2xl py-4 px-6">
            <ArrowLeft className="h-8 w-8 mr-3" />
            Back to Home
          </Button>
          <h1 className="text-5xl md:text-6xl font-bold">My Tickets</h1>
        </div>

        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <Card key={booking.id} className="overflow-hidden">
              {/* ELDERLY-FRIENDLY: Much larger card header with better spacing */}
              <CardHeader className="pb-6">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                  <div className="space-y-3">
                    <CardTitle className="text-3xl md:text-4xl leading-tight">{booking.event.title}</CardTitle>
                    <div className="flex items-center gap-3 text-xl text-muted-foreground">
                      <Calendar className="w-8 h-8" />
                      <span className="leading-relaxed">
                        {format(new Date(booking.event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              {/* ELDERLY-FRIENDLY: Much larger card content and icons */}
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xl">
                  <div className="flex items-center gap-4">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                    <span className="font-semibold">Table {booking.tableId}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                    <span className="font-semibold">{booking.partySize} guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    <span>Booking #{booking.id}</span>
                  </div>
                </div>

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

                {/* Always show ticket with QR code */}
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
                        <div className="text-xs text-center mt-2 font-medium">{booking.event.title}</div>
                      </div>
                    </div>
                    
                    {/* ELDERLY-FRIENDLY: Much larger buttons for easier tapping */}
                    <div className="text-center space-y-6">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setLocation(`/ticket/${booking.id}`)}
                        className="flex items-center gap-4 w-full py-6 text-2xl font-semibold"
                      >
                        <Ticket className="w-8 h-8" />
                        View Full Ticket
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => downloadQRTicket(booking)}
                        className="flex items-center gap-4 w-full py-6 text-2xl font-semibold"
                      >
                        <Download className="w-8 h-8" />
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