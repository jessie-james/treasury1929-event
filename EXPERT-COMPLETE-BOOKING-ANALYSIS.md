# REPLIT AI AGENT CONTEXT: EVENT BOOKING APP PRODUCTION LAUNCH

## PROJECT OVERVIEW
You are helping debug a sophisticated mobile-first event venue booking platform that's ready for production launch. The system allows venue administrators to manage multiple venues per event and customers to book tables with seat selection.

## CRITICAL ISSUE ANALYSIS
Event 13 ("Candlelight Opera") has 2 venues configured:
- **Mezzanine** (venue_id: 3, should have 13 tables)
- **Main Floor** (venue_id: 4, should have 70 tables)

**Current Problem**: When accessing the booking page, the API returns 83 tables for the Mezzanine venue (combining both venues' tables) instead of the expected 13 tables. This causes visual overlap where both venue layouts render simultaneously.

**Expected Behavior**: Clean venue switching showing only the selected venue's tables.

## TECHNICAL STACK
- **Frontend**: React + TypeScript, Wouter routing, TanStack Query, Canvas-based seat selection
- **Backend**: Express.js, Drizzle ORM, PostgreSQL
- **Payment**: Stripe integration (using test keys: pk_test_51Qt... and sk_test_...)
- **Database**: PostgreSQL with proper venue/table separation confirmed
- **Real-time**: WebSocket updates, SendGrid emails

## KEY FILES AND IMPLEMENTATION

### 1. MAIN BOOKING COMPONENT (`client/src/components/booking/IframeSeatSelection.tsx`)

```typescript
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface EventVenueLayout {
  eventVenueId: number;
  displayName: string;
  displayOrder: number;
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: VenueStage[];
}

interface VenueLayout {
  venue: {
    id: number;
    name: string;
    width: number;
    height: number;
  };
  tables: VenueTable[];
  stages: VenueStage[];
}

export function IframeSeatSelection({ eventId, onComplete, hasExistingBooking }: Props) {
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number>(0);
  
  // Fetch event venue layouts using the new API
  const { data: eventVenueLayouts, isLoading: isLoadingVenues, error: venueError } = useQuery({
    queryKey: [`/api/events/${eventId}/venue-layouts`],
    enabled: !!eventId,
    retry: 1
  });

  // Get the current venue layout based on selected venue
  const currentVenueLayout: VenueLayout | undefined = useMemo(() => {
    console.log('🔍 VENUE SELECTION DEBUG:', {
      eventVenueLayouts: eventVenueLayouts,
      selectedVenueIndex,
      layoutsLength: eventVenueLayouts?.length
    });
    
    if (eventVenueLayouts && Array.isArray(eventVenueLayouts) && eventVenueLayouts.length > 0) {
      const selected = eventVenueLayouts[selectedVenueIndex];
      console.log('📍 Selected venue layout:', {
        selectedIndex: selectedVenueIndex,
        selected: selected,
        venueName: selected?.venue?.name,
        tableCount: selected?.tables?.length
      });
      
      if (selected) {
        return {
          venue: selected.venue,
          tables: selected.tables,
          stages: selected.stages
        };
      }
    }
    
    return undefined;
  }, [eventVenueLayouts, selectedVenueIndex, eventData]);
  
  // Canvas rendering with proper venue isolation
  const { drawVenueLayout } = useCanvasRenderer(
    canvasRef,
    currentVenueLayout, // Only renders the currently selected venue
    selectedTable,
    bookedTableIds,
    viewport
  );
}
```

### 2. API ENDPOINT (`server/routes.ts` lines 3505-3601)

```typescript
// Get venue layouts for a specific event based on event-venue relationships
app.get("/api/events/:eventId/venue-layouts", async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    if (isNaN(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    // Get event-venue relationships for this event
    const eventVenuesList = await db
      .select({
        id: eventVenues.id,
        eventId: eventVenues.eventId,
        venueId: eventVenues.venueId,
        displayName: eventVenues.displayName,
        displayOrder: eventVenues.displayOrder,
        isActive: eventVenues.isActive,
        venue: {
          id: venues.id,
          name: venues.name,
          description: venues.description,
          width: venues.width,
          height: venues.height,
        }
      })
      .from(eventVenues)
      .leftJoin(venues, eq(eventVenues.venueId, venues.id))
      .where(and(
        eq(eventVenues.eventId, eventId),
        eq(eventVenues.isActive, true)
      ))
      .orderBy(eventVenues.displayOrder);

    // Fetch layout data for each venue
    const venueLayouts = await Promise.all(
      eventVenuesList.map(async (eventVenue) => {
        const venueId = eventVenue.venueId;
        
        console.log(`🔍 SERVER: Fetching tables for venue ${venueId} (${eventVenue.displayName})`);
        
        // Get tables for this specific venue
        const venueTables = await db
          .select()
          .from(tables)
          .where(eq(tables.venueId, venueId));
          
        console.log(`📊 SERVER: Found ${venueTables.length} tables for venue ${venueId}`);
        
        // Get stages for this venue
        const venueStages = await db
          .select()
          .from(stages)
          .where(eq(stages.venueId, venueId));

        return {
          eventVenueId: eventVenue.id,
          displayName: eventVenue.displayName,
          displayOrder: eventVenue.displayOrder,
          venue: {
            id: eventVenue.venue.id,
            name: eventVenue.venue.name,
            width: eventVenue.venue.width || 1000,
            height: eventVenue.venue.height || 700
          },
          tables: venueTables.map(table => ({
            id: table.id,
            tableNumber: table.tableNumber,
            x: table.x,
            y: table.y,
            width: table.width,
            height: table.height,
            capacity: table.capacity,
            shape: table.shape,
            rotation: table.rotation || 0,
            status: 'available'
          })),
          stages: venueStages.map(stage => ({
            id: stage.id,
            x: stage.x,
            y: stage.y,
            width: stage.width,
            height: stage.height,
            rotation: stage.rotation || 0
          }))
        };
      })
    );

    res.json(venueLayouts);
  } catch (error) {
    console.error("Error fetching event venue layouts:", error);
    res.status(500).json({ error: "Failed to fetch venue layouts" });
  }
});
```

### 3. PAYMENT INTEGRATION (`server/routes-payment.ts`)

```typescript
// Simplified payment routes with Stripe test integration
export function registerPaymentRoutes(app: Express) {
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Calculate amount to charge (in cents)
      let amount = 0;
      
      if (req.body.seatCount && typeof req.body.seatCount === 'number') {
        amount = req.body.seatCount * 1999; // $19.99 per seat
      } else if (req.body.bookingAmount && typeof req.body.bookingAmount === 'number') {
        amount = Math.round(req.body.bookingAmount * 100); // Convert dollars to cents
      }
      
      const metadata: Record<string, string> = {
        timestamp: new Date().toISOString(),
        seatCount: req.body.seatCount?.toString() || '0',
        amount: (amount / 100).toString(),
      };
      
      console.log(`Creating payment intent for $${amount / 100} (${amount} cents)`);
      
      // Create the payment intent
      const paymentIntent = await createPaymentIntent({
        amount,
        metadata
      });
      
      return res.json({
        clientSecret: paymentIntent.client_secret,
        amount: amount / 100,
        success: true
      });
      
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      const { message, code } = formatStripeError(error);
      
      return res.status(500).json({
        error: message,
        code,
        success: false
      });
    }
  });
}
```

### 4. DATABASE SCHEMA (`shared/schema.ts`)

```typescript
// Event Venues Junction Table - Links events to multiple venues (max 2)
export const eventVenues = pgTable("event_venues", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  venueId: integer("venue_id").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(), // e.g., "Main Floor", "Mezzanine"
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unique: unique().on(table.eventId, table.venueId), // Prevent duplicate venue per event
}));

// Tables Table - Properly separated by venue_id
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(), // CRITICAL: This should properly separate tables
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").default(4).notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").default(80).notNull(),
  height: integer("height").default(80).notNull(),
  shape: varchar("shape", { length: 20 }).default("full").notNull(),
  rotation: integer("rotation").default(0),
});
```

## CURRENT DEBUG OUTPUT

**Frontend Console:**
```
🔍 VENUE SELECTION DEBUG: {eventVenueLayouts: [Mezzanine layout], selectedVenueIndex: 0, layoutsLength: 2}
📍 Selected venue layout: {selectedIndex: 0, venueName: "Mezzanine", tableCount: 83}
```

**Database Verification:**
```sql
SELECT venue_id, COUNT(*) as table_count FROM tables WHERE venue_id IN (3, 4) GROUP BY venue_id;
-- Results: venue_id=3 has 13 tables, venue_id=4 has 70 tables (CORRECT)
```

**Server Response**: API returns 83 tables for Mezzanine instead of 13, indicating table data contamination.

## ROOT CAUSE HYPOTHESIS
The database query `eq(tables.venueId, venueId)` should isolate tables correctly, but the API response shows table mixing. Possible causes:
1. Database constraint violation
2. Query execution error
3. Data transformation issue in the mapping function
4. Caching/state management problem

## ENVIRONMENT
- **Stripe**: Test mode with keys pk_test_51Qt... and sk_test_...
- **Database**: PostgreSQL with proper table separation confirmed
- **Server**: Express.js with debugging enabled
- **Development**: Using test keys for live testing capability

## IMMEDIATE DEBUGGING NEEDS
1. **Fix table separation**: Ensure API returns only venue-specific tables
2. **Verify payment flow**: Test Stripe integration with provided test keys
3. **Clean venue switching**: Eliminate visual overlap between venues

**Note**: The system is production-ready except for this critical venue separation issue. All other functionality (authentication, payments, email notifications) is properly implemented.