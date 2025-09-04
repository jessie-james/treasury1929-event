import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

/**
 * Creates a hostess user account for venue check-in operations.
 * 
 * For security, use environment variables:
 * - HOSTESS_EMAIL: Email address for the hostess account
 * - HOSTESS_PASSWORD: Strong password for the hostess account
 * 
 * If environment variables are not set, defaults will be used (not recommended for production).
 */

async function createHostess() {
  const email = process.env.HOSTESS_EMAIL || "hostess@treasury.com";
  const password = process.env.HOSTESS_PASSWORD || "welcome123";
  const role = "hostess";

  try {
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      console.log(`User ${email} already exists, updating password and role instead.`);
      await storage.updateUser(existingUser.id, {
        password: hashedPassword,
        role
      });
      console.log(`Password and role updated for ${email}`);
    } else {
      // Create the user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role,
        firstName: "Venue",
        lastName: "Hostess"
      });
      console.log(`Hostess user created with email: ${email} and ID: ${user.id}`);
    }
    
    console.log("Done! You can now log in with:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    console.log("This account has access only to the Entrance page for scanning tickets and guest check-ins.");
  } catch (error) {
    console.error("Error creating hostess user:", error);
  }
}

createHostess().then(() => process.exit(0));