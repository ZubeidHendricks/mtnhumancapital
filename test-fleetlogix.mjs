import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting Playwright test for FLEET LOGIX...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to FLEET LOGIX
    console.log('1. Navigating to http://localhost:5000?tenant=fleetlogix');
    await page.goto('http://localhost:5000?tenant=fleetlogix', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshot-1-login.png', fullPage: true });
    console.log('   ✅ Screenshot saved: screenshot-1-login.png');
    
    // Check page title
    const title = await page.title();
    console.log(`   Page title: ${title}`);
    
    // Check for FLEET LOGIX branding
    const pageContent = await page.content();
    console.log('\n2. Checking for FLEET LOGIX branding...');
    
    if (pageContent.includes('FLEET LOGIX')) {
      console.log('   ✅ Found "FLEET LOGIX" text in HTML');
    } else {
      console.log('   ❌ "FLEET LOGIX" text NOT found in HTML');
    }
    
    // Check for logo image
    const logos = await page.$$('img');
    console.log(`   Found ${logos.length} images on page`);
    for (const logo of logos) {
      const src = await logo.getAttribute('src');
      const alt = await logo.getAttribute('alt');
      console.log(`   - Image: src="${src}" alt="${alt}"`);
    }
    
    // Check for theme toggle button
    console.log('\n3. Looking for theme toggle...');
    const buttons = await page.$$('button');
    console.log(`   Found ${buttons.length} buttons`);
    
    // Click demo login
    console.log('\n4. Looking for demo login button...');
    try {
      const demoButton = await page.locator('text=Use Demo Credentials').first();
      if (await demoButton.isVisible({ timeout: 5000 })) {
        console.log('   ✅ Found demo login button');
        await demoButton.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Clicked demo login');
        
        // Take screenshot after login
        await page.screenshot({ path: 'screenshot-2-dashboard.png', fullPage: true });
        console.log('   ✅ Screenshot saved: screenshot-2-dashboard.png');
        
        // Check URL
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);
        
        // Check if we're on a dashboard
        const dashboardContent = await page.content();
        if (currentUrl.includes('dashboard') || currentUrl.includes('hr')) {
          console.log('   ✅ Successfully navigated to dashboard');
        }
        
        // Check for FLEET LOGIX on dashboard
        if (dashboardContent.includes('FLEET LOGIX')) {
          console.log('   ✅ FLEET LOGIX branding visible on dashboard');
        } else {
          console.log('   ❌ FLEET LOGIX branding NOT visible on dashboard');
          console.log('   ℹ️  Showing first 500 chars of content:');
          console.log(dashboardContent.substring(0, 500));
        }
        
      }
    } catch (e) {
      console.log('   ❌ Demo login button not found or not clickable');
      console.log('   Error:', e.message);
    }
    
    console.log('\n✅ Test completed! Check screenshots for visual confirmation.');
    console.log('   - screenshot-1-login.png');
    console.log('   - screenshot-2-dashboard.png');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
