import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhoenixDateShort } from '@/lib/timezone';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'date' | 'events' | 'seats';

interface ExtendedBooking {
  id: number;
  eventId: number;
  userId: number;
  tableId: number;
  partySize: number | null;
  guestNames: Record<string, string> | null;
  foodSelections: any[] | null;
  wineSelections: any[] | null;
  customerEmail: string;
  stripePaymentId: string | null;
  amount: number | null; // Actual Stripe payment amount in cents
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

interface UserWithBookings {
  id: number;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  allergens?: string[] | null;
  dietaryRestrictions?: string[] | null;
  createdAt?: string | Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  bookings: ExtendedBooking[];
}

function UsersSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
  });

  const syncRefundsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/sync-refunds', {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Refund Sync Complete",
        description: `${data.refundsSynced} refunds synced from Stripe. ${data.bookingsChecked} bookings checked.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync refunds from Stripe',
        variant: "destructive",
      });
    }
  });

  // Fetch food options to map food selections to names
  const { data: foodOptions, isLoading: foodOptionsLoading } = useQuery({
    queryKey: ['/api/food-options'],
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = Array.isArray(users) ? users.filter((user: UserWithBookings) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesEmail = user.email.toLowerCase().includes(searchLower);
        const matchesName = user.firstName?.toLowerCase().includes(searchLower) || 
                          user.lastName?.toLowerCase().includes(searchLower);
        const matchesGuestName = user.bookings.some(booking => 
          booking.guestNames && Object.values(booking.guestNames).some(name => 
            String(name).toLowerCase().includes(searchLower)
          )
        );
        
        if (!matchesEmail && !matchesName && !matchesGuestName) {
          return false;
        }
      }
      return true;
    }) : [];

    // Sort the users
    result.sort((a: UserWithBookings, b: UserWithBookings) => {
      if (sortBy === 'date') {
        const aDate = a.bookings.length && a.bookings[0].createdAt
          ? new Date(String(a.bookings[0].createdAt)).getTime()
          : 0;
        const bDate = b.bookings.length && b.bookings[0].createdAt
          ? new Date(String(b.bookings[0].createdAt)).getTime()
          : 0;
        return bDate - aDate;
      } else if (sortBy === 'events') {
        const aEvents = new Set(a.bookings.map(b => b.eventId)).size;
        const bEvents = new Set(b.bookings.map(b => b.eventId)).size;
        return bEvents - aEvents;
      } else if (sortBy === 'seats') {
        const aSeats = a.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
        const bSeats = b.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0);
        return bSeats - aSeats;
      }
      return 0;
    });

    return result;
  }, [users, searchTerm, sortBy]);

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
            Retry
          </Button>
        </div>
      </BackofficeLayout>
    );
  }

  if (!Array.isArray(users) || !users.length) {
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
          <div className="flex items-center gap-3">
            <Button
              onClick={() => syncRefundsMutation.mutate()}
              disabled={syncRefundsMutation.isPending}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncRefundsMutation.isPending ? 'animate-spin' : ''}`} />
              {syncRefundsMutation.isPending ? 'Syncing...' : 'Sync Refunds'}
            </Button>
            <Badge variant="secondary" className="text-base self-start sm:self-auto">
              {filteredUsers.length} users
            </Badge>
          </div>
        </div>

        {/* Compact Filters Bar */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium shrink-0">Sort:</Label>
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-40">
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
                <Label className="text-sm font-medium shrink-0">Search:</Label>
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 sm:w-48"
                />
              </div>

              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="w-full sm:w-auto sm:ml-auto"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <div className="space-y-4">
          {filteredUsers.map((user: UserWithBookings) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/50 p-3 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-sm sm:text-base break-all">{user.email}</span>
                      <Badge variant={user.role === 'admin' ? 'destructive' : 'default'} className="self-start text-xs">
                        {user.role}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      {user.firstName || user.lastName ? (
                        <div className="mb-1">
                          <strong>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</strong>
                          {user.phone && <span className="ml-2">• {user.phone}</span>}
                        </div>
                      ) : user.phone ? (
                        <div className="mb-1"><strong>Phone:</strong> {user.phone}</div>
                      ) : null}
                      Joined {user.createdAt ? formatPhoenixDateShort(String(user.createdAt)) : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-row justify-between sm:flex-col sm:text-right shrink-0">
                    <p className="text-xs sm:text-sm font-medium">
                      {user.bookings.length} {user.bookings.length === 1 ? 'booking' : 'bookings'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.bookings.reduce((sum, b) => sum + (b.partySize || 0), 0)} total seats
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-green-600">
                      ${user.bookings.reduce((sum, b) => {
                        if (b.status === 'confirmed' && b.amount && b.amount > 0) {
                          const amount = b.amount / 100; // Convert cents to dollars
                          const refund = (b.refundAmount || 0) / 100;
                          return sum + (amount - refund);
                        }
                        return sum;
                      }, 0).toFixed(2)} total paid
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {user.bookings.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {user.bookings.map(booking => (
                      <AccordionItem key={booking.id} value={booking.id.toString()}>
                        <AccordionTrigger className="px-3 py-3 sm:px-6 sm:py-4 hover:no-underline">
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center w-full text-left">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm sm:text-base leading-tight">{booking.event.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {formatPhoenixDateShort(booking.event.date)}
                              </p>
                            </div>
                            <div className="flex justify-between sm:flex-col sm:gap-1 sm:text-right shrink-0">
                              <p className="text-xs sm:text-sm">
                                {booking.partySize || 0} {(booking.partySize || 0) === 1 ? 'seat' : 'seats'}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Table {booking.table.tableNumber}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 py-3 sm:px-6 sm:py-3 bg-secondary/10">
                          <div className="space-y-3 sm:space-y-4">
                            {/* Booking Status and Check-in */}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {booking.status}
                              </Badge>
                              {booking.checkedIn && (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Checked In
                                </Badge>
                              )}
                              {booking.refundAmount && booking.refundAmount > 0 && (
                                <Badge variant="destructive">
                                  Refunded: ${(booking.refundAmount / 100).toFixed(2)}
                                </Badge>
                              )}
                            </div>

                            <div>
                              <h4 className="font-medium mb-2 text-sm sm:text-base">Guests</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {booking.guestNames ? Object.entries(booking.guestNames as Record<string, string>).map(([seatNumber, name]) => (
                                  <div key={seatNumber} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 rounded-full text-xs shrink-0">
                                      {seatNumber}
                                    </Badge>
                                    <span className="text-xs sm:text-sm break-words">{String(name)}</span>
                                  </div>
                                )) : (
                                  <p className="text-xs sm:text-sm text-muted-foreground">No guest names provided</p>
                                )}
                              </div>
                            </div>

                            {booking.foodSelections && booking.foodSelections.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 text-sm sm:text-base">Food Selections</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {booking.foodSelections.map((guestSelection: any, guestIndex: number) => {
                                    // Handle the typical structure: object with salad, entree, dessert keys
                                    if (typeof guestSelection === 'object' && guestSelection !== null) {
                                      const courses = ['salad', 'entree', 'dessert'];
                                      const hasCourses = courses.some(course => guestSelection[course]);
                                      
                                      if (hasCourses) {
                                        return (
                                          <div key={guestIndex} className="text-xs sm:text-sm p-3 bg-muted rounded border-l-4 border-blue-200">
                                            <div className="font-medium mb-2">Guest {guestIndex + 1} {guestSelection.guestName ? `(${guestSelection.guestName})` : ''}</div>
                                            <div className="space-y-1">
                                              {courses.map(course => {
                                                const courseSelection = guestSelection[course];
                                                if (!courseSelection) return null;
                                                
                                                // If it's a number (ID), find the food option
                                                if (typeof courseSelection === 'number' && Array.isArray(foodOptions)) {
                                                  const foodOption = foodOptions.find((f: any) => f.id === courseSelection);
                                                  return (
                                                    <div key={course} className="flex items-center gap-2">
                                                      <Badge variant="outline" className="capitalize text-xs">{course}</Badge>
                                                      <span>{foodOption?.name || `Item ${courseSelection}`}</span>
                                                    </div>
                                                  );
                                                }
                                                
                                                // If it's an object with name/id
                                                if (typeof courseSelection === 'object' && courseSelection.name) {
                                                  return (
                                                    <div key={course} className="flex items-center gap-2">
                                                      <Badge variant="outline" className="capitalize text-xs">{course}</Badge>
                                                      <span>{courseSelection.name}</span>
                                                    </div>
                                                  );
                                                }
                                                
                                                // If it's a string (name directly)
                                                if (typeof courseSelection === 'string') {
                                                  return (
                                                    <div key={course} className="flex items-center gap-2">
                                                      <Badge variant="outline" className="capitalize text-xs">{course}</Badge>
                                                      <span>{courseSelection}</span>
                                                    </div>
                                                  );
                                                }
                                                
                                                return null;
                                              })}
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      // Handle other object formats
                                      return (
                                        <div key={guestIndex} className="text-xs sm:text-sm p-2 bg-muted rounded">
                                          <div className="font-medium">{guestSelection.name || guestSelection.title || `Selection ${guestIndex + 1}`}</div>
                                          {guestSelection.description && (
                                            <div className="text-muted-foreground mt-1">{guestSelection.description}</div>
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    // Handle if it's just an ID (number)
                                    if (typeof guestSelection === 'number' && Array.isArray(foodOptions)) {
                                      const foodOption = foodOptions.find((f: any) => f.id === guestSelection);
                                      return (
                                        <div key={guestIndex} className="text-xs sm:text-sm p-2 bg-muted rounded">
                                          <div className="font-medium">{foodOption?.name || `Food Item ${guestSelection}`}</div>
                                          {foodOption?.description && (
                                            <div className="text-muted-foreground mt-1">{foodOption.description}</div>
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    // Fallback for unknown format - show raw data for debugging
                                    return (
                                      <div key={guestIndex} className="text-xs sm:text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                                        <span className="font-medium">Debug - Selection {guestIndex + 1}:</span>
                                        <pre className="mt-1 text-xs overflow-auto">{JSON.stringify(guestSelection, null, 2)}</pre>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {booking.wineSelections && booking.wineSelections.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 text-sm sm:text-base">Wine Selections</h4>
                                <div className="grid grid-cols-1 gap-2">
                                  {booking.wineSelections.map((selection: any, index: number) => {
                                    // If it's just an ID (number), map it to food option (wine type)
                                    if (typeof selection === 'number' && Array.isArray(foodOptions)) {
                                      const wineOption = foodOptions.find((f: any) => f.id === selection);
                                      return (
                                        <div key={index} className="text-xs sm:text-sm p-2 bg-muted rounded">
                                          <div className="font-medium">{wineOption?.name || `Wine Item ${selection}`}</div>
                                          {wineOption?.description && (
                                            <div className="text-muted-foreground mt-1">{wineOption.description}</div>
                                          )}
                                          {wineOption?.price && wineOption.price > 0 && (
                                            <span className="text-green-600 font-medium"> ${(wineOption.price / 100).toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    }
                                    // If it's an object with more details
                                    if (typeof selection === 'object' && selection !== null) {
                                      return (
                                        <div key={index} className="text-xs sm:text-sm p-2 bg-muted rounded">
                                          <div className="font-medium">{selection.name || selection.title || `Wine Selection ${index + 1}`}</div>
                                          {selection.description && (
                                            <div className="text-muted-foreground mt-1">{selection.description}</div>
                                          )}
                                          {selection.price && (
                                            <span className="text-green-600 font-medium"> ${(selection.price / 100).toFixed(2)}</span>
                                          )}
                                          {selection.quantity && selection.quantity > 1 && (
                                            <span className="text-muted-foreground"> (×{selection.quantity})</span>
                                          )}
                                        </div>
                                      );
                                    }
                                    // Fallback for unknown format
                                    return (
                                      <div key={index} className="text-xs sm:text-sm p-2 bg-muted rounded">
                                        <span>Wine Selection {index + 1}: {JSON.stringify(selection)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {booking.notes && (
                              <div>
                                <h4 className="font-medium mb-1 text-sm sm:text-base">Special Requests</h4>
                                <p className="text-xs sm:text-sm italic break-words">{booking.notes}</p>
                              </div>
                            )}

                            {/* User Dietary Information */}
                            {(user.allergens && user.allergens.length > 0) || (user.dietaryRestrictions && user.dietaryRestrictions.length > 0) ? (
                              <div>
                                <h4 className="font-medium mb-2 text-sm sm:text-base">Dietary Information</h4>
                                <div className="space-y-1">
                                  {user.allergens && user.allergens.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-red-600">Allergens:</span>
                                      <p className="text-xs sm:text-sm italic break-words">{user.allergens.join(', ')}</p>
                                    </div>
                                  )}
                                  {user.dietaryRestrictions && user.dietaryRestrictions.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-green-600">Dietary Restrictions:</span>
                                      <p className="text-xs sm:text-sm italic break-words">{user.dietaryRestrictions.join(', ')}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {/* Payment Information */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <h4 className="font-medium mb-2 text-sm text-blue-800">Payment Details</h4>
                              <div className="space-y-1 text-xs">
                                {booking.amount && booking.amount > 0 ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Amount Paid:</span>
                                      <span className="font-medium">${(booking.amount / 100).toFixed(2)}</span>
                                    </div>
                                    {booking.refundAmount && booking.refundAmount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-red-600">Refunded:</span>
                                        <span className="font-medium text-red-600">-${(booking.refundAmount / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between border-t border-blue-300 pt-1 mt-2">
                                      <span className="text-blue-700 font-medium">Net Total:</span>
                                      <span className="font-bold">${((booking.amount / 100) - ((booking.refundAmount || 0) / 100)).toFixed(2)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                    ⚠️ Payment amount not synced from Stripe
                                  </div>
                                )}
                                {booking.stripePaymentId && (
                                  <div className="flex justify-between mt-2 pt-2 border-t border-blue-300">
                                    <span className="text-blue-700">Payment ID:</span>
                                    <span className="font-mono text-xs break-all">{booking.stripePaymentId}</span>
                                  </div>
                                )}
                                {booking.refundId && (
                                  <div className="flex justify-between">
                                    <span className="text-red-600">Refund ID:</span>
                                    <span className="font-mono text-xs break-all">{booking.refundId}</span>
                                  </div>
                                )}
                              </div>
                            </div>
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
              <p className="text-muted-foreground">No users match the search criteria</p>
              <Button
                variant="link"
                onClick={() => setSearchTerm("")}
              >
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}