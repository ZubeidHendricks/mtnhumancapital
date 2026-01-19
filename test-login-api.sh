#!/bin/bash

echo "Testing login API..."
echo ""

response=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@fleetlogix.co.za","password":"admin123"}')

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"
echo ""

# Check if token exists in response
if echo "$response" | grep -q "token"; then
  echo "✅ Login successful! Token received."
else
  echo "❌ Login failed! No token in response."
fi
