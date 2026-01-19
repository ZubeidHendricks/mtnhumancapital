import { test, expect } from '@playwright/test';

test.describe('FleetLogix Login and Authentication Flow', () => {

  test('should login successfully and access FleetLogix dashboard', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:5000/login');

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@fleetlogix.co.za');
    await page.fill('input[type="password"]', 'admin123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL('**/hr-dashboard', { timeout: 5000 });

    console.log('✅ Login successful, redirected to:', page.url());

    // Check if token is stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('ahc_auth_token'));
    console.log('🔑 Token stored:', token ? 'YES ✅' : 'NO ❌');
    console.log('Token preview:', token?.substring(0, 50) + '...');

    expect(token).not.toBeNull();
    expect(token).not.toBe('demo_token');

    // Check user data
    const user = await page.evaluate(() => localStorage.getItem('ahc_user'));
    console.log('👤 User data:', user);

    // Navigate to FleetLogix
    await page.goto('http://localhost:5000/fleetlogix');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for API requests
    const apiRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/fleetlogix')) {
        apiRequests.push(request.url());
        console.log('📡 API Request:', request.url());
        console.log('   Authorization:', request.headers()['authorization'] || 'NONE ❌');
      }
    });

    // Trigger some API calls by interacting with the page
    await page.waitForTimeout(2000);

    // Check for 401 errors
    const has401 = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .some((r: any) => r.name.includes('/api/fleetlogix') && r.responseStatus === 401);
    });

    console.log('❌ 401 Errors detected:', has401 ? 'YES' : 'NO');

    // Take a screenshot
    await page.screenshot({ path: 'fleetlogix-dashboard-test.png', fullPage: true });
    console.log('📸 Screenshot saved: fleetlogix-dashboard-test.png');

    // Check console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    if (errors.length > 0) {
      console.log('⚠️  Console Errors:');
      errors.forEach(err => console.log('   -', err));
    }
  });

  test('should verify token is sent with API requests', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5000/login');
    await page.fill('input[type="email"]', 'admin@fleetlogix.co.za');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/hr-dashboard');

    // Get the token
    const token = await page.evaluate(() => localStorage.getItem('ahc_auth_token'));
    console.log('🔑 Using token:', token?.substring(0, 30) + '...');

    // Navigate to FleetLogix
    await page.goto('http://localhost:5000/fleetlogix');

    // Intercept API requests to check headers
    const requestDetails: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/fleetlogix')) {
        const headers = request.headers();
        requestDetails.push({
          url: request.url(),
          hasAuth: !!headers['authorization'],
          authHeader: headers['authorization']?.substring(0, 30) + '...'
        });
      }
    });

    // Wait for requests
    await page.waitForTimeout(3000);

    console.log('\n📊 API Request Analysis:');
    requestDetails.forEach((req, i) => {
      console.log(`\nRequest ${i + 1}:`);
      console.log('  URL:', req.url);
      console.log('  Has Auth:', req.hasAuth ? '✅' : '❌');
      console.log('  Auth Header:', req.authHeader || 'NONE');
    });

    // Verify at least one request was made with auth
    const hasAuthRequests = requestDetails.some(r => r.hasAuth);
    expect(hasAuthRequests).toBeTruthy();
  });

  test('should check tenant configuration', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5000/login');
    await page.fill('input[type="email"]', 'admin@fleetlogix.co.za');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/hr-dashboard');

    // Get user data
    const userData = await page.evaluate(() => {
      const user = localStorage.getItem('ahc_user');
      return user ? JSON.parse(user) : null;
    });

    console.log('\n🏢 Tenant Information:');
    console.log('  User ID:', userData?.id);
    console.log('  Username:', userData?.username);
    console.log('  Tenant ID:', userData?.tenantId);
    console.log('  Role:', userData?.role);
    console.log('  Is Super Admin:', userData?.isSuperAdmin);

    expect(userData).not.toBeNull();
    expect(userData?.tenantId).toBeTruthy();
  });
});

test.describe('Multi-Tenant Subdomain Test', () => {

  test('should test subdomain routing (if configured)', async ({ page }) => {
    // Test if fleetlogix subdomain works
    try {
      await page.goto('http://fleetlogix.localhost:5000');
      console.log('✅ Subdomain routing is configured');
    } catch (error) {
      console.log('❌ Subdomain routing not configured (this is expected)');
    }
  });
});
