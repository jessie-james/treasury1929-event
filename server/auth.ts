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
  // Detect environment - if process.env.NODE_ENV is not set, assume development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true';
  const isDevelopment = !isProduction;
  
  // Use secure random secret instead of hardcoded value
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  // Configure session store (errorCallback is not in the type definition but is supported)
  const sessionStore = new PostgresSessionStore({
    pool,
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
  
  // Configure cookie settings for production deployment
  const cookieSettings: session.CookieOptions = {
    // In production (deployed), use secure cookies for HTTPS
    secure: isProduction,
    
    // Use a longer session lifetime to reduce authentication issues
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    
    httpOnly: true, // Prevent JavaScript access for security
    
    // Use 'lax' for better compatibility in production deployment
    sameSite: isProduction ? 'lax' : 'none',
    
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
    saveUninitialized: true, // Changed to true to ensure cookie is always sent
    
    store: sessionStore,
    
    cookie: cookieSettings,
    
    // Better compatibility with proxy setups (like Replit)
    proxy: true,
    
    // Add rolling session - extends expiration on each request
    rolling: true,
    
    // Explicitly set session name to avoid conflicts
    name: 'venue.sid'
  };
  
  // Log session configuration details for debugging
  console.log(`Auth setup: ${isDevelopment ? 'Development' : 'Production'} mode`);
  console.log(`Session cookie: secure=${cookieSettings.secure}, sameSite=${cookieSettings.sameSite}`);
  
  // Enable trust proxy in Express (needed for secure cookies with proxies)
  app.set('trust proxy', 1);

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
    done(null, user.id);
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

      req.login(user, (err) => {
        if (err) throw err;
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
    // Track authentication debug information
    const authDebug = {
      hasSession: !!req.session,
      hasSessionID: !!req.sessionID,
      cookiesHeader: req.headers.cookie ? 'Present' : 'Missing',
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      origin: req.headers.origin || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Log detailed auth debugging info
    if (process.env.NODE_ENV !== 'production') {
      console.log('Auth debug info:', authDebug);
    }
    
    // Primary authentication check
    if (req.isAuthenticated() && req.user) {
      // Clone the user object to avoid direct modification of req.user
      const userObj = { ...req.user };
      
      // Don't send the password hash to the client
      if ('password' in userObj) {
        delete userObj.password;
      }
      
      return res.json(userObj);
    }
    
    // If we get here, authentication failed
    return res.status(401).json({ 
      message: "Not authenticated",
      // Only include debug info in development
      ...(process.env.NODE_ENV !== 'production' ? { debug: authDebug } : {})
    });
  });
  
  // User preferences endpoint - to update allergens and dietary restrictions
  app.patch("/api/user/preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Preferences update rejected: User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      console.log(`Updating preferences for user ${req.user!.id}:`, req.body);
      const { allergens, dietaryRestrictions } = req.body;
      
      // Validate the data
      if (!Array.isArray(allergens) || !Array.isArray(dietaryRestrictions)) {
        console.log("Invalid preference data format:", req.body);
        return res.status(400).json({ error: "Invalid data format", details: "Both allergens and dietaryRestrictions must be arrays" });
      }
      
      // Update the user preferences
      const updatedUser = await storage.updateUser(req.user!.id, {
        allergens,
        dietaryRestrictions
      });
      
      console.log(`Successfully updated preferences for user ${req.user!.id}`);
      
      // Don't send the password hash to the client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user preferences:", error);
      const errorMessage = error.message || "Failed to update preferences";
      res.status(500).json({ 
        error: "Failed to update preferences", 
        details: errorMessage
      });
    }
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
      const updatedUser = await storage.updateUser(req.user!.id, {
        firstName,
        lastName,
        phone
      });
      
      console.log(`Successfully updated profile for user ${req.user!.id}`);
      
      // Don't send the password hash to the client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      const errorMessage = error.message || "Failed to update profile";
      res.status(500).json({ 
        error: "Failed to update profile",
        details: errorMessage
      });
    }
  });
}