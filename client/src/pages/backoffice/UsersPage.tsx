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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, RotateCcw } from "lucide-react";
import { type User, type Event, type FoodOption, type Booking } from "@shared/schema";
import { UserProfile } from "@/components/backoffice/UserProfile";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ... keep existing type definitions and interfaces ...

export default function UsersPage() {
  // ... keep existing state and query hooks ...

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

        {/* Filters Card */}
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Filters & Organization</CardTitle>
            <CardDescription className="hidden sm:block">
              Use the filters below to find specific users and organize the results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Sort Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sort Options</h3>
                <div className="flex gap-2 w-full sm:w-auto">
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
                    className="shrink-0 w-12 h-10"
                  >
                    <ArrowUpDown className={`h-4 w-4 transition-transform ${sortAsc ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Events Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Events</h3>
                <div className="grid grid-cols-1 gap-4">
                  {events?.map(event => (
                    <div key={event.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={filters.events?.includes(event.id)}
                        onCheckedChange={() => handleEventToggle(event.id)}
                        className="h-5 w-5"
                      />
                      <Label 
                        htmlFor={`event-${event.id}`}
                        className="text-sm sm:text-base flex-1 cursor-pointer"
                      >
                        {event.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Food Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Food Selections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {foodOptions?.map(food => (
                    <div key={food.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`food-${food.id}`}
                        checked={filters.foodItems?.includes(food.id)}
                        onCheckedChange={() => handleFoodToggle(food.id)}
                        className="h-5 w-5"
                      />
                      <Label 
                        htmlFor={`food-${food.id}`}
                        className="text-sm sm:text-base flex-1 cursor-pointer"
                      >
                        {food.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Allergens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Allergens</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALLERGEN_OPTIONS.map(allergen => (
                    <div key={allergen} className="flex items-center space-x-3">
                      <Checkbox
                        id={`allergen-${allergen}`}
                        checked={filters.allergens?.includes(allergen)}
                        onCheckedChange={() => handleAllergenToggle(allergen)}
                        className="h-5 w-5"
                      />
                      <Label 
                        htmlFor={`allergen-${allergen}`}
                        className="text-sm sm:text-base flex-1 cursor-pointer"
                      >
                        {allergen}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Minimum Seats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Filters</h3>
                <div className="w-full sm:w-1/2">
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
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
                <Button
                  onClick={handleSearch}
                  className="w-full sm:w-auto"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>

              {/* Active Filters Summary */}
              {Object.values(appliedFilters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) && (
                <div className="pt-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Filters:</h3>
                  <div className="flex flex-wrap gap-2">
                    {appliedFilters.events?.map(eventId => (
                      <Badge key={eventId} variant="secondary" className="text-xs sm:text-sm">
                        Event: {events?.find(e => e.id === eventId)?.title}
                      </Badge>
                    ))}
                    {appliedFilters.foodItems?.map(foodId => (
                      <Badge key={foodId} variant="secondary" className="text-xs sm:text-sm">
                        Food: {foodOptions?.find(f => f.id === foodId)?.name}
                      </Badge>
                    ))}
                    {appliedFilters.allergens?.map(allergen => (
                      <Badge key={allergen} variant="secondary" className="text-xs sm:text-sm">
                        Allergen: {allergen}
                      </Badge>
                    ))}
                    {appliedFilters.minSeats && (
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        Min Seats: {appliedFilters.minSeats}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <div className="space-y-4 sm:space-y-6">
          {filteredAndSortedUsers.map((user) => {
            const stats = getUserStats(user);

            return (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold flex flex-col gap-2 sm:gap-4">
                    <div className="break-all">
                      <span>{user.email}</span>
                      <span className="block text-base font-normal text-muted-foreground mt-1">
                        Customer since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </CardTitle>
                  {/* User Stats Based on Active Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Total Events</span>
                      <p className="text-xl sm:text-2xl font-bold">{stats.eventCount}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Total Seats Booked</span>
                      <p className="text-xl sm:text-2xl font-bold">{stats.totalSeatsAll}</p>
                    </div>
                    {stats.matchingEvents.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Selected Events Seats</span>
                        <p className="text-xl sm:text-2xl font-bold">{stats.totalSeats}</p>
                        <span className="text-sm text-primary">
                          {stats.matchingEvents.join(", ")}
                        </span>
                      </div>
                    )}
                    {appliedFilters.foodItems?.map(foodId => (
                      <div key={foodId} className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          {foodOptions?.find(f => f.id === foodId)?.name} Orders
                        </span>
                        <p className="text-xl sm:text-2xl font-bold">{stats.selectedFoodCount[foodId] || 0}</p>
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="profile">
                      <AccordionTrigger className="text-lg sm:text-xl py-4">
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