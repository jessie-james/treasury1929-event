import { db } from '../server/db.js';
import { events, eventVenues, venues } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function migrateEventVenues() {
  try {
    console.log('Starting migration: Populating event_venues from existing events...');

    // Get all events with their current venueId
    const existingEvents = await db.select().from(events);
    console.log(`Found ${existingEvents.length} events to migrate`);

    // Get all venues to validate venue names
    const allVenues = await db.select().from(venues);
    const venueMap = new Map(allVenues.map(v => [v.id, v.name]));

    let migratedCount = 0;
    let skippedCount = 0;

    for (const event of existingEvents) {
      if (!event.venueId) {
        console.log(`Skipping event ${event.id} - no venueId`);
        skippedCount++;
        continue;
      }

      // Check if this event-venue combination already exists
      const existingEventVenue = await db
        .select()
        .from(eventVenues)
        .where(eq(eventVenues.eventId, event.id));

      if (existingEventVenue.length > 0) {
        console.log(`Event ${event.id} already has venues configured, skipping`);
        skippedCount++;
        continue;
      }

      // Get venue name for display
      const venueName = venueMap.get(event.venueId) || 'Main Venue';

      // Insert into event_venues table
      await db.insert(eventVenues).values({
        eventId: event.id,
        venueId: event.venueId,
        displayName: venueName,
        displayOrder: 0,
        isActive: true,
      });

      migratedCount++;
      console.log(`Migrated event ${event.id} "${event.title}" -> venue ${event.venueId} "${venueName}"`);
    }

    console.log(`Migration completed:`);
    console.log(`- Migrated: ${migratedCount} events`);
    console.log(`- Skipped: ${skippedCount} events`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEventVenues()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateEventVenues };