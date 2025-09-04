#!/usr/bin/env node
/**
 * STRESS TEST: 100+ Concurrent User Booking Simulation
 * Tests the seat holds system, database locks, and booking safety
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';
const TEST_EVENT_ID = 15; // Use existing event with available seats
const NUM_CONCURRENT_USERS = 100;
const BOOKING_TIMEOUT = 30000; // 30 seconds timeout

class ConcurrentBookingTester {
  constructor() {
    this.results = {
      totalAttempts: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      timeouts: 0,
      seatConflicts: 0,
      startTime: 0,
      endTime: 0,
      responses: [],
      errors: []
    };
  }

  async makeRequest(method, path, data = null, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StressTest/1.0'
        },
        timeout
      };

      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({
              statusCode: res.statusCode,
              data: parsed,
              headers: res.headers,
              responseTime: performance.now()
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              data: responseData,
              headers: res.headers,
              responseTime: performance.now()
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async simulateUserBooking(userId, seatNumber) {
    const userAgent = `StressTest-User-${userId}`;
    const startTime = performance.now();
    
    try {
      // Step 1: Create seat hold (this should have concurrency protection)
      const holdResponse = await this.makeRequest('POST', '/api/seat-holds', {
        eventId: TEST_EVENT_ID,
        tableId: Math.floor((seatNumber - 1) / 4) + 1, // Assume 4 seats per table
        seatNumbers: [seatNumber],
        sessionId: userAgent
      });

      if (holdResponse.statusCode !== 200) {
        return {
          userId,
          seatNumber,
          status: 'failed',
          step: 'hold',
          error: `Hold failed: ${holdResponse.statusCode}`,
          duration: performance.now() - startTime
        };
      }

      const holdToken = holdResponse.data.lockToken;
      
      // Step 2: Submit booking (this should validate the hold)
      const bookingData = {
        eventId: TEST_EVENT_ID,
        selectedSeats: [seatNumber],
        guestInfo: {
          name: `Test User ${userId}`,
          email: `testuser${userId}@example.com`,
          phone: `555-${String(userId).padStart(4, '0')}`
        },
        foodSelections: {
          [seatNumber]: {
            name: `Test User ${userId}`,
            salad: 1,
            entree: 4,
            dessert: 9
          }
        },
        wineSelections: [],
        holdToken: holdToken
      };

      const bookingResponse = await this.makeRequest('POST', '/api/bookings', bookingData);

      const endTime = performance.now();
      
      return {
        userId,
        seatNumber,
        status: bookingResponse.statusCode === 200 ? 'success' : 'failed',
        step: 'booking',
        bookingId: bookingResponse.data?.bookingId,
        error: bookingResponse.statusCode !== 200 ? `Booking failed: ${bookingResponse.statusCode}` : null,
        duration: endTime - startTime,
        holdToken
      };

    } catch (error) {
      return {
        userId,
        seatNumber,
        status: 'error',
        step: 'exception',
        error: error.message,
        duration: performance.now() - startTime
      };
    }
  }

  async runConcurrentTest() {
    console.log(`🚀 Starting stress test with ${NUM_CONCURRENT_USERS} concurrent users`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Event ID: ${TEST_EVENT_ID}`);
    console.log(`Timeout: ${BOOKING_TIMEOUT}ms`);
    console.log('─'.repeat(60));

    this.results.startTime = performance.now();
    
    // Generate seat assignments (some will conflict intentionally)
    const seatAssignments = [];
    for (let i = 0; i < NUM_CONCURRENT_USERS; i++) {
      // Intentionally create conflicts - multiple users try for same seats
      const seatNumber = (i % 20) + 1; // 20 seats, 100 users = 5 users per seat
      seatAssignments.push({ userId: i + 1, seatNumber });
    }

    // Launch all concurrent booking attempts
    const bookingPromises = seatAssignments.map(({ userId, seatNumber }) => 
      this.simulateUserBooking(userId, seatNumber)
    );

    // Wait for all attempts to complete
    const results = await Promise.allSettled(bookingPromises);
    
    this.results.endTime = performance.now();
    this.results.totalAttempts = results.length;

    // Analyze results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const booking = result.value;
        this.results.responses.push(booking);
        
        if (booking.status === 'success') {
          this.results.successful++;
        } else if (booking.status === 'failed') {
          this.results.failed++;
          if (booking.error && booking.error.includes('already booked')) {
            this.results.seatConflicts++;
          }
        } else if (booking.status === 'error') {
          this.results.errors.push(booking.error);
          if (booking.error.includes('timeout')) {
            this.results.timeouts++;
          }
        }
      } else {
        this.results.errors.push(result.reason.message);
        this.results.failed++;
      }
    });

    this.printResults();
    return this.results;
  }

  printResults() {
    const duration = this.results.endTime - this.results.startTime;
    const avgResponseTime = this.results.responses.reduce((sum, r) => sum + r.duration, 0) / this.results.responses.length;
    
    console.log('\n🎯 STRESS TEST RESULTS');
    console.log('═'.repeat(60));
    console.log(`Total Duration: ${Math.round(duration)}ms`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`Concurrent Users: ${NUM_CONCURRENT_USERS}`);
    console.log(`Total Attempts: ${this.results.totalAttempts}`);
    console.log('─'.repeat(60));
    
    console.log(`✅ Successful Bookings: ${this.results.successful}`);
    console.log(`❌ Failed Bookings: ${this.results.failed}`);
    console.log(`⏱️  Timeouts: ${this.results.timeouts}`);
    console.log(`🔒 Seat Conflicts: ${this.results.seatConflicts}`);
    console.log('─'.repeat(60));
    
    // Success rate analysis
    const successRate = (this.results.successful / this.results.totalAttempts) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    // Expected vs actual conflicts
    const expectedConflicts = NUM_CONCURRENT_USERS - 20; // 20 seats, 100 users
    console.log(`Expected Conflicts: ${expectedConflicts}`);
    console.log(`Actual Conflicts: ${this.results.seatConflicts}`);
    
    // Performance benchmarks
    console.log('\n📊 PERFORMANCE BENCHMARKS');
    console.log('─'.repeat(60));
    console.log(`Requests/second: ${Math.round(this.results.totalAttempts / (duration / 1000))}`);
    console.log(`Concurrent handling: ${successRate > 15 ? '✅ GOOD' : '❌ POOR'}`);
    console.log(`Response time: ${avgResponseTime < 5000 ? '✅ GOOD' : '❌ SLOW'}`);
    console.log(`Error rate: ${((this.results.failed / this.results.totalAttempts) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🐛 ERRORS ENCOUNTERED:');
      console.log('─'.repeat(60));
      this.results.errors.slice(0, 5).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (this.results.errors.length > 5) {
        console.log(`... and ${this.results.errors.length - 5} more errors`);
      }
    }
    
    // Final assessment
    console.log('\n🏆 FINAL ASSESSMENT');
    console.log('═'.repeat(60));
    if (successRate > 15 && avgResponseTime < 5000 && this.results.seatConflicts > 0) {
      console.log('🎉 SUCCESS: App can handle 100+ concurrent users safely!');
      console.log('✅ Concurrency protection is working');
      console.log('✅ Seat conflicts are properly handled');
      console.log('✅ Response times are acceptable');
    } else {
      console.log('⚠️  ISSUES DETECTED:');
      if (successRate <= 15) console.log('❌ Low success rate - check server capacity');
      if (avgResponseTime >= 5000) console.log('❌ Slow response times - optimize performance');
      if (this.results.seatConflicts === 0) console.log('❌ No conflicts detected - concurrency protection may not be working');
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new ConcurrentBookingTester();
  tester.runConcurrentTest().catch(console.error);
}

module.exports = ConcurrentBookingTester;