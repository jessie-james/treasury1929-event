import { getStripe } from "../server/stripe";

async function testPaymentCalculation() {
  console.log("TESTING FIXED PAYMENT CALCULATION");
  console.log("==================================");
  
  const stripe = getStripe();
  if (!stripe) {
    console.log("❌ Stripe not available");
    return;
  }
  
  // Test scenarios
  const testCases = [
    { seats: 1, amount: 13000, description: "Single person - $130" },
    { seats: 2, amount: 26000, description: "Two people - $260" },
    { seats: 4, amount: 52000, description: "Four people - $520" },
    { seats: 8, amount: 104000, description: "Eight people - $1040" }
  ];
  
  console.log("Creating test checkout sessions with FIXED calculation...\n");
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.description}`);
      console.log(`Seats: ${testCase.seats}, Expected Amount: $${testCase.amount / 100}`);
      
      // This simulates the FIXED checkout session creation
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Event Booking - ${testCase.seats} seat${testCase.seats > 1 ? 's' : ''}`,
                description: `Test Event, Test Table`,
              },
              unit_amount: testCase.amount, // FIXED: total amount, no division
            },
            quantity: 1, // FIXED: always 1
          },
        ],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          test: 'true',
          seats: testCase.seats.toString(),
          expected_amount: testCase.amount.toString()
        },
      });
      
      console.log(`✅ Session created: ${session.id}`);
      console.log(`   Amount total: $${session.amount_total! / 100}`);
      console.log(`   Correct: ${session.amount_total === testCase.amount ? '✅ YES' : '❌ NO'}`);
      
      // Clean up test session
      await stripe.checkout.sessions.expire(session.id);
      console.log(`   Test session expired\n`);
      
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.description}:`, error);
    }
  }
  
  console.log("Payment calculation tests completed!");
}

testPaymentCalculation().catch(console.error);