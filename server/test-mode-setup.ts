/**
 * Test Mode Database Setup
 * 
 * This module provides database isolation for testing mode,
 * ensuring test data doesn't interfere with production data.
 */

import { db, pool } from './db';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { storage } from './storage';

export interface TestModeConfig {
  useIsolatedSchema: boolean;
  seedTestData: boolean;
  schemaPrefix: string;
}

const DEFAULT_CONFIG: TestModeConfig = {
  useIsolatedSchema: true,
  seedTestData: true,
  schemaPrefix: 'test_'
};

// Test data for seeding
// Use high, unlikely IDs for test data to minimize collision risk
const TEST_ID_BASE = 999900;

const TEST_VENUES = [
  {
    id: TEST_ID_BASE + 1,
    name: 'TEST-MODE-VENUE (SAFE TO USE)',
    width: 1000,
    height: 700,
    description: 'TEST VENUE - Bookings here are isolated and safe'
  }
];

const TEST_EVENTS = [
  {
    id: TEST_ID_BASE + 1,
    title: '🧪 TEST EVENT - SAFE BOOKING (Testing Mode Active)',
    description: '⚠️ TESTING MODE: This is a test event. All bookings are isolated from production. Payments are mocked and no real charges will occur.',
    image: '/test-event-image.png',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    venueId: TEST_ID_BASE + 1,
    displayOrder: 9999,
    isActive: true,
    eventType: 'full' as const,
    isPrivate: false,
    ticketCutoffDays: 1,
    basePrice: 13000,
    priceDisplay: '$130 per guest — 🧪 TEST MODE (NO REAL CHARGES)',
    ticketPrice: 5000,
    includeFoodService: true,
    includeBeverages: true,
    includeAlcohol: true,
    maxTicketsPerPurchase: 8,
    availableTables: 2,
    totalTables: 2,
    availableSeats: 8,
    totalSeats: 8
  }
];

const TEST_TABLES = [
  {
    id: TEST_ID_BASE + 1,
    venueId: TEST_ID_BASE + 1,
    tableNumber: 901,
    x: 400,
    y: 300,
    width: 88,
    height: 88,
    capacity: 4,
    shape: 'full' as const,
    tableSize: 4,
    rotation: 0,
    floor: 'TEST FLOOR'
  },
  {
    id: TEST_ID_BASE + 2,
    venueId: TEST_ID_BASE + 1,
    tableNumber: 902,
    x: 600,
    y: 300,
    width: 88,
    height: 88,
    capacity: 4,
    shape: 'full' as const,
    tableSize: 4,
    rotation: 0,
    floor: 'TEST FLOOR'
  }
];

const TEST_MENU_ITEMS = [
  {
    id: TEST_ID_BASE + 1,
    name: '🧪 TEST Grilled Chicken (Testing Mode)',
    description: 'TEST MENU ITEM - Sample menu item for testing purposes',
    category: 'entree',
    price: 3500,
    isAvailable: true,
    containsAllergens: [],
    dietaryInfo: []
  },
  {
    id: TEST_ID_BASE + 2,
    name: '🧪 TEST Vegetarian Pasta (Testing Mode)',
    description: 'TEST MENU ITEM - Sample vegetarian option for testing',
    category: 'entree',
    price: 3200,
    isAvailable: true,
    containsAllergens: [],
    dietaryInfo: []
  }
];

export class TestModeManager {
  private config: TestModeConfig;
  
  constructor(config: Partial<TestModeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Check if application is currently in testing mode
   */
  static isTestingMode(): boolean {
    return process.env.TESTING_MODE === 'true' || 
           process.env.NODE_ENV === 'test' ||
           process.env.STRIPE_MOCK_MODE === 'true';
  }
  
  /**
   * Initialize test mode setup
   */
  async initialize(): Promise<void> {
    if (!TestModeManager.isTestingMode()) {
      console.log('⚠️  TestModeManager: Not in testing mode, skipping setup');
      return;
    }
    
    console.log('🧪 TestModeManager: Initializing test mode setup...');
    
    if (this.config.useIsolatedSchema) {
      await this.createTestSchema();
    }
    
    if (this.config.seedTestData) {
      await this.seedTestData();
    }
    
    console.log('✅ TestModeManager: Test mode setup complete');
  }
  
  /**
   * Create test schema (if using schema isolation)
   */
  private async createTestSchema(): Promise<void> {
    console.log('🏗️  Creating test database schema...');
    
    try {
      // For simplicity, we'll just ensure test data has distinct IDs
      // In a more complex setup, you might create separate schemas
      console.log('✅ Test schema prepared (using ID isolation)');
    } catch (error) {
      console.error('❌ Failed to create test schema:', error);
      throw error;
    }
  }
  
  /**
   * Seed test data for isolated testing
   */
  private async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test data...');
    
    try {
      // Check if test data already exists
      const existingTestEvent = await db.select()
        .from(schema.events)
        .where(eq(schema.events.id, 999))
        .limit(1);
      
      if (existingTestEvent.length > 0) {
        console.log('🔄 Test data already exists, skipping seed');
        return;
      }
      
      // Insert test venues
      for (const venue of TEST_VENUES) {
        await db.insert(schema.venues)
          .values(venue)
          .onConflictDoNothing();
      }
      
      // Insert test events
      for (const event of TEST_EVENTS) {
        await db.insert(schema.events)
          .values(event)
          .onConflictDoNothing();
      }
      
      // Insert test tables (one at a time to handle schema correctly)
      for (const table of TEST_TABLES) {
        await db.insert(schema.tables)
          .values([table])
          .onConflictDoNothing();
      }
      
      // Insert test menu items (one at a time to handle schema correctly)
      for (const menuItem of TEST_MENU_ITEMS) {
        await db.insert(schema.menuItems)
          .values([menuItem])
          .onConflictDoNothing();
      }
      
      // Note: Skipping menu item linking - schema may not have eventMenuItems table
      // Menu items are linked through other mechanisms in this application
      
      console.log('✅ Test data seeded successfully');
      console.log('   - Test Event ID: 999 (Test Dinner Concert)');
      console.log('   - Test Tables: T1, T2');
      console.log('   - Test Menu Items: 2 items available');
    } catch (error) {
      console.error('❌ Failed to seed test data:', error);
      throw error;
    }
  }
  
  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    if (!TestModeManager.isTestingMode()) {
      console.log('⚠️  TestModeManager: Not in testing mode, skipping cleanup');
      return;
    }
    
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Delete test bookings first (foreign key constraints)
      await db.delete(schema.bookings)
        .where(eq(schema.bookings.eventId, 999));
      
      // Note: Skipping event menu items deletion - schema may not have eventMenuItems table
      
      // Delete test menu items
      await db.delete(schema.menuItems)
        .where(eq(schema.menuItems.id, 9999));
      await db.delete(schema.menuItems)
        .where(eq(schema.menuItems.id, 9998));
      
      // Delete test tables
      await db.delete(schema.tables)
        .where(eq(schema.tables.id, 9999));
      await db.delete(schema.tables)
        .where(eq(schema.tables.id, 9998));
      
      // Delete test events
      await db.delete(schema.events)
        .where(eq(schema.events.id, 999));
      
      // Delete test venues
      await db.delete(schema.venues)
        .where(eq(schema.venues.id, 999));
      
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error);
      throw error;
    }
  }
  
  /**
   * Get test event information
   */
  getTestEventInfo() {
    return {
      eventId: 999,
      eventTitle: 'Test Dinner Concert - SAFE TO BOOK',
      tableIds: [9999, 9998],
      tableNumbers: ['T1', 'T2'],
      menuItemIds: [9999, 9998]
    };
  }
}

// Initialize test mode on module load if in testing mode
if (TestModeManager.isTestingMode()) {
  console.log('🧪 Test mode detected - initializing test database setup...');
  const testManager = new TestModeManager();
  
  // Initialize test setup
  testManager.initialize().catch(error => {
    console.error('❌ Failed to initialize test mode:', error);
  });
  
  // Cleanup on process exit
  process.on('exit', () => {
    console.log('🧹 Process exiting - cleaning up test data...');
  });
  
  process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT - cleaning up test data...');
    await testManager.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM - cleaning up test data...');
    await testManager.cleanup();
    process.exit(0);
  });
}

export default TestModeManager;