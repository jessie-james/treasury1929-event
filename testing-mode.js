#!/usr/bin/env node
/**
 * Testing Mode Configuration Script
 * 
 * This script helps you easily switch between testing and production modes
 * for your booking application without affecting live data or payments.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.env.testing';

// Testing mode environment variables
const TESTING_ENV_VARS = {
  NODE_ENV: 'development',
  STRIPE_MOCK_MODE: 'true',
  EMAIL_SUPPRESS_OUTBOUND: 'true',
  BACKUPS_ENABLED: 'false',
  PROTECT_EVENT_IDS: '*,*',
  // Database isolation - uses test schema prefix
  DB_SCHEMA_PREFIX: 'test_',
  // Additional safety measures
  TESTING_MODE: 'true'
};

// Production mode environment variables (restore defaults)
const PRODUCTION_ENV_VARS = {
  NODE_ENV: 'production',
  STRIPE_MOCK_MODE: 'false',
  EMAIL_SUPPRESS_OUTBOUND: 'false',
  BACKUPS_ENABLED: 'true',
  PROTECT_EVENT_IDS: '',
  DB_SCHEMA_PREFIX: '',
  TESTING_MODE: 'false'
};

function enableTestingMode() {
  console.log('🧪 Enabling Testing Mode...');
  console.log('');
  console.log('This will:');
  console.log('  ✓ Mock all Stripe payments (no real charges)');
  console.log('  ✓ Suppress all outbound emails');
  console.log('  ✓ Disable automatic backups');
  console.log('  ✓ Allow testing on protected events');
  console.log('  ✓ Use isolated test database schema');
  console.log('');

  // Write testing environment variables to file
  const envContent = Object.entries(TESTING_ENV_VARS)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(CONFIG_FILE, `# Testing Mode Configuration\n# Generated on ${new Date().toISOString()}\n\n${envContent}\n`);

  console.log('✅ Testing mode configuration saved to:', CONFIG_FILE);
  console.log('');
  console.log('📝 To apply these settings:');
  console.log('   1. Stop your application');
  console.log('   2. Load the testing environment: source .env.testing');
  console.log('   3. Restart your application: npm run dev');
  console.log('');
  console.log('🔍 You can now test the entire booking cycle safely:');
  console.log('   • Make test bookings with mock payments');
  console.log('   • Test email flows (emails will be logged, not sent)');
  console.log('   • Test admin functions without affecting live data');
  console.log('');
}

function disableTestingMode() {
  console.log('🏭 Disabling Testing Mode (Restoring Production Settings)...');
  console.log('');
  console.log('This will:');
  console.log('  ✓ Enable real Stripe payments');
  console.log('  ✓ Enable outbound email sending');
  console.log('  ✓ Enable automatic backups');
  console.log('  ✓ Restore event protection');
  console.log('  ✓ Use production database schema');
  console.log('');

  // Write production environment variables to file
  const envContent = Object.entries(PRODUCTION_ENV_VARS)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync('.env.production', `# Production Mode Configuration\n# Generated on ${new Date().toISOString()}\n\n${envContent}\n`);

  // Remove testing config file
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }

  console.log('✅ Production mode configuration saved to: .env.production');
  console.log('✅ Testing mode configuration removed');
  console.log('');
  console.log('📝 To apply these settings:');
  console.log('   1. Stop your application');
  console.log('   2. Load the production environment: source .env.production');
  console.log('   3. Restart your application: npm run dev');
  console.log('');
  console.log('⚠️  WARNING: You are now in PRODUCTION mode');
  console.log('   • Real payments will be processed');
  console.log('   • Real emails will be sent to customers');
  console.log('   • Changes affect live data');
  console.log('');
}

function showStatus() {
  console.log('📊 Current Configuration Status:');
  console.log('');
  
  const envVars = [
    'NODE_ENV',
    'STRIPE_MOCK_MODE', 
    'EMAIL_SUPPRESS_OUTBOUND',
    'BACKUPS_ENABLED',
    'TESTING_MODE'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName] || 'not set';
    const isTestValue = TESTING_ENV_VARS[varName] === value;
    const icon = isTestValue ? '🧪' : '🏭';
    console.log(`  ${icon} ${varName}: ${value}`);
  });

  console.log('');
  
  const hasTestingFile = fs.existsSync(CONFIG_FILE);
  const hasProductionFile = fs.existsSync('.env.production');
  
  if (hasTestingFile) {
    console.log('📄 Testing configuration file exists: .env.testing');
  }
  if (hasProductionFile) {
    console.log('📄 Production configuration file exists: .env.production');
  }
  
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'enable':
  case 'on':
  case 'test':
    enableTestingMode();
    break;
    
  case 'disable':
  case 'off':
  case 'prod':
  case 'production':
    disableTestingMode();
    break;
    
  case 'status':
  case 'check':
    showStatus();
    break;
    
  default:
    console.log('🧪 Testing Mode Configuration');
    console.log('');
    console.log('Usage:');
    console.log('  node testing-mode.js enable    # Enable testing mode (safe for testing)');
    console.log('  node testing-mode.js disable   # Disable testing mode (production mode)');
    console.log('  node testing-mode.js status    # Show current configuration status');
    console.log('');
    console.log('Aliases:');
    console.log('  enable:  on, test');
    console.log('  disable: off, prod, production');
    console.log('  status:  check');
    console.log('');
    break;
}