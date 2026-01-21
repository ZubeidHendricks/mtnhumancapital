-- Fleet Logix Production Data Seed Script
-- Run this in your production database through Replit's Database panel

-- First, get your Fleet Logix tenant ID from production
-- You may need to adjust this tenant_id to match your production tenant

-- STEP 1: Insert Routes
INSERT INTO fleetlogix_routes (id, tenant_id, name, origin, destination, distance, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  tc.id,
  r.name,
  r.origin,
  r.destination,
  r.distance,
  'active',
  NOW(),
  NOW()
FROM (VALUES
  ('Exxaro Leeuwpan - Sasol Bosjesspruit', 'Exxaro Leeuwpan', 'Sasol Bosjesspruit', 102),
  ('Exxaro Leeuwpan - Sasol Site 1', 'Exxaro Leeuwpan', 'Sasol Site 1', 85),
  ('Kleinfontein - Arnot', 'Kleinfontein', 'Arnot', 145),
  ('Leeuwport Mine - Lk Tlou', 'Leeuwport Mine', 'Lk Tlou', 29),
  ('Lk Tlou - Middelbult', 'Lk Tlou', 'Middelbult', 70),
  ('Lk Tlou - Sasol Bosjesspruit', 'Lk Tlou', 'Sasol Bosjesspruit', 85),
  ('Lk Tlou - Sasol Impumelelo', 'Lk Tlou', 'Sasol Impumelelo', 73),
  ('Lk Tlou - Shondoni', 'Lk Tlou', 'Shondoni', 58),
  ('LK Tlou - Arnot', 'LK Tlou', 'Arnot', 145),
  ('LK Tlou - Kleinfontein', 'LK Tlou', 'Kleinfontein', 110),
  ('LK Tlou - Hendrina', 'LK Tlou', 'Hendrina', 136),
  ('Matsambisa Kriel - Arnot', 'Matsambisa Kriel', 'Arnot', 126),
  ('Matsambisa Kriel - Hendrina Power', 'Matsambisa Kriel', 'Hendrina Power', 122),
  ('Matsambisa Kriel - Resinga', 'Matsambisa Kriel', 'Resinga', 96),
  ('Mavungwani - Areshumeng', 'Mavungwani', 'Areshumeng', 11),
  ('Mavungwani - Duvha Power Station', 'Mavungwani', 'Duvha Power Station', 82),
  ('Mavungwani - Hendrina Power', 'Mavungwani', 'Hendrina Power', 47),
  ('Mavungwani - Matla Power', 'Mavungwani', 'Matla Power', 108),
  ('Mavungwani - Anthra', 'Mavungwani', 'Anthra', 54),
  ('Mavungwani - Witrand', 'Mavungwani', 'Witrand', 31),
  ('Mwalimu - Umlabu', 'Mwalimu', 'Umlabu', 41),
  ('Resinga Mine - Arnot', 'Resinga Mine', 'Arnot', 52),
  ('Resinga Mine - Camden', 'Resinga Mine', 'Camden', 62),
  ('Resinga Mine - Ipp', 'Resinga Mine', 'Ipp', 5),
  ('Resinga Mine - Matla', 'Resinga Mine', 'Matla', 105)
) AS r(name, origin, destination, distance)
CROSS JOIN tenant_config tc
WHERE tc.company_name ILIKE '%fleet%' OR tc.company_name ILIKE '%logix%'
ON CONFLICT DO NOTHING;

-- STEP 2: Insert Vehicles
INSERT INTO fleetlogix_vehicles (id, tenant_id, registration, fleet_number, type, capacity, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  tc.id,
  v.registration,
  v.fleet_number,
  'Truck',
  34,
  'active',
  NOW(),
  NOW()
FROM (VALUES
  ('KX31ZLGP - FL04', 'FL04'),
  ('KX31ZNGP - FL09', 'FL09'),
  ('KX31ZSGP - FL25', 'FL25'),
  ('KX32BVGP - FL23', 'FL23'),
  ('KX32CMGP - FL10', 'FL10'),
  ('KX32CXGP - FL14', 'FL14'),
  ('KX32DBGP - FL12', 'FL12'),
  ('LC18JZGP - FL29', 'FL29'),
  ('LC18KGGP - FL27', 'FL27'),
  ('LC18KPGP - FL05', 'FL05'),
  ('LC18KWGP - FL06', 'FL06'),
  ('LC18KZGP - FL17', 'FL17'),
  ('LC18LFGP - FL08', 'FL08'),
  ('LC18LKGP - FL02', 'FL02'),
  ('LC18LTGP - FL30', 'FL30'),
  ('LG23HJGP - FL19', 'FL19'),
  ('LG23HTGP - FL15', 'FL15'),
  ('LG23KSGP - FL28', 'FL28'),
  ('LG23MCGP - FL26', 'FL26'),
  ('LG24BKGP - FL24', 'FL24'),
  ('LG24BXGP - FL16', 'FL16'),
  ('LG24CDGP - FL22', 'FL22'),
  ('LG24CKGP - FL21', 'FL21'),
  ('LG24GBGP - FL20', 'FL20'),
  ('LG24GGGP - FL03', 'FL03'),
  ('LG24GMGP - FL01', 'FL01'),
  ('LG24GXGP - FL11', 'FL11'),
  ('LG24HFGP - FL07', 'FL07'),
  ('LG24HKGP - FL31', 'FL31'),
  ('LG29CZGP - FL18', 'FL18'),
  ('KX31ZJGP - FL13', 'FL13'),
  ('KX32CBGP-FL33', 'FL33'),
  ('MK92YTGP-FL34', 'FL34'),
  ('MK92XXGP-FL35', 'FL35'),
  ('LC18MVGP-FL32', 'FL32'),
  ('MR44PNGP-FL38', 'FL38'),
  ('MR44SCGP-FL39', 'FL39'),
  ('MR44SJGP-FL40', 'FL40'),
  ('LD93XWGP-FL41', 'FL41')
) AS v(registration, fleet_number)
CROSS JOIN tenant_config tc
WHERE tc.company_name ILIKE '%fleet%' OR tc.company_name ILIKE '%logix%'
ON CONFLICT DO NOTHING;

-- STEP 3: Insert Drivers
INSERT INTO fleetlogix_drivers (id, tenant_id, name, status, salary_period, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  tc.id,
  d.name,
  'active',
  'monthly',
  NOW(),
  NOW()
FROM (VALUES
  ('Ayanda Tembe'),
  ('Meshack Khathide'),
  ('Sihle Thabo Nkosi'),
  ('Sandile Peter Nzimande'),
  ('Witness Nkosi'),
  ('Themba Simelane'),
  ('Welcome Mashaya'),
  ('Production Mthethwa'),
  ('Bhekinkozi Ismael Zwane'),
  ('Siphesihle Xaba'),
  ('Albert Mduduzi Zikalala'),
  ('Sandiso Siyaya'),
  ('Nkosenhle Ndlovu'),
  ('Lennox Banele Ncanazo'),
  ('Sammy Mahlangu'),
  ('Xolani Ngcobo'),
  ('Melizwe Siyaya'),
  ('Nkosivumile Luphuzi'),
  ('Dumusani Masilela'),
  ('Khanyisani Lembethe'),
  ('Vincent Nkosi'),
  ('Mlungisi Nkambula'),
  ('Zamani Buthelezi'),
  ('Wonder Innocent Kubheka'),
  ('Thabani Mpungose'),
  ('Nqgulunga Lindokule'),
  ('Phumlani Simo Mthethwa'),
  ('Jabulani Buthelezi'),
  ('Mandla Frans Khumalo'),
  ('Mandla Nhlanhla Mthwanazi'),
  ('Sbusiso Samson Kubheka'),
  ('Nsikelelo Mpela'),
  ('Happy Mashilwane'),
  ('Seun Mahlangu'),
  ('Mcebo Dumisani Mtetwa'),
  ('Vuyani Sifiso Nkosi'),
  ('Bongani Mnisi'),
  ('Thulani Victor Magagula'),
  ('Nhlanhla Mafutha Myeni'),
  ('Nhlanhla Mamba'),
  ('Wonderful Sandile Qwabe'),
  ('Mehluko Ntsele'),
  ('Sibonelo Nthangase'),
  ('Menzi Hatshwayo'),
  ('Bheki Zulu'),
  ('Sibusisi Alfred Thwala'),
  ('Siswe Zwane'),
  ('Nkululeko Qwabe'),
  ('Sakhile Freedom Mabaso'),
  ('Thulani Sabelo Simelane')
) AS d(name)
CROSS JOIN tenant_config tc
WHERE tc.company_name ILIKE '%fleet%' OR tc.company_name ILIKE '%logix%'
ON CONFLICT DO NOTHING;

-- STEP 4: Insert Sample Loads (linking to drivers, vehicles, routes by name)
-- This creates 30 sample delivered loads
INSERT INTO fleetlogix_loads (id, tenant_id, load_number, driver_id, vehicle_id, route_id, load_date, weight, revenue, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  tc.id,
  'LOAD-' || to_char(CURRENT_DATE - (row_number() OVER ())::int, 'YYYY-MM-DD') || '-' || row_number() OVER (),
  d.id,
  v.id,
  r.id,
  CURRENT_DATE - (row_number() OVER ())::int,
  30 + (random() * 10)::numeric(10,2),
  (80 + random() * 150)::numeric(10,2),
  'delivered',
  NOW(),
  NOW()
FROM tenant_config tc
CROSS JOIN LATERAL (
  SELECT id FROM fleetlogix_drivers WHERE tenant_id = tc.id ORDER BY random() LIMIT 30
) d
CROSS JOIN LATERAL (
  SELECT id FROM fleetlogix_vehicles WHERE tenant_id = tc.id ORDER BY random() LIMIT 1
) v
CROSS JOIN LATERAL (
  SELECT id FROM fleetlogix_routes WHERE tenant_id = tc.id ORDER BY random() LIMIT 1
) r
WHERE tc.company_name ILIKE '%fleet%' OR tc.company_name ILIKE '%logix%'
ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT 'Routes' as table_name, COUNT(*) as count FROM fleetlogix_routes
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM fleetlogix_vehicles  
UNION ALL
SELECT 'Drivers', COUNT(*) FROM fleetlogix_drivers
UNION ALL
SELECT 'Loads', COUNT(*) FROM fleetlogix_loads;
