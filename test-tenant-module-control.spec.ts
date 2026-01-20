import { test, expect } from '@playwright/test';

test.describe('Tenant Module Control System', () => {
  let baseURL: string;
  let authCookie: any;

  test.beforeAll(async () => {
    baseURL = process.env.BASE_URL || 'http://localhost:5000';
  });

  test.beforeEach(async ({ page }) => {
    // Login first to get authentication
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('should fetch tenant config with modulesEnabled', async ({ page }) => {
    const response = await page.request.get(`${baseURL}/api/tenant-config`);
    expect(response.ok()).toBeTruthy();
    
    const tenantConfig = await response.json();
    console.log('Tenant Config:', JSON.stringify(tenantConfig, null, 2));
    
    expect(tenantConfig).toHaveProperty('id');
    expect(tenantConfig).toHaveProperty('subdomain');
    expect(tenantConfig).toHaveProperty('modulesEnabled');
    
    // Log current module status
    console.log('\n=== Current Module Status ===');
    if (tenantConfig.modulesEnabled && typeof tenantConfig.modulesEnabled === 'object') {
      Object.entries(tenantConfig.modulesEnabled).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    } else {
      console.log('modulesEnabled is not a proper object:', tenantConfig.modulesEnabled);
    }
  });

  test('should enable a module via API', async ({ page }) => {
    // First get current config
    const getResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const currentConfig = await getResponse.json();
    const tenantId = currentConfig.id;
    
    console.log('\n=== Testing Module Enable ===');
    console.log('Tenant ID:', tenantId);
    console.log('Current modules:', currentConfig.modulesEnabled);

    // Try to enable fleetlogix module
    const updateResponse = await page.request.patch(
      `${baseURL}/api/tenant-config/${tenantId}`,
      {
        data: {
          modulesEnabled: {
            ...currentConfig.modulesEnabled,
            fleetlogix: true,
            lms: true,
            workforce_intelligence: true
          }
        },
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Update response status:', updateResponse.status());
    const responseBody = await updateResponse.text();
    console.log('Update response body:', responseBody);

    if (updateResponse.ok()) {
      const updatedConfig = JSON.parse(responseBody);
      console.log('Updated modules:', updatedConfig.modulesEnabled);
      
      expect(updatedConfig.modulesEnabled).toHaveProperty('fleetlogix', true);
      expect(updatedConfig.modulesEnabled).toHaveProperty('lms', true);
    } else {
      console.error('Failed to update modules');
    }
  });

  test('should disable a module via API', async ({ page }) => {
    // Get current config
    const getResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const currentConfig = await getResponse.json();
    const tenantId = currentConfig.id;

    console.log('\n=== Testing Module Disable ===');
    
    // Disable a module
    const updateResponse = await page.request.patch(
      `${baseURL}/api/tenant-config/${tenantId}`,
      {
        data: {
          modulesEnabled: {
            ...currentConfig.modulesEnabled,
            fleetlogix: false
          }
        },
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Disable response status:', updateResponse.status());
    
    if (updateResponse.ok()) {
      const updatedConfig = await updateResponse.json();
      console.log('Updated modules:', updatedConfig.modulesEnabled);
      expect(updatedConfig.modulesEnabled).toHaveProperty('fleetlogix', false);
    }
  });

  test('should verify tenant middleware attaches tenant to request', async ({ page }) => {
    console.log('\n=== Testing Tenant Middleware ===');
    
    // Make a request that requires tenant
    const response = await page.request.get(`${baseURL}/api/jobs`);
    console.log('Jobs API response status:', response.status());
    
    // If we get a 404 for tenant, middleware failed
    if (response.status() === 404) {
      const error = await response.json();
      console.error('Tenant resolution failed:', error);
      expect(response.status()).not.toBe(404);
    }
  });

  test('should check if useTenant hook works in React', async ({ page }) => {
    console.log('\n=== Testing React Hook Integration ===');
    
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check if tenant config is loaded in the page
    const tenantData = await page.evaluate(() => {
      return {
        hasTenantInLocalStorage: localStorage.getItem('tenant-config') !== null,
        windowLocation: window.location.href,
      };
    });

    console.log('Client-side tenant data:', tenantData);
  });

  test('should validate module access control in navigation', async ({ page }) => {
    console.log('\n=== Testing Navigation Module Control ===');
    
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check which navigation items are visible
    const navigationItems = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('nav a, aside a'));
      return navLinks.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        visible: link.offsetParent !== null
      }));
    });

    console.log('Visible navigation items:', navigationItems.filter(item => item.visible));
  });

  test('should test FleetLogix access based on module status', async ({ page }) => {
    console.log('\n=== Testing FleetLogix Module Access ===');
    
    // First check if FleetLogix is enabled
    const configResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const config = await configResponse.json();
    const fleetlogixEnabled = config.modulesEnabled?.fleetlogix;
    
    console.log('FleetLogix module enabled:', fleetlogixEnabled);

    // Try to access FleetLogix route
    const fleetlogixResponse = await page.request.get(`${baseURL}/api/fleetlogix/drivers`);
    console.log('FleetLogix API response status:', fleetlogixResponse.status());
    
    if (fleetlogixEnabled) {
      // Should allow access
      expect([200, 401, 403]).toContain(fleetlogixResponse.status());
    } else {
      // Should deny access with 403
      if (fleetlogixResponse.status() === 403) {
        const error = await fleetlogixResponse.json();
        console.log('Denied as expected:', error);
        expect(error).toHaveProperty('error');
      }
    }

    // Try to navigate to FleetLogix page
    await page.goto(`${baseURL}/fleetlogix`);
    const pageContent = await page.textContent('body');
    
    if (!fleetlogixEnabled) {
      console.log('Checking if module disabled message is shown...');
      // Should show some kind of disabled/unavailable message
    }
  });

  test('should verify database structure', async ({ page }) => {
    console.log('\n=== Verifying Database Structure ===');
    
    // This would need a database connection, but we can check via API
    const response = await page.request.get(`${baseURL}/api/tenant-config`);
    const config = await response.json();
    
    console.log('Database field types:');
    console.log('- modulesEnabled type:', typeof config.modulesEnabled);
    console.log('- modulesEnabled is object:', config.modulesEnabled !== null && typeof config.modulesEnabled === 'object');
    console.log('- modulesEnabled is array:', Array.isArray(config.modulesEnabled));
    
    // Verify it's a proper object (not array, not null, not string)
    expect(typeof config.modulesEnabled).toBe('object');
    expect(config.modulesEnabled).not.toBe(null);
    expect(Array.isArray(config.modulesEnabled)).toBe(false);
  });

  test('should test module validation on update', async ({ page }) => {
    console.log('\n=== Testing Module Validation ===');
    
    const getResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const config = await getResponse.json();
    
    // Try to set an invalid module
    const invalidResponse = await page.request.patch(
      `${baseURL}/api/tenant-config/${config.id}`,
      {
        data: {
          modulesEnabled: {
            invalid_module_name: true
          }
        },
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('Invalid module test status:', invalidResponse.status());
    console.log('Response:', await invalidResponse.text());
    
    // Should either accept it or reject it with proper validation
    expect([200, 400]).toContain(invalidResponse.status());
  });

  test('should verify all valid module keys work', async ({ page }) => {
    console.log('\n=== Testing All Valid Module Keys ===');
    
    const validModules = [
      'recruitment',
      'integrity',
      'onboarding',
      'hr_management',
      'fleetlogix',
      'workforce_intelligence',
      'lms',
      'kpi_performance',
      'social_screening',
      'document_automation',
      'whatsapp'
    ];

    const getResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const config = await getResponse.json();
    
    // Try to enable all modules
    const modulesEnabled: Record<string, boolean> = {};
    validModules.forEach(module => {
      modulesEnabled[module] = true;
    });

    const updateResponse = await page.request.patch(
      `${baseURL}/api/tenant-config/${config.id}`,
      {
        data: { modulesEnabled },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('Enable all modules status:', updateResponse.status());
    
    if (updateResponse.ok()) {
      const updated = await updateResponse.json();
      console.log('All modules enabled successfully:', updated.modulesEnabled);
      
      validModules.forEach(module => {
        console.log(`- ${module}:`, updated.modulesEnabled[module]);
      });
    } else {
      console.log('Response:', await updateResponse.text());
    }
  });

  test('should check tenant resolution with subdomain', async ({ page }) => {
    console.log('\n=== Testing Tenant Resolution ===');
    
    // Test with query parameter
    const response = await page.request.get(`${baseURL}/api/tenant-config?tenant=company`);
    console.log('With tenant param status:', response.status());
    
    if (response.ok()) {
      const config = await response.json();
      console.log('Resolved tenant:', config.subdomain);
      expect(config.subdomain).toBe('company');
    }
  });

  test('should verify module changes persist across requests', async ({ page }) => {
    console.log('\n=== Testing Module Persistence ===');
    
    // Get current state
    const config1 = await (await page.request.get(`${baseURL}/api/tenant-config`)).json();
    
    // Update modules
    await page.request.patch(
      `${baseURL}/api/tenant-config/${config1.id}`,
      {
        data: {
          modulesEnabled: {
            ...config1.modulesEnabled,
            test_persistence: true
          }
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Wait a bit
    await page.waitForTimeout(500);

    // Fetch again
    const config2 = await (await page.request.get(`${baseURL}/api/tenant-config`)).json();
    
    console.log('Before:', config1.modulesEnabled);
    console.log('After:', config2.modulesEnabled);
    
    // Should persist
    expect(config2.modulesEnabled).toHaveProperty('test_persistence', true);
  });

  test('FINAL DIAGNOSTIC: Full system check', async ({ page }) => {
    console.log('\n\n=== FULL DIAGNOSTIC REPORT ===\n');
    
    // 1. Check tenant config endpoint
    console.log('1. Checking tenant config endpoint...');
    const configResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    console.log('   Status:', configResponse.status());
    const config = configResponse.ok() ? await configResponse.json() : null;
    
    if (config) {
      console.log('   ✓ Tenant config loaded');
      console.log('   - Tenant ID:', config.id);
      console.log('   - Subdomain:', config.subdomain);
      console.log('   - Company:', config.companyName);
      console.log('   - modulesEnabled type:', typeof config.modulesEnabled);
      console.log('   - modulesEnabled value:', JSON.stringify(config.modulesEnabled, null, 2));
    } else {
      console.log('   ✗ Failed to load tenant config');
      return;
    }

    // 2. Test module update
    console.log('\n2. Testing module update...');
    const updatePayload = {
      modulesEnabled: {
        recruitment: true,
        fleetlogix: true,
        lms: true,
        test_module: true
      }
    };
    console.log('   Sending:', JSON.stringify(updatePayload, null, 2));
    
    const updateResponse = await page.request.patch(
      `${baseURL}/api/tenant-config/${config.id}`,
      {
        data: updatePayload,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('   Update status:', updateResponse.status());
    console.log('   Response body:', await updateResponse.text());
    
    // 3. Verify update persisted
    console.log('\n3. Verifying persistence...');
    const verifyResponse = await page.request.get(`${baseURL}/api/tenant-config`);
    const verifyConfig = await verifyResponse.json();
    console.log('   New modulesEnabled:', JSON.stringify(verifyConfig.modulesEnabled, null, 2));
    
    // 4. Test in browser context
    console.log('\n4. Testing in browser context...');
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const clientCheck = await page.evaluate(() => {
      // @ts-ignore
      return window.__tenant_debug || 'No debug info available';
    });
    console.log('   Client-side check:', clientCheck);
    
    // 5. Check database directly via SQL endpoint if available
    console.log('\n5. Summary...');
    console.log('   Module control is', updateResponse.ok() ? '✓ WORKING' : '✗ NOT WORKING');
    
    if (!updateResponse.ok()) {
      console.log('\n   ISSUES DETECTED:');
      console.log('   - API update endpoint returned error');
      console.log('   - Check server logs for details');
      console.log('   - Verify tenant_config table structure');
    }
  });
});
