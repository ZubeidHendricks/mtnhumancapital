const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Playwright test for FLEET LOGIX...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to FLEET LOGIX
    console.log('1. Navigating to http://localhost:5000?tenant=fleetlogix');
    await page.goto('http://localhost:5000?tenant=fleetlogix', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshot-1-login.png', fullPage: true });
    console.log('   ✅ Screenshot saved: screenshot-1-login.png');
    
    // Check for FLEET LOGIX branding
    const pageContent = await page.content();
    console.log('\n2. Checking for FLEET LOGIX branding...');
    
    if (pageContent.includes('FLEET LOGIX')) {
      console.log('   ✅ Found "FLEET LOGIX" text on page');
    } else {
      console.log('   ❌ "FLEET LOGIX" text NOT found on page');
    }
    
    // Check for logo
    const logo = await page.$('img[alt*="FLEET"]');
    if (logo) {
      const logoSrc = await logo.getAttribute('src');
      console.log(`   ✅ Found logo: ${logoSrc}`);
    } else {
      console.log('   ❌ FLEET LOGIX logo NOT found');
    }
    
    // Check for theme toggle
    console.log('\n3. Checking for theme toggle...');
    const themeButton = await page.$('button[aria-label*="theme" i], button:has(svg)');
    if (themeButton) {
      console.log('   ✅ Theme toggle button found');
    } else {
      console.log('   ⚠️  Theme toggle button NOT clearly identified');
    }
    
    // Click demo login
    console.log('\n4. Clicking demo login button...');
    const demoButton = await page.getByText('Use Demo Credentials', { exact: false });
    if (demoButton) {
      await demoButton.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked demo login');
      
      // Take screenshot after login
      await page.screenshot({ path: 'screenshot-2-dashboard.png', fullPage: true });
      console.log('   ✅ Screenshot saved: screenshot-2-dashboard.png');
      
      // Check URL
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      
      // Check if FLEET LOGIX branding persists
      const dashboardContent = await page.content();
      if (dashboardContent.includes('FLEET LOGIX')) {
        console.log('   ✅ FLEET LOGIX branding visible on dashboard');
      } else {
        console.log('   ❌ FLEET LOGIX branding NOT visible on dashboard');
      }
      
    } else {
      console.log('   ❌ Demo login button NOT found');
    }
    
    console.log('\n✅ Test completed! Check screenshots for visual confirmation.');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
