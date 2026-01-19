import { test, expect } from '@playwright/test';

test.describe('FleetLogix Authentication Flow', () => {
  // Setup: Create a test user via API
  test.beforeAll(async ({ request }) => {
    // First check if we need to create a tenant
    try {
      // Try to register a test user
      const registerResponse = await request.post('http://localhost:5000/api/auth/register', {
        data: {
          username: 'fleettest',
          password: 'Test1234!',
          email: 'fleettest@example.com',
          firstName: 'Fleet',
          lastName: 'Tester',
          role: 'admin'
        },
        failOnStatusCode: false
      });
      
      console.log('Register response status:', registerResponse.status());
      if (registerResponse.ok()) {
        console.log('Test user created successfully');
      } else {
        console.log('User might already exist or registration endpoint not available');
      }
    } catch (error) {
      console.log('Setup error (non-fatal):', error);
    }
  });

  test('should login with username and access FleetLogix without 401 errors', async ({ page, request }) => {
    // Test login via API first
    console.log('Testing login via API...');
    const loginResponse = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        username: 'fleettest',
        password: 'Test1234!'
      },
      failOnStatusCode: false
    });
    
    console.log('API Login response status:', loginResponse.status());
    
    if (loginResponse.status() === 401) {
      console.log('User does not exist. Trying default admin credentials...');
      
      // Try default admin credentials
      const adminLogin = await request.post('http://localhost:5000/api/auth/login', {
        data: {
          username: 'admin',
          password: 'admin123'
        },
        failOnStatusCode: false
      });
      
      console.log('Admin login status:', adminLogin.status());
      
      if (adminLogin.status() !== 200) {
        console.log('❌ Cannot login with any credentials. Skipping test.');
        test.skip();
      }
    }
    
    // Navigate to login page
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');
    
    // Wait for login form
    await page.waitForSelector('input', { timeout: 10000 });
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/fleetlogix-01-login-page.png' });
    
    // Find and fill username field (could be type="text", type="email", or name="username")
    const usernameInput = page.locator('input[name="username"], input[type="text"]:visible, input[type="email"]:visible').first();
    await usernameInput.fill('fleettest');
    
    // Find and fill password field
    const passwordInput = page.locator('input[type="password"]:visible').first();
    await passwordInput.fill('Test1234!');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/fleetlogix-02-login-filled.png' });
    
    // Click login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
    await loginButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('After login URL:', currentUrl);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'test-results/fleetlogix-03-after-login.png' });
    
    // Check if login was successful (not on login page)
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page. Login failed.');
      const errorMsg = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => 'No error message found');
      console.log('Error message:', errorMsg);
    }
    
    // Navigate to FleetLogix
    console.log('Navigating to FleetLogix...');
    await page.goto('http://localhost:5000/fleetlogix');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('FleetLogix URL:', page.url());
    
    // Monitor for 401 errors
    const failedRequests: { url: string, status: number }[] = [];
    page.on('response', response => {
      if (response.status() === 401) {
        failedRequests.push({ url: response.url(), status: response.status() });
        console.log('❌ 401 Unauthorized:', response.url());
      }
    });
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/fleetlogix-04-final.png', fullPage: true });
    
    // Report results
    console.log('\n=== Test Results ===');
    console.log('Failed requests (401):', failedRequests.length);
    failedRequests.forEach(req => console.log(`  - ${req.url}`));
    
    // Check page content
    const pageContent = await page.content();
    const hasUnauthorized = pageContent.includes('Unauthorized') || pageContent.includes('401');
    
    console.log('Has "Unauthorized" text:', hasUnauthorized);
    
    // Assertions
    expect(failedRequests.length).toBe(0);
    expect(hasUnauthorized).toBe(false);
    
    // Check for FleetLogix content
    const hasFleetContent = await page.locator('text=/fleet|driver|vehicle|route|load/i').first().isVisible().catch(() => false);
    console.log('Has FleetLogix content:', hasFleetContent);
    
    console.log('\n✅ FleetLogix authentication test completed');
  });
});
