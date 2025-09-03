/**
 * Seed September 2025 events with specified artists
 * Part B - Artists seeding for Treasury 1929 events
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Artist data for September events
const artistsData = {
  // September 9 & 12 events
  sophiaEventArtists: [
    {
      name: "Sophia Su",
      role: "Pianist",
      bio: "Collaborative pianist (DMA, University of Arizona). Master's from UT Austin; performances with Butler Opera Center, Miami Music Festival, Chicago Summer Opera, and the International Lyric Academy (Italy). Winner of UA's 2023–24 President's Concerto Competition.",
      photoUrl: "/assets/artists/sophia-su.jpg",
      displayOrder: 0
    },
    {
      name: "TBD Vocalists",
      role: "Vocalists", 
      bio: "Final lineup to be confirmed from: Jared Peterson, Aysen Idil Milliogullari, Emily Gibson, Diana Peralta.",
      photoUrl: null,
      displayOrder: 1
    }
  ],
  
  // September 19 event
  fanyaEventArtists: [
    {
      name: "Dr. Fanya Lin",
      role: "Pianist",
      bio: "Described as a \"striking interpreter\" with \"committed and heartfelt performance,\" Dr. Lin has performed with the Royal Philharmonic, Utah Symphony, Savannah Philharmonic, and more. Her 2023 album Rhapsodic (Navona Records) features Gershwin's Rhapsody in Blue and Rachmaninoff's Rhapsody on a Theme of Paganini. She is Associate Professor of Practice in Piano at the University of Arizona.",
      photoUrl: "/assets/artists/fanya-lin.jpg",
      displayOrder: 0
    }
  ]
};

async function findSeptemberEvents() {
  try {
    console.log('🔍 Finding September 2025 events...');

    // Find September events by looking for our seeded events
    const events = await db.select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.eventType, "full"),
          eq(schema.events.basePrice, 13000)
        )
      );

    console.log(`Found ${events.length} potential September events`);
    
    const septemberEvents = [];
    for (const event of events) {
      const eventDate = new Date(event.date);
      if (eventDate.getMonth() === 8 && eventDate.getFullYear() === 2025) { // September is month 8
        septemberEvents.push(event);
        console.log(`✓ September event: ${event.title} (${eventDate.getDate()}th)`);
      }
    }

    return septemberEvents;

  } catch (error) {
    console.error('❌ Error finding September events:', error);
    throw error;
  }
}

async function seedEventArtists(eventId: number, eventTitle: string, artistsForEvent: typeof artistsData.sophiaEventArtists) {
  try {
    console.log(`🎭 Seeding artists for: ${eventTitle}`);

    // Check if artists already exist for this event
    const existingArtists = await db.select()
      .from(schema.eventArtists)
      .where(eq(schema.eventArtists.eventId, eventId));

    if (existingArtists.length > 0) {
      console.log(`  ℹ️ Event already has ${existingArtists.length} artist(s), updating...`);
      
      // Delete existing artists to refresh data
      await db.delete(schema.eventArtists)
        .where(eq(schema.eventArtists.eventId, eventId));
    }

    // Insert artists for this event
    for (const artistData of artistsForEvent) {
      const artistRecord = {
        ...artistData,
        eventId,
        photoUrl: artistData.photoUrl || null,
      };

      await db.insert(schema.eventArtists).values(artistRecord);
      console.log(`  ✓ Added: ${artistData.name} (${artistData.role})`);
    }

    console.log(`  ✅ Completed seeding ${artistsForEvent.length} artists`);

  } catch (error) {
    console.error(`❌ Error seeding artists for ${eventTitle}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🎭 Treasury 1929 - September 2025 Artists Seeding');
    console.log('=================================================');
    
    const septemberEvents = await findSeptemberEvents();
    
    if (septemberEvents.length === 0) {
      console.log('⚠️ No September 2025 events found. Please run seed-sept-events.ts first.');
      return;
    }

    // Sort events by date to assign artists correctly
    septemberEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const event of septemberEvents) {
      const eventDate = new Date(event.date);
      const dayOfMonth = eventDate.getDate();

      if (dayOfMonth === 9 || dayOfMonth === 12) {
        // September 9 & 12: Sophia Su + TBD Vocalists
        await seedEventArtists(event.id, event.title, artistsData.sophiaEventArtists);
      } else if (dayOfMonth === 19) {
        // September 19: Dr. Fanya Lin
        await seedEventArtists(event.id, event.title, artistsData.fanyaEventArtists);
      } else {
        console.log(`  ℹ️ No specific artists defined for ${event.title} (${dayOfMonth}th)`);
      }
    }
    
    console.log('\n✅ Artists seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('• September 9 & 12: Sophia Su (Pianist) + TBD Vocalists');
    console.log('• September 19: Dr. Fanya Lin (Pianist)');
    console.log('\n🎯 Next steps:');
    console.log('• Replace placeholder photos:');
    console.log('  - /assets/artists/sophia-su.jpg');
    console.log('  - /assets/artists/fanya-lin.jpg');
    console.log('• Test artist display in Event Editor and public event pages');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the artists seeding
main();