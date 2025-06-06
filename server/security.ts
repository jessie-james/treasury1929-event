import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express, Request, Response, NextFunction } from 'express';

export function setupSecurity(app: Express) {
  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for React dev
        connectSrc: ["'self'", "https://api.stripe.com", "wss://localhost:*", "ws://localhost:*"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
  }));

  // Rate limiting for booking endpoints (most critical)
  const bookingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Maximum 3 booking attempts per 5 minutes per IP
    message: {
      error: 'Too many booking attempts. Please wait 5 minutes before trying again.',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use IP address + user ID if authenticated for better tracking
      const baseKey = req.ip || 'unknown';
      const userId = req.user?.id;
      return userId ? `${baseKey}-${userId}` : baseKey;
    }
  });

  // Rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 login attempts per 15 minutes per IP
    message: {
      error: 'Too many login attempts. Please wait 15 minutes before trying again.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // General API rate limiting
  const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Maximum 100 requests per minute per IP
    message: {
      error: 'Too many requests. Please slow down.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters to specific routes
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  app.use('/api/forgot-password', authLimiter);
  app.use('/api/reset-password', authLimiter);
  
  // Apply booking rate limiter to booking endpoints
  app.use('/api/bookings', bookingLimiter);
  app.use('/create-booking-final', bookingLimiter);
  app.use('/api/payment/create-intent', bookingLimiter);
  
  // Apply general rate limiter to all other API routes except payment callbacks
  app.use('/api/', (req, res, next) => {
    // Exclude Stripe payment callback endpoints from rate limiting
    if (req.path === '/api/payment-success' || req.path === '/api/payment-webhook') {
      return next();
    }
    return generalLimiter(req, res, next);
  });

  console.log('✓ Security middleware configured with rate limiting and headers');
}

// Input validation and sanitization middleware
export function validateInput(req: Request, res: Response, next: NextFunction) {
  // Basic input sanitization
  const sanitizeString = (value: any): string => {
    if (typeof value !== 'string') return '';
    return value
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: urls
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  };

  // Sanitize common input fields
  if (req.body) {
    if (req.body.email) {
      req.body.email = sanitizeString(req.body.email).toLowerCase();
    }
    if (req.body.customerEmail) {
      req.body.customerEmail = sanitizeString(req.body.customerEmail).toLowerCase();
    }
    if (req.body.notes) {
      req.body.notes = sanitizeString(req.body.notes);
    }
    if (req.body.guestNames && Array.isArray(req.body.guestNames)) {
      req.body.guestNames = req.body.guestNames.map((name: any) => sanitizeString(name));
    }
  }

  next();
}

// Error handling middleware for security
export function securityErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log security-related errors without exposing sensitive information
  console.error('Security error:', {
    error: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't expose internal error details to clients
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid input data',
      details: 'Please check your input and try again'
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      message: err.message || 'Please slow down and try again later'
    });
  }

  // Generic error response
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong. Please try again later.'
  });
}

// Environment validation
export function validateEnvironment() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('⚠️  Application may not function correctly without these variables');
  } else {
    console.log('✅ All critical environment variables are present');
  }

  // Warn about optional but recommended variables
  const recommendedVars = [
    'SENDGRID_API_KEY',
    'SESSION_SECRET',
    'ADMIN_EMAIL',
    'FROM_EMAIL'
  ];

  const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);
  
  if (missingRecommended.length > 0) {
    console.warn('⚠️  Missing recommended environment variables:', missingRecommended);
    console.warn('📧 Email notifications and some features may not work without these');
  }
}