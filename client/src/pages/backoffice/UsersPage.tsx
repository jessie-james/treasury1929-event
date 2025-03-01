import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RotateCcw } from "lucide-react";
import { type User, type Event, type FoodOption, type Booking } from "@shared/schema";
import { UserProfile } from "@/components/backoffice/UserProfile";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type SortOption = 'date' | 'events' | 'seats';
type FilterOptions = {
  event?: number;
  foodItem?: number;
  allergen?: string;
  specialRequest?: string;
  minSeats?: number;
};

interface ExtendedBooking extends Booking {
  event: {
    id: number;
    title: string;
    date: string;
  };
  foodItems: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  foodSelections: {
    [key: string]: {
      [key: string]: number;
    };
  };
  specialRequests?: string;
  allergens?: string;
}

interface ExtendedUser extends User {
  bookings: ExtendedBooking[];
}

export default function UsersPage() {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});

  const { data: users, isLoading: usersLoading } = useQuery<ExtendedUser[]>({
    queryKey: ["/api/users"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  // Get unique allergens and special requests
  const uniqueValues = useMemo(() => {
    const allergens = new Set<string>();
    const specialRequests = new Set<string>();

    users?.forEach(user => {
      user.bookings?.forEach(booking => {
        if (booking.allergens) {
          allergens.add(booking.allergens);
        }
        if (booking.specialRequests) {
          specialRequests.add(booking.specialRequests);
        }
      });
    });

    return {
      allergens: Array.from(allergens),
      specialRequests: Array.from(specialRequests)
    };
  }, [users]);

  // Update the getUserStats function
  const getUserStats = (user: ExtendedUser) => {
    const userBookings = user.bookings || [];
    const stats = {
      totalSeats: 0,
      eventCount: userBookings.length,
      totalSeatsAll: userBookings.reduce((sum, b) => sum + (b.seatNumbers.length || 0), 0),
      selectedFoodCount: 0,
      matchingEvents: [] as string[],
    };

    if (appliedFilters.event) {
      const eventBookings = userBookings.filter(b => b.event.id === appliedFilters.event);
      stats.matchingEvents = eventBookings.map(b => b.event.title);
      stats.totalSeats = eventBookings.reduce((sum, b) => sum + (b.seatNumbers.length || 0), 0);
    }

    if (appliedFilters.foodItem) {
      stats.selectedFoodCount = userBookings.reduce((count, booking) => {
        return count + booking.foodItems.filter(item => item.id === appliedFilters.foodItem).length;
      }, 0);
    }

    return stats;
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    // Apply filters
    if (appliedFilters.event) {
      filtered = filtered.filter(user =>
        user.bookings?.some(b => b.event.id === appliedFilters.event)
      );
    }

    if (appliedFilters.foodItem) {
      filtered = filtered.filter(user => {
        const stats = getUserStats(user);
        return stats.selectedFoodCount > 0;
      });
    }

    if (appliedFilters.minSeats) {
      filtered = filtered.filter(user => {
        const totalSeats = user.bookings?.reduce(
          (sum, b) => sum + (b.seatNumbers?.length || 0),
          0
        ) || 0;
        return totalSeats >= appliedFilters.minSeats;
      });
    }

    // Sort users
    return filtered.sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      switch (sortBy) {
        case 'date':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return (dateA - dateB) * multiplier;
        case 'events':
          const eventsA = a.bookings?.length || 0;
          const eventsB = b.bookings?.length || 0;
          return (eventsA - eventsB) * multiplier;
        case 'seats':
          const seatsA = a.bookings?.reduce((sum, b) => sum + (b.seatNumbers.length || 0), 0) || 0;
          const seatsB = b.bookings?.reduce((sum, b) => sum + (b.seatNumbers.length || 0), 0) || 0;
          return (seatsA - seatsB) * multiplier;
        default:
          return 0;
      }
    });
  }, [users, appliedFilters, sortBy, sortAsc]);

  // Get active filter count
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters({});
    setAppliedFilters({});
  };

  if (usersLoading) {
    return (
      <BackofficeLayout>
        <div>Loading users...</div>
      </BackofficeLayout>
    );
  }

  const selectedFoodName = appliedFilters.foodItem
    ? foodOptions?.find(f => f.id === appliedFilters.foodItem)?.name
    : null;

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">User Management</h1>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-base">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
            </Badge>
          )}
        </div>

        {/* Filters Card - Content remains the same as before */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Organization</CardTitle>
            <CardDescription>
              Use the filters below to find specific users and organize the results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Sort Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sort Options</h3>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select sort criteria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Customer Since</SelectItem>
                      <SelectItem value="events">Number of Events</SelectItem>
                      <SelectItem value="seats">Total Seats Booked</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortAsc(!sortAsc)}
                    className="shrink-0"
                  >
                    <ArrowUpDown className={`h-4 w-4 transition-transform ${sortAsc ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Basic Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select
                      value={filters.event?.toString() || "all"}
                      onValueChange={(value) =>
                        setFilters(prev => ({
                          ...prev,
                          event: value === "all" ? undefined : parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {events?.map(event => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Seats Booked</Label>
                    <Input
                      type="number"
                      min="0"
                      value={filters.minSeats || ''}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, minSeats: parseInt(e.target.value) || undefined }))
                      }
                      placeholder="Enter minimum seats"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Food Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Food Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Food Selection</Label>
                    <Select
                      value={filters.foodItem?.toString() || "all"}
                      onValueChange={(value) =>
                        setFilters(prev => ({
                          ...prev,
                          foodItem: value === "all" ? undefined : parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select food item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Food Items</SelectItem>
                        {foodOptions?.map(food => (
                          <SelectItem key={food.id} value={food.id.toString()}>
                            {food.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Special Requirements</Label>
                    <Select
                      value={filters.specialRequest || "all"}
                      onValueChange={(value) =>
                        setFilters(prev => ({
                          ...prev,
                          specialRequest: value === "all" ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requirements</SelectItem>
                        {uniqueValues.specialRequests.map(req => (
                          <SelectItem key={req} value={req}>
                            {req}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Allergens</Label>
                    <Select
                      value={filters.allergen || "all"}
                      onValueChange={(value) =>
                        setFilters(prev => ({
                          ...prev,
                          allergen: value === "all" ? undefined : value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select allergen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Allergens</SelectItem>
                        {uniqueValues.allergens.map(allergen => (
                          <SelectItem key={allergen} value={allergen}>
                            {allergen}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="min-w-[120px]"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
                <Button
                  onClick={handleSearch}
                  className="min-w-[120px]"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>

              {/* Active Filters Summary */}
              {activeFilterCount > 0 && (
                <div className="pt-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Filters:</h3>
                  <div className="flex flex-wrap gap-2">
                    {appliedFilters.event && (
                      <Badge variant="secondary">
                        Event: {events?.find(e => e.id === appliedFilters.event)?.title}
                      </Badge>
                    )}
                    {appliedFilters.foodItem && (
                      <Badge variant="secondary">
                        Food: {foodOptions?.find(f => f.id === appliedFilters.foodItem)?.name}
                      </Badge>
                    )}
                    {appliedFilters.minSeats && (
                      <Badge variant="secondary">
                        Min Seats: {appliedFilters.minSeats}
                      </Badge>
                    )}
                    {appliedFilters.allergen && (
                      <Badge variant="secondary">
                        Allergen: {appliedFilters.allergen}
                      </Badge>
                    )}
                    {appliedFilters.specialRequest && (
                      <Badge variant="secondary">
                        Special Request: {appliedFilters.specialRequest}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <div className="space-y-6">
          {filteredAndSortedUsers.map((user) => {
            const stats = getUserStats(user);

            return (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <span>{user.email}</span>
                      <span className="text-base font-normal text-muted-foreground block lg:inline lg:ml-4">
                        Customer since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </CardTitle>
                  {/* User Stats Based on Active Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Total Events</span>
                      <p className="text-2xl font-bold">{stats.eventCount}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Total Seats Booked</span>
                      <p className="text-2xl font-bold">{stats.totalSeatsAll}</p>
                    </div>
                    {appliedFilters.event && stats.matchingEvents.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Selected Event Seats</span>
                        <p className="text-2xl font-bold">{stats.totalSeats}</p>
                        <span className="text-sm text-primary">
                          {stats.matchingEvents.join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedFoodName && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          {selectedFoodName} Orders
                        </span>
                        <p className="text-2xl font-bold">{stats.selectedFoodCount}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="profile">
                      <AccordionTrigger className="text-xl">
                        View Profile & Bookings
                      </AccordionTrigger>
                      <AccordionContent>
                        <UserProfile userId={user.id} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </BackofficeLayout>
  );
}