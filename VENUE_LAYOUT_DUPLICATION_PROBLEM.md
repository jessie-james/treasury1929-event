# Venue Layout Duplication Problem - Technical Analysis

## Problem Summary
The venue booking platform has significant table duplication in the Main Floor venue (ID: 4), causing data integrity issues and incorrect table counts. Additionally, there are phantom layouts ("s" and another unidentified layout) that appear above the real venue layouts and prevent user interaction with tables.

## Current Data State

### Venue Configuration
```sql
-- Current venues in database
SELECT * FROM venues ORDER BY id;
```
Results:
- ID 3: "Mezzanine" - 7 unique tables
- ID 4: "Main Floor" - 32 unique tables (but 70 total records due to duplicates)

### Table Duplication Analysis
```sql
-- Duplication severity by table number
SELECT table_number, COUNT(*) as duplicate_count 
FROM tables WHERE venue_id = 4 
GROUP BY table_number HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC;
```

Results show severe duplication:
- Table 8: 5 duplicate entries
- Tables 1-7, 9: 3 duplicate entries each
- Tables 10-30: 2 duplicate entries each

### Example of Duplicate Records
```sql
SELECT id, venue_id, table_number, x, y, capacity 
FROM tables WHERE venue_id = 4 AND table_number = 1 
ORDER BY id;
```
Results:
```
id=1,   venue_id=4, table_number=1, x=865, y=195, capacity=4
id=28,  venue_id=4, table_number=1, x=853, y=354, capacity=4  
id=126, venue_id=4, table_number=1, x=810, y=238, capacity=4
```

### Table ID Pattern Analysis
Table IDs show three distinct creation batches:
- **Original tables**: IDs 1-27 (tables 1-32, some missing)
- **First duplication**: IDs 28-57 (tables 1-30)
- **Second duplication**: IDs 126-157 (tables 1-32)

## Technical Architecture

### Database Schema (relevant tables)
```typescript
// From shared/schema.ts
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  width: integer("width").default(1000).notNull(),
  height: integer("height").default(700).notNull(),
  bounds: json("bounds").$type<{x: number, y: number, width: number, height: number}>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(),
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").default(4).notNull(),
  floor: varchar("floor", { length: 50 }).default("main").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").default(80).notNull(),
  height: integer("height").default(80).notNull(),
  shape: varchar("shape", { length: 20 }).default("full").notNull(),
  tableSize: integer("table_size").default(8).notNull(),
  status: varchar("status", { length: 20 }).default("available"),
  zone: varchar("zone", { length: 50 }),
  priceCategory: varchar("price_category", { length: 20 }).default("standard"),
  isLocked: boolean("is_locked").default(false),
  rotation: integer("rotation").default(0),
});

export const eventVenues = pgTable("event_venues", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  venueId: integer("venue_id").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Root Cause: Venue Layout Save Method

### Problematic Code in `server/routes-venue.ts` (lines 194-211)
```typescript
// Handle tables
if (tables && Array.isArray(tables)) {
  // For simplicity, we'll replace all tables
  const existingTables = await storage.getTablesByVenue(venueId);
  
  // Remove existing tables
  for (const table of existingTables) {
    await storage.deleteTable(table.id);
  }

  // Add new tables
  for (const tableData of tables) {
    const validatedTable = insertTableSchema.parse({
      ...tableData,
      venueId
    });
    await storage.createTable(validatedTable);
  }
}
```

### Storage Implementation (server/storage.ts)
```typescript
async createTable(tableData: any): Promise<number> {
  const result = await db.insert(schema.tables).values(tableData).returning({ id: schema.tables.id });
  return result[0].id;
}

async deleteTable(id: number): Promise<boolean> {
  // First delete all seats associated with this table
  await db.delete(schema.seats).where(eq(schema.seats.tableId, id));
  // Then delete the table
  const result = await db.delete(schema.tables).where(eq(schema.tables.id, id));
  return result.rowCount! > 0;
}
```

## Frontend Venue Selection System

### Booking Component Logic (`client/src/components/booking/IframeSeatSelection.tsx`)
```typescript
// Get the current venue layout based on selected venue or fallback to event data
const currentVenueLayout: VenueLayout | undefined = useMemo(() => {
  console.log('🔍 VENUE SELECTION DEBUG:', {
    eventVenueLayouts: eventVenueLayouts,
    selectedVenueIndex,
    layoutsLength: eventVenueLayouts?.length
  });
  
  // First try new venue layouts system
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
  
  // Fallback to event data structure
  if (eventData && (eventData as any).venueLayout) {
    console.log('🔄 Using fallback event data');
    return (eventData as any).venueLayout;
  }
  
  console.log('❌ No venue layout found');
  return undefined;
}, [eventVenueLayouts, selectedVenueIndex, eventData]);
```

### Interface Definitions
```typescript
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
```

## Console Log Evidence

### From Live Application Logs:
```
🔍 VENUE SELECTION DEBUG: {
  eventVenueLayouts: [
    {
      eventVenueId: 1,
      displayName: "Mezzanine",
      displayOrder: 0,
      venue: { id: 3, name: "Mezzanine", width: 1000, height: 700 },
      tables: [...7 tables...]
    },
    {
      eventVenueId: 9,
      displayName: "Main Floor", 
      displayOrder: 1,
      venue: { id: 4, name: "Main Floor", width: 1000, height: 700 },
      tables: [...70 tables with duplicates...]
    }
  ]
}
```

## User-Reported Phantom Layout Issue

**Critical Issue**: User reports that there were previously two additional phantom layouts:
1. A layout named "s" 
2. Another unidentified layout name (user cannot remember)

These phantom layouts:
- Appear above the real venue layouts (Mezzanine and Main Floor)
- Render as non-interactive overlays
- Prevent users from clicking on tables
- May be related to the duplication issue or corrupted venue data

## Event-Venue Relationship

### Event Venues Query Results
Events are configured to use both venues through the `event_venues` junction table:
- Event venues are limited to maximum 2 per event
- Current events reference both Mezzanine (venueId: 3) and Main Floor (venueId: 4)
- DisplayOrder determines venue selection order in frontend

## Migration Scripts Analysis

### Potentially Related Scripts:
1. `scripts/update-events.ts` - References non-existent `venueId: 1`
2. `scripts/migrate-event-venues.ts` - Handles event-venue associations
3. `scripts/migrate-schema.ts` - Adds table columns but doesn't handle data

### No Evidence Found:
- No bulk table import scripts
- No venue template duplication logic
- No clear source of the phantom layouts

## Current System Behavior

### Working Elements:
- Venue selection dropdown functions
- Table rendering displays (with wrong counts)
- Booking system processes (no bookings on duplicated tables currently)

### Broken Elements:
- Incorrect table counts (70 vs 32 for Main Floor)
- Phantom layouts blocking interaction
- Data integrity compromised for capacity planning

## Technical Questions for Resolution

1. **Phantom Layout Source**: What creates layouts named "s" and the other unidentified layout?
2. **Deletion Failure**: Why do table deletions fail during venue layout saves?
3. **Foreign Key Constraints**: Are there hidden references preventing table deletion?
4. **Event-Venue Integrity**: How should the event-venue relationships be properly maintained?
5. **Migration History**: What sequence of operations led to this state?

## Data Integrity Impact

- Venue capacity calculations are incorrect
- Admin dashboard shows misleading statistics  
- Potential booking conflicts if phantom layouts interact with real ones
- User experience degraded by non-interactive overlay layouts

## Required Information for Solution

Please analyze this complete codebase context and provide guidance on:

1. How to identify and remove phantom layouts
2. Safe cleanup strategy for duplicate table records
3. Proper venue layout save methodology to prevent recurrence
4. Event-venue relationship validation and repair
5. Prevention strategies for future data corruption