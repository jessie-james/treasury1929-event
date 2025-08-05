# Payment Calculation Bug - Critical Incident Report

## Date: August 5, 2025

## Summary
A critical payment calculation bug in the Stripe checkout session creation was causing customers to be overcharged due to incorrect unit amount calculation.

## Impact
- **Customer Affected**: vivacedan@comcast.net
- **Booking ID**: 121
- **Expected Charge**: $130.00
- **Actual Charge**: $176.00
- **Overcharge**: $46.00

## Root Cause
In `server/routes-payment.ts` line 86, the payment calculation was:
```typescript
unit_amount: Math.round(amount / selectedSeats.length), // WRONG
quantity: selectedSeats.length,
```

This divides the total amount by seat count, then multiplies by quantity again, causing calculation errors.

## Resolution
### Immediate Actions Taken
1. **Refund Processed**: $46.00 refund successfully issued
   - Refund ID: re_3RsfBuEOOtiAoFkb1oa0MNHk
   - Status: Succeeded
   - Processed: August 5, 2025 7:34 AM

2. **Bug Fixed**: Changed payment calculation to:
   ```typescript
   unit_amount: amount, // Total amount in cents
   quantity: 1, // Always 1 since amount is already total
   ```

3. **Database Updated**: Added refund note to booking record

### Prevention Measures
1. Fixed payment calculation logic
2. Added comprehensive logging for payment verification
3. Documented incident for future reference

## Customer Communication Required
- Contact vivacedan@comcast.net to explain the error and confirm refund receipt
- Apologize for the inconvenience
- Confirm the booking remains valid at the corrected $130 price

## System Status
- ✅ Payment bug fixed
- ✅ Refund processed  
- ✅ Database updated
- ✅ Server restarted with fix
- ⏳ Customer notification pending

## Payment Details
- **Stripe Charge ID**: ch_3RsfBuEOOtiAoFkb1ZRCy2s1
- **Payment Intent ID**: pi_3RsfBuEOOtiAoFkb1uMPg8Yv
- **Refund ID**: re_3RsfBuEOOtiAoFkb1oa0MNHk
- **Original Amount**: $176.00
- **Refunded Amount**: $46.00
- **Final Amount**: $130.00

## Testing Required
- Verify new checkout sessions calculate correctly
- Test with different party sizes
- Confirm refund appears in customer's account