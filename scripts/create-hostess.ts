import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

async function createHostess() {
  const email = "hostess@treasury.com";
  const password = "welcome123";
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