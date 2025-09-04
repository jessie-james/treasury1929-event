import { db } from "../server/db";
import { bookings, events } from "../shared/schema";
import { eq } from "drizzle-orm";

async function clearAllBookings() {
  try {
    console.log("Starting to clear all bookings...");
    
    // Clear all bookings
    const result = await db.delete(bookings);
    console.log(`Deleted bookings`);
    
    // Reset event available seats to total seats
    const allEvents = await db.select().from(events);
    console.log(`Found ${allEvents.length} events to reset seats for`);
    
    for (const event of allEvents) {
      await db.update(events)
        .set({ availableSeats: event.totalSeats })
        .where(eq(events.id, event.id));
      console.log(`Reset seats for event: ${event.title} (ID: ${event.id})`);
    }
    
    console.log('All bookings cleared and event seats reset successfully');
  } catch (error) {
    console.error('Error clearing bookings:', error);
  } finally {
    process.exit(0);
  }
}

// Run the function
clearAllBookings();