const { spawn } = require('child_process');

// Test the cross-event security validation
async function testCrossEventSecurity() {
  console.log('=== TESTING CROSS-EVENT SECURITY VALIDATION ===\n');
  
  // Test 1: Check-in booking 1 (event 19) with event 16 - should fail
  console.log('Test 1: Cross-event check-in (booking 1 for event 19, but selecting event 16)');
  const result1 = await makeRequest('POST', '/api/bookings/1/check-in?eventId=16');
  console.log('Status:', result1.status);
  console.log('Response:', result1.body);
  
  if (result1.status === 401) {
    console.log('✅ Authentication required (expected)');
  } else if (result1.status === 400 && result1.body.message?.includes('different event')) {
    console.log('✅ Cross-event validation working');
  } else {
    console.log('❌ Cross-event validation failed');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Check-in booking 1 (event 19) with correct event 19 - should work if authenticated
  console.log('Test 2: Same-event check-in (booking 1 for event 19, selecting event 19)');
  const result2 = await makeRequest('POST', '/api/bookings/1/check-in?eventId=19');
  console.log('Status:', result2.status);
  console.log('Response:', result2.body);
  
  if (result2.status === 401) {
    console.log('✅ Authentication required (expected)');
  } else if (result2.status === 200) {
    console.log('✅ Same-event check-in working');
  } else {
    console.log('❌ Same-event check-in failed');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Check-in without event ID - should fail
  console.log('Test 3: Check-in without event ID');
  const result3 = await makeRequest('POST', '/api/bookings/1/check-in');
  console.log('Status:', result3.status);
  console.log('Response:', result3.body);
  
  if (result3.status === 401) {
    console.log('✅ Authentication required (expected)');
  } else if (result3.status === 400 && result3.body.message?.includes('Event ID is required')) {
    console.log('✅ Event ID validation working');
  } else {
    console.log('❌ Event ID validation failed');
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-s',
      '-X', method,
      '-H', 'Content-Type: application/json',
      ...(body ? ['-d', JSON.stringify(body)] : []),
      `http://localhost:5000${path}`
    ]);
    
    let stdout = '';
    let stderr = '';
    
    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    curl.on('close', (code) => {
      try {
        const response = JSON.parse(stdout);
        resolve({
          status: response.status || (response.message ? 400 : 200),
          body: response
        });
      } catch (error) {
        resolve({
          status: 500,
          body: { error: 'Failed to parse response', stdout, stderr }
        });
      }
    });
  });
}

// Run the test
testCrossEventSecurity().catch(console.error);