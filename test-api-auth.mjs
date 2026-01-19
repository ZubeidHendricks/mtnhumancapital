// Test FleetLogix API authentication
async function testAuth() {
  console.log("🔐 Testing FleetLogix API Authentication\n");

  // Step 1: Login
  console.log("Step 1: Logging in...");
  const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "admin@fleetlogix.co.za",
      password: "admin123"
    })
  });

  if (!loginResponse.ok) {
    console.log("❌ Login failed:", await loginResponse.text());
    return;
  }

  const { token, user } = await loginResponse.json();
  console.log("✅ Login successful!");
  console.log("  User:", user.username);
  console.log("  Tenant ID:", user.tenantId);
  console.log("  Token:", token.substring(0, 30) + "...\n");

  // Step 2: Test API endpoints
  const endpoints = [
    "/api/fleetlogix/drivers",
    "/api/fleetlogix/vehicles",
    "/api/fleetlogix/routes",
    "/api/fleetlogix/loads"
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ SUCCESS - Received ${Array.isArray(data) ? data.length : '?'} items`);
    } else {
      const error = await response.text();
      console.log(`  ❌ FAILED - ${response.status}: ${error}`);
    }
  }
}

testAuth().catch(console.error);
