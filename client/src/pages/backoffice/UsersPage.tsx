import { useQuery } from "@tanstack/react-query";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { type User, type Event, type FoodOption } from "@shared/schema";
import { UserProfile } from "@/components/backoffice/UserProfile";
import { useState, useMemo } from "react";

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
  const [filters, setFilters] = useState<FilterOptions>({});

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
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        // Other sort options will be implemented when we have the data
        default:
          return 0;
      }
    });
  }, [users, sortBy]);

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
        <h1 className="text-4xl font-bold">User Management</h1>

        {/* Filters and Sorting */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sort Options */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort criteria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Customer Since</SelectItem>
                    <SelectItem value="events">Number of Events</SelectItem>
                    <SelectItem value="seats">Total Seats Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Filter */}
              <div className="space-y-2">
                <Label>Filter by Event</Label>
                <Select
                  value={filters.event?.toString()}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, event: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Events</SelectItem>
                    {events?.map(event => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Food Selection Filter */}
              <div className="space-y-2">
                <Label>Filter by Food Selection</Label>
                <Select
                  value={filters.foodItem?.toString()}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, foodItem: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select food item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Food Items</SelectItem>
                    {foodOptions?.map(food => (
                      <SelectItem key={food.id} value={food.id.toString()}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Minimum Seats Filter */}
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

              {/* Allergen Filter */}
              <div className="space-y-2">
                <Label>Filter by Allergen</Label>
                <Select
                  value={filters.allergen}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, allergen: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select allergen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Allergens</SelectItem>
                    {uniqueValues.allergens.map(allergen => (
                      <SelectItem key={allergen} value={allergen}>
                        {allergen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Special Requirements Filter */}
              <div className="space-y-2">
                <Label>Filter by Special Requirement</Label>
                <Select
                  value={filters.specialRequest}
                  onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, specialRequest: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Requirements</SelectItem>
                    {uniqueValues.specialRequests.map(req => (
                      <SelectItem key={req} value={req}>
                        {req}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    Customer since: {new Date(user.createdAt).toLocaleDateString()}
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