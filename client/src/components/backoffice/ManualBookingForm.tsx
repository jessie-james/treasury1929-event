import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Event, User, Table, Seat, FoodOption } from "@shared/schema";

interface SeatWithAvailability extends Seat {
  isAvailable: boolean;
}

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Form validation schema
const bookingFormSchema = z.object({
  eventId: z.number({
    required_error: "Please select an event",
  }),
  userId: z.number({
    required_error: "Please select a user",
  }),
  tableId: z.number({
    required_error: "Please select a table",
  }),
  seatNumbers: z.array(z.number()).min(1, "Please select at least one seat"),
  customerEmail: z.string().email("Please enter a valid email address"),
  foodSelections: z.record(z.record(z.number().optional())).optional(),
  guestNames: z.record(z.string()).optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function ManualBookingForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get events for dropdown
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  // Get users for dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Get tables for dropdown
  const { data: tables } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });
  
  // Form setup
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      seatNumbers: [],
      foodSelections: {},
      guestNames: {},
    },
  });
  
  // Selected values for conditional fields
  const watchEventId = form.watch("eventId");
  const watchTableId = form.watch("tableId");
  
  // Get seats for selected table
  const { data: seats, isLoading: isLoadingSeats } = useQuery<SeatWithAvailability[]>({
    queryKey: ["/api/tables", watchTableId, "seats", { eventId: watchEventId }],
    queryFn: async () => {
      if (!watchTableId || !watchEventId) return [];
      const response = await fetch(`/api/tables/${watchTableId}/seats?eventId=${watchEventId}`);
      return await response.json();
    },
    enabled: !!watchEventId && !!watchTableId,
  });
  
  // Get food options
  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });
  
  // Mutation for creating a manual booking
  const createManualBooking = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      const response = await apiRequest("POST", "/api/manual-booking", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual booking created successfully",
      });
      setOpen(false);
      form.reset();
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: BookingFormValues) => {
    createManualBooking.mutate(values);
  };
  
  // Function to get salads, entrees, and desserts
  const getFoodItemsByType = (type: string) => {
    return foodOptions?.filter(food => food.type === type) || [];
  };
  
  // Get available seats
  const availableSeats = seats?.filter(seat => 'isAvailable' in seat && seat.isAvailable) || [];
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Manual Booking</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>
            Create a new booking manually without payment processing
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Selection */}
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.title} - {format(new Date(event.date), "PPP")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* User Selection */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.filter(u => u.role === "customer").map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Customer Email */}
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    This will be used for sending confirmation emails
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Table Selection */}
            {watchEventId && (
              <FormField
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables?.map((table) => (
                          <SelectItem key={table.id} value={table.id.toString()}>
                            Table {table.tableNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Seat Selection */}
            {watchTableId && (
              <FormField
                control={form.control}
                name="seatNumbers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {isLoadingSeats ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            availableSeats.map((seat) => (
                              <Button
                                key={seat.id}
                                type="button"
                                size="sm"
                                variant={field.value.includes(seat.seatNumber) ? "default" : "outline"}
                                onClick={() => {
                                  const newValue = field.value.includes(seat.seatNumber)
                                    ? field.value.filter((id) => id !== seat.seatNumber)
                                    : [...field.value, seat.seatNumber];
                                  field.onChange(newValue);
                                }}
                              >
                                Seat {seat.seatNumber}
                              </Button>
                            ))
                          )}
                          {availableSeats.length === 0 && !isLoadingSeats && (
                            <p className="text-sm text-muted-foreground">No available seats</p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Selected: {field.value.map(s => `Seat ${s}`).join(", ")}
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Add any special requests or notes" />
                  </FormControl>
                  <FormDescription>
                    Internal notes for this booking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="submit"
                disabled={createManualBooking.isPending}
              >
                {createManualBooking.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Booking
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}