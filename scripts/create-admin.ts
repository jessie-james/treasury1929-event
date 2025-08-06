import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@treasury.com";
  const password = process.env.ADMIN_PASSWORD;
  const role = "admin";

  if (!password) {
    console.error("ADMIN_PASSWORD environment variable is required");
    process.exit(1);
  }

  try {
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      console.log(`User ${email} already exists, updating password instead.`);
      await storage.updateUserPassword(existingUser.id, hashedPassword);
      console.log(`Password updated for ${email}`);
    } else {
      // Create the user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role
      });
      console.log(`Admin user created with email: ${email} and ID: ${user.id}`);
    }
    
    console.log("Done! You can now log in with:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdmin().then(() => process.exit(0));