
import { storage } from "./storage";

async function updateEventAvailability() {
  try {
    // Get all events
    const events = await storage.getEvents();
    
    if (events.length < 2) {
      console.log("Not enough events to update. Please create at least 2 events first.");
      return;
    }
    
    // Update first event to be sold out (0 available seats)
    const firstEvent = events[0];
    const seatsToRemoveFirst = firstEvent.availableSeats;
    await storage.updateEventAvailability(firstEvent.id, seatsToRemoveFirst);
    console.log(`Updated event "${firstEvent.title}" to be sold out`);
    
    // Update second event to have only ~10% seats available
    const secondEvent = events[1];
    const targetRemainingSeats = Math.ceil(secondEvent.totalSeats * 0.1);
    const seatsToRemoveSecond = Math.max(0, secondEvent.availableSeats - targetRemainingSeats);
    
    if (seatsToRemoveSecond > 0) {
      await storage.updateEventAvailability(secondEvent.id, seatsToRemoveSecond);
      console.log(`Updated event "${secondEvent.title}" to have only ${targetRemainingSeats} seats remaining`);
    } else {
      console.log(`Event "${secondEvent.title}" already has fewer than ${targetRemainingSeats} seats available`);
    }
    
    // Print the updated events
    const updatedEvents = await storage.getEvents();
    console.log("\nUpdated events:");
    updatedEvents.forEach(event => {
      console.log(`- ${event.title}: ${event.availableSeats}/${event.totalSeats} seats available`);
    });
  } catch (error) {
    console.error("Error updating event availability:", error);
  } finally {
    process.exit(0);
  }
}

updateEventAvailability();
