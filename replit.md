# Event Venue Booking Platform

## Overview

This is a sophisticated mobile-first event venue booking platform designed for live entertainment venues hosting candlelight concerts and similar intimate performances. The application facilitates table reservations, seat selection, payment processing, and comprehensive venue management through a dual-interface system serving both customers and administrators.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state management
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Payment Integration**: Stripe.js for client-side payment processing
- **Canvas Rendering**: Custom seat selection with HTML5 Canvas for venue layouts

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript
- **ORM**: Drizzle ORM with type-safe database operations
- **Authentication**: Passport.js with session-based auth using connect-pg-simple
- **Security**: Helmet.js, rate limiting, CORS configuration
- **File Handling**: Multer for image uploads
- **Real-time**: WebSocket integration for live updates

### Data Storage Solutions
- **Primary Database**: PostgreSQL (Neon serverless)
- **Session Store**: PostgreSQL-backed sessions
- **ORM**: Drizzle with schema-first approach
- **Connection Pooling**: Neon serverless with WebSocket support

## Key Components

### Customer-Facing Features
1. **Event Discovery System**
   - Mobile-optimized event listings with rich media
   - Event filtering and search capabilities
   - Comprehensive event details with artist information

2. **Table-Based Booking System**
   - Interactive venue maps with clickable table selection
   - Multi-venue support (up to 2 venues per event)
   - Real-time availability updates
   - Flexible seating for 1-8 guests per table
   - Pricing tiers based on table location

3. **Payment Processing**
   - Stripe Checkout integration with test keys
   - Support for all major payment methods
   - Server-side payment verification
   - Administrative refund capabilities

4. **Food & Beverage Integration**
   - Pre-event menu ordering
   - Allergen tracking and dietary restrictions
   - Guest-specific food selections
   - Dynamic pricing with event customization

### Administrative Features
1. **Back Office Dashboard**
   - Comprehensive event management
   - Multi-venue layout configuration
   - Table and seat arrangement tools
   - Booking oversight and customer service
   - Payment tracking and refund processing

2. **Venue Management**
   - Canvas-based layout editor
   - Table positioning and capacity management
   - Stage and venue element configuration
   - Multi-floor venue support

## Data Flow

### Booking Process
1. **Event Selection**: Customer browses events and selects desired performance
2. **Venue Selection**: For multi-venue events, customer chooses specific venue
3. **Table Selection**: Interactive canvas displays available tables
4. **Guest Information**: Customer provides party details and dietary preferences
5. **Food Ordering**: Pre-event menu selections with allergen filtering
6. **Payment Processing**: Stripe Checkout with server-side verification
7. **Confirmation**: Email notifications and booking confirmation

### Authentication Flow
- Session-based authentication with PostgreSQL session store
- Role-based access control (customer, admin, venue_owner, hostess)
- Custom error handling for unauthenticated requests (204 status)
- Protected routes with middleware validation

## External Dependencies

### Payment Processing
- **Stripe**: Payment processing with test keys configured
  - Publishable Key: `pk_test_51QtEaqFLCzPHjMo2FZhpLhZWmb3lJRUkPm3EiNhhPH1LMaZNGBCY2rHbxJTfXOGaUB4UBgrwzurmc2lJ24kp0eZq004vJK0fIk`
  - Checkout integration with metadata support
  - Payment intent creation and verification

### Email Services
- **SendGrid**: Email notifications for booking confirmations
- Template-based email system with dynamic content
- Administrative email alerts

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL with connection pooling
- WebSocket-based connections for real-time updates
- Automated backup and scaling

## Deployment Strategy

### Development Environment
- **Replit Configuration**: Node.js 20, PostgreSQL 16, web modules
- **Port Configuration**:
  - Main application: 5000 (external port 80)
  - Vite dev server: 3000
  - API server: 3001
  - Payment server: 3002
- **Build Process**: Vite build with Express.js bundle using esbuild

### Production Deployment
- **Target**: Google Cloud Run
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Environment**: Production Node.js with optimized builds

### Security Considerations
- Rate limiting on booking endpoints (50 requests per 5 minutes)
- CORS configuration for development and production
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention through Drizzle ORM

## Changelog
- June 24, 2025. Initial setup
- June 24, 2025. Critical bug fixes: authentication errors, table selection validation, payment success pages

## User Preferences

Preferred communication style: Simple, everyday language.