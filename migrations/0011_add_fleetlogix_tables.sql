-- Fleet Logix Tables Migration
-- This migration adds all tables required for Fleet Logix functionality

-- Fleet Logix Drivers
CREATE TABLE IF NOT EXISTS fleetlogix_drivers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT,
  contact_number TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  hire_date DATE,
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Vehicles
CREATE TABLE IF NOT EXISTS fleetlogix_vehicles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  fleet_code TEXT,
  vehicle_type TEXT,
  capacity DECIMAL(10, 2),
  status TEXT DEFAULT 'active',
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Routes
CREATE TABLE IF NOT EXISTS fleetlogix_routes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  loading_point TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance DECIMAL(10, 2) NOT NULL,
  normal_rate DECIMAL(10, 2),
  holiday_rate DECIMAL(10, 2),
  normal_amount DECIMAL(10, 2),
  holiday_amount DECIMAL(10, 2),
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Loads
CREATE TABLE IF NOT EXISTS fleetlogix_loads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  load_date DATE NOT NULL,
  route_id VARCHAR REFERENCES fleetlogix_routes(id),
  vehicle_id VARCHAR REFERENCES fleetlogix_vehicles(id),
  driver_id VARCHAR REFERENCES fleetlogix_drivers(id),
  ticket_number_b TEXT,
  ticket_number_w TEXT,
  tonnage_b DECIMAL(10, 2),
  tonnage_w DECIMAL(10, 2),
  distance DECIMAL(10, 2),
  rate DECIMAL(10, 2),
  is_holiday BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Driver Salaries
CREATE TABLE IF NOT EXISTS fleetlogix_driver_salaries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id VARCHAR REFERENCES fleetlogix_drivers(id),
  month VARCHAR(7) NOT NULL,
  load_id VARCHAR REFERENCES fleetlogix_loads(id),
  route_name TEXT,
  vehicle_reg TEXT,
  tonnage DECIMAL(10, 2),
  distance DECIMAL(10, 2),
  rate DECIMAL(10, 2),
  amount DECIMAL(10, 2),
  is_holiday BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Load Reconciliation
CREATE TABLE IF NOT EXISTS fleetlogix_load_reconciliation (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,
  load_id VARCHAR REFERENCES fleetlogix_loads(id),
  loading_point TEXT,
  destination TEXT,
  distance DECIMAL(10, 2),
  normal_rate DECIMAL(10, 2),
  holiday_rate DECIMAL(10, 2),
  calculated_amount DECIMAL(10, 2),
  actual_amount DECIMAL(10, 2),
  variance DECIMAL(10, 2),
  reconciliation_status TEXT DEFAULT 'pending',
  notes TEXT,
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Rate Schedules
CREATE TABLE IF NOT EXISTS fleetlogix_rate_schedules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id VARCHAR REFERENCES fleetlogix_routes(id),
  effective_date DATE NOT NULL,
  normal_rate_per_km DECIMAL(10, 2),
  holiday_rate_per_km DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet Logix Holidays
CREATE TABLE IF NOT EXISTS fleetlogix_holidays (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fleetlogix_drivers_tenant ON fleetlogix_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_vehicles_tenant ON fleetlogix_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_routes_tenant ON fleetlogix_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_loads_tenant ON fleetlogix_loads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_loads_date ON fleetlogix_loads(load_date);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_loads_driver ON fleetlogix_loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_loads_vehicle ON fleetlogix_loads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_salaries_tenant ON fleetlogix_driver_salaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_salaries_month ON fleetlogix_driver_salaries(month);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_salaries_driver ON fleetlogix_driver_salaries(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_reconciliation_tenant ON fleetlogix_load_reconciliation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_reconciliation_month ON fleetlogix_load_reconciliation(month);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_rate_schedules_tenant ON fleetlogix_rate_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_rate_schedules_route ON fleetlogix_rate_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_holidays_tenant ON fleetlogix_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleetlogix_holidays_date ON fleetlogix_holidays(holiday_date);
