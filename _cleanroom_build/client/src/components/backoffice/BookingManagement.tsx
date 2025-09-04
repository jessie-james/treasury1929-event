import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Booking, type Event, type FoodOption, type User, type Table as DbTable, type Seat, type BookingWithDetails } from "@shared/schema";
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { formatPhoenixDateShort } from "@/lib/timezone";

type EnrichedBooking = BookingWithDetails & { 
  foodItems?: FoodOption[];
};

export function BookingManagement() {
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking | null>(null);
  const [isSeatsDialogOpen, setIsSeatsDialogOpen] = useState(false);
  const [isFoodDialogOpen, setIsFoodDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [releaseReason, setReleaseReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // State for seat selection management
  const [selectedTableId, setSelectedTableId] = useState<number>(0);
  const [selectedPartySize, setSelectedPartySize] = useState<number>(1);
  
  // State for food selection management
  const [foodSelections, setFoodSelections] = useState<Record<string, Record<string, number>>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: bookings, isLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/bookings"],
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
      console.log(`🔄 Frontend: Starting refund for booking ${bookingId}, amount: $${amount}`);
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/refund`, { amount });
      console.log(`📊 Frontend: API response status: ${res.status}`);
      
      if (!res.ok) {
        const errorData = await res.text();
        console.error(`❌ Frontend: API error response:`, errorData);
        throw new Error(`Refund failed: ${errorData}`);
      }
      
      const result = await res.json();
      console.log(`✅ Frontend: Refund successful:`, result);
      return result;
    },
    onSuccess: () => {
      console.log(`✅ Frontend: Refund mutation completed successfully`);
      toast({
        title: "Refund processed",
        description: "The refund has been successfully processed",
      });
      setRefundAmount(0);
      setIsRefundDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      console.error(`❌ Frontend: Refund mutation failed:`, error);
      toast({
        title: "Failed to process refund",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const releaseTableMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/release`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Table released",
        description: "The table has been manually released",
      });
      setReleaseReason("");
      setIsReleaseDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to release table",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const changeSeatsBookingMutation = useMutation({
    mutationFn: async ({ 
      bookingId, 
      tableId, 
      partySize 
    }: { 
      bookingId: number; 
      tableId: number; 
      partySize: number 
    }) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/change-seats`, { 
        tableId, partySize, eventId: selectedBooking?.eventId 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Table assignment updated",
        description: "The table assignment has been successfully updated",
      });
      setSelectedTableId(0);
      setSelectedPartySize(1);
      setIsSeatsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update table assignment",
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
  
  // Filter and sort bookings based on search query and status
  const filteredBookings = bookings?.filter(booking => {
    const matchesSearch = 
      searchQuery === "" || 
      booking.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toString().includes(searchQuery) ||
      booking.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.table?.tableNumber?.toString().includes(searchQuery) ||
      booking.stripePaymentId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort by createdAt date, newest first
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
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
              <SelectItem value="refunded">Refunded (Auto-synced from Stripe)</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
          <strong>Note:</strong> Refunds processed directly in Stripe automatically update booking status and release tables. Refunded bookings cannot be modified.
        </div>
      </div>
      
      <div className="bg-card rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Party Size</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings?.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">#{booking.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{booking.event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.event.date ? new Date(booking.event.date).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric', 
                        hour: 'numeric', minute: '2-digit' 
                      }) : 'N/A'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{booking.user.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.user.firstName} {booking.user.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>Table {booking.table?.tableNumber || booking.tableId}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.table?.floor === 'main' && booking.table?.tableNumber >= 200 ? 'Mezzanine' : 'Main Floor'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{booking.partySize} guests</TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>${((booking.totalAmount || booking.amount || 0) / 100).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.refundAmount ? `Refunded: $${(booking.refundAmount / 100).toFixed(2)}` : 'Paid'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex flex-col">
                    <span className="break-all max-w-[200px]" title={booking.stripePaymentId || 'No payment ID'}>
                      {booking.stripePaymentId || 'N/A'}
                    </span>
                    {booking.refundId && (
                      <span className="text-amber-600 break-all max-w-[200px]" title={booking.refundId}>
                        R: {booking.refundId}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(booking.status)}</TableCell>
                <TableCell>{booking.createdAt ? formatPhoenixDateShort(booking.createdAt) : "N/A"}</TableCell>
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
                      disabled={booking.status === "refunded" || booking.status === "cancelled"}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Refund
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsReleaseDialogOpen(true);
                      }}
                      disabled={booking.status === "cancelled" || booking.status === "refunded"}
                    >
                      <RotateCw className="h-4 w-4 mr-1" />
                      Release
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setIsSeatsDialogOpen(true);
                      }}
                      disabled={booking.status === "cancelled" || booking.status === "refunded"}
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
                      disabled={booking.status === "cancelled" || booking.status === "refunded"}
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
                      disabled={booking.status === "cancelled" || booking.status === "refunded"}
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
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No bookings found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
              <p>Date: {selectedBooking?.createdAt ? formatPhoenixDateShort(selectedBooking.createdAt) : "N/A"}</p>
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
      
      {/* Manual Release Dialog */}
      <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Table Manually</DialogTitle>
            <DialogDescription>
              This will cancel the booking and release the table without processing a refund. 
              Use this for manual corrections or when refund has been processed separately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Release</label>
              <Textarea
                placeholder="Enter reason for manually releasing this table (required)..."
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Booking:</strong> #{selectedBooking?.id}</p>
              <p><strong>Customer:</strong> {selectedBooking?.user.email}</p>
              <p><strong>Table:</strong> {selectedBooking?.table?.tableNumber || selectedBooking?.tableId} ({selectedBooking?.table?.floor === 'main' && selectedBooking?.table?.tableNumber >= 200 ? 'Mezzanine' : 'Main Floor'})</p>
              <p><strong>Event:</strong> {selectedBooking?.event.title}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking && releaseReason.trim()) {
                  releaseTableMutation.mutate({
                    bookingId: selectedBooking.id,
                    reason: releaseReason.trim()
                  });
                }
              }}
              disabled={!releaseReason.trim() || releaseTableMutation.isPending}
              variant="destructive"
            >
              {releaseTableMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Release Table
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Seats Modification Dialog */}
      <Dialog open={isSeatsDialogOpen} onOpenChange={setIsSeatsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Seats for Booking #{selectedBooking?.id}</DialogTitle>
            <DialogDescription>
              Modify seat assignments for this booking. Current Table: {selectedBooking?.table?.tableNumber || selectedBooking?.tableId} ({selectedBooking?.table?.floor === 'main' && selectedBooking?.table?.tableNumber >= 200 ? 'Mezzanine' : 'Main Floor'}), Party Size: {selectedBooking?.partySize}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Select Table</h3>
                <Select 
                  value={selectedTableId.toString()} 
                  onValueChange={(value) => setSelectedTableId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Table 1</SelectItem>
                    <SelectItem value="2">Table 2</SelectItem>
                    <SelectItem value="3">Table 3</SelectItem>
                    <SelectItem value="4">Table 4</SelectItem>
                    <SelectItem value="5">Table 5</SelectItem>
                    <SelectItem value="6">Table 6</SelectItem>
                    <SelectItem value="7">Table 7</SelectItem>
                    <SelectItem value="8">Table 8</SelectItem>
                    <SelectItem value="9">Table 9</SelectItem>
                    <SelectItem value="10">Table 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Table Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Table ID</label>
                    <Input
                      type="number"
                      value={selectedTableId || ""}
                      onChange={(e) => setSelectedTableId(parseInt(e.target.value) || 0)}
                      placeholder="Enter table ID"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Party Size</label>
                    <Input
                      type="number"
                      value={selectedPartySize}
                      onChange={(e) => setSelectedPartySize(parseInt(e.target.value) || 1)}
                      placeholder="Enter party size"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium mb-2">Booking Information</h3>
              <div className="text-sm text-muted-foreground">
                <p>Event: {selectedBooking?.event.title}</p>
                <p>Original Table: {selectedBooking?.table?.tableNumber || selectedBooking?.tableId} ({selectedBooking?.table?.floor === 'main' && selectedBooking?.table?.tableNumber >= 200 ? 'Mezzanine' : 'Main Floor'})</p>
                <p>Current Party Size: {selectedBooking?.partySize}</p>
                <p>Status: {selectedBooking?.status}</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSeatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking && selectedTableId && selectedPartySize > 0) {
                  changeSeatsBookingMutation.mutate({
                    bookingId: selectedBooking.id,
                    tableId: selectedTableId,
                    partySize: selectedPartySize
                  });
                }
              }}
              disabled={!selectedTableId || selectedPartySize <= 0 || changeSeatsBookingMutation.isPending}
            >
              {changeSeatsBookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Update Seats
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Food Modification Dialog */}
      <Dialog open={isFoodDialogOpen} onOpenChange={setIsFoodDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modify Food Selections for Booking #{selectedBooking?.id}</DialogTitle>
            <DialogDescription>
              Update food selections for each seat in this booking.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {Array.from({ length: selectedBooking?.partySize || 1 }, (_, index) => (
              <div key={index} className="space-y-3 p-3 border rounded-md">
                <h3 className="font-medium">Guest {index + 1}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <h4 className="text-sm mb-1">Salad</h4>
                    <Select 
                      value={(foodSelections[`guest-${index}`]?.salad || "0").toString()} 
                      onValueChange={(value) => {
                        setFoodSelections(prev => ({
                          ...prev,
                          [`guest-${index}`]: {
                            ...prev[`guest-${index}`] || {},
                            salad: parseInt(value)
                          }
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a salad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">Garden Salad</SelectItem>
                        <SelectItem value="2">Caesar Salad</SelectItem>
                        <SelectItem value="3">Greek Salad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="text-sm mb-1">Entrée</h4>
                    <Select 
                      value={(foodSelections[`guest-${index}`]?.entree || "0").toString()} 
                      onValueChange={(value) => {
                        setFoodSelections(prev => ({
                          ...prev,
                          [`guest-${index}`]: {
                            ...prev[`guest-${index}`] || {},
                            entree: parseInt(value)
                          }
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an entrée" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="4">Grilled Chicken</SelectItem>
                        <SelectItem value="5">Beef Tenderloin</SelectItem>
                        <SelectItem value="6">Vegetable Risotto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="text-sm mb-1">Dessert</h4>
                    <Select 
                      value={(foodSelections[`guest-${index}`]?.dessert || "0").toString()} 
                      onValueChange={(value) => {
                        setFoodSelections(prev => ({
                          ...prev,
                          [`guest-${index}`]: {
                            ...prev[`guest-${index}`] || {},
                            dessert: parseInt(value)
                          }
                        }))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dessert" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="7">Chocolate Cake</SelectItem>
                        <SelectItem value="8">Cheesecake</SelectItem>
                        <SelectItem value="9">Fruit Tart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="text-sm text-muted-foreground mt-4">
              <p>Event: {selectedBooking?.event.title}</p>
              <p>Table: {selectedBooking?.table?.tableNumber || selectedBooking?.tableId} ({selectedBooking?.table?.floor === 'main' && selectedBooking?.table?.tableNumber >= 200 ? 'Mezzanine' : 'Main Floor'}), Party Size: {selectedBooking?.partySize}</p>
              <p>Status: {selectedBooking?.status}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFoodDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBooking && Object.keys(foodSelections).length > 0) {
                  changeFoodBookingMutation.mutate({
                    bookingId: selectedBooking.id,
                    foodSelections: foodSelections
                  });
                }
              }}
              disabled={Object.keys(foodSelections).length === 0 || changeFoodBookingMutation.isPending}
            >
              {changeFoodBookingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Update Food Selections
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}