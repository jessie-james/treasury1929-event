# 🧪 Testing Mode Setup Instructions

Your booking application now has a comprehensive testing mode that allows you to safely test the entire booking cycle without affecting your live application or charging real payments.

## Quick Start

### Enable Testing Mode
```bash
node testing-mode.js enable
source .env.testing
npm run dev
```

### Disable Testing Mode (Return to Production)
```bash
node testing-mode.js disable
source .env.production  
npm run dev
```

### Check Current Status
```bash
node testing-mode.js status
```

## What Testing Mode Does

When testing mode is enabled, your application will:

✅ **Mock All Payments**
- No real charges will be made to credit cards
- Stripe payments are completely simulated
- Payment flows work exactly like production but safely

✅ **Suppress All Emails** 
- No emails will be sent to customers
- Email content is logged to console instead
- You can see what emails would have been sent

✅ **Isolate Test Data**
- Uses test database records with distinct IDs
- Test bookings won't interfere with real bookings
- Automatic cleanup when switching back to production

✅ **Disable Backups**
- Prevents test data from being backed up
- Keeps your backup system clean

✅ **Allow Protected Events**
- Bypass event protection for testing
- Test on any event without restrictions

## Testing the Complete Booking Cycle

1. **Enable Testing Mode**
   ```bash
   node testing-mode.js enable
   source .env.testing
   npm run dev
   ```

2. **Look for Test Event**
   - Navigate to your application
   - Look for "Test Dinner Concert - SAFE TO BOOK"
   - This event is specifically for testing

3. **Test Booking Flow**
   - Select seats/tables
   - Choose menu options
   - Enter test customer information
   - Use test credit card: `4242 4242 4242 4242`
   - Complete the "payment" (no real charge)

4. **Verify Results**
   - Check booking confirmation
   - Review console logs for "suppressed" emails
   - Test admin functions like refunds
   - All data is isolated and safe

5. **Return to Production**
   ```bash
   node testing-mode.js disable
   source .env.production
   npm run dev
   ```

## Environment Variables Reference

Testing mode uses these environment variables:

| Variable | Testing Value | Production Value | Purpose |
|----------|---------------|------------------|---------|
| `STRIPE_MOCK_MODE` | `true` | `false` | Mock payments |
| `EMAIL_SUPPRESS_OUTBOUND` | `true` | `false` | Suppress emails |
| `BACKUPS_ENABLED` | `false` | `true` | Control backups |
| `TESTING_MODE` | `true` | `false` | Overall test flag |
| `PROTECT_EVENT_IDS` | `*,*` | _(empty)_ | Bypass protections |

## Safety Features

🔒 **Multiple Safety Layers**
- Environment variable checks
- Automatic mock detection
- Console warnings when in test mode
- Isolated test data with unique IDs

🚨 **Clear Visual Indicators**
- Console shows "MOCK mode enabled"
- Test events are clearly labeled
- Suppressed emails are logged
- Status command shows current mode

⚡ **Easy Switching**
- One command to enable/disable
- Automatic environment file generation
- Status checking built-in
- No manual configuration needed

## Troubleshooting

### Issue: "Real payments are still being processed"
**Solution:** Check that `STRIPE_MOCK_MODE=true` is set:
```bash
echo $STRIPE_MOCK_MODE  # Should show "true"
node testing-mode.js status  # Check full status
```

### Issue: "Emails are still being sent"
**Solution:** Verify email suppression is enabled:
```bash
echo $EMAIL_SUPPRESS_OUTBOUND  # Should show "true"
```

### Issue: "Test data mixed with production data"
**Solution:** Test events use ID 999 and test tables use IDs 9999, 9998. These are automatically isolated.

### Issue: "Can't find test events"
**Solution:** Test events are created automatically when testing mode starts. Look for events with "TEST" in the name.

## Advanced Usage

### Custom Test Configuration
You can modify the test data in `server/test-mode-setup.ts`:
- Add more test events
- Create different table layouts
- Customize menu items
- Set specific pricing

### Manual Environment Setup
Instead of using the script, you can manually set environment variables:
```bash
export STRIPE_MOCK_MODE=true
export EMAIL_SUPPRESS_OUTBOUND=true  
export BACKUPS_ENABLED=false
export TESTING_MODE=true
export PROTECT_EVENT_IDS=*,*
npm run dev
```

## Best Practices

1. **Always use testing mode for development**
2. **Test the complete booking flow regularly**  
3. **Check console logs for suppressed emails**
4. **Use the status command to verify your mode**
5. **Switch back to production when deploying**

## Support

If you encounter issues with testing mode:

1. Check current status: `node testing-mode.js status`
2. Review console logs for error messages
3. Ensure all environment variables are properly set
4. Restart your application after changing modes

---

**⚠️ Important:** Always verify you're in the correct mode before making changes. Testing mode is for development and testing only.