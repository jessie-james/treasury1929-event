# Bug Report for AI Coder Expert

## Executive Summary
This is a comprehensive bug analysis of a full-stack event booking application built with React/TypeScript frontend and Express/Node.js backend. The application has several critical issues that need immediate attention.

## Application Architecture
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack Query, Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript, Drizzle ORM, PostgreSQL (Neon), Stripe payments
- **Key Features**: Event booking, table/seat selection, payment processing, admin dashboard

## Critical Bugs Identified

### 1. **CRITICAL: Lucide React Import Error**
**Severity**: High - Blocking user interactions
**Error**: `SyntaxError: The requested module '/@fs/home/runner/workspace/node_modules/.vite/deps/lucide-react.js?v=7f24f98d' does not provide an export named 'Bottle'`

**Root Cause**: 
- Code is trying to import `Bottle` icon from `lucide-react` but this icon doesn't exist
- Found in `client/src/components/booking/WineSelection.tsx` (lines 140-160)
- The component uses `Wine` icon correctly but references `Bottle` somewhere

**Files Affected**:
- `client/src/components/booking/WineSelection.tsx`
- Potentially other components importing non-existent Lucide icons

**Impact**: Frontend crashes when WineSelection component loads

### 2. **CRITICAL: Unhandled Promise Rejections**
**Severity**: High - Application stability
**Error**: Multiple unhandled rejections in browser console (27 instances logged)

**Root Cause**:
- Authentication queries failing and creating unhandled promise rejections
- TanStack Query error handling not catching all async errors
- Network requests timing out or failing silently

**Files Affected**:
- `client/src/lib/queryClient.ts` (has some error handling but missing edge cases)
- `client/src/hooks/use-auth.tsx`
- API routes returning 401s without proper frontend handling

**Impact**: Console errors, potential memory leaks, degraded user experience

### 3. **CRITICAL: Authentication State Issues**
**Severity**: High - User experience
**Evidence**: Logs show repeated `/api/user` and `/api/events` requests failing

**Root Cause**:
- Auth queries returning 401 but frontend keeps retrying
- Session management not properly handling expired/invalid sessions
- Race conditions between auth check and protected route access

**Files Affected**:
- `client/src/hooks/use-auth.tsx`
- `client/src/lib/queryClient.ts`
- `server/auth.ts`
- `client/src/lib/protected-route.tsx`

### 4. **MAJOR: Stripe Integration Problems**
**Severity**: Medium-High - Payment functionality
**Evidence**: Multiple Stripe-related configuration files and debugging documents

**Root Cause**:
- Stripe CDN loading failures (documented in `STRIPE_INTEGRATION_ANALYSIS.md`)
- Frontend payment forms cannot initialize without Stripe.js
- Backend Stripe initialization has retry logic but frontend integration is unstable

**Files Affected**:
- `server/stripe.ts`
- `server/routes-payment.ts`
- Frontend payment components
- `client/src/components/booking/CheckoutForm.tsx`

### 5. **MAJOR: Database/Venue Layout Duplication**
**Severity**: Medium - Data integrity
**Evidence**: `VENUE_LAYOUT_DUPLICATION_PROBLEM.md` documents phantom layouts

**Root Cause**:
- Venue table layouts being duplicated during saves
- Phantom layouts with names like "s" appearing
- Foreign key constraint issues preventing proper cleanup

**Files Affected**:
- `server/storage.ts`
- `server/routes-venue.ts`
- `shared/schema.ts`
- Admin venue management components

### 6. **MINOR: Development Server Instability**
**Severity**: Low-Medium - Development experience
**Evidence**: Frequent Vite reconnection attempts in logs

**Root Cause**:
- HMR (Hot Module Replacement) disconnections
- Potentially related to authentication middleware interfering with Vite dev server

## Attempted Solutions Analysis

### What I've Observed:
1. **Error Handling**: The `queryClient.ts` has extensive error handling but still allows unhandled rejections
2. **Auth Flow**: Complex authentication setup with multiple retry mechanisms
3. **Stripe Setup**: Backend Stripe initialization is robust but frontend integration is problematic
4. **Database Issues**: Evidence of previous attempts to fix venue layout problems

### Current Workarounds in Place:
1. **Booking Routes**: Server has early route registration to bypass middleware (lines 18-50 in `server/index.ts`)
2. **Error Suppression**: Global unhandled rejection handler in `queryClient.ts` (lines 330-350)
3. **Stripe Fallback**: Backend has Stripe Checkout redirect as fallback when frontend fails
4. **Auth Resilience**: Query client configured to return null on auth failures

## Questions for AI Coder Expert

To effectively fix these issues, I need the following information:

### 1. Lucide React Icon Fix
- Should I replace the non-existent `Bottle` icon with `Wine` or another available icon?
- Do you want me to audit all Lucide imports across the codebase for similar issues?

### 2. Promise Rejection Handling
- Should I implement a global error boundary component to catch React errors?
- Do you prefer to fix the root cause of auth failures or improve error handling?
- Should TanStack Query errors be displayed to users or logged silently?

### 3. Authentication Architecture
- Do you want to implement a token-based auth system instead of session-based?
- Should protected routes redirect to login or show inline auth prompts?
- How should we handle auth state persistence across browser refreshes?

### 4. Stripe Integration Strategy
- Should I implement a pure server-side Stripe integration (Stripe Checkout only)?
- Do you want to keep trying to fix the frontend Stripe.js loading issues?
- Should we add Stripe webhook handling for payment confirmations?

### 5. Database Cleanup Approach
- Should I create a migration script to clean up duplicate venue layouts?
- Do you want to implement soft deletes for venue tables to prevent constraint issues?
- Should we add database transaction handling for venue saves?

### 6. Development Environment
- Should I investigate the Vite HMR disconnection issues?
- Do you want me to separate the API server from the Vite dev server?

## Prioritization Recommendation

**Immediate (Fix First)**:
1. Lucide React import error - blocking user interactions
2. Unhandled promise rejections - application stability

**High Priority**:
3. Authentication state management - user experience
4. Stripe integration - payment functionality

**Medium Priority**:
5. Database duplication issues - data integrity
6. Development server stability - developer experience

## Additional Context

The application appears to be a production-ready event booking system with sophisticated features. The bugs are primarily related to frontend stability and integration points rather than core business logic. The backend infrastructure is solid, and most issues seem to stem from frontend-backend communication and third-party service integration.

Please let me know which issues you'd like me to tackle first and your preferred approach for each problem area.