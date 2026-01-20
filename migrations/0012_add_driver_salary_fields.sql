-- Add salary fields to fleetlogix_drivers table
ALTER TABLE fleetlogix_drivers 
ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS bonus_per_load DECIMAL(10, 2);

-- Add comment
COMMENT ON COLUMN fleetlogix_drivers.basic_salary IS 'Driver base salary amount';
COMMENT ON COLUMN fleetlogix_drivers.salary_period IS 'Salary payment period: monthly, weekly, daily';
COMMENT ON COLUMN fleetlogix_drivers.bonus_per_load IS 'Bonus amount per load completed';
