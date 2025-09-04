// PHASE 1: Write-guard middleware to protect specified events
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to deny destructive writes for protected event IDs
 * Attach to routes that update/delete bookings/events
 */
export function createWriteGuardMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get protected event IDs from environment variable (CSV format)
    const protectedEventIds = process.env.PROTECT_EVENT_IDS || '';
    
    if (!protectedEventIds) {
      // No protection enabled, allow all operations
      return next();
    }
    
    // Parse the CSV list of protected event IDs
    const protectedIds = protectedEventIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    if (protectedIds.length === 0) {
      return next();
    }
    
    // Extract event ID from various possible sources
    const eventId = 
      req.params.eventId || 
      req.params.id || 
      req.body.eventId || 
      req.query.eventId;
    
    // Check if this is a destructive operation on a protected event
    const isDestructiveMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isProtectedEvent = eventId && protectedIds.includes(eventId.toString());
    
    if (isDestructiveMethod && isProtectedEvent) {
      console.warn(`[WRITE_GUARD] Blocked ${req.method} operation on protected event ${eventId}`);
      return res.status(403).json({
        error: 'Event Protected',
        message: `This event (${eventId}) is protected from modifications. Contact administrator for changes.`,
        protectedEventIds: protectedIds
      });
    }
    
    // Allow the operation
    next();
  };
}

/**
 * Apply write guard to specific routes that modify bookings/events
 */
export const writeGuard = createWriteGuardMiddleware();