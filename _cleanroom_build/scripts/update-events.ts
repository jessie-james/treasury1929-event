import { db } from "../server/db";
import { events, bookings } from "../shared/schema";
import { eq } from "drizzle-orm";

async function deleteAllBookings() {
  try {
    console.log("Deleting all bookings...");
    // Delete all bookings from the database
    await db.delete(bookings);
    console.log("All bookings deleted successfully");
  } catch (error) {
    console.error("Error deleting bookings:", error);
    throw error;
  }
}

async function deleteAllEvents() {
  try {
    console.log("Deleting all events...");
    // Delete all events from the database
    await db.delete(events);
    console.log("All events deleted successfully");
  } catch (error) {
    console.error("Error deleting events:", error);
    throw error;
  }
}

async function createNewEvents() {
  try {
    console.log("Creating new events...");
    
    const newEvents = [
      {
        title: "Candlelight Opera: A Night of Puccini and Verdi",
        description: "Experience the timeless arias of Puccini and Verdi performed by rising opera stars, surrounded by hundreds of flickering candles.\n\nFeatured Artists: Maria López (soprano), David Kim (tenor), The Verona String Quartet",
        image: "https://images.unsplash.com/photo-1470019693664-1d202d2c0907",
        date: new Date("2025-06-15T19:30:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 0
      },
      {
        title: "Baroque by Candlelight: Bach and Vivaldi",
        description: "An enchanting evening featuring the works of Bach and Vivaldi, performed by a chamber orchestra in an ethereal, candlelit setting.\n\nFeatured Artists: Aria Chamber Ensemble",
        image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76",
        date: new Date("2025-07-04T20:00:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 1
      },
      {
        title: "Classical Guitar Under the Stars",
        description: "A soulful solo performance of Spanish and Latin American guitar masterpieces, perfect for a serene evening under a sea of candlelight.\n\nFeatured Artists: Miguel Santiago (classical guitar)",
        image: "https://images.unsplash.com/photo-1619296094533-e6f6c8c983f0",
        date: new Date("2025-07-26T20:30:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 2
      },
      {
        title: "Candlelight Jazz: Tribute to Ella Fitzgerald",
        description: "A nostalgic journey through the jazz classics of Ella Fitzgerald, reinterpreted with a modern touch.\n\nFeatured Artists: The Lana Rivers Trio",
        image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f",
        date: new Date("2025-08-11T19:00:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 3
      },
      {
        title: "Moonlight Serenades: Chopin and Debussy",
        description: "Intimate piano performances of dreamy nocturnes and impressionistic masterpieces by candlelight.\n\nFeatured Artists: Anastasia Petrov (piano)",
        image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0",
        date: new Date("2025-08-24T19:30:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 4
      },
      {
        title: "Sacred Choral Works by Candlelight",
        description: "A spiritual evening featuring Renaissance and Baroque sacred music, sung by an a cappella vocal ensemble.\n\nFeatured Artists: The Cantare Chamber Choir",
        image: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3",
        date: new Date("2025-09-18T20:00:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 5
      },
      {
        title: "String Quartet Tribute: The Beatles Unplugged",
        description: "A beautiful string quartet reimagines the legendary songs of The Beatles in an emotional and acoustic candlelit setting.\n\nFeatured Artists: Crescent String Quartet",
        image: "https://images.unsplash.com/photo-1460036521480-ff49c08c2781",
        date: new Date("2025-10-10T20:00:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 6
      },
      {
        title: "Opera duets: Love and Passion",
        description: "A captivating program of famous opera duets exploring love, heartbreak, and passion through dramatic candlelit staging.\n\nFeatured Artists: Sofia Mendes (mezzo-soprano), Luca Romano (baritone), with live piano accompaniment",
        image: "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f",
        date: new Date("2025-11-02T19:00:00"),
        availableSeats: 80,
        totalSeats: 80,
        venueId: 1,
        displayOrder: 7
      }
    ];
    
    // Insert all new events
    await db.insert(events).values(newEvents);
    
    console.log("New events created successfully");
  } catch (error) {
    console.error("Error creating new events:", error);
    throw error;
  }
}

async function updateEvents() {
  try {
    // First delete all bookings to remove foreign key constraints
    await deleteAllBookings();
    // Then delete all events
    await deleteAllEvents();
    // Then create new events
    await createNewEvents();
    console.log("Events update complete!");
  } catch (error) {
    console.error("Error updating events:", error);
  } finally {
    process.exit(0);
  }
}

updateEvents();