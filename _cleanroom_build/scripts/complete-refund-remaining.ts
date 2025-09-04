import { getStripe } from "../server/stripe";

async function completeRemainingRefund() {
  console.log("COMPLETING FULL REFUND - REMAINING AMOUNT");
  console.log("=========================================");
  
  const stripe = getStripe();
  if (!stripe) {
    console.log("❌ Stripe not available");
    return;
  }
  
  const chargeId = "ch_3RsfBuEOOtiAoFkb1ZRCy2s1";
  
  try {
    // Get the exact charge details
    const charge = await stripe.charges.retrieve(chargeId);
    
    console.log(`Charge Details:`);
    console.log(`  Original amount: $${charge.amount / 100}`);
    console.log(`  Amount refunded: $${charge.amount_refunded / 100}`);
    console.log(`  Remaining to refund: $${(charge.amount - charge.amount_refunded) / 100}`);
    
    const remainingAmount = charge.amount - charge.amount_refunded;
    
    if (remainingAmount <= 0) {
      console.log("✅ Charge is already fully refunded!");
      return;
    }
    
    console.log(`\nProcessing refund for remaining amount: $${remainingAmount / 100}`);
    
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: remainingAmount, // Exact remaining amount
      reason: 'requested_by_customer',
      metadata: {
        reason: 'Complete refund - final refund to make it 100%',
        customer_email: 'vivacedan@comcast.net',
        booking_id: '121',
        processed_by: 'admin_complete_refund'
      }
    });
    
    console.log("✅ Complete refund processed successfully!");
    console.log(`Refund ID: ${refund.id}`);
    console.log(`Status: ${refund.status}`);
    console.log(`Amount: $${refund.amount / 100}`);
    
    // Verify the charge is now fully refunded
    const updatedCharge = await stripe.charges.retrieve(chargeId);
    console.log(`\n✅ VERIFICATION:`);
    console.log(`  Total charged: $${updatedCharge.amount / 100}`);
    console.log(`  Total refunded: $${updatedCharge.amount_refunded / 100}`);
    console.log(`  Fully refunded: ${updatedCharge.amount === updatedCharge.amount_refunded ? 'YES' : 'NO'}`);
    
    return refund;
    
  } catch (error) {
    console.error("❌ Complete refund failed:", error);
    
    if (error instanceof Error) {
      console.log("Error details:", error.message);
    }
    return null;
  }
}

completeRemainingRefund().catch(console.error);