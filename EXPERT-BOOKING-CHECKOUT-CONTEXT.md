# Event Booking System - Critical Issue Analysis

## PROJECT OVERVIEW
A sophisticated mobile-first event venue booking platform with React frontend, Node.js backend, PostgreSQL database, and Stripe payment integration. The system allows venue administrators to manage multiple venues per event and customers to book tables with seat selection.

## CRITICAL ISSUES
1. **Venue Layout Rendering Problem**: When booking Event 13, multiple venue layouts (Mezzanine + Main Floor) are being rendered on top of each other instead of showing only the selected venue
2. **Table Data Contamination**: API returns 83 tables for Mezzanine venue instead of the correct 13 tables
3. **Checkout Process**: Stripe integration needs verification with test keys

## KEY TECHNICAL DETAILS

### Database Structure
- Event 13 has 2 venues assigned: Mezzanine (venue_id: 3, 13 tables) and Main Floor (venue_id: 4, 70 tables)
- Each event can have multiple venues through event_venues table
- Tables are properly separated by venue_id in database

### Current Behavior
- Venue selection dropdown works correctly
- API endpoint `/api/events/13/venue-layouts` returns both venues
- First venue (Mezzanine) incorrectly contains tables from both venues (83 total instead of 13)
- Canvas renderer draws all tables simultaneously causing visual overlap

### Expected Behavior
- Show only selected venue's tables (13 for Mezzanine, 70 for Main Floor)
- Clean venue switching without overlapping layouts
- Proper Stripe checkout flow with test keys

## STRIPE CONFIGURATION
- Using test keys for development
- Key prefix: pk_test_51Qt... and sk_test_...
- Environment: development with live testing capability

## STACK
- Frontend: React + TypeScript, Wouter routing, TanStack Query
- Backend: Express.js, Drizzle ORM, PostgreSQL
- Payment: Stripe integration
- Real-time: WebSocket updates
- Email: SendGrid notifications

## FILES INCLUDED
All core booking and checkout files are provided below for analysis and debugging.