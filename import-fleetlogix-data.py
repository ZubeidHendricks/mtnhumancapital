#!/usr/bin/env python3
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from datetime import datetime

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://neondb_owner:npg_FYlfWNThZ0n6@ep-cool-hall-af1nklal.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require')

# Files
LOADS_FILE = "/home/zubeid/AvatarHumanCapital/attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx"
SALARY_FILE = "/home/zubeid/AvatarHumanCapital/attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx"

def get_tenant_id(conn):
    """Get tenant_id from existing user"""
    with conn.cursor() as cur:
        cur.execute("SELECT tenant_id FROM users WHERE username = 'fleetlogix' LIMIT 1")
        result = cur.fetchone()
        if result:
            return result[0]
        cur.execute("SELECT tenant_id FROM users LIMIT 1")
        result = cur.fetchone()
        return result[0] if result else None

def import_data():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    
    try:
        tenant_id = get_tenant_id(conn)
        if not tenant_id:
            print("❌ No tenant found!")
            return
        
        print(f"✓ Using tenant_id: {tenant_id}")
        
        # Read load data
        df_loads = pd.read_excel(LOADS_FILE, sheet_name='Data')
        print(f"✓ Loaded {len(df_loads)} records from Excel")
        
        # Extract unique drivers, vehicles, and routes
        drivers = {}
        vehicles = {}
        routes = {}
        loads = []
        
        for idx, row in df_loads.iterrows():
            driver_name = str(row['Driver Name']).strip() if pd.notna(row['Driver Name']) else None
            reg_number = str(row['Reg #']).strip() if pd.notna(row['Reg #']) else None
            route_name = str(row['Route']).strip() if pd.notna(row['Route']) else None
            distance = float(row['Distance (Km)']) if pd.notna(row['Distance (Km)']) else 0
            rate = float(row['Rate']) if pd.notna(row['Rate']) else 0
            normal_rate = float(row['Normal Rate Per  Kilometer      ']) if pd.notna(row['Normal Rate Per  Kilometer      ']) else 3.3
            holiday_rate = float(row[' Sunday &Holiday Rate']) if pd.notna(row[' Sunday &Holiday Rate']) else 4.8
            
            if driver_name and driver_name != 'nan':
                drivers[driver_name] = {
                    'name': driver_name,
                    'license_number': f'DL{hash(driver_name) % 1000000:06d}',
                    'status': 'active'
                }
            
            if reg_number and reg_number != 'nan':
                vehicles[reg_number] = {
                    'registration': reg_number,
                    'fleet_number': reg_number.split('-')[1] if '-' in reg_number else reg_number[:6],
                    'type': 'Truck',
                    'capacity': 34.00,
                    'status': 'active'
                }
            
            if route_name and route_name != 'nan':
                parts = route_name.split('-')
                origin = parts[0].strip() if len(parts) > 0 else route_name
                dest = parts[1].strip() if len(parts) > 1 else 'Unknown'
                
                routes[route_name] = {
                    'name': route_name,
                    'origin': origin,
                    'destination': dest,
                    'distance': distance,
                    'normal_rate': normal_rate,
                    'holiday_rate': holiday_rate
                }
        
        # Insert drivers
        with conn.cursor() as cur:
            for d in drivers.values():
                cur.execute("""
                    INSERT INTO fleetlogix_drivers (id, name, license_number, status, tenant_id, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (d['name'], d['license_number'], d['status'], tenant_id))
            print(f"✓ Inserted {len(drivers)} drivers")
        
        # Insert vehicles
        with conn.cursor() as cur:
            for v in vehicles.values():
                cur.execute("""
                    INSERT INTO fleetlogix_vehicles (id, registration, fleet_number, type, capacity, status, tenant_id, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (v['registration'], v['fleet_number'], v['type'], v['capacity'], v['status'], tenant_id))
            print(f"✓ Inserted {len(vehicles)} vehicles")
        
        # Insert routes
        with conn.cursor() as cur:
            for r in routes.values():
                cur.execute("""
                    INSERT INTO fleetlogix_routes (id, name, origin, destination, distance, tenant_id, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (r['name'], r['origin'], r['destination'], r['distance'], tenant_id))
            print(f"✓ Inserted {len(routes)} routes")
        
        # Insert loads (January 2026 data)
        with conn.cursor() as cur:
            for idx, row in df_loads.head(30).iterrows():  # Import first 30 loads
                driver_name = str(row['Driver Name']).strip() if pd.notna(row['Driver Name']) else None
                reg_number = str(row['Reg #']).strip() if pd.notna(row['Reg #']) else None
                route_name = str(row['Route']).strip() if pd.notna(row['Route']) else None
                
                if not driver_name or driver_name == 'nan':
                    continue
                
                # Get IDs
                cur.execute("SELECT id FROM fleetlogix_drivers WHERE name = %s AND tenant_id = %s LIMIT 1", (driver_name, tenant_id))
                driver = cur.fetchone()
                
                cur.execute("SELECT id FROM fleetlogix_vehicles WHERE registration = %s AND tenant_id = %s LIMIT 1", (reg_number, tenant_id))
                vehicle = cur.fetchone()
                
                if route_name and route_name != 'nan':
                    cur.execute("SELECT id FROM fleetlogix_routes WHERE name = %s AND tenant_id = %s LIMIT 1", (route_name, tenant_id))
                    route = cur.fetchone()
                else:
                    route = None
                
                if driver and vehicle and route:
                    distance = float(row['Distance (Km)']) if pd.notna(row['Distance (Km)']) else 0
                    rate = float(row['Rate']) if pd.notna(row['Rate']) else 0
                    
                    cur.execute("""
                        INSERT INTO fleetlogix_loads 
                        (id, load_date, route_id, vehicle_id, driver_id, weight, revenue, status, tenant_id, created_at, load_number)
                        VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, 'completed', %s, NOW(), %s)
                    """, (
                        f'2026-01-{(idx % 28) + 1:02d}',  # Spread across January
                        route[0], vehicle[0], driver[0],
                        30.0 + (idx % 5), rate, tenant_id,
                        f'LOAD{idx+1:06d}'
                    ))
            
            print(f"✓ Inserted loads for January 2026")
        
        conn.commit()
        print("\n🎉 FleetLogix data imported successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    import_data()
