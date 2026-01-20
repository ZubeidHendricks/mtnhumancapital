# Fleet Logix Development Specification

## Overview
Fleet Logix is a comprehensive fleet and logistics management system for tracking driver salaries, load reconciliation, route costing, and operational metrics.

## Data Structures

### 1. Driver Salaries Module
**Purpose**: Track driver compensation based on routes, tonnage, and rates

**Key Fields**:
- Date (DD/MM/YYYY)
- Route (e.g., "Exxaro Leeuwpan - Sasol Bosjesspruit")
- Vehicle Registration # (e.g., "KX31ZJGP - FL13")
- Driver Name
- Ticket Numbers (B, W)
- Tonnage (B, W)
- Distance (KM)
- Rate (R)
- Normal Rate Per Kilometer: 3.5
- Sunday & Holiday Rate: 5.0

**Sheets**: Multiple driver sheets (numbered 1-161) + Data sheet with master route info

### 2. Load Reconciliation Module
**Purpose**: Track and reconcile loads, calculate costs, manage routes

**Key Fields**:
- Loading Point
- Destination
- Distance (KM)
- Normal Rate Per Kilometer: 3.3
- Sunday & Holiday Rate: 4.8
- Calculated Amounts

**Sheets**: Monthly sheets (Jan-Dec) + Data + Costing sheets

## Features to Develop

### Phase 1: Core Data Management
1. ✅ Database schema for fleet operations
2. ✅ Driver management (CRUD)
3. ✅ Vehicle management (CRUD)
4. ✅ Route management with distance & costing
5. ✅ Load tracking with reconciliation

### Phase 2: Salary & Payment Processing
1. Driver salary calculations
2. Rate differential handling (normal vs. weekend/holiday)
3. Tonnage-based compensation
4. Monthly salary reports
5. Payment history tracking

### Phase 3: Load & Route Management
1. Load creation and tracking
2. Route assignment to drivers/vehicles
3. Real-time load status updates
4. Load reconciliation dashboard
5. Distance and cost calculations

### Phase 4: Reporting & Analytics
1. Driver performance reports
2. Route profitability analysis
3. Vehicle utilization metrics
4. Monthly reconciliation reports
5. Cost analysis and optimization

### Phase 5: Integration
1. Excel import/export functionality
2. PDF report generation
3. Dashboard visualizations
4. Real-time notifications
5. Mobile-friendly interface

## Technical Stack
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React with TypeScript
- **UI Components**: shadcn/ui
- **File Processing**: xlsx library
- **Reporting**: PDF generation

## Database Schema Requirements

### Tables Needed:
1. `drivers` - Driver information
2. `vehicles` - Fleet vehicle details
3. `routes` - Route definitions with distances
4. `loads` - Load records
5. `driver_salaries` - Salary calculations
6. `load_reconciliation` - Load tracking and reconciliation
7. `rate_schedules` - Rate cards for different scenarios
8. `holidays` - Holiday calendar for rate calculations

## API Endpoints

### Driver Management
- GET /api/fleetlogix/drivers
- POST /api/fleetlogix/drivers
- PUT /api/fleetlogix/drivers/:id
- DELETE /api/fleetlogix/drivers/:id

### Load Management
- GET /api/fleetlogix/loads
- POST /api/fleetlogix/loads
- PUT /api/fleetlogix/loads/:id
- GET /api/fleetlogix/loads/reconciliation

### Salary Management
- GET /api/fleetlogix/salaries
- POST /api/fleetlogix/salaries/calculate
- GET /api/fleetlogix/salaries/reports/:month

### Route & Costing
- GET /api/fleetlogix/routes
- POST /api/fleetlogix/routes
- GET /api/fleetlogix/costing/calculate

## Next Steps
1. Create database migrations
2. Implement API endpoints
3. Build UI components
4. Add Excel import functionality
5. Create reporting dashboards
