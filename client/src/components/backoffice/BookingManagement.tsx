import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Booking, type Event, type FoodOption, type User, type Table, type Seat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Ban, RefreshCw, DollarSign, MessageSquare, Check, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type EnrichedBooking = Booking & { 
  event: Event; 
  foodItems: FoodOption[];
  user: User;
};

export function BookingManagement() {
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const [isSeatsDialogOpen, setIsSeatsDialogOpen] = useState(false);
  const [isFoodDialogOpen, setIsFoodDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // State for seat selection management
  const [selectedTableId, setSelectedTableId] = useState<number>(0);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>([]);
  
  // State for food selection management
  const [foodSelections, setFoodSelections] = useState<Record<string, Record<string, number>>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: bookings, isLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bookings");
      const bookingsData = await res.json();
      
      // Fetch detailed info for each booking
      const enrichedBookings = await Promise.all(
        bookingsData.map(async (booking: Booking) => {
          const detailRes = await apiRequest("GET", `/api/bookings/${booking.id}`);
          return await detailRes.json();
        })
      );
      
      return enrichedBookings;
    }
  });
  
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking canceled",
        description: "The booking has been successfully canceled",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel booking",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async ({ bookingId, note }: { bookingId: number; note: string }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/add-note`, { note });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "The note has been added to the booking",
      });
      setNoteText("");
      setIsNoteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const processRefundMutation = useMutation({
    mutationFn: async ({ bookingId, amount }: { bookingId: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/refund`, { amount });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Refund processed",
        description: "The refund has been successfully processed",
      });
      setRefundAmount(0);
      setIsRefundDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process refund",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const changeSeatsBookingMutation = useMutation({
    mutationFn: async ({ 
      bookingId, 
      tableId, 
      seatNumbers 
    }: { 
      bookingId: number; 
      tableId: number; 
      seatNumbers: number[] 
    }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/change-seats`, { 
        tableId, seatNumbers, eventId: selectedBooking?.eventId 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Seats updated",
        description: "The seat assignments have been successfully updated",
      });
      setSelectedTableId(0);
      setSelectedSeatNumbers([]);
      setIsSeatsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update seats",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const changeFoodBookingMutation = useMutation({
    mutationFn: async ({ 
      bookingId, 
      foodSelections 
    }: { 
      bookingId: number; 
      foodSelections: Record<string, Record<string, number>> 
    }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/change-food`, { foodSelections });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Food selections updated",
        description: "The food selections have been successfully updated",
      });
      setFoodSelections({});
      setIsFoodDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update food selections",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter bookings based on search query and status
  const filteredBookings = bookings?.filter(booking => {
    const matchesSearch = 
      searchQuery === "" || 
      booking.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toString().includes(searchQuery) ||
      booking.event.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "modified":
        return <Badge className="bg-blue-500">Modified</Badge>;
      case "refunded":
        return <Badge className="bg-amber-500">Refunded</Badge>;
      case "canceled":
        return <Badge className="bg-red-500">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading bookings...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="w-full md:w-1/3">
          <Input
            placeholder="Search by email, ID, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-1/4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="modified">Modified</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-card rounded-md shadow">
        <TableComponent>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings?.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">#{booking.id}</TableCell>
                <TableCell>{booking.event.title}</TableCell>
                <TableCell>{booking.user.email}</TableCell>
                <TableCell>{booking.seatNumbers.length} seats</TableCell>
                <TableCell>{getStatusBadge(booking.status)}</TableCell>
                <TableCell>{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "N/A"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsNoteDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Note
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsRefundDialogOpen(true);
                      }}
                      disabled={booking.status === "refunded" || booking.status === "canceled"}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Refund
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsSeatsDialogOpen(true);
                      }}
                      disabled={booking.status === "canceled"}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Seats
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsFoodDialogOpen(true);
                      }}
                      disabled={booking.status === "canceled"}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Food
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to cancel this booking?")) {
                          cancelBookingMutation.mutate(booking.id);
                        }
                      }}
                      disabled={booking.status === "canceled"}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {filteredBookings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No bookings found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableComponent>
      </div>
      
      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note to Booking #{selectedBooking?.id}</DialogTitle>
            <DialogDescription>
              Add a note to this booking for record-keeping or customer support purposes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
            />
            
            {selectedBooking?.notes && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Previous Notes:</h4>
                <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-line">
                  {selectedBooking.notes}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking && noteText.trim()) {
                  addNoteMutation.mutate({
                    bookingId: selectedBooking.id,
                    note: noteText
                  });
                }
              }}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Note
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Process Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund for Booking #{selectedBooking?.id}</DialogTitle>
            <DialogDescription>
              Enter the amount to refund to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center">
              <span className="mr-2 text-lg">$</span>
              <Input
                type="number"
                placeholder="Amount to refund"
                value={refundAmount || ""}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                min={0}
                step={0.01}
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Customer: {selectedBooking?.user.email}</p>
              <p>Event: {selectedBooking?.event.title}</p>
              <p>Date: {selectedBooking?.createdAt ? new Date(selectedBooking.createdAt).toLocaleDateString() : "N/A"}</p>
              <p>Status: {selectedBooking?.status}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking && refundAmount > 0) {
                  processRefundMutation.mutate({
                    bookingId: selectedBooking.id,
                    amount: refundAmount
                  });
                }
              }}
              disabled={!refundAmount || refundAmount <= 0 || processRefundMutation.isPending}
            >
              {processRefundMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}