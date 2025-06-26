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

  // Helper function to transform food selections from API format
  const transformFoodSelections = (foodSelections: any[]): Array<{type: string, name: string, allergens: string[], dietary: string[]}> => {
    const items: Array<{type: string, name: string, allergens: string[], dietary: string[]}> = [];
    
    if (Array.isArray(foodSelections)) {
      foodSelections.forEach((selection: any) => {
        if (selection.salad) {
          items.push({
            type: "Salad",
            name: `Salad Option ${selection.salad}`,
            allergens: [],
            dietary: []
          });
        }
        if (selection.entree) {
          items.push({
            type: "Entree", 
            name: `Entree Option ${selection.entree}`,
            allergens: [],
            dietary: []
          });
        }
        if (selection.dessert) {
          items.push({
            type: "Dessert",
            name: `Dessert Option ${selection.dessert}`,
            allergens: [],
            dietary: []
          });
        }
      });
    }
    
    return items;
  };

  // Helper function to transform kitchen dashboard data format to orders page format
  const transformOrdersData = (ordersResponse: any): EventOrder[] => {
    if (!ordersResponse || !ordersResponse.ordersByTable) {
      return [];
    }

    const transformedOrders: EventOrder[] = [];
    
    Object.entries(ordersResponse.ordersByTable).forEach(([tableId, tableOrders]: [string, any]) => {
      if (Array.isArray(tableOrders) && tableOrders.length > 0) {
        // Use the first order for table-level info
        const firstOrder = tableOrders[0];
        
        const eventOrder: EventOrder = {
          bookingId: firstOrder.bookingId,
          tableNumber: parseInt(tableId),
          tableId: parseInt(tableId),
          tableZone: "General", // Default since not available
          tablePriceCategory: "Standard", // Default since not available  
          partySize: tableOrders.length,
          customerEmail: "customer@example.com", // Default since not available
          status: firstOrder.status || "confirmed",
          createdAt: new Date().toISOString(),
          checkedIn: false, // Default since not available
          checkedInAt: null,
          guestOrders: tableOrders.map((order: any, index: number) => ({
            guestName: order.guestName || `Guest ${index + 1}`,
            guestNumber: index + 1,
            items: transformFoodSelections(order.foodSelections || [])
          })),
          totalGuests: tableOrders.length,
          hasOrders: tableOrders.some((order: any) => order.foodSelections && order.foodSelections.length > 0)
        };
        
        transformedOrders.push(eventOrder);
      }
    });

    return transformedOrders;
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

  // Component to render individual event orders
  const EventOrdersCard = ({ event }: { event: Event }) => {
    const { data: ordersResponse, isLoading } = useQuery({
      queryKey: [`/api/events/${event.id}/orders`],
      enabled: !!event.id,
    });

    // Transform the kitchen dashboard format to the orders page format
    const orders: EventOrder[] = ordersResponse ? transformOrdersData(ordersResponse) : [];
    const tablesWithOrders = orders?.filter(order => order.hasOrders) || [];
    const totalGuests = orders?.reduce((sum, order) => sum + order.totalGuests, 0) || 0;

    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-secondary/30">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
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
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {orders?.length || 0} tables
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {tablesWithOrders.length} with orders
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalGuests} guests ordered
                </Badge>
              </div>
              {orders && orders.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => generatePDF(event, orders)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading orders...</span>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bookings for this event yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{orders.length}</div>
                  <div className="text-sm text-muted-foreground">Total Tables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{tablesWithOrders.length}</div>
                  <div className="text-sm text-muted-foreground">Tables with Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalGuests}</div>
                  <div className="text-sm text-muted-foreground">Total Guests</div>
                </div>
              </div>

              {/* Food Totals */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Food Selection Totals</h4>
                <EventFoodTotals eventId={event.id} />
              </div>

              {/* Detailed Orders by Table */}
              {tablesWithOrders.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Orders by Table</h4>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {tablesWithOrders.map((order) => (
                        <Card key={order.bookingId} className="border-l-4 border-l-primary/50">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">
                                  Table {order.tableNumber}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {order.tableZone}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {order.partySize} guests
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {order.checkedIn ? (
                                  <Badge variant="default" className="text-xs gap-1">
                                    <Check className="h-3 w-3" />
                                    Checked In
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <X className="h-3 w-3" />
                                    Not Checked In
                                  </Badge>
                                )}
                                <Badge 
                                  variant={order.status === 'confirmed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="text-sm text-muted-foreground mb-3">
                              <p>Customer: {order.customerEmail}</p>
                              <p>Booking ID: #{order.bookingId}</p>
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-3">
                              <h5 className="font-medium text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Guest Food Orders ({order.totalGuests} orders)
                              </h5>
                              
                              {order.guestOrders.map((guestOrder, guestIndex) => (
                                <div key={guestIndex} className="ml-4 p-3 bg-secondary/10 rounded-md">
                                  <div className="font-medium text-sm mb-2">{guestOrder.guestName}</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    {guestOrder.items.map((item, itemIndex) => (
                                      <div key={itemIndex} className="space-y-1">
                                        <div className="font-medium">{item.type}:</div>
                                        <div className="text-muted-foreground">{item.name}</div>
                                        {item.allergens.length > 0 && (
                                          <div className="flex items-center gap-1 text-red-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>Allergens: {item.allergens.join(', ')}</span>
                                          </div>
                                        )}
                                        {item.dietary.length > 0 && (
                                          <div className="text-green-600 text-xs">
                                            Dietary: {item.dietary.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Tables without orders */}
              {orders.some(order => !order.hasOrders) && (
                <div>
                  <h4 className="text-lg font-semibold mb-3">Tables without Food Orders</h4>
                  <div className="flex flex-wrap gap-2">
                    {orders
                      .filter(order => !order.hasOrders)
                      .map(order => (
                        <Badge key={order.bookingId} variant="outline" className="text-xs">
                          Table {order.tableNumber} ({order.partySize} guests)
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Event Orders Management</h1>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="active">Events with Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {sortedEvents.map((event) => (
              <EventOrdersCard key={event.id} event={event} />
            ))}
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            {sortedEvents
              .filter(event => (event.totalSeats || 0) - (event.availableSeats || 0) > 0)
              .map((event) => (
                <EventOrdersCard key={event.id} event={event} />
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}