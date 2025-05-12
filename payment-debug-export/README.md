# Payment System Debug Package

This package contains key files related to the payment system for debugging purposes.

## Structure

- `client/`: Frontend components and pages related to payment processing
- `server/`: Backend routes and handlers for payment APIs
- Configuration files (vite.config.ts, tsconfig.json, package.json)

## Common Issues

1. Session persistence problems between pages
2. CORS issues with Stripe elements
3. Authentication failures during payment flow
4. Stripe API key configuration

## Debugging Steps

1. Check browser console for errors during payment processes
2. Verify Stripe public key is correctly loaded
3. Examine network requests during payment flow
4. Test standalone payment page without authentication

## Required Environment Variables

- `STRIPE_SECRET_KEY`: Stripe secret key (server-side)
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (client-side)
