// Recovery script for missing booking
// Run this in the browser console or as a Node.js script

const recoverBooking = async (sessionId) => {
  try {
    const response = await fetch('/api/admin/recover-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId })
    });
    
    const result = await response.json();
    console.log('Recovery result:', result);
    return result;
  } catch (error) {
    console.error('Recovery failed:', error);
    return { error: error.message };
  }
};

// Example usage:
// recoverBooking('cs_test_xxxxxxxxxxxxxxxxxxxxx');

console.log('Recovery function loaded. Call recoverBooking("your_session_id") to recover a missing booking.');