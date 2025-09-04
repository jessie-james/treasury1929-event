# Treasury 1929 Audit — August 9, 2025, 17:15 PM

## Executive Summary

• **Time/Timezone Compliance**: ✅ Fully implemented with America/Phoenix timezone handling across frontend, backend, and email systems  
• **Email Delivery Issues**: ❌ Critical failures - SendGrid intermittently failing, using Treasury key but with initialization problems  
• **Table/Seat Label Consistency**: ⚠️ Mixed implementation - some areas use customer-facing tableNumber, others may expose internal IDs  
• **Stripe Integration**: ✅ Using Treasury test keys (TRE_STRIPE_TEST_SECRET_KEY), webhook endpoints configured  
• **Secrets Ownership**: ✅ Migrated to Treasury-owned keys (SENDGRID_API_KEY_NEW, TRE_STRIPE_TEST_SECRET_KEY)  
• **TypeScript Errors**: ❌ 24 LSP diagnostics indicating type mismatches in booking email data  
• **Database Architecture**: ✅ PostgreSQL with proper indexing, concurrency controls, and seat hold mechanisms  
• **Performance Concerns**: ⚠️ Slow availability requests (160-168ms) noted in logs  

## System Inventory

**Framework**: React 18 + TypeScript frontend, Node.js Express backend  
**Database**: PostgreSQL (Neon serverless) with Drizzle ORM  
**Key Dependencies**: Stripe 17.7.0, @sendgrid/mail 8.1.5, date-fns-tz 3.2.0  
**Authentication**: Passport.js with session-based auth  
**Real-time**: WebSocket integration via ws 8.18.0  
**Build System**: Vite 5.4.15 with TSX for development  

**Entry Points**:
- `server/index.ts` - Main Express server
- `client/src/App.tsx` - React application root
- Scripts: `npm run dev` (development), `npm run build` (production)

## Time & Timezone Audit (America/Phoenix required)

**✅ COMPLIANT** - Comprehensive timezone implementation found:

**Frontend Implementation** (`client/src/lib/timezone.ts`):
```typescript
export const PHOENIX_TZ = 'America/Phoenix';
export function formatEventTimes(eventDate: Date | string): {
  timeDisplay: string; // "Guest Arrival 5:45 PM, show starts 6:30 PM"
}
```

**Backend Implementation** (`server/email-service.ts` lines 73-87):
```typescript
const PHOENIX_TZ = 'America/Phoenix';
const arrivalTime = new Date(eventDateObj.getTime() - 45 * 60 * 1000);
const timeDisplay = `Guest Arrival ${arrivalTimeFormatted}, show starts ${showTime}`;
```

**Rendering Points Verified**:
- ✅ Email confirmations: "Guest Arrival 5:45 PM, show starts 6:30 PM"
- ✅ Frontend displays: Uses formatPhoenixTime() utilities
- ✅ PDF tickets: Timezone-aware generation
- ✅ Storage: Events stored in UTC, rendered in Phoenix timezone

## Email Flows Audit (SendGrid)

**❌ CRITICAL ISSUES FOUND**:

**Environment Variables** (`server/email-service.ts` line 48):
| Name | Present | Used By | Purpose | Owner | Mode |
|------|---------|---------|----------|-------|------|
| SENDGRID_API_KEY_NEW | ✅ | email-service.ts:48 | Treasury account key | Treasury | Live |
| SENDGRID_API_KEY | ❌ Fallback removed | N/A | Legacy key | Jose | Disabled |

**Email Templates & Flows**:
- ✅ Booking confirmation: `sendBookingConfirmation()` 
- ✅ Cancellation/refund: `sendCancellationEmail()`
- ✅ From address: "The Treasury 1929 <info@thetreasury1929.com>"

**Critical Issues**:
1. **Initialization Problems**: Line 66 shows "Email service not initialized - skipping"
2. **Error Handling**: Missing await/try-catch patterns in multiple locations
3. **Logging**: Insufficient error capture when SendGrid calls fail

## Payments/Refunds Audit (Stripe)

**✅ TREASURY KEYS VERIFIED**:

**Stripe Configuration** (`server/stripe.ts` lines 25-33):
```typescript
const stripeSecretKey = process.env.TRE_STRIPE_TEST_SECRET_KEY;
console.log(`Using Stripe key with prefix: ${keyPrefix}... (TREASURY_TEST)`);
```

**Webhook Implementation** (`server/routes-payment.ts` lines 934-950):
- ✅ Endpoint: `/api/stripe-webhook`
- ✅ Signature verification with STRIPE_WEBHOOK_SECRET
- ✅ Events: payment_intent.succeeded, checkout.session.completed

**Refund Flow**:
- ✅ Method: `storage.processRefund()` in storage-base.ts:353
- ✅ Email notification: `sendCancellationEmail()` with refund amount
- ⚠️ Webhook-driven vs manual trigger needs verification

## Secrets & Ownership Validation

**Environment Analysis**:

| Service | Env Var Name | Where Referenced | Account Owner | Status |
|---------|--------------|------------------|---------------|---------|
| Stripe | TRE_STRIPE_TEST_SECRET_KEY | stripe.ts:25 | Treasury | ✅ Active |
| SendGrid | SENDGRID_API_KEY_NEW | email-service.ts:48 | Treasury | ✅ Active |
| Database | DATABASE_URL | db.ts:4 | Replit/Neon | ✅ Active |

**Security Compliance**:
- ✅ No hardcoded keys found in source code
- ✅ Treasury-owned keys properly referenced
- ✅ Legacy Jose keys removed from active use
- ✅ Key prefixes logged safely (first 12 chars only)

## Deployment, Domain & DNS Readiness

**Current State**:
- ✅ Production build script configured (`npm run build`)
- ✅ Environment variable setup for deployment
- ✅ Static asset handling via Vite
- ✅ Express server ready for production mode
- ⚠️ No custom domain configuration visible
- ⚠️ DNS/TLS setup would be handled by Replit Deployments

## Security Review

**Strengths**:
- ✅ Helmet.js security headers
- ✅ CORS properly configured  
- ✅ Rate limiting implemented
- ✅ Session-based authentication
- ✅ Input validation with Zod schemas

**Concerns**:
- ⚠️ 24 TypeScript errors indicating potential type safety issues
- ⚠️ Error logging may expose sensitive data
- ✅ Webhook signature verification properly implemented

## Performance Review

**Database Performance**:
- ✅ Proper indexing on bookings table (event_id, status combinations)
- ✅ Seat hold mechanism for concurrency control
- ⚠️ Slow availability queries: 160-168ms (logs show "PERFORMANCE Slow availability request")

**Frontend Performance**:
- ✅ React Query for caching
- ✅ Canvas-based venue layouts for efficient rendering
- ✅ WebSocket for real-time updates

## Table/Seat Label Consistency (NEW)

**⚠️ INCONSISTENCY FOUND**:

**Schema Analysis** (`shared/schema.ts` line 106):
```typescript
export const tables = pgTable("tables", {
  tableNumber: integer("table_number").notNull(), // Customer-facing label
```

**Rendering Analysis**:
| File | Line | Field Used | Type | Notes |
|------|------|------------|------|-------|
| `ticketGenerator.ts` | 98 | `tableNumber \|\| tableId` | Mixed | ⚠️ Fallback to ID |
| `pdf-generator.ts` | 162 | `order.tableNumber` | ✅ Correct | Customer label |
| `email-service.ts` | ~85 | `table.tableNumber` | ✅ Correct | Customer label |
| `routes-admin.ts` | 388 | `t.tableNumber` | ✅ Correct | Customer label |

**Sample Data Expected**:
- Floor tables: 1-32 (simple numbers)
- Mezzanine tables: 201-207 (200-series)

**Risk Areas**:
- ⚠️ `ticketGenerator.ts` line 98: Falls back to `tableId` (internal ID) if `tableNumber` missing

## Reproduction Steps (for each bug)

**1. Email Delivery Failure**:
```bash
# Trigger booking confirmation
curl -X POST /api/create-booking-payment -d '{...}'
# Check logs for "Email service not initialized" message
```

**2. Table Label Inconsistency**:
```bash
# Generate ticket PDF with missing tableNumber
# Verify if internal tableId (e.g., 297) appears instead of human label
```

**3. Type Safety Issues**:
```bash
npm run check
# Shows 24 TypeScript diagnostics in server files
```

## Fix Plan (No changes applied)

**Time/Timezone**: ✅ No changes needed - properly implemented

**Emails**:
```typescript
// Centralized error handling in email-service.ts
static async initialize(): Promise<void> {
  try {
    // Add retry logic and better error reporting
    // Ensure sgMail.setApiKey() success before setting emailInitialized = true
  } catch (error) {
    // Log specific SendGrid API errors
    // Set up fallback notification system
  }
}
```

**Table/Seat Label Consistency**:
```typescript
// Fix ticketGenerator.ts line 98:
const tableNumber = booking.table?.tableNumber; // Remove || booking.tableId fallback
if (!tableNumber) {
  throw new Error(`Missing customer-facing table label for booking ${booking.id}`);
}

// Add validation in booking creation:
if (typeof tableNumber !== 'number' || tableNumber > 299 || tableNumber < 1) {
  console.warn(`Table number ${tableNumber} outside expected range`);
}
```

**TypeScript Errors**:
```typescript
// Fix BookingEmailData interface type mismatches
// Ensure booking.id is consistently number type
// Align createdAt handling between string/Date types
```

## QA Checklist

- [ ] Verify 5:45 PM arrival, 6:30 PM show times in all outputs
- [ ] Test booking confirmation email delivery end-to-end  
- [ ] Validate table labels (1-32 floor, 201-207 mezzanine) in tickets
- [ ] Confirm refund email triggers correctly via webhook
- [ ] Resolve all 24 TypeScript diagnostics
- [ ] Test payment flow with Treasury Stripe keys
- [ ] Verify webhook signature validation
- [ ] Check availability query performance optimization
- [ ] Validate QR code generation with booking IDs
- [ ] Test concurrent booking prevention

---

**Guardrails Confirmed**: ✅ This audit performed no file modifications, secret access, or configuration changes. Analysis based entirely on code examination and system observation.