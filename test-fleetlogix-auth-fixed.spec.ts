import { test, expect } from '@playwright/test';

test.describe('FleetLogix Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the home page
    await page.goto('http://localhost:5000');
  });

  test('should login and access FleetLogix with authentication', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on the login page or home page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // If not logged in, login first
    if (currentUrl.includes('/login') || await page.locator('input[type="email"]').isVisible().catch(() => false)) {
      console.log('Not logged in, performing login...');
      
      // Fill in email (NOT username)
      await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'test@example.com');
      
      // Fill in password
      await page.fill('input[type="password"], input[name="password"]', 'password123');
      
      // Click login button
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
      
      // Wait for navigation after login
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    console.log('After login URL:', page.url());
    
    // Now navigate to FleetLogix
    console.log('Navigating to FleetLogix...');
    await page.goto('http://localhost:5000/fleetlogix');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('FleetLogix URL:', page.url());
    
    // Check for 401 errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Check network requests for 401 errors
    const failedRequests: string[] = [];
    page.on('response', response => {
      if (response.status() === 401) {
        failedRequests.push(`401: ${response.url()}`);
      }
    });
    
    // Wait for any FleetLogix content to load
    await page.waitForTimeout(3000);
    
    // Check if we got any 401 errors
    console.log('Failed requests (401):', failedRequests);
    console.log('Console errors:', consoleErrors);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'fleetlogix-after-login.png', fullPage: true });
    
    // Assert no 401 errors
    expect(failedRequests).toHaveLength(0);
    
    // Check if FleetLogix page loaded successfully
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Unauthorized');
    expect(pageContent).not.toContain('401');
    
    // Check for FleetLogix specific elements
    const hasFleetLogixContent = await page.locator('text=/fleet|driver|vehicle|load/i').first().isVisible().catch(() => false);
    expect(hasFleetLogixContent).toBeTruthy();
    
    console.log('✅ FleetLogix loaded successfully with authentication');
  });
});
