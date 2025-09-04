import { getStripe } from "../server/stripe";

async function emergencyRefundAnalysis() {
  console.log("EMERGENCY PAYMENT INVESTIGATION");
  console.log("===============================");
  
  const stripe = getStripe();
  if (!stripe) {
    console.log("❌ Stripe not available");
    return;
  }
  
  // The customer mentioned being charged hundreds - let's find the actual payment
  // Since the payment ID doesn't exist in test mode, it's likely in live mode
  console.log("🔍 Searching for recent charges around the time of booking...");
  
  try {
    // Look for charges around the booking time (2025-08-05 07:21:49)
    const startTime = Math.floor(new Date('2025-08-05T07:20:00Z').getTime() / 1000);
    const endTime = Math.floor(new Date('2025-08-05T07:25:00Z').getTime() / 1000);
    
    const charges = await stripe.charges.list({
      created: {
        gte: startTime,
        lte: endTime
      },
      limit: 10
    });
    
    console.log(`Found ${charges.data.length} charges in time window:`);
    
    charges.data.forEach((charge, index) => {
      console.log(`\nCharge ${index + 1}:`);
      console.log(`  ID: ${charge.id}`);
      console.log(`  Amount: $${charge.amount / 100}`);
      console.log(`  Currency: ${charge.currency}`);
      console.log(`  Status: ${charge.status}`);
      console.log(`  Customer: ${charge.customer || 'N/A'}`);
      console.log(`  Description: ${charge.description || 'N/A'}`);
      console.log(`  Payment Intent: ${charge.payment_intent || 'N/A'}`);
      console.log(`  Created: ${new Date(charge.created * 1000).toISOString()}`);
      
      if (charge.billing_details?.email) {
        console.log(`  Email: ${charge.billing_details.email}`);
      }
      
      // Check if this matches our problematic booking
      if (charge.billing_details?.email === 'vivacedan@comcast.net' || 
          charge.amount > 2000) { // More than $20
        console.log(`  🚨 POTENTIAL MATCH for customer issue!`);
        
        // This could be the overcharge
        if (charge.amount > 13000) { // More than expected $130
          console.log(`  ⚠️  OVERCHARGE DETECTED: Expected $130, Charged $${charge.amount / 100}`);
          console.log(`  💡 Refund amount needed: $${(charge.amount - 13000) / 100}`);
        }
      }
    });
    
    // Also check payment intents
    console.log("\n🔍 Checking payment intents...");
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: startTime,
        lte: endTime
      },
      limit: 10
    });
    
    console.log(`Found ${paymentIntents.data.length} payment intents in time window:`);
    
    paymentIntents.data.forEach((pi, index) => {
      console.log(`\nPayment Intent ${index + 1}:`);
      console.log(`  ID: ${pi.id}`);
      console.log(`  Amount: $${pi.amount / 100}`);
      console.log(`  Status: ${pi.status}`);
      console.log(`  Customer: ${pi.customer || 'N/A'}`);
      console.log(`  Created: ${new Date(pi.created * 1000).toISOString()}`);
      
      if (pi.amount > 13000) {
        console.log(`  🚨 OVERCHARGE DETECTED in Payment Intent!`);
        console.log(`  💰 Refund candidate: $${(pi.amount - 13000) / 100}`);
      }
    });
    
  } catch (error) {
    console.error("❌ Error searching Stripe:", error);
  }
  
  console.log("\n📋 RECOMMENDED ACTIONS:");
  console.log("1. Review charges above to identify the overcharge");
  console.log("2. Contact customer immediately with explanation");
  console.log("3. Process partial refund for amount over $130");
  console.log("4. Fix payment calculation bug in checkout session");
  console.log("5. Implement better logging for payment verification");
}

emergencyRefundAnalysis().catch(console.error);