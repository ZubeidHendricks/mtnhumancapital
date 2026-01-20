#!/bin/bash

echo "======================================"
echo "TENANT MODULE CONTROL DIAGNOSTIC TEST"
echo "======================================"
echo ""

BASE_URL="${BASE_URL:-http://localhost:5000}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get tenant config
echo "1. Fetching tenant config..."
TENANT_CONFIG=$(curl -s "$BASE_URL/api/tenant-config")
echo "$TENANT_CONFIG" | jq '.' 2>/dev/null || echo "$TENANT_CONFIG"

TENANT_ID=$(echo "$TENANT_CONFIG" | jq -r '.id' 2>/dev/null)
MODULES=$(echo "$TENANT_CONFIG" | jq '.modulesEnabled' 2>/dev/null)

if [ "$TENANT_ID" != "null" ] && [ ! -z "$TENANT_ID" ]; then
    echo -e "${GREEN}✓ Tenant config loaded${NC}"
    echo "  Tenant ID: $TENANT_ID"
    echo "  Current modules:"
    echo "$MODULES" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Failed to load tenant config${NC}"
    exit 1
fi

echo ""
echo "2. Checking modulesEnabled type..."
MODULE_TYPE=$(echo "$TENANT_CONFIG" | jq -r 'type' 2>/dev/null)
MODULES_TYPE=$(echo "$MODULES" | jq -r 'type' 2>/dev/null)
echo "  Config type: $MODULE_TYPE"
echo "  modulesEnabled type: $MODULES_TYPE"

if [ "$MODULES_TYPE" == "object" ]; then
    echo -e "${GREEN}✓ modulesEnabled is an object${NC}"
else
    echo -e "${RED}✗ modulesEnabled is not an object (is: $MODULES_TYPE)${NC}"
fi

echo ""
echo "3. Testing module update..."

# Create update payload
UPDATE_PAYLOAD=$(cat <<EOF
{
  "modulesEnabled": {
    "recruitment": true,
    "fleetlogix": true,
    "lms": true,
    "workforce_intelligence": true,
    "integrity": true,
    "onboarding": true
  }
}
EOF
)

echo "  Sending update request..."
UPDATE_RESPONSE=$(curl -s -X PATCH \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" \
  "$BASE_URL/api/tenant-config/$TENANT_ID")

echo "  Response:"
echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"

# Check if update was successful
UPDATED_MODULES=$(echo "$UPDATE_RESPONSE" | jq '.modulesEnabled' 2>/dev/null)
if [ "$UPDATED_MODULES" != "null" ] && [ ! -z "$UPDATED_MODULES" ]; then
    echo -e "${GREEN}✓ Module update successful${NC}"
    echo "  Updated modules:"
    echo "$UPDATED_MODULES" | jq '.'
else
    echo -e "${RED}✗ Module update failed${NC}"
    echo "  Check if authentication is required"
fi

echo ""
echo "4. Verifying persistence..."
sleep 1
VERIFY_CONFIG=$(curl -s "$BASE_URL/api/tenant-config")
VERIFY_MODULES=$(echo "$VERIFY_CONFIG" | jq '.modulesEnabled' 2>/dev/null)

echo "  Current modules after update:"
echo "$VERIFY_MODULES" | jq '.'

# Compare before and after
FLEETLOGIX_ENABLED=$(echo "$VERIFY_MODULES" | jq -r '.fleetlogix' 2>/dev/null)
LMS_ENABLED=$(echo "$VERIFY_MODULES" | jq -r '.lms' 2>/dev/null)

echo ""
echo "  Module status:"
echo "  - fleetlogix: $FLEETLOGIX_ENABLED"
echo "  - lms: $LMS_ENABLED"

if [ "$FLEETLOGIX_ENABLED" == "true" ]; then
    echo -e "${GREEN}✓ fleetlogix enabled and persisted${NC}"
else
    echo -e "${YELLOW}⚠ fleetlogix not enabled${NC}"
fi

echo ""
echo "5. Testing module-specific API access..."

# Test FleetLogix API
echo "  Testing FleetLogix drivers endpoint..."
FLEETLOGIX_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/fleetlogix/drivers")
HTTP_STATUS=$(echo "$FLEETLOGIX_RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
RESPONSE_BODY=$(echo "$FLEETLOGIX_RESPONSE" | sed '/HTTP_STATUS/d')

echo "    HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "    ${GREEN}✓ FleetLogix API accessible${NC}"
elif [ "$HTTP_STATUS" == "403" ]; then
    echo -e "    ${YELLOW}⚠ FleetLogix API forbidden (module disabled?)${NC}"
    echo "    Response: $RESPONSE_BODY"
elif [ "$HTTP_STATUS" == "401" ]; then
    echo -e "    ${YELLOW}⚠ Authentication required${NC}"
else
    echo -e "    ${YELLOW}⚠ Status $HTTP_STATUS${NC}"
    echo "    Response: $RESPONSE_BODY"
fi

echo ""
echo "6. Database check..."
if [ ! -z "$DATABASE_URL" ]; then
    echo "  Checking database directly..."
    psql "$DATABASE_URL" -c "SELECT subdomain, company_name, modules_enabled FROM tenant_config LIMIT 5;" 2>/dev/null || echo "  Database query failed"
else
    echo "  DATABASE_URL not set, skipping database check"
fi

echo ""
echo "======================================"
echo "DIAGNOSTIC COMPLETE"
echo "======================================"

# Summary
echo ""
echo "SUMMARY:"
if [ "$MODULES_TYPE" == "object" ] && [ "$FLEETLOGIX_ENABLED" == "true" ]; then
    echo -e "${GREEN}✓ Module control system appears to be working${NC}"
    echo "  - Tenant config loads correctly"
    echo "  - modulesEnabled is proper object type"
    echo "  - Module updates work"
    echo "  - Changes persist"
else
    echo -e "${RED}✗ Module control system has issues:${NC}"
    [ "$MODULES_TYPE" != "object" ] && echo "  - modulesEnabled is not an object"
    [ "$FLEETLOGIX_ENABLED" != "true" ] && echo "  - Module updates not persisting"
fi
