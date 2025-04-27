import { db } from "../server/db";
import { tables, seats, type InsertTable, type InsertSeat } from "../shared/schema";
import { eq } from "drizzle-orm";

// Default venue ID - Change this if you have multiple venues
const DEFAULT_VENUE_ID = 1;

interface TableData {
  tableNumber: number;
  floor: string;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  seatPositions: { position: string; x: number; y: number }[];
}

// Main floor table configurations
const mainFloorTables: TableData[] = [
  // Row near stage (left to right)
  { tableNumber: 1, floor: "main", x: 865, y: 195, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 5, floor: "main", x: 730, y: 195, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 3, floor: "main", x: 795, y: 145, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },

  // Right side tables
  { tableNumber: 2, floor: "main", x: 865, y: 280, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 4, floor: "main", x: 780, y: 280, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 6, floor: "main", x: 715, y: 280, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  
  // Middle tables near stage
  { tableNumber: 8, floor: "main", x: 535, y: 280, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 7, floor: "main", x: 600, y: 280, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  
  // Left side tables
  { tableNumber: 9, floor: "main", x: 370, y: 195, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 10, floor: "main", x: 300, y: 265, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 11, floor: "main", x: 290, y: 140, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 12, floor: "main", x: 230, y: 210, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 13, floor: "main", x: 180, y: 265, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 14, floor: "main", x: 155, y: 160, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 15, floor: "main", x: 120, y: 265, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  
  // Right corner tables
  { tableNumber: 16, floor: "main", x: 880, y: 380, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 18, floor: "main", x: 780, y: 405, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 20, floor: "main", x: 710, y: 390, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 22, floor: "main", x: 635, y: 385, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 24, floor: "main", x: 560, y: 390, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 26, floor: "main", x: 485, y: 390, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 28, floor: "main", x: 405, y: 390, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 30, floor: "main", x: 325, y: 390, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  
  // Wall tables
  { tableNumber: 19, floor: "main", x: 730, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 21, floor: "main", x: 670, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 23, floor: "main", x: 610, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 25, floor: "main", x: 550, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 27, floor: "main", x: 470, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 29, floor: "main", x: 405, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 31, floor: "main", x: 345, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
  { tableNumber: 32, floor: "main", x: 290, y: 330, shape: "round", capacity: 4, 
    seatPositions: [
      { position: "top", x: 0, y: -25 },
      { position: "right", x: 25, y: 0 },
      { position: "bottom", x: 0, y: 25 },
      { position: "left", x: -25, y: 0 }
    ]
  },
];

// Mezzanine floor table configurations
const mezzanineTables: TableData[] = [
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

async function setupVenueLayout() {
  try {
    console.log("Starting venue layout setup...");
    
    // Clear existing tables and seats
    console.log("Clearing existing tables and seats...");
    await db.delete(seats);
    await db.delete(tables);
    
    console.log("Creating main floor tables...");
    await createTablesAndSeats(mainFloorTables);
    
    console.log("Creating mezzanine tables...");
    await createTablesAndSeats(mezzanineTables);
    
    console.log("Venue layout setup complete!");
  } catch (error) {
    console.error("Error setting up venue layout:", error);
  } finally {
    process.exit(0);
  }
}

async function createTablesAndSeats(tablesData: TableData[]) {
  for (const tableData of tablesData) {
    console.log(`Creating table ${tableData.tableNumber} on ${tableData.floor} floor...`);
    
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
    
    console.log(`Created table ${tableData.tableNumber} with ${tableData.capacity} seats`);
  }
}

console.log("Setting up venue layout based on floor plans...");
setupVenueLayout();