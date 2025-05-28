
import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { getQueryFn } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RotateCcw, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { type User, type Event, type FoodOption, type Booking } from "@shared/schema";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UsersSkeleton } from "@/components/skeletons/UsersSkeleton";

type SortOption = 'date' | 'events' | 'seats';
type FilterOptions = {
  events?: number[];
  foodItems?: number[];
  allergens?: string[];
  specialRequest?: string;
  minSeats?: number;
};

// We need to define a custom type for the booking that comes from the API
// which has JSON fields converted to objects
interface ExtendedBooking {
  id: number;
  eventId: number;
  userId: number;
  tableId: number;
  partySize: number | null;
  guestNames: Record<string, string> | null;
  foodSelections: any[] | null;
  customerEmail: string;
  stripePaymentId: string | null;
  createdAt: string | Date | null;
  status: string;
  notes: string | null;
  refundAmount: number | null;
  refundId: string | null;
  lastModified: Date | null;
  modifiedBy: number | null;
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkedInBy: number | null;
  
  // Extended fields added by the API
  event: {
    id: number;
    title: string;
    date: string;
    description?: string;
    image?: string;
    availableTables?: number;
    totalTables?: number;
    availableSeats?: number;
    totalSeats?: number;
    venueId?: number;
    displayOrder?: number;
    isActive?: boolean;
  };
  user: {
    id: number;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    allergens?: string[] | null;
    dietaryRestrictions?: string[] | null;
  };
  table: {
    id: number;
    venueId: number;
    tableNumber: number;
    capacity: number;
    floor: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: string;
    tableSize: number;
    status: string;
    zone: string | null;
    priceCategory: string;
    isLocked: boolean;
    rotation: number;
  };
}

interface UserWithBookings extends User {
  bookings: ExtendedBooking[];
}

export default function UsersPage() {
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<UserWithBookings[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  // Group food options by type
  const foodOptionsByType = useMemo(() => {
    const grouped: Record<string, FoodOption[]> = {};
    
    if (foodOptions) {
      foodOptions.forEach(item => {
        if (!grouped[item.type]) {
          grouped[item.type] = [];
        }
        grouped[item.type].push(item);
      });
    }
    
    return grouped;
  }, [foodOptions]);

  // Get all unique allergens from food items
  const allAllergens = useMemo(() => {
    const allergens = new Set<string>();
    
    if (foodOptions) {
      foodOptions.forEach(item => {
        // Extract allergens from allergens array (more reliable)
        if (item.allergens && Array.isArray(item.allergens)) {
          item.allergens.forEach(allergen => {
            if (allergen) allergens.add(allergen);
          });
        }
        
        // Also check description for backward compatibility
        if (item.description?.toLowerCase().includes('allergen')) {
          const match = item.description.match(/allergens:([^]+)/i);
          if (match && match[1]) {
            const allergensText = match[1].trim();
            allergensText.split(',').forEach(allergen => {
              const cleanAllergen = allergen.trim().replace(/contains /i, '');
              if (cleanAllergen) allergens.add(cleanAllergen);
            });
          }
        }
      });
    }
    
    return Array.from(allergens);
  }, [foodOptions]);

  // Apply filters and sort
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    // First, filter based on search term
    let result = users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => {
        const hasMatchingEmail = user.email.toLowerCase().includes(term);
        const hasMatchingBooking = user.bookings.some(booking => 
          booking.guestNames && Object.values(booking.guestNames)
            .some(name => name.toLowerCase().includes(term))
        );
        return hasMatchingEmail || hasMatchingBooking;
      });
    }

    // Apply other filters
    const appliedFilters = filters;
    
    if (appliedFilters.events && appliedFilters.events.length > 0) {
      result = result.filter(user => 
        user.bookings.some(booking => appliedFilters.events?.includes(booking.event.id))
      );
    }

    if (appliedFilters.foodItems && appliedFilters.foodItems.length > 0) {
      result = result.filter(user =>
        user.bookings.some(booking =>
          booking.foodItems.some(food => appliedFilters.foodItems?.includes(food.id))
        )
      );
    }

    if (appliedFilters.allergens && appliedFilters.allergens.length > 0) {
      result = result.filter(user =>
        user.bookings.some(booking => {
          // Check if any of the food items in this booking has any of the filtered allergens
          return booking.foodItems.some(food => {
            // Check if this food has allergens array and it includes any of the selected allergens
            return food.allergens && Array.isArray(food.allergens) &&
              food.allergens.some(allergen => 
                appliedFilters.allergens?.includes(allergen)
              );
          });
        })
      );
    }

    if (appliedFilters.specialRequest) {
      const requestTerm = appliedFilters.specialRequest.toLowerCase();
      result = result.filter(user =>
        user.bookings.some(booking =>
          booking.specialRequests?.toLowerCase().includes(requestTerm)
        )
      );
    }

    if (appliedFilters.minSeats) {
      result = result.filter(user =>
        user.bookings.some(booking =>
  (booking.partySize || 0) >= (appliedFilters.minSeats || 0)
        )
      );
    }

    // Sort the users
    result.sort((a, b) => {
      if (sortBy === 'date') {
        // Sort by most recent booking
        const aDate = a.bookings.length && a.bookings[0].createdAt
          ? new Date(String(a.bookings[0].createdAt)).getTime()
          : 0;
        const bDate = b.bookings.length && b.bookings[0].createdAt
          ? new Date(String(b.bookings[0].createdAt)).getTime()
          : 0;
        return bDate - aDate; // Most recent first
      } else if (sortBy === 'events') {
        // Sort by number of booked events
        const aEvents = new Set(a.bookings.map(b => b.eventId)).size;
        const bEvents = new Set(b.bookings.map(b => b.eventId)).size;
        return bEvents - aEvents; // Most events first
      } else if (sortBy === 'seats') {
        // Sort by total seats booked
        const aSeats = a.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
        const bSeats = b.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
        return bSeats - aSeats; // Most seats first
      }
      return 0;
    });

    return result;
  }, [users, searchTerm, filters, sortBy]);

  // Track applied filters for displaying count
  const appliedFilters = useMemo(() => {
    return {
      events: filters.events || [],
      foodItems: filters.foodItems || [],
      allergens: filters.allergens || [],
      specialRequest: filters.specialRequest || "",
      minSeats: filters.minSeats || 0
    };
  }, [filters]);

  const handleEventToggle = (eventId: number) => {
    setFilters(prev => ({
      ...prev,
      events: prev.events?.includes(eventId)
        ? prev.events.filter(id => id !== eventId)
        : [...(prev.events || []), eventId]
    }));
  };

  const handleFoodToggle = (foodId: number) => {
    setFilters(prev => ({
      ...prev,
      foodItems: prev.foodItems?.includes(foodId)
        ? prev.foodItems.filter(id => id !== foodId)
        : [...(prev.foodItems || []), foodId]
    }));
  };

  const handleAllergenToggle = (allergen: string) => {
    setFilters(prev => ({
      ...prev,
      allergens: prev.allergens?.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...(prev.allergens || []), allergen]
    }));
  };

  if (usersLoading) {
    return (
      <BackofficeLayout>
        <UsersSkeleton />
      </BackofficeLayout>
    );
  }

  if (usersError) {
    return (
      <BackofficeLayout>
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
          <p className="text-destructive text-center">Failed to load users.</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </BackofficeLayout>
    );
  }

  if (!users?.length) {
    return (
      <BackofficeLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No users found</p>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold">User Management</h1>
          {Object.values(appliedFilters).filter(v => Array.isArray(v) ? v.length > 0 : Boolean(v)).length > 0 && (
            <Badge variant="secondary" className="text-base self-start sm:self-auto">
              {Object.values(appliedFilters).filter(v => Array.isArray(v) ? v.length > 0 : Boolean(v)).length} filters applied
            </Badge>
          )}
        </div>

        {/* Compact Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Sort:</Label>
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Registration Date</SelectItem>
                    <SelectItem value="events">Number of Events</SelectItem>
                    <SelectItem value="seats">Total Seats Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Search:</Label>
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>

              {Object.values(appliedFilters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="ml-auto"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <div className="space-y-4">
          {filteredUsers.map(user => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {user.email}
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                        {user.role}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Joined {user.createdAt ? new Date(String(user.createdAt)).toLocaleDateString() : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {user.bookings.length} {user.bookings.length === 1 ? 'booking' : 'bookings'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0)} total seats
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {user.bookings.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {user.bookings.map(booking => (
                      <AccordionItem key={booking.id} value={booking.id.toString()}>
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex justify-between items-center w-full text-left">
                            <div>
                              <h3 className="font-medium">{booking.event.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {new Date(booking.event.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-4">
                              <p className="text-sm">
                                {booking.partySize || 0} {(booking.partySize || 0) === 1 ? 'seat' : 'seats'}
                              </p>
                              <p className="text-sm">
                                {booking.foodSelections?.length || 0} {(booking.foodSelections?.length || 0) === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-3 bg-secondary/10">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Guests</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {booking.guestNames ? Object.entries(booking.guestNames as Record<string, string>).map(([seatNumber, name]) => (
                                  <div key={seatNumber} className="flex items-center gap-2">
                                    <Badge variant="outline" className="h-6 w-6 flex items-center justify-center p-0 rounded-full">
                                      {seatNumber}
                                    </Badge>
                                    <span className="text-sm">{String(name)}</span>
                                  </div>
                                )) : (
                                  <p className="text-sm text-muted-foreground">No guest names provided</p>
                                )}
                              </div>
                            </div>

                            {booking.foodSelections && booking.foodSelections.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Food Selections</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {booking.foodSelections.map((item: any, index: number) => (
                                    <div key={index} className="text-sm">
                                      <span>Selection {index + 1}: {JSON.stringify(item)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {booking.notes && (
                              <div>
                                <h4 className="font-medium mb-1">Special Requests</h4>
                                <p className="text-sm italic">{booking.notes}</p>
                              </div>
                            )}

                            {user.allergens && user.allergens.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-1">Allergens</h4>
                                <p className="text-sm italic">{user.allergens?.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No bookings found for this user.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users match the selected filters</p>
              <Button
                variant="link"
                onClick={() => {
                  setFilters({});
                  setSearchTerm("");
                }}
              >
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Filter by Food Selections</Label>
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(foodOptionsByType).map(([type, items]) => (
                        <AccordionItem key={type} value={type}>
                          <AccordionTrigger className="capitalize text-sm">{type}s</AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-1 space-y-2">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`food-${item.id}`}
                                    checked={appliedFilters.foodItems.includes(item.id)}
                                    onCheckedChange={() => handleFoodToggle(item.id)}
                                  />
                                  <label
                                    htmlFor={`food-${item.id}`}
                                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {item.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </>
              )}

              {allAllergens.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Filter by Allergens</Label>
                    <div className="pl-1 space-y-2">
                      {allAllergens.map((allergen) => (
                        <div key={allergen} className="flex items-center space-x-2">
                          <Checkbox
                            id={`allergen-${allergen}`}
                            checked={appliedFilters.allergens.includes(allergen)}
                            onCheckedChange={() => handleAllergenToggle(allergen)}
                          />
                          <label
                            htmlFor={`allergen-${allergen}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {allergen}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="special-request">Special Request</Label>
                <Input
                  id="special-request"
                  placeholder="Contains text..."
                  value={filters.specialRequest || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, specialRequest: e.target.value }))}
                />
              </div>

              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="min-seats">Minimum Seats</Label>
                <Input
                  id="min-seats"
                  type="number"
                  min="0"
                  value={filters.minSeats || ""}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    minSeats: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setFilters({});
                  setSearchTerm("");
                  toast({
                    description: "All filters have been reset."
                  });
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Main user list */}
          <div className="space-y-6">
            {filteredUsers.map(user => (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="bg-secondary/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {user.email}
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                          {user.role}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Joined {user.createdAt ? new Date(String(user.createdAt)).toLocaleDateString() : 'N/A'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.bookings.length} Bookings</p>
                      <p className="text-xs text-muted-foreground">
                        {user.bookings.reduce((total, booking) => total + (booking.partySize || 0), 0)} Total Seats
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {user.bookings.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      {user.bookings.map(booking => (
                        <AccordionItem key={booking.id} value={`booking-${booking.id}`}>
                          <AccordionTrigger className="px-6 py-3 hover:no-underline hover:bg-secondary/30">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full text-left">
                              <div>
                                <p className="font-medium">{booking.event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(booking.event.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-4">
                                <p className="text-sm">
                                  {booking.partySize || 0} {(booking.partySize || 0) === 1 ? 'seat' : 'seats'}
                                </p>
                                <p className="text-sm">
                                  {booking.foodSelections?.length || 0} {(booking.foodSelections?.length || 0) === 1 ? 'item' : 'items'}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-6 py-3 bg-secondary/10">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Guests</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {booking.guestNames ? Object.entries(booking.guestNames as Record<string, string>).map(([seatNumber, name]) => (
                                    <div key={seatNumber} className="flex items-center gap-2">
                                      <Badge variant="outline" className="h-6 w-6 flex items-center justify-center p-0 rounded-full">
                                        {seatNumber}
                                      </Badge>
                                      <span className="text-sm">{String(name)}</span>
                                    </div>
                                  )) : (
                                    <p className="text-sm text-muted-foreground">No guest names provided</p>
                                  )}
                                </div>
                              </div>

                              {booking.foodSelections && booking.foodSelections.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Food Selections</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {booking.foodSelections.map((item: any, index: number) => (
                                      <div key={index} className="text-sm">
                                        <span>Selection {index + 1}: {JSON.stringify(item)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {booking.notes && (
                                <div>
                                  <h4 className="font-medium mb-1">Special Requests</h4>
                                  <p className="text-sm italic">{booking.notes}</p>
                                </div>
                              )}

                              {user.allergens && user.allergens.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-1">Allergens</h4>
                                  <p className="text-sm italic">{user.allergens?.join(', ')}</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      No bookings found for this user.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users match the selected filters</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setFilters({});
                    setSearchTerm("");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
