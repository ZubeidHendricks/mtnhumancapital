import { Express } from "express";
import { db } from "./db";
import { authenticate } from "./auth-middleware";
import { 
  fleetlogixDrivers, 
  fleetlogixVehicles, 
  fleetlogixRoutes,
  fleetlogixLoads,
  insertFleetlogixDriverSchema,
  insertFleetlogixVehicleSchema,
  insertFleetlogixRouteSchema,
  insertFleetlogixLoadSchema,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export function registerFleetLogixRoutes(app: Express) {
  
  // ==================== DRIVER ROUTES ====================
  
  // Get all drivers
  app.get("/api/fleetlogix/drivers", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const drivers = await db
        .select()
        .from(fleetlogixDrivers)
        .where(eq(fleetlogixDrivers.tenantId, tenantId))
        .orderBy(desc(fleetlogixDrivers.createdAt));

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  // Create driver
  app.post("/api/fleetlogix/drivers", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const validatedData = insertFleetlogixDriverSchema.parse({
        ...req.body,
        tenantId,
      });

      const [newDriver] = await db
        .insert(fleetlogixDrivers)
        .values(validatedData)
        .returning();

      res.json(newDriver);
    } catch (error) {
      res.status(400).json({ error: "Failed to create driver" });
    }
  });

  // Update driver
  app.put("/api/fleetlogix/drivers/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const [updatedDriver] = await db
        .update(fleetlogixDrivers)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(
          eq(fleetlogixDrivers.id, id),
          eq(fleetlogixDrivers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedDriver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json(updatedDriver);
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(400).json({ error: "Failed to update driver" });
    }
  });

  // Delete driver
  app.delete("/api/fleetlogix/drivers/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      await db
        .delete(fleetlogixDrivers)
        .where(and(
          eq(fleetlogixDrivers.id, id),
          eq(fleetlogixDrivers.tenantId, tenantId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete driver error:", error);
      res.status(400).json({ error: "Failed to delete driver" });
    }
  });

  // ==================== VEHICLE ROUTES ====================
  
  // Get all vehicles
  app.get("/api/fleetlogix/vehicles", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const vehicles = await db
        .select()
        .from(fleetlogixVehicles)
        .where(eq(fleetlogixVehicles.tenantId, tenantId))
        .orderBy(desc(fleetlogixVehicles.createdAt));

      // Transform to match frontend expectations
      const transformedVehicles = vehicles.map(vehicle => ({
        ...vehicle,
        registrationNumber: vehicle.registration,
        fleetCode: vehicle.fleetNumber,
        vehicleType: vehicle.type,
      }));

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(transformedVehicles);
    } catch (error) {
      console.error("FleetLogix vehicles error:", error);
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  // Create vehicle
  app.post("/api/fleetlogix/vehicles", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const validatedData = insertFleetlogixVehicleSchema.parse({
        ...req.body,
        tenantId,
      });

      const [newVehicle] = await db
        .insert(fleetlogixVehicles)
        .values(validatedData)
        .returning();

      res.json(newVehicle);
    } catch (error) {
      res.status(400).json({ error: "Failed to create vehicle" });
    }
  });

  // Update vehicle
  app.put("/api/fleetlogix/vehicles/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const [updatedVehicle] = await db
        .update(fleetlogixVehicles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(
          eq(fleetlogixVehicles.id, id),
          eq(fleetlogixVehicles.tenantId, tenantId)
        ))
        .returning();

      if (!updatedVehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }

      res.json(updatedVehicle);
    } catch (error) {
      console.error("Update vehicle error:", error);
      res.status(400).json({ error: "Failed to update vehicle" });
    }
  });

  // Delete vehicle
  app.delete("/api/fleetlogix/vehicles/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      await db
        .delete(fleetlogixVehicles)
        .where(and(
          eq(fleetlogixVehicles.id, id),
          eq(fleetlogixVehicles.tenantId, tenantId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete vehicle error:", error);
      res.status(400).json({ error: "Failed to delete vehicle" });
    }
  });

  // ==================== ROUTE ROUTES ====================
  
  // Get all routes
  app.get("/api/fleetlogix/routes", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const routes = await db
        .select()
        .from(fleetlogixRoutes)
        .where(eq(fleetlogixRoutes.tenantId, tenantId))
        .orderBy(desc(fleetlogixRoutes.createdAt));

      // Transform to match frontend expectations
      const transformedRoutes = routes.map(route => ({
        ...route,
        loadingPoint: route.origin,
        normalRate: '3.3',
        holidayRate: '4.8',
        normalAmount: (parseFloat(route.distance || '0') * 3.3).toFixed(2),
        holidayAmount: (parseFloat(route.distance || '0') * 4.8).toFixed(2),
      }));

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(transformedRoutes);
    } catch (error) {
      console.error("FleetLogix routes error:", error);
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  // Create route
  app.post("/api/fleetlogix/routes", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const validatedData = insertFleetlogixRouteSchema.parse({
        ...req.body,
        tenantId,
      });

      const [newRoute] = await db
        .insert(fleetlogixRoutes)
        .values(validatedData)
        .returning();

      res.json(newRoute);
    } catch (error) {
      res.status(400).json({ error: "Failed to create route" });
    }
  });

  // Update route
  app.put("/api/fleetlogix/routes/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const [updatedRoute] = await db
        .update(fleetlogixRoutes)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(
          eq(fleetlogixRoutes.id, id),
          eq(fleetlogixRoutes.tenantId, tenantId)
        ))
        .returning();

      if (!updatedRoute) {
        return res.status(404).json({ error: "Route not found" });
      }

      res.json(updatedRoute);
    } catch (error) {
      console.error("Update route error:", error);
      res.status(400).json({ error: "Failed to update route" });
    }
  });

  // Delete route
  app.delete("/api/fleetlogix/routes/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      await db
        .delete(fleetlogixRoutes)
        .where(and(
          eq(fleetlogixRoutes.id, id),
          eq(fleetlogixRoutes.tenantId, tenantId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete route error:", error);
      res.status(400).json({ error: "Failed to delete route" });
    }
  });

  // ==================== LOAD ROUTES ====================
  
  // Get all loads
  app.get("/api/fleetlogix/loads", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { startDate, endDate, driverId, vehicleId, status } = req.query;

      let query = db
        .select({
          load: fleetlogixLoads,
          driver: fleetlogixDrivers,
          vehicle: fleetlogixVehicles,
          route: fleetlogixRoutes,
        })
        .from(fleetlogixLoads)
        .leftJoin(fleetlogixDrivers, eq(fleetlogixLoads.driverId, fleetlogixDrivers.id))
        .leftJoin(fleetlogixVehicles, eq(fleetlogixLoads.vehicleId, fleetlogixVehicles.id))
        .leftJoin(fleetlogixRoutes, eq(fleetlogixLoads.routeId, fleetlogixRoutes.id))
        .where(eq(fleetlogixLoads.tenantId, tenantId));

      if (startDate && endDate) {
        query = query.where(
          and(
            eq(fleetlogixLoads.tenantId, tenantId),
            gte(fleetlogixLoads.loadDate, new Date(startDate as string)),
            lte(fleetlogixLoads.loadDate, new Date(endDate as string))
          )
        );
      }

      const loads = await query.orderBy(desc(fleetlogixLoads.loadDate));

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(loads);
    } catch (error) {
      console.error("FleetLogix loads error:", error);
      res.status(500).json({ error: "Failed to fetch loads" });
    }
  });

  // Create load
  app.post("/api/fleetlogix/loads", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const validatedData = insertFleetlogixLoadSchema.parse({
        ...req.body,
        tenantId,
      });

      const [newLoad] = await db
        .insert(fleetlogixLoads)
        .values(validatedData)
        .returning();

      res.json(newLoad);
    } catch (error) {
      res.status(400).json({ error: "Failed to create load" });
    }
  });

  // Update load
  app.put("/api/fleetlogix/loads/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const [updatedLoad] = await db
        .update(fleetlogixLoads)
        .set({ ...req.body, updatedAt: new Date() })
        .where(and(
          eq(fleetlogixLoads.id, id),
          eq(fleetlogixLoads.tenantId, tenantId)
        ))
        .returning();

      if (!updatedLoad) {
        return res.status(404).json({ error: "Load not found" });
      }

      res.json(updatedLoad);
    } catch (error) {
      console.error("Update load error:", error);
      res.status(400).json({ error: "Failed to update load" });
    }
  });

  // Delete load
  app.delete("/api/fleetlogix/loads/:id", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      await db
        .delete(fleetlogixLoads)
        .where(and(
          eq(fleetlogixLoads.id, id),
          eq(fleetlogixLoads.tenantId, tenantId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete load error:", error);
      res.status(400).json({ error: "Failed to delete load" });
    }
  });

  // ==================== RECONCILIATION ROUTES ====================
  
  // Get load reconciliation
  app.get("/api/fleetlogix/reconciliation", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { month } = req.query;

      // Get loads with route and driver details and flatten structure
      const loads = await db
        .select()
        .from(fleetlogixLoads)
        .leftJoin(fleetlogixRoutes, eq(fleetlogixLoads.routeId, fleetlogixRoutes.id))
        .leftJoin(fleetlogixDrivers, eq(fleetlogixLoads.driverId, fleetlogixDrivers.id))
        .leftJoin(fleetlogixVehicles, eq(fleetlogixLoads.vehicleId, fleetlogixVehicles.id))
        .where(eq(fleetlogixLoads.tenantId, tenantId))
        .orderBy(desc(fleetlogixLoads.loadDate));

      // Transform to reconciliation format with calculated amounts
      const reconciliation = loads.map((row: any) => {
        const distance = parseFloat(row.fleetlogix_routes?.distance || '0');
        const revenue = parseFloat(row.fleetlogix_loads?.revenue || '0');
        const expenses = parseFloat(row.fleetlogix_loads?.expenses || '0');
        
        return {
          id: row.fleetlogix_loads?.id,
          loadNumber: row.fleetlogix_loads?.loadNumber,
          loadDate: row.fleetlogix_loads?.loadDate,
          route: row.fleetlogix_routes?.name || `${row.fleetlogix_routes?.origin} - ${row.fleetlogix_routes?.destination}`,
          distance: distance,
          calculatedAmount: distance * 3.5, // Using default rate
          actualAmount: revenue,
          variance: revenue - (distance * 3.5),
          status: 'pending',
          driverName: row.fleetlogix_drivers?.name,
          vehicleReg: row.fleetlogix_vehicles?.registration,
        };
      });

      res.json(reconciliation);
    } catch (error) {
      console.error("FleetLogix reconciliation error:", error);
      res.status(500).json({ error: "Failed to fetch reconciliation data" });
    }
  });
  
  // ==================== SALARY ROUTES ====================
  
  app.get("/api/fleetlogix/salaries/report/:month", authenticate, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Unauthorized" });

      const { month } = req.params;
      
      // Calculate from loads data grouped by driver
      const report = await db
        .select({
          driverId: fleetlogixLoads.driverId,
          driverName: fleetlogixDrivers.name,
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${fleetlogixLoads.revenue} AS DECIMAL)), 0)`,
          totalLoads: sql<number>`COUNT(${fleetlogixLoads.id})`,
          vehicleReg: fleetlogixVehicles.registration,
        })
        .from(fleetlogixLoads)
        .leftJoin(fleetlogixDrivers, eq(fleetlogixLoads.driverId, fleetlogixDrivers.id))
        .leftJoin(fleetlogixVehicles, eq(fleetlogixLoads.vehicleId, fleetlogixVehicles.id))
        .where(eq(fleetlogixLoads.tenantId, tenantId))
        .groupBy(fleetlogixLoads.driverId, fleetlogixDrivers.name, fleetlogixVehicles.registration);

      res.json(report);
    } catch (error) {
      console.error("FleetLogix salaries report error:", error);
      res.status(500).json({ error: "Failed to generate salary report" });
    }
  });
}
