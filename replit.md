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
- **Email Services**: SendGrid (for booking confirmations and administrative alerts)
- **Database Services**: Neon PostgreSQL (serverless PostgreSQL with connection pooling)