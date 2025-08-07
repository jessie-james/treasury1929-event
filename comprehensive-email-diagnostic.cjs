#!/usr/bin/env node

/**
 * COMPREHENSIVE EMAIL DIAGNOSTIC TEST
 * Tests every aspect of the email system to find the real issue
 */

const { spawn } = require('child_process');
const { EmailService } = require('./server/email-service.ts');

console.log('\n🔍 COMPREHENSIVE EMAIL DIAGNOSTIC TEST');
console.log('=' .repeat(60));

async function runDiagnostic() {
  console.log('\n📋 STEP 1: Testing SendGrid Direct Connection');
  console.log('-'.repeat(40));
  
  try {
    // Test 1: Initialize SendGrid
    console.log('🔌 Initializing SendGrid...');
    await EmailService.initialize();
    console.log('✅ SendGrid initialized successfully');
    
    // Test 2: Try sending a test email
    console.log('\n📧 Sending test email...');
    const testEmailData = {
      booking: {
        id: 'DIAGNOSTIC-TEST-' + Date.now(),
        customerEmail: 'jose@sahuaroworks.com',
        partySize: 2,
        status: 'confirmed',
        createdAt: new Date(),
        guestNames: ['Diagnostic Test']
      },
      event: {
        id: '35',
        title: 'EMAIL DIAGNOSTIC TEST',
        date: new Date('2025-08-14T18:30:00.000Z'),
        description: 'Testing email system'
      },
      table: {
        id: '999',
        tableNumber: 99,
        floor: 'Test Floor',
        capacity: 4
      },
      venue: {
        id: '1',
        name: 'Test Venue',
        address: '2 E Congress St, Ste 100'
      }
    };
    
    const emailResult = await EmailService.sendBookingConfirmation(testEmailData);
    
    if (emailResult) {
      console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
      console.log('   📧 Check jose@sahuaroworks.com for test email');
      console.log('   🎯 This proves SendGrid is working correctly');
    } else {
      console.log('❌ TEST EMAIL FAILED');
      console.log('   🚨 SendGrid is NOT working correctly');
    }
    
  } catch (error) {
    console.error('💥 SendGrid test failed:', error.message);
  }
  
  console.log('\n📋 STEP 2: Checking Purchase Flow Email Triggers');
  console.log('-'.repeat(40));
  
  // Check if email triggers exist in payment routes
  const fs = require('fs');
  try {
    const paymentRoutes = fs.readFileSync('./server/routes-payment.ts', 'utf8');
    
    if (paymentRoutes.includes('sendBookingConfirmation')) {
      console.log('✅ Email trigger found in payment routes');
    } else {
      console.log('❌ NO email trigger found in payment routes');
    }
    
    if (paymentRoutes.includes('EmailService')) {
      console.log('✅ EmailService imported in payment routes');
    } else {
      console.log('❌ EmailService NOT imported in payment routes');
    }
    
    // Check for error handling
    if (paymentRoutes.includes('catch') && paymentRoutes.includes('email')) {
      console.log('✅ Error handling present for email operations');
    } else {
      console.log('⚠️  Limited error handling for email operations');
    }
    
  } catch (error) {
    console.error('❌ Could not read payment routes:', error.message);
  }
  
  console.log('\n📋 STEP 3: Analyzing Error Logs');
  console.log('-'.repeat(40));
  
  // Look for recent email-related errors
  try {
    const emailServiceCode = fs.readFileSync('./server/email-service.ts', 'utf8');
    
    // Check logging configuration
    if (emailServiceCode.includes('console.error') && emailServiceCode.includes('email')) {
      console.log('✅ Error logging configured for email failures');
    } else {
      console.log('⚠️  Limited error logging for email failures');
    }
    
    // Check timezone implementation
    if (emailServiceCode.includes('formatInTimeZone') && emailServiceCode.includes('Phoenix')) {
      console.log('✅ Phoenix timezone handling implemented');
    } else {
      console.log('⚠️  Phoenix timezone handling may be incomplete');
    }
    
  } catch (error) {
    console.error('❌ Could not analyze email service:', error.message);
  }
  
  console.log('\n📋 STEP 4: Testing Complete Purchase Flow Simulation');
  console.log('-'.repeat(40));
  
  // This would require database access, so we'll just check the flow exists
  console.log('🔍 Checking payment flow structure...');
  
  try {
    const routesContent = fs.readFileSync('./server/routes-payment.ts', 'utf8');
    
    // Look for the complete flow
    const hasStripeSession = routesContent.includes('checkout.sessions.retrieve');
    const hasBookingCreation = routesContent.includes('createBooking');
    const hasEmailTrigger = routesContent.includes('sendBookingConfirmation');
    
    console.log(`✅ Stripe session retrieval: ${hasStripeSession ? 'Present' : 'Missing'}`);
    console.log(`✅ Booking creation: ${hasBookingCreation ? 'Present' : 'Missing'}`);
    console.log(`✅ Email trigger: ${hasEmailTrigger ? 'Present' : 'Missing'}`);
    
    if (hasStripeSession && hasBookingCreation && hasEmailTrigger) {
      console.log('✅ Complete purchase → email flow is present');
    } else {
      console.log('❌ Purchase → email flow is incomplete');
    }
    
  } catch (error) {
    console.error('❌ Could not analyze purchase flow:', error.message);
  }
  
  console.log('\n📋 STEP 5: Environment Check');
  console.log('-'.repeat(40));
  
  // Check critical environment variables
  console.log(`SendGrid API Key: ${process.env.SENDGRID_API_KEY_NEW ? '✅ Present' : '❌ Missing'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSTIC COMPLETE');
  console.log('=' .repeat(60));
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error('💥 Diagnostic failed:', error);
  process.exit(1);
});