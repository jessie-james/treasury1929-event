// Script to help find and recover missing Stripe bookings
// This will help identify the customer's session ID from recent Stripe activities

const checkRecentStripeActivity = async () => {
  try {
    // First, let's check recent bookings to see what's missing
    const response = await fetch('/api/admin/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const bookings = await response.json();
    console.log('Recent bookings in system:', bookings);
    
    return bookings;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
};

const recoverBookingBySessionId = async (sessionId) => {
  try {
    console.log(`Attempting to recover booking for session: ${sessionId}`);
    
    const response = await fetch('/api/admin/recover-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId })
    });
    
    const result = await response.json();
    console.log('Recovery result:', result);
    
    if (result.status === 'recovered') {
      console.log(`✅ SUCCESS: Booking #${result.bookingId} recovered`);
      console.log(`📧 Email sent: ${result.emailSent ? 'YES' : 'NO'}`);
    } else if (result.status === 'already_exists') {
      console.log(`ℹ️  Booking already exists: #${result.bookingId}`);
    } else {
      console.log(`❌ Recovery failed:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Recovery failed:', error);
    return { error: error.message };
  }
};

const syncAllAvailability = async () => {
  try {
    console.log('🔄 Syncing all event availability...');
    
    const response = await fetch('/api/admin/sync-all-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log('Availability sync result:', result);
    
    return result;
  } catch (error) {
    console.error('Sync failed:', error);
    return { error: error.message };
  }
};

// Export functions for use
window.checkRecentStripeActivity = checkRecentStripeActivity;
window.recoverBookingBySessionId = recoverBookingBySessionId;
window.syncAllAvailability = syncAllAvailability;

console.log('🔧 Missing booking recovery tools loaded!');
console.log('');
console.log('Available functions:');
console.log('- checkRecentStripeActivity() - See what bookings exist');
console.log('- recoverBookingBySessionId("cs_xxxxx") - Recover missing booking');
console.log('- syncAllAvailability() - Fix seat availability');
console.log('');
console.log('To find the session ID:');
console.log('1. Go to Stripe Dashboard > Payments');
console.log('2. Find the customer\'s payment');
console.log('3. Look for the checkout session ID (starts with cs_)');
console.log('4. Run: recoverBookingBySessionId("cs_xxxxxxxxxxxxx")');