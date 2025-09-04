import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../shared/schema';

let testPool: Pool | null = null;
let testDb: any = null;
let testSchemaName: string = '';

export async function setupTestSchema(): Promise<{ db: any; schemaName: string }> {
  // Generate unique test schema name
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  testSchemaName = `tre_audit_${timestamp}_${random}`;
  
  console.log(`🧪 Setting up test schema: ${testSchemaName}`);
  
  // Create connection pool
  testPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Single connection for tests
  });
  
  // Create schema
  await testPool.query(`CREATE SCHEMA IF NOT EXISTS "${testSchemaName}"`);
  await testPool.query(`SET search_path TO "${testSchemaName}"`);
  
  // Initialize drizzle with test schema
  testDb = drizzle(testPool, { schema });
  
  // Run migrations in test schema
  try {
    // Note: This is a simplified approach - in production you'd use proper migration files
    await createTestTables();
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
  
  console.log(`✅ Test schema ${testSchemaName} ready`);
  return { db: testDb, schemaName: testSchemaName };
}

async function createTestTables() {
  if (!testPool) throw new Error('Test pool not initialized');
  
  // Create minimal tables for testing
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      capacity INTEGER DEFAULT 100,
      layout_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      venue_id INTEGER REFERENCES venues(id),
      event_type VARCHAR(50) DEFAULT 'full',
      base_price INTEGER DEFAULT 13000,
      ticket_price INTEGER,
      price_display TEXT,
      is_active BOOLEAN DEFAULT true,
      total_seats INTEGER DEFAULT 80,
      total_tables INTEGER DEFAULT 20,
      available_seats INTEGER DEFAULT 80,
      available_tables INTEGER DEFAULT 20,
      image TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER REFERENCES venues(id),
      table_number INTEGER NOT NULL,
      capacity INTEGER DEFAULT 4,
      floor VARCHAR(100) DEFAULT 'Main Floor',
      x_position DECIMAL(10,2) DEFAULT 0,
      y_position DECIMAL(10,2) DEFAULT 0,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS food_options (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      price INTEGER DEFAULT 0,
      image TEXT,
      allergens TEXT[] DEFAULT '{}',
      dietary_restrictions TEXT[] DEFAULT '{}',
      is_available BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS event_food_options (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      food_option_id INTEGER REFERENCES food_options(id) ON DELETE CASCADE,
      is_available BOOLEAN DEFAULT true,
      custom_price INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, food_option_id)
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS artists (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255),
      bio TEXT,
      photo_url TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'customer',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      user_id INTEGER REFERENCES users(id),
      table_id INTEGER REFERENCES tables(id),
      party_size INTEGER NOT NULL,
      guest_names JSONB DEFAULT '[]'::jsonb,
      customer_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      total_paid_cents INTEGER DEFAULT 0,
      stripe_payment_id VARCHAR(255),
      booking_type VARCHAR(50) DEFAULT 'standard',
      food_selections JSONB DEFAULT '[]'::jsonb,
      wine_selections JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      checked_in_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function teardownTestSchema(): Promise<void> {
  if (!testPool || !testSchemaName) return;
  
  const keepSchema = process.env.KEEP_AUDIT_SCHEMA === 'true';
  
  if (!keepSchema) {
    console.log(`🧹 Dropping test schema: ${testSchemaName}`);
    await testPool.query(`DROP SCHEMA IF EXISTS "${testSchemaName}" CASCADE`);
  } else {
    console.log(`🔒 Keeping test schema: ${testSchemaName} (KEEP_AUDIT_SCHEMA=true)`);
  }
  
  await testPool.end();
  testPool = null;
  testDb = null;
  testSchemaName = '';
}

export function getTestDb() {
  if (!testDb) throw new Error('Test database not initialized');
  return testDb;
}

export function getTestSchemaName() {
  return testSchemaName;
}