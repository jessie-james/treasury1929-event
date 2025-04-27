import { db } from "../server/db";
import { tables, seats, type InsertTable, type InsertSeat } from "../shared/schema";
import { eq } from "drizzle-orm";

// Default venue ID
const DEFAULT_VENUE_ID = 1;

// Mezzanine floor table configurations
const mezzanineTables = [
  { tableNumber: 1, floor: "mezzanine", x: 845, y: 250, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 2, floor: "mezzanine", x: 760, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 3, floor: "mezzanine", x: 690, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 4, floor: "mezzanine", x: 620, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 5, floor: "mezzanine", x: 550, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 6, floor: "mezzanine", x: 480, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
];

async function setupMezzanine() {
  try {
    console.log("Setting up mezzanine tables...");
    
    for (const tableData of mezzanineTables) {
      console.log(`Creating mezzanine table ${tableData.tableNumber}...`);
      
      // Create the table
      const tableToInsert: InsertTable = {
        venueId: DEFAULT_VENUE_ID,
        tableNumber: tableData.tableNumber,
        capacity: tableData.capacity,
        floor: tableData.floor,
        x: tableData.x,
        y: tableData.y,
        shape: tableData.shape,
      };
      
      const [newTable] = await db.insert(tables).values(tableToInsert).returning();
      
      // Create seats for the table
      for (let i = 0; i < tableData.capacity; i++) {
        const seatPosition = tableData.seatPositions[i];
        const seatToInsert: InsertSeat = {
          tableId: newTable.id,
          seatNumber: i + 1,
          position: seatPosition.position,
          x: seatPosition.x,
          y: seatPosition.y,
        };
        
        await db.insert(seats).values(seatToInsert);
      }
      
      console.log(`Created mezzanine table ${tableData.tableNumber} with ${tableData.capacity} seats`);
    }
    
    console.log("Mezzanine setup complete!");
  } catch (error) {
    console.error("Error setting up mezzanine:", error);
  } finally {
    process.exit(0);
  }
}

setupMezzanine();