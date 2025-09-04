// Send a test email using the existing booking system
const { spawn } = require('child_process');

console.log('Creating a test booking and sending confirmation email...\n');

// Use the existing test script that works
const testProcess = spawn('node', ['test-booking-with-email.cjs'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Test completed successfully!');
    console.log('📧 Check your email at jose@sahuaroworks.com');
  } else {
    console.log(`\n❌ Test failed with exit code ${code}`);
  }
});

testProcess.on('error', (err) => {
  console.error('Failed to run test:', err.message);
});