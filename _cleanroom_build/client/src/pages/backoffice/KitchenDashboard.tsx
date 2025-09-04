import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Clock, CheckCircle, Users, Wine, UtensilsCrossed } from "lucide-react";
import type { Event } from "@shared/schema";
import { formatPhoenixDateShort } from "@/lib/timezone";

interface OrderItem {
  bookingId: number;
  guestName: string;
  orderItems: any[];
  status: string;
  foodSelections: any[];
  wineSelections: any[];
}

interface OrdersByTable {
  [tableId: string]: OrderItem[];
}

export default function KitchenDashboard() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch orders for selected event
  const { data: ordersData, isLoading } = useQuery({
    queryKey: [`/api/events/${selectedEventId}/orders`],
    enabled: !!selectedEventId,
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      const response = await fetch(`/api/orders/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update order status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/orders`] });
      toast({
        title: "Status updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'preparing': return <ChefHat className="h-4 w-4" />;
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'served': return <UtensilsCrossed className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const activeEvents = events.filter(event => new Date(event.date) >= new Date());
  const ordersByTable: OrdersByTable = ordersData?.ordersByTable || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kitchen Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedEventId?.toString() || ""}
            onValueChange={(value) => setSelectedEventId(parseInt(value))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {activeEvents.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.title} - {formatPhoenixDateShort(event.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedEventId && (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Select an event to view kitchen orders
            </p>
          </CardContent>
        </Card>
      )}

      {selectedEventId && isLoading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center">Loading orders...</p>
          </CardContent>
        </Card>
      )}

      {selectedEventId && !isLoading && (
        <div className="grid gap-6">
          {Object.keys(ordersByTable).length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  No orders found for this event
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(ordersByTable).map(([tableId, orders]) => (
              <Card key={tableId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Table {tableId}
                    <Badge variant="outline">{orders.length} orders</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.bookingId}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{order.guestName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Booking #{order.bookingId}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                            <Select
                              value={order.status}
                              onValueChange={(status) =>
                                updateStatusMutation.mutate({
                                  bookingId: order.bookingId,
                                  status,
                                })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="preparing">Preparing</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="served">Served</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Food Selections */}
                        {order.foodSelections && order.foodSelections.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Food Orders:</h5>
                            <div className="space-y-1">
                              {order.foodSelections.map((item: any, index: number) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span>{item.name}</span>
                                  <span className="text-muted-foreground">
                                    Qty: {item.quantity || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Wine Selections */}
                        {order.wineSelections && order.wineSelections.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                              <Wine className="h-4 w-4" />
                              Wine Orders:
                            </h5>
                            <div className="space-y-1">
                              {order.wineSelections.map((item: any, index: number) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span>{item.name}</span>
                                  <span className="text-muted-foreground">
                                    Qty: {item.quantity || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!order.foodSelections || order.foodSelections.length === 0) &&
                         (!order.wineSelections || order.wineSelections.length === 0) && (
                          <p className="text-sm text-muted-foreground">
                            No specific orders - check booking details
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}