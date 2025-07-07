#!/usr/bin/env node
/**
 * LOAD TEST: Database Performance Under Heavy Load
 * Tests database connections, query performance, and seat hold system
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';

class LoadTester {
  constructor() {
    this.results = {
      requests: 0,
      successful: 0,
      failed: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: []
    };
  }

  async makeRequest(path, method = 'GET', data = null) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      };

      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            duration
          });
        });
      });

      req.on('error', (err) => {
        const endTime = performance.now();
        reject({
          error: err.message,
          duration: endTime - startTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          error: 'Request timeout',
          duration: 15000
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async runLoadTest() {
    console.log('🔥 Starting load test...');
    console.log(`Target: ${BASE_URL}`);
    console.log('─'.repeat(50));

    const testEndpoints = [
      '/api/events',
      '/api/events/15',
      '/api/events/15/availability',
      '/api/food-options',
      '/api/venues/4'
    ];

    const totalRequests = 500;
    const concurrentBatches = 10;
    const requestsPerBatch = totalRequests / concurrentBatches;

    for (let batch = 0; batch < concurrentBatches; batch++) {
      console.log(`Running batch ${batch + 1}/${concurrentBatches}...`);
      
      const batchPromises = [];
      for (let i = 0; i < requestsPerBatch; i++) {
        const endpoint = testEndpoints[Math.floor(Math.random() * testEndpoints.length)];
        batchPromises.push(this.makeRequest(endpoint));
      }

      const results = await Promise.allSettled(batchPromises);
      
      results.forEach(result => {
        this.results.requests++;
        
        if (result.status === 'fulfilled') {
          const response = result.value;
          this.results.successful++;
          this.results.totalTime += response.duration;
          this.results.minTime = Math.min(this.results.minTime, response.duration);
          this.results.maxTime = Math.max(this.results.maxTime, response.duration);
        } else {
          this.results.failed++;
          this.results.errors.push(result.reason.error);
        }
      });
    }

    this.printLoadResults();
  }

  printLoadResults() {
    const avgTime = this.results.totalTime / this.results.successful;
    const successRate = (this.results.successful / this.results.requests) * 100;

    console.log('\n📊 LOAD TEST RESULTS');
    console.log('═'.repeat(50));
    console.log(`Total Requests: ${this.results.requests}`);
    console.log(`Successful: ${this.results.successful}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log('─'.repeat(50));
    console.log(`Average Response Time: ${Math.round(avgTime)}ms`);
    console.log(`Min Response Time: ${Math.round(this.results.minTime)}ms`);
    console.log(`Max Response Time: ${Math.round(this.results.maxTime)}ms`);
    console.log('─'.repeat(50));
    
    if (successRate > 95 && avgTime < 1000) {
      console.log('✅ EXCELLENT: Server handles load very well');
    } else if (successRate > 90 && avgTime < 2000) {
      console.log('👍 GOOD: Server handles load adequately');
    } else {
      console.log('⚠️  NEEDS OPTIMIZATION: Server struggling with load');
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new LoadTester();
  tester.runLoadTest().catch(console.error);
}

module.exports = LoadTester;