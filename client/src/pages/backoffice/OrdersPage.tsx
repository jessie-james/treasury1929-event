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
import { Loader2, ArrowLeft, Download, Users, MapPin, Check, X, AlertTriangle, FileText, ChefHat } from "lucide-react";
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
      dietary?: string[];
    }>;
    wineItems?: Array<{
      name: string;
      type: string;
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

  // Fetch food options to get actual names
  const { data: foodOptions } = useQuery<Array<{id: number, name: string, type: string}>>({
    queryKey: ["/api/food-options"],
  });

  const handleBackToDashboard = () => {
    setLocation('/backoffice');
  };

  // Helper function to transform food selections from API format
  const transformFoodSelections = (foodSelections: any[]): Array<{type: string, name: string}> => {
    const items: Array<{type: string, name: string}> = [];
    
    if (Array.isArray(foodSelections) && foodOptions) {
      foodSelections.forEach((selection: any) => {
        if (selection.salad) {
          const saladItem = foodOptions.find(item => item.id === selection.salad);
          items.push({
            type: "Salad",
            name: saladItem?.name || `Salad Option ${selection.salad}`
          });
        }
        if (selection.entree) {
          const entreeItem = foodOptions.find(item => item.id === selection.entree);
          items.push({
            type: "Entree", 
            name: entreeItem?.name || `Entree Option ${selection.entree}`
          });
        }
        if (selection.dessert) {
          const dessertItem = foodOptions.find(item => item.id === selection.dessert);
          items.push({
            type: "Dessert",
            name: dessertItem?.name || `Dessert Option ${selection.dessert}`
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

  // Helper function to transform detailed orders data format to orders page format
  const transformDetailedOrdersData = (ordersResponse: any): EventOrder[] => {
    if (!ordersResponse || !Array.isArray(ordersResponse)) {
      return [];
    }

    const transformedOrders: EventOrder[] = [];
    
    ordersResponse.forEach((order: any) => {
      if (order.guestOrders && order.guestOrders.length > 0) {
        const eventOrder: EventOrder = {
          bookingId: order.bookingId,
          tableNumber: order.tableNumber,
          tableId: order.tableId,
          tableZone: order.tableZone || "General",
          tablePriceCategory: order.tablePriceCategory || "Standard",
          partySize: order.partySize,
          customerEmail: order.customerEmail,
          status: order.status,
          createdAt: order.createdAt,
          checkedIn: order.checkedIn,
          checkedInAt: order.checkedInAt,
          guestOrders: order.guestOrders.map((guestOrder: any) => ({
            guestName: guestOrder.guestName,
            guestNumber: guestOrder.guestNumber,
            items: guestOrder.items.map((item: any) => ({
              type: item.type,
              name: item.name,
              dietary: item.dietary || []
            })),
            wineItems: guestOrder.wineItems || []
          })),
          totalGuests: order.guestOrders.length,
          hasOrders: order.guestOrders.some((guestOrder: any) => guestOrder.items && guestOrder.items.length > 0)
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
          
          // Guest orders - improved format
          for (const guestOrder of order.guestOrders) {
            if (yPosition > 260) {
              doc.addPage();
              yPosition = 20;
            }
            
            doc.setFontSize(11);
            doc.text(`Guest: ${guestOrder.guestName}`, 30, yPosition);
            yPosition += 10;
            
            for (const item of guestOrder.items) {
              doc.setFontSize(10);
              doc.text(`• ${item.type}: ${item.name}`, 40, yPosition);
              
              // Add dietary info if available
              if (item.dietary && item.dietary.length > 0) {
                const dietaryLabels = item.dietary.map(diet => {
                  return diet === 'gluten-free' ? 'GF' :
                         diet === 'vegan' ? 'VG' :
                         diet === 'vegetarian' ? 'V' :
                         diet === 'dairy-free' ? 'DF' : diet;
                }).join(', ');
                doc.text(`  [${dietaryLabels}]`, 150, yPosition);
              }
              
              yPosition += 8;
            }
            
            // Wine selections
            if (guestOrder.wineItems && guestOrder.wineItems.length > 0) {
              guestOrder.wineItems.forEach((wineItem: any) => {
                doc.setFontSize(10);
                doc.text(`• Wine: ${wineItem.name}`, 40, yPosition);
                yPosition += 8;
              });
            }
            
            yPosition += 8;
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
      queryKey: [`/api/events/${event.id}/orders-detailed`],
      enabled: !!event.id,
    });

    // Transform the detailed orders format to the orders page format
    const orders: EventOrder[] = ordersResponse ? transformDetailedOrdersData(ordersResponse) : [];
    const tablesWithOrders = Array.isArray(orders) ? orders.filter(order => order.hasOrders) : [];
    const totalGuests = Array.isArray(orders) ? orders.reduce((sum, order) => sum + order.totalGuests, 0) : 0;

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
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/api/events/${event.id}/kitchen-report`, '_blank')}
                    className="text-xs"
                  >
                    <ChefHat className="h-3 w-3 mr-1" />
                    Kitchen Report
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/api/events/${event.id}/server-report`, '_blank')}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Server Report
                  </Button>
                </div>
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
                                <div key={guestIndex} className="ml-4 p-3 bg-secondary/10 rounded-md border border-secondary/20">
                                  <div className="font-semibold text-sm mb-3 text-primary border-b border-secondary/30 pb-2">
                                    {guestOrder.guestName}
                                  </div>
                                  <div className="space-y-2">
                                    {guestOrder.items.map((item, itemIndex) => (
                                      <div key={itemIndex} className="flex justify-between items-start p-2 bg-white rounded border border-secondary/20">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm text-primary">{item.type}:</div>
                                          <div className="text-sm text-foreground">{item.name}</div>
                                        </div>
                                        {item.dietary && item.dietary.length > 0 && (
                                          <div className="flex gap-1">
                                            {item.dietary.map(diet => {
                                              const label = diet === 'gluten-free' ? 'GF' :
                                                          diet === 'vegan' ? 'VG' :
                                                          diet === 'vegetarian' ? 'V' :
                                                          diet === 'dairy-free' ? 'DF' : diet;
                                              return (
                                                <span key={diet} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                  {label}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {/* Wine Selections */}
                                    {guestOrder.wineItems && guestOrder.wineItems.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {guestOrder.wineItems.map((wineItem: any, wineIndex: number) => (
                                          <div key={wineIndex} className="flex justify-between items-start p-2 bg-purple-50 rounded border border-purple-200">
                                            <div className="flex-1">
                                              <div className="font-medium text-sm text-purple-700">Wine:</div>
                                              <div className="text-sm text-foreground">{wineItem.name}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
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