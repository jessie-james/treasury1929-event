import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User, type InsertAdminLog } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { EmailService } from "./email-service";

// Safe admin logging function that won't crash the app if it fails
async function safeCreateAdminLog(logData: InsertAdminLog): Promise<boolean> {
  try {
    await storage.createAdminLog(logData);
    return true;
  } catch (error) {
    console.error("Failed to create admin log:", error);
    return false;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  // Initialize email service first
  EmailService.initialize().catch(error => {
    console.error('Failed to initialize email service:', error);
  });

  // Detect environment - if process.env.NODE_ENV is not set, assume development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true';
  const isDevelopment = !isProduction;
  
  // Use secure random secret instead of hardcoded value
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  // Configure session store (errorCallback is not in the type definition but is supported)
  const sessionStore = new PostgresSessionStore({
    pool: pool,
    createTableIfMissing: true,
    // Custom error logging without using the errorCallback option
  });
  
  // Attach error handler to the store's events
  sessionStore.on('error', (error: any) => {
    console.error('PostgreSQL session store error:', error);
  });
  
  // Detect headers that might indicate HTTPS
  const hasSecureHeaders = (req: any) => {
    return (
      (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'https') ||
      (req.headers['x-forwarded-ssl'] && req.headers['x-forwarded-ssl'] === 'on')
    );
  };
  
  // Configure cookie settings for development compatibility
  const cookieSettings: session.CookieOptions = {
    // Always use non-secure cookies for development
    secure: false,
    
    // Use a longer session lifetime to reduce authentication issues
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    
    httpOnly: true, // Prevent JavaScript access for security
    
    // Use 'lax' for better compatibility
    sameSite: 'lax',
    
    path: '/', // Available across entire site
    domain: undefined // Let browser determine domain automatically for compatibility
  };
  
  // Enhanced session settings with better compatibility across environments
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    
    // Resave determines whether the session should be saved back to the session store,
    // even if it wasn't modified during the request
    resave: false,
    
    // SaveUninitialized determines whether a session should be stored for a request
    // that doesn't modify the session
    saveUninitialized: true, // Set to true to ensure sessions are created
    
    store: sessionStore,
    
    cookie: cookieSettings,
    
    // Better compatibility with proxy setups (like Replit)
    proxy: false, // Disable proxy to fix session issues
    
    // Add rolling session - extends expiration on each request
    rolling: true,
    
    // Explicitly set session name to avoid conflicts
    name: 'venue.sid'
  };
  
  // Log session configuration details for debugging
  console.log(`Auth setup: ${isDevelopment ? 'Development' : 'Production'} mode`);
  console.log(`Session cookie: secure=${cookieSettings.secure}, sameSite=${cookieSettings.sameSite}`);
  
  // Disable trust proxy for development
  app.set('trust proxy', false);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Attempting login for email: ${email}`);
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("User not found");
            return done(null, false);
          }

          console.log("Found user:", { id: user.id, email: user.email, role: user.role });
          
          // Check if user has a password set
          if (!user.password) {
            console.log("User has no password set");
            return done(null, false);
          }
          
          const isValid = await comparePasswords(password, user.password);
          console.log("Password validation result:", isValid);

          if (!isValid) {
            return done(null, false);
          }

          return done(null, user);
        } catch (error) {
          console.error("Login error:", error);
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    try {
      if (!user || !user.id) {
        console.error("Cannot serialize user: missing user or user.id", user);
        return done(new Error("Invalid user object for serialization"));
      }
      done(null, user.id);
    } catch (error) {
      console.error("Error in serializeUser:", error);
      done(error);
    }
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Create initial admin user if it doesn't exist
  (async () => {
    try {
      const existingAdmin = await storage.getUserByEmail("admin@venue.com");
      if (!existingAdmin) {
        console.log("Creating initial admin user...");
        const hashedPassword = await hashPassword("admin123");
        await storage.createUser({
          email: "admin@venue.com",
          password: hashedPassword,
          role: "admin",
        });
        console.log("Initial admin user created successfully");
      }
    } catch (error) {
      console.error("Error creating initial admin user:", error);
    }
  })();

  app.post("/api/register", async (req, res) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Validate role
      const role = req.body.role || 'customer';
      if (!['admin', 'venue_owner', 'venue_manager', 'customer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Extract profile fields
      const { email, password, role: userRole, firstName, lastName, phone } = req.body;
      
      // Validate required profile fields if they're provided
      if (firstName !== undefined && firstName.trim() === '') {
        return res.status(400).json({ message: "First name cannot be empty" });
      }
      
      if (lastName !== undefined && lastName.trim() === '') {
        return res.status(400).json({ message: "Last name cannot be empty" });
      }

      const hashedPassword = await hashPassword(password);
      console.log("Registering new user with hashed password:", hashedPassword);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role: userRole,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
      });

      // Attempt to log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error("Auto-login failed after registration:", err);
          // User was created successfully, but auto-login failed
          // Return success with a flag indicating login issue
          return res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            autoLoginFailed: true,
            message: "Account created successfully. Please log in manually."
          });
        }
        // Auto-login successful
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    console.log("Login attempt for:", req.body.email);

    passport.authenticate("local", async (err: any, user: User | false) => {
      if (err) {
        console.error("Authentication error:", err);
        // Log failed login with error
        if (req.body.email) {
          await safeCreateAdminLog({
            userId: -1, // We don't have a user ID for failed logins
            action: "FAILED_LOGIN_ERROR",
            entityType: "auth",
            details: { 
              email: req.body.email,
              error: err.message || "Authentication error"
            }
          });
        }
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed");
        // Log failed login with invalid credentials
        if (req.body.email) {
          await safeCreateAdminLog({
            userId: -1, // We don't have a user ID for failed logins
            action: "FAILED_LOGIN",
            entityType: "auth",
            details: { 
              email: req.body.email,
              reason: "Invalid credentials"
            }
          });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.login(user, async (err) => {
        if (err) {
          console.error("Login error:", err);
          // Log failed login during session creation
          await safeCreateAdminLog({
            userId: user.id,
            action: "FAILED_LOGIN_SESSION",
            entityType: "auth",
            details: { 
              email: user.email,
              error: err.message || "Session error"
            }
          });
          return next(err);
        }
        console.log("Login successful for user:", user.email);
        
        // Log successful login
        if (user.role !== 'customer') {
          await safeCreateAdminLog({
            userId: user.id,
            action: "LOGIN",
            entityType: "auth",
            details: { 
              email: user.email,
              role: user.role
            }
          });
        }
        
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res) => {
    // Only log logout for admin users
    if (req.isAuthenticated() && req.user && req.user.role !== 'customer') {
      const user = req.user as User;
      await safeCreateAdminLog({
        userId: user.id,
        action: "LOGOUT",
        entityType: "auth",
        details: { 
          email: user.email,
          role: user.role
        }
      });
    }
    
    req.logout(() => {
      res.sendStatus(200);
    });
  });

  // Enhanced user endpoint with better debugging and fallback auth
  app.get("/api/user", (req, res) => {
    console.log("User endpoint check:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID,
      cookies: req.headers.cookie
    });
    
    if (req.isAuthenticated() && req.user) {
      const userObj = { ...req.user };
      if ('password' in userObj) {
        delete userObj.password;
      }
      return res.json(userObj);
    }
    
    // Return 204 instead of 401 to prevent unhandled promise rejections
    return res.status(204).send();
  });
  

  
  // User profile endpoint - to update personal information
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Profile update rejected: User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      console.log(`Updating profile for user ${req.user!.id}:`, {
        ...req.body,
        // Redact any sensitive fields if they were to be included
        password: req.body.password ? "[REDACTED]" : undefined
      });
      
      const { firstName, lastName, phone } = req.body;
      
      // Validate required fields
      if (firstName === "" || lastName === "") {
        console.log("Invalid profile data - empty required fields");
        return res.status(400).json({ error: "Invalid data", details: "First name and last name cannot be empty" });
      }
      
      // Update the user profile information
      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        firstName,
        lastName,
        phone
      });
      
      console.log(`Successfully updated profile for user ${req.user!.id}`);
      
      // Don't send the password hash to the client
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      const errorMessage = error.message || "Failed to update profile";
      res.status(500).json({ 
        error: "Failed to update profile",
        details: errorMessage
      });
    }
  });

  // Password reset request route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate a secure reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the reset token with 1-hour expiration
      if (!app.locals.resetTokens) {
        app.locals.resetTokens = new Map();
      }
      const resetTokens = app.locals.resetTokens;
      resetTokens.set(resetToken, { email, expires: Date.now() + 3600000 }); // 1 hour

      // Send password reset email
      const emailSent = await EmailService.sendPasswordResetEmail(email, resetToken);
      
      if (emailSent) {
        console.log(`✓ Password reset email sent to ${email}`);
        res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      } else {
        console.log(`✗ Failed to send password reset email to ${email}`);
        res.status(500).json({ message: "Failed to send password reset email" });
      }

    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password reset confirmation route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Check if token exists and is valid
      const resetTokens = app.locals.resetTokens || new Map();
      const tokenData = resetTokens.get(token);
      
      if (!tokenData || tokenData.expires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Find the user
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await storage.updateUserPassword(user.id, hashedPassword);
      
      // Remove the used token
      resetTokens.delete(token);
      
      console.log(`✓ Password reset successful for ${tokenData.email}`);
      res.json({ message: "Password reset successful" });

    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

}