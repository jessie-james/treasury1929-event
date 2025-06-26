import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { EventFoodTotals } from "@/components/backoffice/EventFoodTotals";
import { type Event } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Download, Users, MapPin, Check, X, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface EventOrder {
  bookingId: number;
  tableNumber: number;
  tableId: number;
  tableZone: string;
  tablePriceCategory: string;
  partySize: number;
  customerEmail: string;
  status: string;
  createdAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  guestOrders: Array<{
    guestName: string;
    guestNumber: number;
    items: Array<{
      type: string;
      name: string;
      allergens: string[];
      dietary: string[];
    }>;
  }>;
  totalGuests: number;
  hasOrders: boolean;
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const handleBackToDashboard = () => {
    setLocation('/backoffice');
  };

  const generatePDF = async (event: Event, orders: EventOrder[]) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text(`Food Orders - ${event.title}`, 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, 30);
      
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
      
      let yPosition = 55;
      
      // Summary
      const totalTables = orders.length;
      const totalGuests = orders.reduce((sum, order) => sum + order.totalGuests, 0);
      const tablesWithOrders = orders.filter(order => order.hasOrders).length;
      
      doc.setFontSize(14);
      doc.text("Summary", 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.text(`Total Tables: ${totalTables}`, 20, yPosition);
      doc.text(`Tables with Food Orders: ${tablesWithOrders}`, 20, yPosition + 10);
      doc.text(`Total Guests with Orders: ${totalGuests}`, 20, yPosition + 20);
      
      yPosition += 40;
      
      // Orders by Table
      doc.setFontSize(14);
      doc.text("Orders by Table", 20, yPosition);
      yPosition += 15;
      
      for (const order of orders) {
        if (order.hasOrders) {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`Table ${order.tableNumber} (${order.tableZone}) - ${order.partySize} guests`, 20, yPosition);
          doc.setFontSize(10);
          doc.text(`Customer: ${order.customerEmail}`, 20, yPosition + 8);
          doc.text(`Status: ${order.status} ${order.checkedIn ? '✓ Checked In' : ''}`, 20, yPosition + 16);
          
          yPosition += 25;
          
          // Guest orders
          for (const guestOrder of order.guestOrders) {
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.text(`${guestOrder.guestName}:`, 30, yPosition);
            yPosition += 8;
            
            for (const item of guestOrder.items) {
              doc.text(`• ${item.type}: ${item.name}`, 40, yPosition);
              if (item.allergens.length > 0) {
                doc.text(`  Allergens: ${item.allergens.join(', ')}`, 45, yPosition + 6);
                yPosition += 6;
              }
              if (item.dietary.length > 0) {
                doc.text(`  Dietary: ${item.dietary.join(', ')}`, 45, yPosition + 6);
                yPosition += 6;
              }
              yPosition += 8;
            }
            yPosition += 5;
          }
          yPosition += 10;
        }
      }
      
      // Food Totals Summary (new page)
      doc.addPage();
      doc.setFontSize(16);
      doc.text("Food Totals Summary", 20, 20);
      
      // This would require fetching food totals - for now just indicate where it would go
      doc.setFontSize(10);
      doc.text("Food totals by category would be displayed here", 20, 40);
      
      // Save the PDF
      doc.save(`${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_orders.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (eventsLoading) {
    return (
      <BackofficeLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BackofficeLayout>
    );
  }

  // Sort events by date (newest first)
  const sortedEvents = [...(events || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Food Selections by Event</h1>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="active">Active Events</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {sortedEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <CardHeader className="bg-secondary/30">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div>
                        <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                        <CardDescription>
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </CardDescription>
                      </div>
                      <div className="mt-2 md:mt-0 md:text-right">
                        <span className="font-medium text-sm inline-block bg-primary/10 text-primary px-3 py-1 rounded-full">
                          {event.totalSeats - event.availableSeats} orders / {event.totalSeats} seats
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <EventFoodTotals eventId={event.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {sortedEvents
                .filter(event => event.availableSeats < event.totalSeats)
                .map((event) => (
                  <Card key={event.id} className="overflow-hidden">
                    <CardHeader className="bg-secondary/30">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div>
                          <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                          <CardDescription>
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                        <div className="mt-2 md:mt-0 md:text-right">
                          <span className="font-medium text-sm inline-block bg-primary/10 text-primary px-3 py-1 rounded-full">
                            {event.totalSeats - event.availableSeats} orders / {event.totalSeats} seats
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <EventFoodTotals eventId={event.id} />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}