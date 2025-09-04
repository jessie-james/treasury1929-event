import { getStripe } from "../server/stripe";

async function processEmergencyRefund() {
  console.log("PROCESSING EMERGENCY REFUND");
  console.log("============================");
  
  const stripe = getStripe();
  if (!stripe) {
    console.log("❌ Stripe not available");
    return;
  }
  
  const chargeId = "ch_3RsfBuEOOtiAoFkb1ZRCy2s1";
  const refundAmount = 4600; // $46 in cents
  const customer = "vivacedan@comcast.net";
  
  try {
    console.log(`Processing refund for customer: ${customer}`);
    console.log(`Refund amount: $${refundAmount / 100}`);
    console.log(`Charge ID: ${chargeId}`);
    
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount,
      reason: 'duplicate', // or 'requested_by_customer'
      metadata: {
        reason: 'Payment calculation error - overcharge',
        customer_email: customer,
        booking_id: '121',
        processed_by: 'admin_emergency_fix'
      }
    });
    
    console.log("✅ Refund processed successfully!");
    console.log(`Refund ID: ${refund.id}`);
    console.log(`Status: ${refund.status}`);
    console.log(`Amount: $${refund.amount / 100}`);
    
    // Update the booking record with refund information
    console.log("Updating booking record...");
    
  } catch (error) {
    console.error("❌ Refund failed:", error);
    
    if (error instanceof Error) {
      console.log("Error details:", error.message);
    }
    
    console.log("\n📞 MANUAL ACTION REQUIRED:");
    console.log("1. Log into Stripe Dashboard");
    console.log("2. Find charge: ch_3RsfBuEOOtiAoFkb1ZRCy2s1");
    console.log("3. Process $46 refund manually");
    console.log("4. Contact customer: vivacedan@comcast.net");
  }
}

processEmergencyRefund().catch(console.error);