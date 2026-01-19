import { test, expect } from '@playwright/test';

test.describe('FleetLogix API Authentication', () => {
  let authToken: string;
  
  test('should authenticate and access FleetLogix API endpoints without 401 errors', async ({ request }) => {
    console.log('\n=== FleetLogix Authentication Test ===\n');
    
    // Step 1: Register a test user
    console.log('1. Attempting to register test user...');
    const registerResponse = await request.post('http://localhost:5000/api/auth/register', {
      data: {
        username: 'fleetapitest',
        password: 'Test1234!',
        email: 'fleetapitest@example.com',
        firstName: 'Fleet',
        lastName: 'API Tester',
        role: 'admin'
      },
      failOnStatusCode: false
    });
    
    console.log(`   Register status: ${registerResponse.status()}`);
    
    // Step 2: Login
    console.log('\n2. Logging in...');
    const loginResponse = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        username: 'fleetapitest',
        password: 'Test1234!'
      }
    });
    
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    console.log(`   Login successful! Token received: ${authToken.substring(0, 20)}...`);
    
    // Step 3: Test FleetLogix API endpoints with authentication
    console.log('\n3. Testing FleetLogix API endpoints...\n');
    
    const endpoints = [
      '/api/fleetlogix/drivers',
      '/api/fleetlogix/routes',
      '/api/fleetlogix/vehicles',
      '/api/fleetlogix/loads'
    ];
    
    const results: { endpoint: string, status: number, success: boolean }[] = [];
    
    for (const endpoint of endpoints) {
      console.log(`   Testing: ${endpoint}`);
      const response = await request.get(`http://localhost:5000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      });
      
      const success = response.status() !== 401;
      results.push({
        endpoint,
        status: response.status(),
        success
      });
      
      console.log(`   → Status: ${response.status()} ${success ? '✓' : '✗ UNAUTHORIZED'}`);
    }
    
    // Step 4: Report results
    console.log('\n=== Test Results ===\n');
    const unauthorized = results.filter(r => !r.success);
    
    if (unauthorized.length === 0) {
      console.log('✅ All endpoints accessible with authentication');
      console.log(`   Tested ${results.length} endpoints successfully`);
    } else {
      console.log(`❌ ${unauthorized.length} endpoint(s) returned 401 Unauthorized:`);
      unauthorized.forEach(r => console.log(`   - ${r.endpoint} (${r.status})`));
    }
    
    // Assertions
    expect(unauthorized.length).toBe(0);
    
    console.log('\n=== Data from FleetLogix ===\n');
    
    // Fetch and display some data
    const driversResponse = await request.get('http://localhost:5000/api/fleetlogix/drivers', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (driversResponse.ok()) {
      const drivers = await driversResponse.json();
      console.log(`   Drivers in database: ${Array.isArray(drivers) ? drivers.length : 'N/A'}`);
      if (Array.isArray(drivers) && drivers.length > 0) {
        console.log(`   First driver: ${drivers[0].firstName} ${drivers[0].lastName}`);
      }
    }
    
    const vehiclesResponse = await request.get('http://localhost:5000/api/fleetlogix/vehicles', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (vehiclesResponse.ok()) {
      const vehicles = await vehiclesResponse.json();
      console.log(`   Vehicles in database: ${Array.isArray(vehicles) ? vehicles.length : 'N/A'}`);
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        console.log(`   First vehicle: ${vehicles[0].registrationNumber}`);
      }
    }
    
    const routesResponse = await request.get('http://localhost:5000/api/fleetlogix/routes', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (routesResponse.ok()) {
      const routes = await routesResponse.json();
      console.log(`   Routes in database: ${Array.isArray(routes) ? routes.length : 'N/A'}`);
      if (Array.isArray(routes) && routes.length > 0) {
        console.log(`   First route: ${routes[0].origin} → ${routes[0].destination}`);
      }
    }
    
    console.log('\n✅ FleetLogix API authentication test completed successfully\n');
  });
});
