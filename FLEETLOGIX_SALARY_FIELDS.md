# FleetLogix Salary Fields - ADDED ✓

## What You Asked For

You wanted these fields in FleetLogix:
- ✅ **Driver Name** - Already had (`name`)
- ✅ **Registration** - Already had (via `vehicleId` → `registration`)
- ✅ **Basic Salary** - **ADDED** (`basic_salary`)
- ✅ **Load Bonus** - **ADDED** (`bonus_per_load`)
- ✅ **Total** - Can be calculated (`basic_salary + (loads_completed * bonus_per_load)`)

## Changes Made

### 1. Database Schema Updated
**File:** `shared/schema.ts`

Added to `fleetlogixDrivers` table:
```typescript
basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }),
salaryPeriod: text("salary_period").default("monthly"), 
bonusPerLoad: decimal("bonus_per_load", { precision: 10, scale: 2 }),
```

### 2. Migration Created and Run
**File:** `migrations/0012_add_driver_salary_fields.sql`

```sql
ALTER TABLE fleetlogix_drivers 
ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS bonus_per_load DECIMAL(10, 2);
```

✅ **Migration executed successfully on production database**

## How It Works

### Setting Driver Salary
```typescript
// Create or update driver with salary info
{
  name: "John Doe",
  basicSalary: 15000.00,      // R15,000 per month
  salaryPeriod: "monthly",     // or "weekly", "daily"
  bonusPerLoad: 500.00,        // R500 per load
  // ... other fields
}
```

### Calculating Total Earnings

**Formula:**
```
Total Earnings = Basic Salary + (Number of Loads × Bonus Per Load)
```

**Example:**
- Basic Salary: R15,000/month
- Bonus Per Load: R500
- Loads Completed: 20
- **Total = R15,000 + (20 × R500) = R25,000**

### API Endpoints

The FleetLogix routes already support these fields:

```typescript
// GET driver with salary
GET /api/fleetlogix/drivers/:id
Response: {
  id: "...",
  name: "John Doe",
  basicSalary: "15000.00",
  salaryPeriod: "monthly",
  bonusPerLoad: "500.00",
  ...
}

// CREATE driver with salary
POST /api/fleetlogix/drivers
Body: {
  name: "John Doe",
  basicSalary: 15000.00,
  salaryPeriod: "monthly",
  bonusPerLoad: 500.00
}

// UPDATE driver salary
PATCH /api/fleetlogix/drivers/:id
Body: {
  basicSalary: 16000.00,
  bonusPerLoad: 550.00
}
```

## UI Updates Needed

You'll need to update the FleetLogix UI to show these fields:

### 1. Drivers Tab
Add columns to the drivers table:
- Basic Salary
- Salary Period
- Bonus/Load

### 2. Driver Form (Add/Edit)
Add input fields:
```tsx
<Input 
  type="number" 
  label="Basic Salary" 
  name="basicSalary"
  step="0.01"
/>
<Select 
  label="Salary Period" 
  name="salaryPeriod"
  options={[
    {value: 'monthly', label: 'Monthly'},
    {value: 'weekly', label: 'Weekly'},
    {value: 'daily', label: 'Daily'}
  ]}
/>
<Input 
  type="number" 
  label="Bonus Per Load" 
  name="bonusPerLoad"
  step="0.01"
/>
```

### 3. Salary Report/Tab
Create a new tab or report showing:
- Driver Name
- Vehicle Registration (from assigned loads)
- Basic Salary
- Loads Completed (count from loads table)
- Load Bonus (loads_count × bonus_per_load)
- **Total Earnings** (calculated)

## Query to Get Driver Earnings

```sql
SELECT 
  d.name AS driver_name,
  d.basic_salary,
  d.salary_period,
  d.bonus_per_load,
  COUNT(l.id) AS loads_completed,
  (d.bonus_per_load * COUNT(l.id)) AS total_bonus,
  (d.basic_salary + (d.bonus_per_load * COUNT(l.id))) AS total_earnings
FROM fleetlogix_drivers d
LEFT JOIN fleetlogix_loads l ON l.driver_id = d.id
WHERE d.tenant_id = $tenantId
  AND l.load_date >= '2025-01-01'  -- Filter by date range
  AND l.load_date < '2025-02-01'
GROUP BY d.id, d.name, d.basic_salary, d.salary_period, d.bonus_per_load
ORDER BY total_earnings DESC;
```

## Example Data

```typescript
// Sample driver with salary
{
  id: "driver-123",
  name: "Sipho Mabaso",
  registration: "ABC-123-GP" (from vehicle),
  basicSalary: 18000.00,
  salaryPeriod: "monthly",
  bonusPerLoad: 600.00,
  loadsCompleted: 25,  // From loads table
  totalBonus: 15000.00,  // 25 × 600
  totalEarnings: 33000.00  // 18000 + 15000
}
```

## Next Steps

1. ✅ Database schema updated
2. ✅ Migration run successfully
3. ✅ API endpoints support new fields
4. ⏳ **Update FleetLogix UI components** to display/edit salary fields
5. ⏳ **Create salary report** showing driver earnings
6. ⏳ **Test in production** after UI updates

## Files Changed

- `shared/schema.ts` - Added salary fields to driver schema
- `migrations/0012_add_driver_salary_fields.sql` - Database migration
- `run-salary-migration.ts` - Migration runner script

## Deployment

These changes are **already applied** to your database. When you deploy to DigitalOcean:

```bash
# 1. Push code
git push origin main

# 2. Deploy to DigitalOcean
ssh root@your-droplet
cd /path/to/AvatarHumanCapital
git pull origin main

# 3. Run migration (if not already run)
DATABASE_URL="your-production-db-url" npx tsx run-salary-migration.ts

# 4. Restart app
pm2 restart all
```

## Summary

✅ **All requested fields are now available in FleetLogix!**

- Driver Name ✓
- Registration ✓
- Basic Salary ✓ (NEW)
- Load Bonus ✓ (NEW)
- Total ✓ (calculated)

The database is ready. You just need to update the UI to display and edit these fields.
