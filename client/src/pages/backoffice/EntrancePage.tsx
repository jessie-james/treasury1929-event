import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { QrScanner } from "@/components/backoffice/QrScanner";
import { useToast } from "@/hooks/use-toast";
import { Event, Booking, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Camera,
  Check,
  AlertCircle,
  RefreshCw,
  Ticket,
  Clock,
  User as UserIcon,
  Key,
  Utensils
} from "lucide-react";

// Define scan log entry type
interface ScanLogEntry {
  timestamp: Date;
  bookingId: number;
  status: 'success' | 'error';
  message: string;
  guestNames?: string[];
}

export default function EntrancePage() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [manualBookingId, setManualBookingId] = useState("");
  const [activeTab, setActiveTab] = useState<"scanner" | "manual">("scanner");
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  
  // Get all events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  // Set first event as selected if none is selected
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      // Find the first upcoming event (today or future date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingEvent = events.find(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });
      
      if (upcomingEvent) {
        setSelectedEventId(upcomingEvent.id);
      } else {
        // If no upcoming events, just use the first one
        setSelectedEventId(events[0].id);
      }
    }
  }, [events, selectedEventId]);
  
  // Define the type for check-in stats
  interface CheckInStats {
    totalBookings: number;
    checkedInBookings: number;
    checkedInPercentage: number;
    foodStats: {
      salads: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      entrees: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      desserts: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
      wines: { total: number; checkedIn: number; percentage: number; byItem: Record<number, { total: number; checkedIn: number; percentage: number; }> };
    };
  }
  
  // Get check-in stats for selected event
  const { data: checkinStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<CheckInStats>({
    queryKey: [`/api/events/${selectedEventId}/check-in-stats`],
    enabled: !!selectedEventId,
  });
  
  // Selected event details
  const selectedEvent = events?.find(e => e.id === selectedEventId);
  
  // Query to get booking details by ID for the scan log
  const getBookingDetails = async (bookingId: number): Promise<{guestNames?: Record<string, string>}> => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) {
        return { guestNames: {} };
      }
      return await res.json();
    } catch (error) {
      console.error("Error fetching booking details:", error);
      return { guestNames: {} };
    }
  };

  // Mutation for checking in a booking
  const checkInMutation = useMutation({
    mutationFn: (bookingId: number) => {
      return apiRequest({
        method: "POST",
        url: `/api/bookings/${bookingId}/check-in`
      });
    },
    onSuccess: async (data, bookingId) => {
      // Show toast notification
      toast({
        title: "Success",
        description: "Ticket checked in successfully.",
        variant: "default"
      });
      
      try {
        // Get booking details for the scan log
        const bookingDetails = await getBookingDetails(bookingId);
        
        // Create a formatted list of guest names
        const guestNamesArray = bookingDetails.guestNames ? 
          Object.values(bookingDetails.guestNames).filter(name => name) : 
          [];
        
        // Add to scan log
        setScanLog(prev => [{
          timestamp: new Date(),
          bookingId,
          status: 'success',
          message: 'Checked in successfully',
          guestNames: guestNamesArray
        }, ...prev.slice(0, 9)]); // Keep only the 10 most recent entries
      } catch (error) {
        console.error("Error adding to scan log:", error);
      }
      
      // Refetch check-in stats to update the UI
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/check-in-stats`] });
      
      // Clear manual input after successful check-in
      setManualBookingId("");
      
      // Auto-restart scanning after a brief delay
      setTimeout(() => {
        const scannerElement = document.querySelector('[data-scanner-restart]');
        if (scannerElement instanceof HTMLButtonElement) {
          scannerElement.click();
        }
      }, 1500);
    },
    onError: (error, bookingId) => {
      // Show toast notification
      toast({
        title: "Error",
        description: error.message || "Failed to check in ticket. It may have been already checked in.",
        variant: "destructive"
      });
      
      // Add to scan log
      setScanLog(prev => [{
        timestamp: new Date(),
        bookingId,
        status: 'error',
        message: error.message || "Failed to check in ticket"
      }, ...prev.slice(0, 9)]); // Keep only the 10 most recent entries
    }
  });
  
  // Handle manual booking ID submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBookingId && !isNaN(parseInt(manualBookingId))) {
      checkInMutation.mutate(parseInt(manualBookingId));
    } else {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid booking ID number.",
        variant: "destructive"
      });
    }
  };
  
  // Handle QR code scan
  const handleQrCodeScanned = (data: string) => {
    try {
      // Extract booking ID from QR code data
      // QR code data format would be something like "booking:123" or just "123"
      const bookingId = parseInt(data.includes("booking:") ? data.split("booking:")[1] : data);
      
      if (!isNaN(bookingId)) {
        checkInMutation.mutate(bookingId);
      } else {
        toast({
          title: "Invalid QR Code",
          description: "The scanned QR code doesn't contain a valid booking ID.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process the scanned QR code.",
        variant: "destructive"
      });
    }
  };
  
  // Calculate food type percentages for the progress bars
  const getFoodTypeStats = (type: 'salads' | 'entrees' | 'desserts' | 'wines') => {
    if (!checkinStats || !checkinStats.foodStats) return { 
      total: 0, 
      checkedIn: 0, 
      percentage: 0,
      items: []
    };
    
    const stats = checkinStats.foodStats[type];
    const items = Object.entries(stats.byItem).map(([id, item]) => ({
      id: parseInt(id),
      ...item
    })).sort((a, b) => b.total - a.total);
    
    return {
      total: stats.total,
      checkedIn: stats.checkedIn,
      percentage: stats.percentage,
      items
    };
  };
  
  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Entrance Check-in</h1>
            <p className="text-muted-foreground">Scan tickets at the entrance and track attendance in real-time</p>
          </div>
          
          {/* Event Selection */}
          <div className="mt-4 md:mt-0">
            <select 
              className="border rounded p-2 w-full md:w-auto" 
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(parseInt(e.target.value))}
              disabled={eventsLoading}
            >
              {eventsLoading ? (
                <option value="">Loading events...</option>
              ) : events && events.length > 0 ? (
                events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({format(new Date(event.date), "MMM d, yyyy")})
                  </option>
                ))
              ) : (
                <option value="">No events available</option>
              )}
            </select>
          </div>
        </div>
        
        {selectedEvent ? (
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{selectedEvent.title}</CardTitle>
                <CardDescription>
                  {format(new Date(selectedEvent.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Total Capacity</p>
                      <p className="text-2xl font-bold">{selectedEvent.totalSeats}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Booked Seats</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          checkinStats?.totalBookings || 0
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Checked In</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <>
                            {checkinStats?.checkedInBookings || 0} / {checkinStats?.totalBookings || 0}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              ({checkinStats?.checkedInPercentage || 0}%)
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : eventsLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Event Selected</AlertTitle>
            <AlertDescription>
              Please select an event to proceed with check-ins.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="scanner">
              <Camera className="h-4 w-4 mr-2" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Key className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>
          
          {/* Scanner Tab */}
          <TabsContent value="scanner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Position the QR code in the center of the camera frame.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-md">
                    <QrScanner 
                      onScan={handleQrCodeScanned}
                      isLoading={checkInMutation.isPending}
                    />
                  </div>
                  
                  {checkInMutation.isPending && (
                    <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 mt-4">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertTitle>Processing</AlertTitle>
                      <AlertDescription>
                        Verifying and checking in the ticket...
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {checkInMutation.isSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200 mt-4">
                      <Check className="h-4 w-4" />
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>
                        Ticket checked in successfully!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {checkInMutation.isError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {checkInMutation.error instanceof Error ? checkInMutation.error.message : "Failed to check in ticket."}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Scan Log */}
                  <div className="mt-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-2">Recent Scans</h3>
                    {scanLog.length === 0 ? (
                      <p className="text-muted-foreground text-sm italic">No scan history yet</p>
                    ) : (
                      <ScrollArea className="h-64 w-full border rounded-md">
                        <div className="p-4 space-y-4">
                          {scanLog.map((entry, index) => (
                            <div 
                              key={index} 
                              className={`p-3 rounded-md border ${
                                entry.status === 'success' 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                  {entry.status === 'success' ? (
                                    <Check className="h-4 w-4 text-green-600 mr-2" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                                  )}
                                  <span className="font-medium">
                                    Booking #{entry.bookingId}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(entry.timestamp, "HH:mm:ss")}
                                </span>
                              </div>
                              
                              {entry.guestNames && entry.guestNames.length > 0 && (
                                <div className="mt-1 ml-6 text-sm">
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                                    <span>{entry.guestNames.join(", ")}</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="mt-1 ml-6 text-sm text-muted-foreground">
                                {entry.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Manual Entry
                </CardTitle>
                <CardDescription>
                  Enter the booking ID manually if QR code scanning is not available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter Booking ID"
                      value={manualBookingId}
                      onChange={(e) => setManualBookingId(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={checkInMutation.isPending}>
                      {checkInMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Check In"
                      )}
                    </Button>
                  </div>
                  
                  {checkInMutation.isSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <Check className="h-4 w-4" />
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>
                        Ticket checked in successfully!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {checkInMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {checkInMutation.error instanceof Error ? checkInMutation.error.message : "Failed to check in ticket."}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Food Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Utensils className="h-5 w-5 mr-2" />
                  Food Check-in Statistics
                </CardTitle>
                <CardDescription>
                  Track how many of each food item have been checked in
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Salads Section */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Salads</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall: {getFoodTypeStats('salads').checkedIn} / {getFoodTypeStats('salads').total} checked in</span>
                        <span className="text-sm font-medium">{getFoodTypeStats('salads').percentage}%</span>
                      </div>
                      <Progress value={getFoodTypeStats('salads').percentage} className="h-2" />
                      
                      <div className="mt-3 space-y-2">
                        {getFoodTypeStats('salads').items.map(item => (
                          <div key={item.id} className="pl-4 border-l-2 border-primary/20">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Salad #{item.id}: {item.checkedIn} / {item.total}</span>
                              <span className="text-sm">{item.percentage}%</span>
                            </div>
                            <Progress value={item.percentage} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Entrees Section */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Entrees</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall: {getFoodTypeStats('entrees').checkedIn} / {getFoodTypeStats('entrees').total} checked in</span>
                        <span className="text-sm font-medium">{getFoodTypeStats('entrees').percentage}%</span>
                      </div>
                      <Progress value={getFoodTypeStats('entrees').percentage} className="h-2" />
                      
                      <div className="mt-3 space-y-2">
                        {getFoodTypeStats('entrees').items.map(item => (
                          <div key={item.id} className="pl-4 border-l-2 border-primary/20">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Entree #{item.id}: {item.checkedIn} / {item.total}</span>
                              <span className="text-sm">{item.percentage}%</span>
                            </div>
                            <Progress value={item.percentage} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Desserts Section */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Desserts</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall: {getFoodTypeStats('desserts').checkedIn} / {getFoodTypeStats('desserts').total} checked in</span>
                        <span className="text-sm font-medium">{getFoodTypeStats('desserts').percentage}%</span>
                      </div>
                      <Progress value={getFoodTypeStats('desserts').percentage} className="h-2" />
                      
                      <div className="mt-3 space-y-2">
                        {getFoodTypeStats('desserts').items.map(item => (
                          <div key={item.id} className="pl-4 border-l-2 border-primary/20">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Dessert #{item.id}: {item.checkedIn} / {item.total}</span>
                              <span className="text-sm">{item.percentage}%</span>
                            </div>
                            <Progress value={item.percentage} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Wines Section */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Wines</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall: {getFoodTypeStats('wines').checkedIn} / {getFoodTypeStats('wines').total} checked in</span>
                        <span className="text-sm font-medium">{getFoodTypeStats('wines').percentage}%</span>
                      </div>
                      <Progress value={getFoodTypeStats('wines').percentage} className="h-2" />
                      
                      <div className="mt-3 space-y-2">
                        {getFoodTypeStats('wines').items.map(item => (
                          <div key={item.id} className="pl-4 border-l-2 border-primary/20">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Wine #{item.id}: {item.checkedIn} / {item.total}</span>
                              <span className="text-sm">{item.percentage}%</span>
                            </div>
                            <Progress value={item.percentage} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
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