# FleetLogix API Documentation

## ✅ Full CRUD Operations Available

You have complete Create, Read, Update, Delete functionality for:
- **Drivers**
- **Vehicles**
- **Routes**
- **Loads**
- **Reconciliation**
- **Salary Reports**

---

## 🚗 DRIVERS API

### List All Drivers
```http
GET /api/fleetlogix/drivers
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenantId": "tenant-id",
    "name": "John Doe",
    "idNumber": "8501015800083",
    "licenseNumber": "ABC123",
    "licenseType": "Code 14",
    "phone": "+27123456789",
    "email": "john@example.com",
    "address": "123 Main St",
    "emergencyContact": "Jane Doe",
    "emergencyPhone": "+27987654321",
    "hireDate": "2024-01-15",
    "status": "active",
    "basicSalary": "15000.00",
    "salaryPeriod": "monthly",
    "bonusPerLoad": "500.00",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Driver
```http
POST /api/fleetlogix/drivers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe",
  "idNumber": "8501015800083",
  "licenseNumber": "ABC123",
  "licenseType": "Code 14",
  "phone": "+27123456789",
  "email": "john@example.com",
  "address": "123 Main St",
  "emergencyContact": "Jane Doe",
  "emergencyPhone": "+27987654321",
  "hireDate": "2024-01-15",
  "basicSalary": 15000.00,
  "salaryPeriod": "monthly",
  "bonusPerLoad": 500.00
}
```

### Update Driver
```http
PUT /api/fleetlogix/drivers/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "basicSalary": 16000.00,
  "bonusPerLoad": 550.00,
  "status": "active"
}
```

### Delete Driver
```http
DELETE /api/fleetlogix/drivers/{id}
Authorization: Bearer {token}
```

---

## 🚚 VEHICLES API

### List All Vehicles
```http
GET /api/fleetlogix/vehicles
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenantId": "tenant-id",
    "registration": "ABC-123-GP",
    "registrationNumber": "ABC-123-GP",
    "make": "Mercedes-Benz",
    "model": "Actros",
    "year": 2022,
    "vin": "WDB9634121L123456",
    "fleetNumber": "FLEET-001",
    "fleetCode": "FLEET-001",
    "type": "Rigid Truck",
    "vehicleType": "Rigid Truck",
    "capacity": "30000.00",
    "fuelType": "Diesel",
    "status": "active",
    "purchaseDate": "2022-01-15",
    "lastServiceDate": "2024-12-01",
    "nextServiceDate": "2025-03-01"
  }
]
```

### Create Vehicle
```http
POST /api/fleetlogix/vehicles
Authorization: Bearer {token}
Content-Type: application/json

{
  "registration": "ABC-123-GP",
  "make": "Mercedes-Benz",
  "model": "Actros",
  "year": 2022,
  "vin": "WDB9634121L123456",
  "fleetNumber": "FLEET-001",
  "type": "Rigid Truck",
  "capacity": 30000.00,
  "fuelType": "Diesel",
  "status": "active",
  "purchaseDate": "2022-01-15",
  "lastServiceDate": "2024-12-01",
  "nextServiceDate": "2025-03-01"
}
```

### Update Vehicle
```http
PUT /api/fleetlogix/vehicles/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "maintenance",
  "lastServiceDate": "2025-01-15",
  "nextServiceDate": "2025-04-15"
}
```

### Delete Vehicle
```http
DELETE /api/fleetlogix/vehicles/{id}
Authorization: Bearer {token}
```

---

## 🛣️ ROUTES API

### List All Routes
```http
GET /api/fleetlogix/routes
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenantId": "tenant-id",
    "name": "JHB to DBN",
    "origin": "Johannesburg",
    "loadingPoint": "Johannesburg",
    "destination": "Durban",
    "distance": "600.00",
    "estimatedDuration": 480,
    "status": "active",
    "normalRate": "3.3",
    "holidayRate": "4.8",
    "normalAmount": "1980.00",
    "holidayAmount": "2880.00"
  }
]
```

### Create Route
```http
POST /api/fleetlogix/routes
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "JHB to DBN",
  "origin": "Johannesburg",
  "destination": "Durban",
  "distance": 600.00,
  "estimatedDuration": 480,
  "status": "active"
}
```

### Update Route
```http
PUT /api/fleetlogix/routes/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "distance": 610.00,
  "estimatedDuration": 490,
  "status": "active"
}
```

### Delete Route
```http
DELETE /api/fleetlogix/routes/{id}
Authorization: Bearer {token}
```

---

## 📦 LOADS API

### List All Loads
```http
GET /api/fleetlogix/loads
Authorization: Bearer {token}

# Optional query parameters:
?startDate=2025-01-01
&endDate=2025-01-31
&driverId=uuid
&vehicleId=uuid
&status=delivered
```

**Response:**
```json
[
  {
    "load": {
      "id": "uuid",
      "tenantId": "tenant-id",
      "loadNumber": "LOAD-2025-001",
      "driverId": "driver-uuid",
      "vehicleId": "vehicle-uuid",
      "routeId": "route-uuid",
      "loadDate": "2025-01-15",
      "deliveryDate": "2025-01-16",
      "cargoDescription": "Building materials",
      "weight": "25000.00",
      "revenue": "3500.00",
      "expenses": "1200.00",
      "status": "delivered"
    },
    "driver": {
      "id": "uuid",
      "name": "John Doe"
    },
    "vehicle": {
      "id": "uuid",
      "registration": "ABC-123-GP"
    },
    "route": {
      "id": "uuid",
      "name": "JHB to DBN",
      "origin": "Johannesburg",
      "destination": "Durban"
    }
  }
]
```

### Create Load
```http
POST /api/fleetlogix/loads
Authorization: Bearer {token}
Content-Type: application/json

{
  "loadNumber": "LOAD-2025-001",
  "driverId": "driver-uuid",
  "vehicleId": "vehicle-uuid",
  "routeId": "route-uuid",
  "loadDate": "2025-01-15",
  "deliveryDate": "2025-01-16",
  "cargoDescription": "Building materials",
  "weight": 25000.00,
  "revenue": 3500.00,
  "expenses": 1200.00,
  "status": "in_transit"
}
```

### Update Load
```http
PUT /api/fleetlogix/loads/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "delivered",
  "deliveryDate": "2025-01-16",
  "revenue": 3500.00,
  "expenses": 1250.00
}
```

### Delete Load
```http
DELETE /api/fleetlogix/loads/{id}
Authorization: Bearer {token}
```

---

## 📊 RECONCILIATION API

### Get Reconciliation Report
```http
GET /api/fleetlogix/reconciliation
Authorization: Bearer {token}

# Optional query parameters:
?month=2025-01
```

**Response:**
```json
[
  {
    "id": "uuid",
    "loadNumber": "LOAD-2025-001",
    "loadDate": "2025-01-15",
    "route": "JHB to DBN",
    "distance": 600.00,
    "calculatedAmount": 2100.00,
    "actualAmount": 3500.00,
    "variance": 1400.00,
    "status": "pending",
    "driverName": "John Doe",
    "vehicleReg": "ABC-123-GP"
  }
]
```

---

## 💰 SALARY REPORTS API

### Get Driver Salary Report
```http
GET /api/fleetlogix/salaries/report/{month}
Authorization: Bearer {token}

# Example: /api/fleetlogix/salaries/report/2025-01
```

**Response:**
```json
[
  {
    "driverId": "uuid",
    "driverName": "John Doe",
    "vehicleReg": "ABC-123-GP",
    "totalRevenue": 75000.00,
    "totalLoads": 25,
    "basicSalary": 15000.00,
    "bonusPerLoad": 500.00,
    "totalBonus": 12500.00,
    "totalEarnings": 27500.00
  }
]
```

---

## 📝 Usage Examples

### JavaScript/TypeScript

```typescript
// Create a new driver
const response = await fetch('/api/fleetlogix/drivers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "John Doe",
    licenseNumber: "ABC123",
    licenseType: "Code 14",
    phone: "+27123456789",
    basicSalary: 15000.00,
    bonusPerLoad: 500.00
  })
});

const driver = await response.json();
console.log('Created driver:', driver);

// Get all loads for a date range
const loadsResponse = await fetch(
  '/api/fleetlogix/loads?startDate=2025-01-01&endDate=2025-01-31',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const loads = await loadsResponse.json();
console.log('Loads:', loads);

// Update a vehicle
await fetch(`/api/fleetlogix/vehicles/${vehicleId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'maintenance',
    lastServiceDate: '2025-01-15'
  })
});
```

### React Query Hook Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Get drivers
export function useDrivers() {
  return useQuery({
    queryKey: ['fleetlogix', 'drivers'],
    queryFn: async () => {
      const res = await fetch('/api/fleetlogix/drivers');
      return res.json();
    }
  });
}

// Create driver
export function useCreateDriver() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (driver: any) => {
      const res = await fetch('/api/fleetlogix/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driver)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleetlogix', 'drivers'] });
    }
  });
}
```

---

## 🔒 Authentication

All endpoints require authentication. Include the bearer token in the Authorization header:

```
Authorization: Bearer {your-jwt-token}
```

Get the token by logging in:
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

---

## ✅ Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 🎯 Summary

**You have FULL CRUD functionality for:**
- ✅ Drivers (with salary fields)
- ✅ Vehicles
- ✅ Routes
- ✅ Loads
- ✅ Reconciliation reporting
- ✅ Salary reporting

**All operations work with:**
- Multi-tenant isolation (tenantId)
- UUID-based IDs
- Full validation
- Error handling
- Proper HTTP methods

**Ready to use!** Just update your UI to call these endpoints.
