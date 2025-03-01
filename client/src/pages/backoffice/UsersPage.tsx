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
import { type User, type Event, type FoodOption } from "@shared/schema";
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

export default function UsersPage() {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});
  const [appliedSort, setAppliedSort] = useState({ by: 'date' as SortOption, asc: false });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: foodOptions } = useQuery<FoodOption[]>({
    queryKey: ["/api/food-options"],
  });

  // Collect unique allergens and special requests from all bookings
  const uniqueValues = useMemo(() => {
    const allergens = new Set<string>();
    const specialRequests = new Set<string>();

    // We'll populate these from user bookings when available
    return { allergens: Array.from(allergens), specialRequests: Array.from(specialRequests) };
  }, []);

  // Sort users based on selected criteria
  const sortedUsers = useMemo(() => {
    if (!users) return [];

    return [...users].sort((a, b) => {
      const multiplier = appliedSort.asc ? 1 : -1;
      switch (appliedSort.by) {
        case 'date':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return (dateA - dateB) * multiplier;
        default:
          return 0;
      }
    });
  }, [users, appliedSort]);

  // Get active filter count
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  const handleSearch = () => {
    setAppliedFilters(filters);
    setAppliedSort({ by: sortBy, asc: sortAsc });
  };

  const handleReset = () => {
    setFilters({});
    setSortBy('date');
    setSortAsc(false);
    setAppliedFilters({});
    setAppliedSort({ by: 'date', asc: false });
  };

  if (usersLoading) {
    return (
      <BackofficeLayout>
        <div>Loading users...</div>
      </BackofficeLayout>
    );
  }

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

        {/* Filters and Sorting */}
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
          {sortedUsers?.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>{user.email}</span>
                  <span className="text-base font-normal text-muted-foreground">
                    Customer since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </CardTitle>
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
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}