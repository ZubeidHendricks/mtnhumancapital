#!/bin/bash

# Get fresh token
echo "Getting fresh token..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@fleetlogix.co.za","password":"admin123"}' | jq -r '.token')

echo "Token: ${TOKEN:0:50}..."
echo ""

# Test API with token
echo "Testing /api/fleetlogix/drivers..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/fleetlogix/drivers | jq .

echo ""
echo "Testing /api/fleetlogix/vehicles..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/fleetlogix/vehicles | jq .
