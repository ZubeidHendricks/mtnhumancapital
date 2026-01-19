import { test, expect, chromium } from '@playwright/test';

test('Debug FleetLogix API errors', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages from the browser
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.text());
  });

  // Listen to all network responses
  const errors: any[] = [];
  page.on('response', async response => {
    const url = response.url();
    
    if (url.includes('/api/fleetlogix/')) {
      console.log(`\n📡 ${response.status()} ${response.request().method()} ${url}`);
      
      if (response.status() === 500) {
        try {
          const body = await response.json();
          console.log('❌ ERROR RESPONSE:', JSON.stringify(body, null, 2));
          errors.push({ url, status: 500, body });
        } catch (e) {
          console.log('❌ ERROR: Could not parse response body');
        }
      } else if (response.status() === 200) {
        try {
          const body = await response.json();
          console.log(`✅ SUCCESS: ${Array.isArray(body) ? body.length : 'N/A'} items`);
        } catch (e) {
          console.log('✅ SUCCESS: Response received');
        }
      }
    }
  });

  console.log('\n🔍 Testing FleetLogix API endpoints...\n');

  try {
    // Go to login page
    console.log('📄 Navigating to login...');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle' });

    // Login
    console.log('🔐 Logging in as admin@fleetlogix.co.za...');
    await page.fill('input[type="text"]', 'admin@fleetlogix.co.za');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/(hr-dashboard|home|hr)/, { timeout: 10000 });
    console.log('✅ Login successful!\n');

    // Navigate to FleetLogix
    console.log('📄 Navigating to FleetLogix...');
    await page.goto('http://localhost:5000/fleetlogix', { waitUntil: 'networkidle' });
    
    // Wait a bit for all API calls to complete
    await page.waitForTimeout(3000);

    console.log('\n📊 Summary:');
    console.log(`Found ${errors.length} failed API calls\n`);

    if (errors.length > 0) {
      console.log('❌ Failed endpoints:');
      errors.forEach(err => {
        console.log(`  - ${err.url}`);
        console.log(`    Error: ${err.body.error || 'Unknown'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await browser.close();
  }
});
