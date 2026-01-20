import fetch from 'node-fetch';

async function testFleetLogix() {
  console.log('🔍 Testing FleetLogix API endpoints...\n');

  // First, login to get auth token
  console.log('🔐 Logging in...');
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin@fleetlogix.co.za',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    process.exit(1);
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('✅ Login successful!\n');

  // Test each endpoint
  const endpoints = [
    '/api/fleetlogix/drivers',
    '/api/fleetlogix/vehicles',
    '/api/fleetlogix/routes',
    '/api/fleetlogix/loads'
  ];

  for (const endpoint of endpoints) {
    console.log(`📡 Testing ${endpoint}...`);
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        const count = Array.isArray(data) ? data.length : 'N/A';
        console.log(`✅ ${response.status} - ${count} items`);
      } else {
        console.log(`❌ ${response.status} - Error: ${data.error || 'Unknown'}`);
        console.log(`   Check server console for: "FleetLogix ${endpoint.split('/').pop()} error:"`);
      }
    } catch (error) {
      console.log(`❌ Request failed:`, error.message);
    }
    
    console.log('');
  }

  console.log('\n✅ Test complete! Check server console for detailed error messages.');
}

testFleetLogix().catch(console.error);
