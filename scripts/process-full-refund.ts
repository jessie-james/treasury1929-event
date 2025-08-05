import { getStripe } from "../server/stripe";

async function processFullRefund() {
  console.log("PROCESSING FULL REFUND");
  console.log("======================");
  
  const stripe = getStripe();
  if (!stripe) {
    console.log("❌ Stripe not available");
    return;
  }
  
  const chargeId = "ch_3RsfBuEOOtiAoFkb1ZRCy2s1";
  const remainingAmount = 13000; // $130 remaining to refund (total was $176, already refunded $46)
  const customer = "vivacedan@comcast.net";
  
  try {
    console.log(`Processing FULL remaining refund for customer: ${customer}`);
    console.log(`Additional refund amount: $${remainingAmount / 100}`);
    console.log(`Total refunded will be: $176 (full amount)`);
    console.log(`Charge ID: ${chargeId}`);
    
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: remainingAmount,
      reason: 'requested_by_customer',
      metadata: {
        reason: 'Full refund requested - completing refund process',
        customer_email: customer,
        booking_id: '121',
        processed_by: 'admin_full_refund',
        previous_refund: 're_3RsfBuEOOtiAoFkb1oa0MNHk'
      }
    });
    
    console.log("✅ Full refund processed successfully!");
    console.log(`Refund ID: ${refund.id}`);
    console.log(`Status: ${refund.status}`);
    console.log(`Amount: $${refund.amount / 100}`);
    console.log(`Total refunded: $176.00 (complete refund)`);
    
    return refund;
    
  } catch (error) {
    console.error("❌ Full refund failed:", error);
    
    if (error instanceof Error) {
      console.log("Error details:", error.message);
    }
    
    console.log("\n📞 MANUAL ACTION REQUIRED:");
    console.log("1. Log into Stripe Dashboard");
    console.log("2. Find charge: ch_3RsfBuEOOtiAoFkb1ZRCy2s1");
    console.log("3. Process remaining $130 refund manually");
    console.log("4. Contact customer: vivacedan@comcast.net");
    return null;
  }
}

processFullRefund().catch(console.error);