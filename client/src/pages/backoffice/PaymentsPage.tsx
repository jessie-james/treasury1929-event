import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { type Event, type Booking } from "@shared/schema";
import { Calendar, CalendarIcon, CreditCard, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, isAfter, parseISO, isBefore, isValid } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

export default function PaymentsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 1),
    end: new Date()
  });

  // Format dates for display
  const formattedStartDate = format(dateRange.start, "MMM dd, yyyy");
  const formattedEndDate = format(dateRange.end, "MMM dd, yyyy");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Helper function to calculate total revenue
  const calculateTotalRevenue = (bookings: Booking[] | undefined) => {
    if (!bookings || bookings.length === 0) return 0;
    
    return bookings.reduce((total, booking) => {
      // Calculate total from food selections
      let bookingTotal = 0;
      
      const foodSelections = booking.foodSelections as Record<string, Record<string, number>>;
      if (foodSelections) {
        Object.keys(foodSelections).forEach(category => {
          Object.values(foodSelections[category] || {}).forEach(quantity => {
            bookingTotal += quantity * 19.99; // Assuming a fixed price for food items
          });
        });
      }
      
      // Add seat price (assuming $19.99 per seat)
      bookingTotal += (booking.seatNumbers?.length || 0) * 19.99;
      
      // Subtract refund if any
      if (booking.refundAmount) {
        bookingTotal -= booking.refundAmount;
      }
      
      return total + bookingTotal;
    }, 0);
  };

  // Filter bookings by date range
  const filteredBookings = bookings?.filter(booking => {
    // Skip bookings with no createdAt date
    if (!booking.createdAt) return false;
    
    const bookingDate = parseISO(booking.createdAt.toString());
    if (!isValid(bookingDate)) return false;
    
    // Filter by date range
    const isInDateRange = 
      isAfter(bookingDate, dateRange.start) && 
      isBefore(bookingDate, dateRange.end);
    
    // Filter by search term
    const matchesSearch = 
      searchTerm === "" || 
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.stripePaymentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = 
      filterStatus === "all" || 
      booking.status === filterStatus;
    
    return isInDateRange && matchesSearch && matchesStatus;
  });

  // Calculate revenue stats
  const totalRevenue = calculateTotalRevenue(filteredBookings);
  const confirmedRevenue = calculateTotalRevenue(
    filteredBookings?.filter(b => b.status === "confirmed")
  );
  const refundedAmount = calculateTotalRevenue(
    filteredBookings?.filter(b => b.status === "refunded")
  );
  const canceledAmount = calculateTotalRevenue(
    filteredBookings?.filter(b => b.status === "canceled")
  );

  // Get event-specific revenue
  const eventRevenue = events?.map(event => {
    const eventBookings = filteredBookings?.filter(b => b.eventId === event.id);
    return {
      event,
      revenue: calculateTotalRevenue(eventBookings),
      bookingCount: eventBookings?.length || 0
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Get monthly revenue
  const months: Record<string, number> = {};
  filteredBookings?.forEach(booking => {
    // Skip bookings with no createdAt date
    if (!booking.createdAt) return;
    
    const date = parseISO(booking.createdAt.toString());
    if (!isValid(date)) return;
    
    const monthYear = format(date, "MMM yyyy");
    const amount = (booking.seatNumbers?.length || 0) * 19.99;
    
    if (!months[monthYear]) {
      months[monthYear] = 0;
    }
    
    months[monthYear] += amount;
    
    // Subtract refund if any
    if (booking.refundAmount) {
      months[monthYear] -= booking.refundAmount;
    }
  });

  // Process refund
  const handleRefund = async (bookingId: number, amount: number) => {
    try {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/refund`, { amount });
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Refund successful",
          description: `$${amount.toFixed(2)} has been refunded.`,
        });
      } else {
        toast({
          title: "Refund failed",
          description: result.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Refund failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Cancel booking
  const handleCancel = async (bookingId: number) => {
    try {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {});
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Booking canceled",
          description: "The booking has been canceled successfully.",
        });
      } else {
        toast({
          title: "Cancellation failed",
          description: result.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Payments Management</h1>
            <p className="text-muted-foreground">
              Manage payments, refunds, and view sales analytics
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formattedStartDate} - {formattedEndDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: dateRange.start,
                    to: dateRange.end
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({
                        start: range.from,
                        end: range.to
                      });
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredBookings?.length || 0} transactions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Confirmed Payments
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${confirmedRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredBookings?.filter(b => b.status === "confirmed").length || 0} transactions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Refunds Processed
                  </CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${Math.abs(refundedAmount).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredBookings?.filter(b => b.status === "refunded").length || 0} transactions
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Canceled Bookings
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${Math.abs(canceledAmount).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredBookings?.filter(b => b.status === "canceled").length || 0} bookings
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Monthly revenue chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Sales</CardTitle>
                <CardDescription>Revenue breakdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  {Object.keys(months).length > 0 ? (
                    <div className="space-y-4">
                      {Object.keys(months).map(month => (
                        <div key={month} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{month}</span>
                            <span>${months[month].toFixed(2)}</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ 
                                width: `${(months[month] / Math.max(...Object.values(months))) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No data available for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Event revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Event</CardTitle>
                <CardDescription>Performance breakdown by event</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {eventRevenue && eventRevenue.length > 0 ? (
                    eventRevenue.map(({ event, revenue, bookingCount }) => (
                      <div key={event.id} className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded overflow-hidden">
                          <img 
                            src={event.image} 
                            alt={event.title} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.date), "MMM dd, yyyy")} • {bookingCount} bookings
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${revenue.toFixed(2)}</p>
                          <Badge variant={
                            event.availableSeats === 0 ? "destructive" : 
                            event.availableSeats < event.totalSeats * 0.2 ? "default" : 
                            "secondary"
                          }>
                            {event.availableSeats === 0 ? "Sold out" : 
                             event.availableSeats < event.totalSeats * 0.2 ? "Selling fast" : 
                             "Available"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No events found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View and filter all payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by email or transaction ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        <SelectItem value="all">All transactions</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="modified">Modified</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p>Loading transactions...</p>
                  </div>
                ) : filteredBookings && filteredBookings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBookings.map(booking => {
                      const bookingTotal = (booking.seatNumbers?.length || 0) * 19.99;
                      const refundAmount = booking.refundAmount || 0;
                      const finalAmount = bookingTotal - refundAmount;
                      
                      return (
                        <Card key={booking.id} className="overflow-hidden">
                          <div className="p-6">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div>
                                <h3 className="font-medium">Booking #{booking.id}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {booking.customerEmail}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Transaction ID: {booking.stripePaymentId.substring(0, 12)}...
                                </p>
                                {booking.createdAt && (
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(booking.createdAt.toString()), "MMM dd, yyyy h:mm a")}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  ${finalAmount.toFixed(2)}
                                  {refundAmount > 0 && (
                                    <span className="text-destructive ml-2">
                                      -${refundAmount.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <Badge variant={
                                  booking.status === "confirmed" ? "default" :
                                  booking.status === "refunded" ? "destructive" :
                                  booking.status === "canceled" ? "outline" :
                                  "secondary"
                                }>
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Refund & Cancellation Management</CardTitle>
                <CardDescription>Process refunds and cancel bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by email or transaction ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Status</SelectLabel>
                        <SelectItem value="all">All bookings</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="modified">Modified</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p>Loading bookings...</p>
                  </div>
                ) : filteredBookings && filteredBookings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBookings
                      .filter(booking => booking.status !== "refunded" && booking.status !== "canceled")
                      .map(booking => {
                        const bookingTotal = (booking.seatNumbers?.length || 0) * 19.99;
                        const refundAmount = booking.refundAmount || 0;
                        const finalAmount = bookingTotal - refundAmount;
                        
                        return (
                          <Card key={booking.id} className="overflow-hidden">
                            <div className="p-6">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                  <h3 className="font-medium">Booking #{booking.id}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.customerEmail}
                                  </p>
                                  {booking.createdAt && (
                                    <p className="text-sm text-muted-foreground">
                                      {format(parseISO(booking.createdAt.toString()), "MMM dd, yyyy h:mm a")}
                                    </p>
                                  )}
                                  <p className="text-sm font-medium mt-2">
                                    Total Amount: ${finalAmount.toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <Label htmlFor={`refund-amount-${booking.id}`}>Refund Amount:</Label>
                                    <Input
                                      id={`refund-amount-${booking.id}`}
                                      type="number"
                                      min="0.01"
                                      max={finalAmount}
                                      step="0.01"
                                      defaultValue={finalAmount.toFixed(2)}
                                      className="w-24"
                                    />
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => handleCancel(booking.id)}
                                    >
                                      Cancel Booking
                                    </Button>
                                    <Button 
                                      onClick={() => {
                                        const input = document.getElementById(`refund-amount-${booking.id}`) as HTMLInputElement;
                                        const amount = parseFloat(input.value);
                                        if (!isNaN(amount) && amount > 0 && amount <= finalAmount) {
                                          handleRefund(booking.id, amount);
                                        } else {
                                          toast({
                                            title: "Invalid amount",
                                            description: "Please enter a valid refund amount",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      Process Refund
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No eligible bookings found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}