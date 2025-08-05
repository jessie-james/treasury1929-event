# Emergency Recovery Plan for Missing Booking

## The Critical Issue
A customer was charged via Stripe but no booking record was created, no seats were marked unavailable, no food orders were recorded, and no confirmation email was sent.

## Root Cause
- Stripe webhook was only processing `payment_intent.succeeded` events
- Missing handler for `checkout.session.completed` events which contain booking metadata
- No availability sync triggered after successful payments
- Booking creation and email systems were bypassed entirely

## Immediate Actions Required

### 1. Fix System-Wide Availability (Run This First)
```bash
# Sync all event availability to correct seat counts
curl -X POST http://localhost:5000/api/admin/sync-all-availability
```

### 2. Recover the Missing Booking
To recover the specific customer's booking:

1. **Find the Stripe Session ID**:
   - Go to Stripe Dashboard > Payments
   - Find the customer's charge
   - Look for the associated checkout session ID (starts with `cs_`)

2. **Recover the Booking**:
```bash
# Replace 'cs_xxxxx' with the actual session ID
curl -X POST http://localhost:5000/api/admin/recover-booking \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cs_xxxxxxxxxxxxxxxxxxxxx"}'
```

This will:
- Create the missing booking record
- Send the confirmation email with QR code
- Update seat availability
- Record all food/wine selections
- Mark the table as booked

### 3. Verify the Fix
```bash
# Check updated availability for the event
curl http://localhost:5000/api/events/35/availability
```

## What Was Fixed

### Enhanced Webhook Handler
- Now processes `checkout.session.completed` events
- Automatically creates booking records from metadata
- Triggers availability sync after each booking
- Sends confirmation emails with QR codes
- Records all food and wine selections

### Availability Sync Integration
- All booking creation now triggers automatic availability sync
- Real-time seat counts updated immediately
- Table status correctly reflects bookings
- Food orders properly recorded

### Recovery Tools
- Manual booking recovery endpoint for missing bookings
- System-wide availability sync for correction
- Comprehensive error handling and logging

## Prevention
The webhook enhancement ensures this issue cannot happen again. Every successful Stripe payment now automatically:
1. Creates the booking record
2. Updates seat availability
3. Records food/wine orders
4. Sends confirmation email
5. Marks tables as booked

## Testing
After recovery, test the system with a small booking to verify everything works end-to-end.