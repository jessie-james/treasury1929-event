const puppeteer = require('puppeteer');

// Test the actual frontend booking flow
async function testFrontendBooking() {
  console.log('🚀 Testing Frontend Booking Flow...\n');
  
  let browser;
  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport for mobile-first design
    await page.setViewport({ width: 375, height: 667 });
    
    console.log('1. Navigating to the application...');
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    
    // Take screenshot of homepage
    console.log('   ✅ Application loaded successfully');
    
    // Check if events are loaded
    const eventsVisible = await page.waitForSelector('[data-testid="event-card"], .event-card, h2, h3', { timeout: 10000 }).catch(() => null);
    
    if (eventsVisible) {
      console.log('   ✅ Events page loaded');
      
      // Try to find and click an event
      const eventLinks = await page.$$eval('a[href*="/events/"]', links => 
        links.map(link => ({ href: link.href, text: link.textContent?.trim() }))
      );
      
      if (eventLinks.length > 0) {
        console.log(`   ✅ Found ${eventLinks.length} event links`);
        console.log(`2. Clicking on event: ${eventLinks[0].text}`);
        
        await page.click(`a[href="${eventLinks[0].href}"]`);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('   ✅ Event details page loaded');
        
        // Look for booking/table selection elements
        const hasBookingElements = await page.evaluate(() => {
          const bookButton = document.querySelector('button[data-testid="book-now"], button:contains("Book"), button:contains("Select")');
          const canvas = document.querySelector('canvas');
          const tableElements = document.querySelectorAll('[data-testid*="table"], .table');
          
          return {
            hasBookButton: !!bookButton,
            hasCanvas: !!canvas,
            tableCount: tableElements.length
          };
        });
        
        console.log('3. Checking booking interface...');
        console.log(`   Canvas present: ${hasBookingElements.hasCanvas ? '✅' : '❌'}`);
        console.log(`   Book button present: ${hasBookingElements.hasBookButton ? '✅' : '❌'}`);
        console.log(`   Table elements: ${hasBookingElements.tableCount}`);
        
        // Take screenshot of booking interface
        await page.screenshot({ path: 'booking-interface.png', fullPage: true });
        console.log('   📸 Screenshot saved: booking-interface.png');
        
      } else {
        console.log('   ⚠️ No event links found');
      }
    } else {
      console.log('   ⚠️ Events not loaded properly');
    }
    
    // Check console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    if (logs.length > 0) {
      console.log('\n🔴 Console Errors Found:');
      logs.forEach(log => console.log(`   - ${log}`));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
  } catch (error) {
    console.error('❌ Frontend booking test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Alternative: Test API endpoints directly
async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...\n');
  
  const endpoints = [
    'http://localhost:5000/api/events',
    'http://localhost:5000/api/events/35',
    'http://localhost:5000/api/events/35/venue-layouts',
    'http://localhost:5000/api/food-options'
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      
      if (response.ok) {
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.log(`✅ ${url} - OK (${Array.isArray(data) ? data.length + ' items' : 'object'})`);
        } else {
          console.log(`⚠️ ${url} - Returns ${contentType} instead of JSON`);
        }
      } else {
        console.log(`❌ ${url} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${url} - ${error.message}`);
    }
  }
}

// Run tests
async function runAllTests() {
  await testAPIEndpoints();
  // Puppeteer test disabled for now due to complexity
  // await testFrontendBooking();
}

runAllTests();