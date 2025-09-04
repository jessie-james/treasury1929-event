import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../server/auth";

async function setupAdminAccounts() {
  console.log("Setting up admin accounts...");
  
  const adminAccounts = [
    {
      email: process.env.TREASURY_ADMIN_EMAIL!,
      password: process.env.TREASURY_ADMIN_PASSWORD!,
      role: "admin",
      firstName: "Treasury",
      lastName: "Admin"
    },
    {
      email: process.env.JOSE_ADMIN_EMAIL!,
      password: process.env.JOSE_ADMIN_PASSWORD!,
      role: "admin", 
      firstName: "Jose",
      lastName: "Santos"
    }
  ];

  for (const account of adminAccounts) {
    try {
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, account.email));
      
      const hashedPassword = await hashPassword(account.password);
      
      if (existingUser.length > 0) {
        // Update existing user
        console.log(`Updating existing user: ${account.email}`);
        await db.update(users)
          .set({
            password: hashedPassword,
            role: account.role,
            firstName: account.firstName,
            lastName: account.lastName
          })
          .where(eq(users.email, account.email));
        console.log(`✓ Updated ${account.email} with admin privileges`);
      } else {
        // Create new user
        console.log(`Creating new admin user: ${account.email}`);
        await db.insert(users).values({
          email: account.email,
          password: hashedPassword,
          role: account.role,
          firstName: account.firstName,
          lastName: account.lastName
        });
        console.log(`✓ Created new admin account: ${account.email}`);
      }
    } catch (error) {
      console.error(`Error setting up admin account ${account.email}:`, error);
    }
  }
  
  console.log("Admin account setup completed!");
}

// Run the script
setupAdminAccounts().catch(console.error);