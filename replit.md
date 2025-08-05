# Event Venue Booking Platform

## Overview
This project is a mobile-first event venue booking platform specifically designed for live entertainment venues hosting intimate performances like candlelight concerts. It offers a comprehensive solution for customers to discover events, book tables with seat selection, process payments, and for administrators to manage venues, events, and bookings. The platform aims to provide a seamless experience for both users and venue operators, enhancing the efficiency and reach of event organization.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI**: Tailwind CSS with shadcn/ui components
- **Payment Integration**: Stripe.js
- **Custom UI**: HTML5 Canvas for interactive seat selection and venue layouts.
- **UI/UX Decisions**: Mobile-first design with enhanced accessibility features for elderly users, including enlarged text, buttons, and optimized spacing for small screens. Desktop experience includes zoom controls for venue layouts.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Security**: Helmet.js, rate limiting, CORS configuration
- **File Handling**: Multer for image uploads
- **Real-time**: WebSocket integration for live updates.
- **Feature Specifications**:
    - **Customer-Facing**: Event discovery, table-based booking with real-time availability, flexible seating (1-8 guests), payment processing via Stripe, pre-event food & beverage ordering with dietary tracking, and integrated wine selection. Support for both table-based and ticket-only events with dual pricing.
    - **Administrative**: Back office dashboard for event and venue management, Canvas-based layout editor, booking oversight, payment tracking, and refund processing. Includes a robust seat hold system with 20-minute timers and database-level locks for concurrent booking safety.
    - **Security**: QR code validation for check-ins with event ID, date, and booking status validation. Comprehensive error handling for security violations.

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless)
- **Session Store**: PostgreSQL-backed sessions
- **ORM**: Drizzle

## External Dependencies

- **Payment Processing**: Stripe (for payment processing, with live keys configured)
- **Email Services**: SendGrid (for booking confirmations and administrative alerts, configured with "The Treasury 1929" branding)
- **Database Services**: Neon PostgreSQL (serverless PostgreSQL with connection pooling)

## Recent Updates (August 2025)

### CRITICAL Double-Booking Vulnerability RESOLVED (August 5, 2025)

#### MAJOR SECURITY ISSUE: Frontend Override Bypassing Real-Time Status (RESOLVED)
- **CRITICAL DISCOVERY**: Frontend was completely overriding backend's real-time booking status calculation
- **Root Cause**: Two-part system failure:
  1. **Backend**: Venue-layouts route hardcoded `status: 'available'` for all tables at line 4225
  2. **Frontend**: IframeSeatSelection component overrode all backend status with local logic at line 419
- **Security Impact**: 
  - Tables showed as "available" (green) even when already booked
  - Multiple customers could book the same table simultaneously
  - Real-time booking status completely bypassed
  - Tables 11 and 16 confirmed affected (showed green when booked)
- **Complete Resolution**:
  - **Backend Fix**: Replaced hardcoded status with `storage.getTablesByVenue(venueId, eventId)` real-time calculation
  - **Frontend Fix**: Removed status override, now respects backend's `table.status === 'booked'` data
  - **Verification**: Tables 11 and 16 now correctly show as red (unclickable) when booked
  - **Production Ready**: Double-booking prevention now fully operational

#### Previous Payment and Booking Flow Bug Resolution (August 5, 2025)

#### MAJOR ISSUE: Complete Booking System Bypass After Payment (RESOLVED)
- **CRITICAL DISCOVERY**: Customers charged via Stripe but entire booking system bypassed
- **Full Impact**: 
  - No booking records created in database
  - No confirmation emails sent to customers
  - No seat availability updates (tables still show available)
  - No food/wine orders recorded from payment metadata  
  - No table status changes (remained bookable)
- **Root Cause**: Stripe webhook only handling `payment_intent.succeeded` events, missing `checkout.session.completed` events containing booking metadata
- **Complete Resolution**:
  - Enhanced webhook to process `checkout.session.completed` events with full booking creation
  - Integrated automatic availability sync after every booking creation
  - Added email confirmation with QR codes to webhook flow
  - Created recovery endpoint `/api/admin/recover-booking` for missing bookings
  - Added system-wide availability sync endpoint `/api/admin/sync-all-availability`
  - Fixed all field mapping errors and data flow integration
  - All booking endpoints now trigger availability updates automatically

#### Previous Payment Calculation Bug (August 5, 2025) 
- **RESOLVED**: Payment calculation bug causing customer overcharges
- **Customer Impact**: vivacedan@comcast.net was overcharged $46 ($176 charged instead of $130 expected)
- **Resolution**: Fixed payment calculation to use total amount with quantity=1
- **Payment Details**: Stripe Charge ch_3RsfBuEOOtiAoFkb1ZRCy2s1, Refund ID: re_3RsfBuEOOtiAoFkb1oa0MNHk

### Critical Booking Integrity Fix (August 5, 2025)
- **RESOLVED: Double Booking Prevention**: Fixed table status synchronization to prevent multiple customers from booking the same table
- **RESOLVED: Seat Hold Timer Integration**: Tables now properly show as "hold" (orange) during 20-minute booking timer, preventing conflicts
- **RESOLVED: Real-time Status Calculation**: Venue layout now calculates table status based on both confirmed bookings AND active seat holds
- **Enhanced Canvas Rendering**: Updated frontend to display 'booked' tables as red and 'hold' tables as orange for clear visual distinction
- **Database Sync Implementation**: Added real-time status calculation that checks confirmed bookings and active seat holds with expiry validation

### Complete End-to-End Testing (August 5, 2025)
- Completed comprehensive test of the entire booking system from account creation to email confirmation
- **Test Account**: Created jose@sahuaroworks.com with customer role and profile data
- **Booking Test**: Successfully created booking ID #16 with randomized test data:
  - Table #11 (4-seat capacity, Main Floor) for party of 3 guests
  - Randomized guest names: Jose Santos, Maria Rodriguez, Carlos Thompson
  - Complete food selections for each guest across salads, entrees, and desserts
  - Wine selections: Sterling Cabernet and Twenty Acres Chardonnay
  - Database booking creation with proper foreign key relationships
- **Email Confirmation**: Successfully sent booking confirmation email with:
  - QR code attachment for check-in (using SendGrid inline content)
  - Complete digital ticket with event details, timing, and guest information
  - Meal and wine selections display
  - Professional Treasury 1929 branding and contact information
- **System Validation**: All components tested and operational including authentication, database operations, payment processing structure, and email delivery

### Menu and Food Service Enhancements
- Updated all food item descriptions to start with capital letters for professional presentation
- Added "berries on side" to all dessert descriptions (Creme Brulee, Chocolate Molten Cake, Tiramisu)
- Comprehensive allergen information maintained for all menu items (dairy, gluten, eggs)
- Professional food presentation standards implemented

### Email Communication System
- Updated SendGrid sender configuration from "info" to "The Treasury 1929" for professional branding
- Implemented complete email template suite matching The Treasury 1929 brand standards:
  - **Booking Confirmation**: Full digital ticket with actual QR code image and event details
  - **Cancellation/Refund**: Customer-initiated cancellation with refund processing details
  - **Venue Cancellation**: Treasury-initiated event cancellation with full refund notifications
  - **Event Reminders**: Full digital ticket with actual QR code image and day-before notifications
  - **Password Reset/Welcome**: Functional password reset system with secure token validation
- **QR Code Standardization**: QR codes now use consistent format (`BOOKING:${booking.id}:${event.id}:${booking.customerEmail}`) matching PDF ticket component throughout all emails and app interfaces
- **QR Code Enhancement**: QR codes sent as email attachments using SendGrid's inline content feature (cid:) for maximum email client compatibility, eliminating data URL blocking issues
- **Time Format Standardization**: Corrected time display to show "Guest Arrival 5:45 PM, show starts 6:30 PM" format (arrival time calculated as 45 minutes before show time)
- **Email Template Cleanup**: Removed PDF download buttons from all email templates while preserving download functionality in the app interface
- **Email Client Compatibility**: Resolved QR code display issues by using attachment-based approach instead of data URLs
- **Password Reset URL Fix**: Corrected password reset email links to use proper public deployment URL (https://venue-master-remix.replit.app/) instead of internal development URLs
- All email templates include consistent contact information (📍 2 E Congress St, Ste 100, 📞 (520) 734-3937)
- Website references corrected to www.thetreasury1929.com/dinnerconcerts for the official dinner concert app domain
- Password reset functionality fully implemented with secure token generation and validation routes