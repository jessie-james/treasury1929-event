import { getStripe } from "../server/stripe";
import { db } from "../server/db";
import { bookings, events } from "../shared/schema";
import { eq } from "drizzle-orm";

async function investigatePaymentIssue() {
  console.log("🔍 Investigating payment discrepancy...");
  
  // Get the specific booking with the issue
  const problemBooking = await db.select()
    .from(bookings)
    .where(eq(bookings.stripe_payment_id, "pi_3RsfBuEOOtiAoFkb1uMPg8Yv"));
  
  if (problemBooking.length === 0) {
    console.log("❌ No booking found with that Stripe payment ID");
    return;
  }
  
  const booking = problemBooking[0];
  console.log("📋 Booking Details:");
  console.log(`   Booking ID: ${booking.id}`);
  console.log(`   Party Size: ${booking.party_size}`);
  console.log(`   Customer: ${booking.customer_email}`);
  console.log(`   Event ID: ${booking.event_id}`);
  console.log(`   Stripe Payment ID: ${booking.stripe_payment_id}`);
  
  // Get event pricing
  const event = await db.select()
    .from(events)
    .where(eq(events.id, booking.event_id));
  
  if (event.length > 0) {
    const eventData = event[0];
    console.log("\n💰 Event Pricing:");
    console.log(`   Base Price: $${eventData.base_price / 100} per person`);
    console.log(`   Expected Total: $${(eventData.base_price * booking.party_size) / 100}`);
  }
  
  // Check Stripe payment details
  try {
    const stripe = getStripe();
    if (stripe) {
      console.log("\n🔗 Checking Stripe Payment Details...");
      const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_id);
      
      console.log(`   Stripe Amount: $${paymentIntent.amount / 100}`);
      console.log(`   Stripe Currency: ${paymentIntent.currency}`);
      console.log(`   Stripe Status: ${paymentIntent.status}`);
      console.log(`   Created: ${new Date(paymentIntent.created * 1000).toISOString()}`);
      
      if (paymentIntent.metadata) {
        console.log("   Metadata:");
        Object.entries(paymentIntent.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
      
      // Calculate expected vs actual
      const expectedAmount = (event[0]?.base_price || 0) * booking.party_size;
      const actualAmount = paymentIntent.amount;
      const discrepancy = actualAmount - expectedAmount;
      
      console.log("\n⚠️  PAYMENT ANALYSIS:");
      console.log(`   Expected: $${expectedAmount / 100}`);
      console.log(`   Actual: $${actualAmount / 100}`);
      console.log(`   Discrepancy: $${discrepancy / 100}`);
      
      if (Math.abs(discrepancy) > 100) { // More than $1 difference
        console.log("🚨 CRITICAL: Significant payment discrepancy detected!");
        
        // Check for recent similar issues
        console.log("\n🔎 Checking for similar recent issues...");
        const recentBookings = await db.select()
          .from(bookings)
          .where(eq(bookings.event_id, booking.event_id));
        
        console.log(`   Found ${recentBookings.length} total bookings for this event`);
        
        // Check if this is a pattern
        let issueCount = 0;
        for (const recentBooking of recentBookings.slice(-10)) { // Check last 10
          if (recentBooking.stripe_payment_id && recentBooking.stripe_payment_id.startsWith('pi_')) {
            try {
              const recentPayment = await stripe.paymentIntents.retrieve(recentBooking.stripe_payment_id);
              const recentExpected = (event[0]?.base_price || 0) * recentBooking.party_size;
              const recentDiscrepancy = recentPayment.amount - recentExpected;
              
              if (Math.abs(recentDiscrepancy) > 100) {
                issueCount++;
                console.log(`   Issue found in booking ${recentBooking.id}: Expected $${recentExpected/100}, Got $${recentPayment.amount/100}`);
              }
            } catch (err) {
              console.log(`   Could not verify payment for booking ${recentBooking.id}`);
            }
          }
        }
        
        console.log(`\n📊 Summary: ${issueCount} out of last 10 bookings have payment issues`);
      }
      
    } else {
      console.log("❌ Stripe not available for verification");
    }
  } catch (error) {
    console.error("❌ Error checking Stripe payment:", error);
  }
}

investigatePaymentIssue().catch(console.error);