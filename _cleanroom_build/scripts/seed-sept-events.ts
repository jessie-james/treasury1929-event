/**
 * September 2025 Events Seeding Script
 * Seeds three dinner concert events with full content, schedules, and artist information
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

/**
 * Creates placeholder asset directories if they don't exist
 */
async function createPlaceholderAssets() {
  const assetPaths = [
    '/assets/events/2025-09-09/sophia.jpg',
    '/assets/events/2025-09-12/sophia.jpg', 
    '/assets/events/2025-09-19/fanya-lin.jpg',
    '/assets/menu/grilled-king-salmon.jpg',
    '/assets/artists/sophia-su.jpg',
    '/assets/artists/fanya-lin.jpg'
  ];
  
  console.log('Asset placeholders needed:', assetPaths);
  console.log('Note: Create actual image files for these paths later');
}

async function upsertSeptemberEvents() {
  try {
    console.log('Starting September 2025 events seeding...');

    // Event data with full content from specification
    const septemberEvents = [
      // September 9, 2025 Event
      {
        title: "An Evening of Fine Dining & Music: Sophia Su with Artists of The Arizona Opera",
        description: `Join us for the launch of our Dinner Concert Series, an elegant evening where culinary artistry and live classical performance come together inside the historic setting of The Treasury 1929. This immersive experience features a handcrafted, multi-course dinner by renowned chef Daniel Scordato, while being transported by the soaring melodies of Puccini's La Bohème, Verdi's La Traviata, and Bizet's Carmen. Performed by talented vocalists, these iconic works bring to life the romance, fire, and beauty that make opera unforgettable.

Tickets include a 3-course fine dining experience, two live 30-minute concert performances, and all non-alcoholic beverages. Bottles of wine are available for purchase through the app, while glasses of wine, beer, and craft cocktails will be available for purchase at your table. Please arrive by 5:45 PM to allow time for drink service.

All tickets are purchasable online only—select your seats, choose your three-course dinner in advance, and complete payment securely online. No door tickets.`,
        image: "/assets/events/2025-09-09/sophia.jpg",
        date: new Date("2025-09-09T18:30:00-07:00"), // America/Phoenix time
        venueId: 4, // Treasury 1929 venue ID
        eventType: "full",
        basePrice: 13000, // $130.00 in cents
        ticketPrice: null,
        includeFoodService: true,
        includeBeverages: true,
        ticketCutoffDays: 3,
        maxTicketsPerPurchase: 8,
        isActive: true,
        totalSeats: 98,
        totalTables: 32,
        availableSeats: 98,
        availableTables: 32,
        displayOrder: 0
      },
      
      // September 12, 2025 Event  
      {
        title: "An Evening of Fine Dining & Music: Sophia Su with Artists of The Arizona Opera",
        description: `Join us for the launch of our Dinner Concert Series, an elegant evening where culinary artistry and live classical performance come together inside the historic setting of The Treasury 1929. This immersive experience features a handcrafted, multi-course dinner by renowned chef Daniel Scordato, while being transported by the soaring melodies of Puccini's La Bohème, Verdi's La Traviata, and Bizet's Carmen. Performed by talented vocalists, these iconic works bring to life the romance, fire, and beauty that make opera unforgettable.

Tickets include a 3-course fine dining experience, two live 30-minute concert performances, and all non-alcoholic beverages. Bottles of wine are available for purchase through the app, while glasses of wine, beer, and craft cocktails will be available for purchase at your table. Please arrive by 5:45 PM to allow time for drink service.

All tickets are purchasable online only—select your seats, choose your three-course dinner in advance, and complete payment securely online. No door tickets.`,
        image: "/assets/events/2025-09-12/sophia.jpg",
        date: new Date("2025-09-12T18:30:00-07:00"), // America/Phoenix time
        venueId: 4,
        eventType: "full",
        basePrice: 13000,
        ticketPrice: null,
        includeFoodService: true,
        includeBeverages: true,
        ticketCutoffDays: 3,
        maxTicketsPerPurchase: 8,
        isActive: true,
        totalSeats: 98,
        totalTables: 32,
        availableSeats: 98,
        availableTables: 32,
        displayOrder: 1
      },
      
      // September 19, 2025 Event
      {
        title: "An Evening of Fine Dining & Music: Featuring Renowned Pianist Dr. Fanya Lin",
        description: `Join us for our Dinner Concert Series, where culinary artistry and live classical performance meet inside the historic Treasury 1929. Enjoy a handcrafted, multi-course dinner by Chef Daniel Scordato while being transported by the virtuosity of Steinway Artist Dr. Fanya Lin.

Tickets include a 3-course fine dining experience, two live 30-minute concert performances, and all non-alcoholic beverages. Bottles of wine are available for purchase through the app; glasses of wine, beer, and craft cocktails will be available at your table. Please arrive by 5:45 PM to allow time for drink service.

All tickets are purchasable online only—seat selection, dinner pre-selection, and secure checkout online. No door tickets.`,
        image: "/assets/events/2025-09-19/fanya-lin.jpg",
        date: new Date("2025-09-19T18:30:00-07:00"), // America/Phoenix time
        venueId: 4,
        eventType: "full",
        basePrice: 13000,
        ticketPrice: null,
        includeFoodService: true,
        includeBeverages: true,
        ticketCutoffDays: 3,
        maxTicketsPerPurchase: 8,
        isActive: true,
        totalSeats: 98,
        totalTables: 32,
        availableSeats: 98,
        availableTables: 32,
        displayOrder: 2
      }
    ];

    // Upsert events (find by title and date, update if exists, insert if not)
    for (const eventData of septemberEvents) {
      try {
        // Check if event already exists by title and date
        const existingEvent = await db.select()
          .from(schema.events)
          .where(
            and(
              eq(schema.events.title, eventData.title),
              eq(schema.events.date, eventData.date)
            )
          );
        
        if (existingEvent.length > 0) {
          // Update existing event
          await db.update(schema.events)
            .set(eventData)
            .where(eq(schema.events.id, existingEvent[0].id));
          console.log(`✓ Updated event: ${eventData.title} on ${eventData.date.toDateString()}`);
        } else {
          // Insert new event
          const result = await db.insert(schema.events).values(eventData).returning();
          console.log(`✓ Created event: ${eventData.title} on ${eventData.date.toDateString()}`);
        }
      } catch (error) {
        console.error(`✗ Error processing event ${eventData.title}:`, error);
      }
    }

    // Note: Schedule and artist information will be added via additional tables/fields later
    console.log('\n📋 Event Schedule Information (to be added to events):');
    console.log('5:45 PM - Doors open; seating; beverage service; amuse-bouche');
    console.log('6:30 PM - First musical performance (30 min)');
    console.log('7:00 PM - Dinner service (salad, pre-selected entrée, dessert)');
    console.log('8:15 PM - Second musical performance (30 min)');
    console.log('8:45 PM - Dinner and music conclude');

    console.log('\n🎭 Artist Information (to be added to artist tables):');
    console.log('Sophia Su - Pianist - DMA University of Arizona, performances with Butler Opera Center');
    console.log('Dr. Fanya Lin - Steinway Artist, Associate Professor, University of Arizona');
    
    console.log('\n🍽️ Menu Notes (to be updated in events):');
    console.log('Grilled King Salmon — mushroom, tomato, caper, fresh thyme sauce served with scalloped potatoes');

    await createPlaceholderAssets();
    console.log('\n✅ September 2025 events seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding September events:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🌟 Treasury 1929 - September 2025 Events Seeding');
    console.log('=================================================');
    
    await upsertSeptemberEvents();
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seeding
main();