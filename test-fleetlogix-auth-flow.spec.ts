import { test, expect } from '@playwright/test';

test.describe('FleetLogix Authentication Flow', () => {
  test('should login and access FleetLogix with proper authentication', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');

    // Fill in login form with email (not username)
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'admin123');

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/hr-dashboard', { timeout: 10000 });
    
    // Verify we're logged in by checking for auth token
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('ahc_auth_token');
    });
    
    console.log('Auth token after login:', authToken ? 'Present' : 'Missing');
    expect(authToken).toBeTruthy();

    // Navigate to FleetLogix
    await page.goto('http://localhost:5000/fleetlogix');
    await page.waitForLoadState('networkidle');

    // Check if auth token is still present
    const authTokenAfterNav = await page.evaluate(() => {
      return localStorage.getItem('ahc_auth_token');
    });
    
    console.log('Auth token after FleetLogix nav:', authTokenAfterNav ? 'Present' : 'Missing');
    expect(authTokenAfterNav).toBeTruthy();

    // Check network requests for authorization headers
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/fleetlogix/')) {
        const headers = request.headers();
        requests.push({
          url: request.url(),
          hasAuth: !!headers['authorization'],
          authHeader: headers['authorization']
        });
        console.log('FleetLogix API Request:', {
          url: request.url(),
          hasAuth: !!headers['authorization'],
          authValue: headers['authorization'] ? 'Present' : 'Missing'
        });
      }
    });

    // Wait for API calls
    await page.waitForTimeout(3000);

    // Try to get some data
    const driversResponse = await page.waitForResponse(
      response => response.url().includes('/api/fleetlogix/drivers'),
      { timeout: 5000 }
    ).catch(() => null);

    if (driversResponse) {
      console.log('Drivers API Response Status:', driversResponse.status());
      const responseBody = await driversResponse.text();
      console.log('Drivers API Response:', responseBody.substring(0, 200));
    }

    // Check for error messages on the page
    const errorMessages = await page.$$eval('[role="alert"]', elements => 
      elements.map(el => el.textContent)
    );
    
    if (errorMessages.length > 0) {
      console.log('Error messages on page:', errorMessages);
    }

    // Check console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('API Requests made:', requests);
    console.log('Total FleetLogix API requests:', requests.length);
    console.log('Requests with auth:', requests.filter(r => r.hasAuth).length);
  });

  test('should check axios interceptor setup', async ({ page }) => {
    await page.goto('http://localhost:5000/login');
    
    // Check if axios interceptors are set up
    const axiosConfig = await page.evaluate(() => {
      // @ts-ignore
      return window.axios ? 'Axios available' : 'Axios not found';
    });
    
    console.log('Axios status:', axiosConfig);
  });
});
