import { test, expect } from '@playwright/test';

test.describe('Fleet Logix Authentication Test', () => {
  
  test('should test Fleet Logix with authentication', async ({ page }) => {
    console.log('\n🚀 Starting Fleet Logix authentication test...\n');
    
    // Step 1: Navigate to home page
    console.log('Step 1: Navigating to home page...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshot-1-home.png', fullPage: true });
    console.log('✅ Screenshot saved: screenshot-1-home.png');
    
    // Step 2: Check if already logged in
    console.log('\nStep 2: Checking if already logged in...');
    const userMenuExists = await page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Logout")').count() > 0;
    
    if (userMenuExists) {
      console.log('✅ Already logged in!');
    } else {
      console.log('❌ Not logged in, looking for login button...');
      
      // Listen to all network requests
      page.on('request', request => {
        if (request.url().includes('/api/auth/login')) {
          console.log('📤 Login request:', request.url());
          console.log('   Method:', request.method());
          console.log('   Post data:', request.postData());
        }
      });
      
      page.on('response', async response => {
        if (response.url().includes('/api/auth/login')) {
          console.log('📥 Login response:', response.status());
          const body = await response.text();
          console.log('   Response body:', body.substring(0, 200));
        }
      });
      
      // Try to find login button or link
      const loginButton = page.locator('a:has-text("Login"), button:has-text("Login"), a:has-text("Sign In"), button:has-text("Sign In")').first();
      const loginButtonExists = await loginButton.count() > 0;
      
      if (loginButtonExists) {
        console.log('✅ Found login button, clicking...');
        await loginButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshot-2-login-page.png', fullPage: true });
        console.log('✅ Screenshot saved: screenshot-2-login-page.png');
        
        // Fill login form
        console.log('📝 Filling login form...');
        
        // Use proper email address
        await page.locator('input#email').click();
        await page.locator('input#email').fill('admin@fleetlogix.co.za');
        
        await page.locator('input[type="password"]').click();
        await page.locator('input[type="password"]').fill('fleet123');
        
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshot-3-login-filled.png', fullPage: true });
        console.log('✅ Screenshot saved: screenshot-3-login-filled.png');
        
        // Submit login
        console.log('🔐 Submitting login...');
        
        // Check if button is actually enabled
        const submitButton = page.locator('button[type="submit"]').first();
        const isDisabled = await submitButton.isDisabled();
        console.log('Submit button disabled:', isDisabled);
        
        if (!isDisabled) {
          await submitButton.click();
        } else {
          console.log('⚠️ Submit button is disabled! Trying to click anyway...');
          await page.click('button[type="submit"]', { force: true });
        }
        
        console.log('⏳ Waiting for response...');
        await page.waitForTimeout(5000);
        
        // Check for error messages on page
        const errorVisible = await page.locator('[role="alert"], .alert-destructive').count();
        if (errorVisible > 0) {
          const errorText = await page.locator('[role="alert"], .alert-destructive').first().textContent();
          console.log('❌ Error on page:', errorText);
        }
        
        // Check if redirected
        const currentUrl = page.url();
        console.log('Current URL after login:', currentUrl);
        
        await page.screenshot({ path: 'screenshot-4-after-login.png', fullPage: true });
        console.log('✅ Screenshot saved: screenshot-4-after-login.png');
      } else {
        console.log('⚠️ Could not find login button on page');
        console.log('Current URL:', page.url());
        console.log('Page title:', await page.title());
      }
    }
    
    // Step 3: Check localStorage for token
    console.log('\nStep 3: Checking localStorage for auth token...');
    const token = await page.evaluate(() => localStorage.getItem('ahc_auth_token'));
    const user = await page.evaluate(() => localStorage.getItem('ahc_user'));
    
    console.log('Auth token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
    console.log('User data:', user ? 'EXISTS' : 'NOT FOUND');
    
    if (token) {
      console.log('✅ Auth token found in localStorage');
    } else {
      console.log('❌ No auth token in localStorage!');
    }
    
    // Step 4: Navigate to Fleet Logix
    console.log('\nStep 4: Navigating to Fleet Logix...');
    await page.goto('http://localhost:5000/fleetlogix');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot-5-fleetlogix.png', fullPage: true });
    console.log('✅ Screenshot saved: screenshot-5-fleetlogix.png');
    
    // Step 5: Check for errors in console
    console.log('\nStep 5: Checking for console errors...');
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', text);
      }
    });
    
    // Step 6: Check network requests
    console.log('\nStep 6: Monitoring network requests...');
    const requests: { url: string; status: number; headers: any }[] = [];
    
    page.on('response', async response => {
      if (response.url().includes('/api/fleetlogix/')) {
        const request = response.request();
        const headers = await request.allHeaders();
        
        requests.push({
          url: response.url(),
          status: response.status(),
          headers: headers
        });
        
        console.log(`📡 ${response.status()} ${response.url()}`);
        console.log('   Authorization header:', headers['authorization'] || 'NOT PRESENT');
        
        if (response.status() === 401) {
          console.log('❌ 401 Unauthorized!');
        } else if (response.status() === 200) {
          console.log('✅ Success!');
        }
      }
    });
    
    // Reload to trigger requests
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Step 7: Check page content
    console.log('\nStep 7: Checking page content...');
    const pageText = await page.textContent('body');
    
    if (pageText?.includes('Fleet Logix') || pageText?.includes('Drivers') || pageText?.includes('Vehicles')) {
      console.log('✅ Fleet Logix content found');
    } else {
      console.log('❌ Fleet Logix content NOT found');
      console.log('Page contains:', pageText?.substring(0, 200));
    }
    
    // Check for specific tabs
    const driversTab = await page.locator('button:has-text("Drivers"), [role="tab"]:has-text("Drivers")').count();
    const vehiclesTab = await page.locator('button:has-text("Vehicles"), [role="tab"]:has-text("Vehicles")').count();
    
    console.log('Drivers tab found:', driversTab > 0);
    console.log('Vehicles tab found:', vehiclesTab > 0);
    
    // Step 8: Check for error messages
    console.log('\nStep 8: Checking for error messages...');
    const errorMessages = await page.locator('text=/error|unable|failed|unauthorized/i').count();
    console.log('Error messages found:', errorMessages);
    
    if (errorMessages > 0) {
      const errors = await page.locator('text=/error|unable|failed|unauthorized/i').allTextContents();
      console.log('Error texts:', errors);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshot-6-final.png', fullPage: true });
    console.log('✅ Screenshot saved: screenshot-6-final.png');
    
    // Step 9: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('Auth token in localStorage:', token ? '✅ YES' : '❌ NO');
    console.log('Fleet Logix page loaded:', page.url().includes('fleetlogix') ? '✅ YES' : '❌ NO');
    console.log('API requests made:', requests.length);
    console.log('401 errors:', requests.filter(r => r.status === 401).length);
    console.log('200 success:', requests.filter(r => r.status === 200).length);
    console.log('='.repeat(60));
    
    // Print all requests
    console.log('\n📋 ALL API REQUESTS:');
    requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.url}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Auth header: ${req.headers['authorization'] || 'MISSING'}`);
    });
  });
});
