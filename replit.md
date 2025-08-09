# Event Venue Booking Platform

## Overview
This project is a mobile-first event venue booking platform for live entertainment venues, specifically designed for intimate performances like candlelight concerts. It enables customers to discover events, book tables with seat selection, and process payments. For administrators, it provides tools to manage venues, events, and bookings. The platform aims to streamline event organization and enhance the user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (August 9, 2025)
- **PDF Ticket Generation Fixed**: Complete resolution of booking information display issues
  - Fixed table number display (now shows correct Table 8 instead of wrong table numbers)
  - Added proper event timing ("Doors: 5:45 PM • Concert: 6:30 PM") 
  - Implemented complete food selections display with guest-specific choices
  - Resolved TypeScript errors preventing My Tickets tab from loading
- **Customer Dashboard Enhanced**: Updated booking data retrieval to always fetch fresh data
- **Authentication System Fixed**: Resolved critical session deserialization issue that was preventing user logins
- **Session Management**: Fixed PostgreSQL session store configuration and passport middleware ordering

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI**: Tailwind CSS with shadcn/ui components
- **Payment Integration**: Stripe.js
- **Custom UI**: HTML5 Canvas for interactive seat selection and venue layouts.
- **UI/UX Decisions**: Mobile-first design with enhanced accessibility features (enlarged text/buttons, optimized spacing). Desktop experience includes zoom controls for venue layouts.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Security**: Helmet.js, rate limiting, CORS configuration
- **File Handling**: Multer for image uploads
- **Real-time**: WebSocket integration for live updates.
- **Feature Specifications**:
    - **Customer-Facing**: Event discovery, table-based booking with real-time availability, flexible seating (1-8 guests), payment processing via Stripe, pre-event food & beverage ordering with dietary tracking and wine selection. Supports both table-based and ticket-only events with dual pricing.
    - **Administrative**: Back office dashboard for event and venue management, Canvas-based layout editor, booking oversight, payment tracking, and refund processing. Includes a robust seat hold system with 20-minute timers and database-level locks for concurrent booking safety.
    - **Security**: QR code validation for check-ins with event ID, date, and booking status validation. Comprehensive error handling for security violations.

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless)
- **Session Store**: PostgreSQL-backed sessions
- **ORM**: Drizzle

## External Dependencies

- **Payment Processing**: Stripe
- **Email Services**: SendGrid
- **Database Services**: Neon PostgreSQL