import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateSchema() {
  console.log("Starting database schema migration...");
  
  try {
    // First check if the stripe_customer_id column exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
      );
    `);

    const columnExists = result.rows[0]?.exists === true;
    
    if (!columnExists) {
      // Add Stripe-related columns to users table
      console.log("Adding Stripe-related columns to users table...");
      await db.execute(sql`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255);
      `);
      console.log("✅ Added Stripe columns to users table");
    } else {
      console.log("Stripe columns already exist, skipping...");
    }
    
    // Check for shape column in tables
    const tableShapeExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'shape'
      );
    `);
    
    if (!tableShapeExists.rows[0]?.exists) {
      console.log("Adding shape column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "shape" VARCHAR(20) DEFAULT 'round' NOT NULL;
      `);
      console.log("✅ Added shape column to tables");
    }
    
    // Check for rotation column in tables
    const tableRotationExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'rotation'
      );
    `);
    
    if (!tableRotationExists.rows[0]?.exists) {
      console.log("Adding rotation column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "rotation" INTEGER DEFAULT 0;
      `);
      console.log("✅ Added rotation column to tables");
    }
    
    // Check for status column in tables
    const tableStatusExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'status'
      );
    `);
    
    if (!tableStatusExists.rows[0]?.exists) {
      console.log("Adding status column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'available';
      `);
      console.log("✅ Added status column to tables");
    }
    
    // Check for zone column in tables
    const tableZoneExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'zone'
      );
    `);
    
    if (!tableZoneExists.rows[0]?.exists) {
      console.log("Adding zone column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "zone" VARCHAR(50);
      `);
      console.log("✅ Added zone column to tables");
    }
    
    // Check for price_category column in tables
    const tablePriceCategoryExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'price_category'
      );
    `);
    
    if (!tablePriceCategoryExists.rows[0]?.exists) {
      console.log("Adding price_category column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "price_category" VARCHAR(20) DEFAULT 'standard';
      `);
      console.log("✅ Added price_category column to tables");
    }
    
    // Check for is_locked column in tables
    const tableIsLockedExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tables' AND column_name = 'is_locked'
      );
    `);
    
    if (!tableIsLockedExists.rows[0]?.exists) {
      console.log("Adding is_locked column to tables...");
      await db.execute(sql`
        ALTER TABLE "tables" 
        ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN DEFAULT false;
      `);
      console.log("✅ Added is_locked column to tables");
    }
    
    // Create floors table if it doesn't exist
    console.log("Creating floors table if it doesn't exist...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "floors" (
        "id" SERIAL PRIMARY KEY,
        "venue_id" INTEGER NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "floor_key" VARCHAR(50) NOT NULL,
        "image" VARCHAR(255),
        "is_active" BOOLEAN DEFAULT true,
        "display_order" INTEGER DEFAULT 0
      );
    `);
    console.log("✅ Created floors table");
    
    // Create table_zones table if it doesn't exist
    console.log("Creating table_zones table if it doesn't exist...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "table_zones" (
        "id" SERIAL PRIMARY KEY,
        "venue_id" INTEGER NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "color" VARCHAR(7) NOT NULL,
        "is_active" BOOLEAN DEFAULT true
      );
    `);
    console.log("✅ Created table_zones table");
    
    // Create venue_layout_templates table if it doesn't exist
    console.log("Creating venue_layout_templates table if it doesn't exist...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "venue_layout_templates" (
        "id" SERIAL PRIMARY KEY,
        "venue_id" INTEGER NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "last_modified" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("✅ Created venue_layout_templates table");
    
    // Create template_table_associations table if it doesn't exist
    console.log("Creating template_table_associations table if it doesn't exist...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "template_table_associations" (
        "id" SERIAL PRIMARY KEY,
        "template_id" INTEGER NOT NULL,
        "table_id" INTEGER NOT NULL,
        "override_x" INTEGER,
        "override_y" INTEGER,
        "override_shape" VARCHAR(20),
        "override_status" VARCHAR(20),
        "override_zone" VARCHAR(50),
        "override_price_category" VARCHAR(20),
        UNIQUE("template_id", "table_id")
      );
    `);
    console.log("✅ Created template_table_associations table");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateSchema()
  .then(() => {
    console.log("Database schema migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database schema migration failed:", error);
    process.exit(1);
  });