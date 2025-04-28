import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { type Event, type Booking } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { QrScanner } from "@/components/backoffice/QrScanner";
import { QrCode, Check, AlertCircle, Camera, Key, Ticket, Users, RefreshCw, ChevronRight, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function EntrancePage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "manual" | "stats">("scanner");
  const [manualBookingId, setManualBookingId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get all events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  // If no event is selected and events are loaded, select the first upcoming event
  useEffect(() => {
    if (!selectedEventId && events && events.length > 0) {
      // Find the next upcoming event, or the closest past event
      const now = new Date();
      const upcoming = events
        .filter(e => new Date(e.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (upcoming.length > 0) {
        setSelectedEventId(upcoming[0].id);
      } else {
        // If no upcoming events, get the most recent past event
        const past = events
          .filter(e => new Date(e.date) <= now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (past.length > 0) {
          setSelectedEventId(past[0].id);
        }
      }
    }
  }, [events, selectedEventId]);
  
  // Get check-in stats for selected event
  const { data: checkinStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: [`/api/events/${selectedEventId}/check-in-stats`],
    enabled: !!selectedEventId,
  });
  
  // Selected event details
  const selectedEvent = events?.find(e => e.id === selectedEventId);
  
  // Mutation for checking in a booking
  const checkInMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return await apiRequest<Booking>(`/api/bookings/${bookingId}/check-in`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ticket checked in successfully.",
        variant: "default"
      });
      // Refetch check-in stats to update the UI
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/check-in-stats`] });
      // Clear manual input after successful check-in
      setManualBookingId("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check in ticket. It may have been already checked in.",
        variant: "destructive"
      });
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
                    <Users className="h-5 w-5 text-muted-foreground" />
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
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="scanner">
              <Camera className="h-4 w-4 mr-2" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Key className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Utensils className="h-4 w-4 mr-2" />
              Food Stats
            </TabsTrigger>
          </TabsList>
          
          {/* Scanner Tab */}
          <TabsContent value="scanner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Position the QR code in the center of the camera frame.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="mb-4 w-full max-w-md">
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
                      className="max-w-sm"
                      disabled={checkInMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!manualBookingId || checkInMutation.isPending}
                    >
                      {checkInMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Check In
                        </>
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
                  Food Order Statistics
                </CardTitle>
                <CardDescription>
                  Real-time tracking of food orders and check-ins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : checkinStats ? (
                  <div className="space-y-6">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchStats()}
                      className="mb-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Stats
                    </Button>
                    
                    {/* Entrees Section */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Badge variant="outline" className="mr-2">Entrees</Badge>
                        <span>{getFoodTypeStats('entrees').checkedIn} / {getFoodTypeStats('entrees').total} checked in</span>
                      </h3>
                      <Progress value={getFoodTypeStats('entrees').percentage} className="h-2" />
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Checked In</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFoodTypeStats('entrees').items.map(item => (
                            <TableRow key={`entree-${item.id}`}>
                              <TableCell>Entree #{item.id}</TableCell>
                              <TableCell>{item.total}</TableCell>
                              <TableCell>{item.checkedIn}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Salads Section */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Badge variant="outline" className="mr-2">Salads</Badge>
                        <span>{getFoodTypeStats('salads').checkedIn} / {getFoodTypeStats('salads').total} checked in</span>
                      </h3>
                      <Progress value={getFoodTypeStats('salads').percentage} className="h-2" />
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Checked In</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFoodTypeStats('salads').items.map(item => (
                            <TableRow key={`salad-${item.id}`}>
                              <TableCell>Salad #{item.id}</TableCell>
                              <TableCell>{item.total}</TableCell>
                              <TableCell>{item.checkedIn}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Desserts Section */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Badge variant="outline" className="mr-2">Desserts</Badge>
                        <span>{getFoodTypeStats('desserts').checkedIn} / {getFoodTypeStats('desserts').total} checked in</span>
                      </h3>
                      <Progress value={getFoodTypeStats('desserts').percentage} className="h-2" />
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Checked In</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFoodTypeStats('desserts').items.map(item => (
                            <TableRow key={`dessert-${item.id}`}>
                              <TableCell>Dessert #{item.id}</TableCell>
                              <TableCell>{item.total}</TableCell>
                              <TableCell>{item.checkedIn}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Wines Section */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Badge variant="outline" className="mr-2">Wines</Badge>
                        <span>{getFoodTypeStats('wines').checkedIn} / {getFoodTypeStats('wines').total} checked in</span>
                      </h3>
                      <Progress value={getFoodTypeStats('wines').percentage} className="h-2" />
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Checked In</TableHead>
                            <TableHead>Percentage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFoodTypeStats('wines').items.map(item => (
                            <TableRow key={`wine-${item.id}`}>
                              <TableCell>Wine #{item.id}</TableCell>
                              <TableCell>{item.total}</TableCell>
                              <TableCell>{item.checkedIn}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Data Available</AlertTitle>
                    <AlertDescription>
                      Unable to load food statistics for the selected event.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}