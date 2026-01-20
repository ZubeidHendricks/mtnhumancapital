import type { Express } from "express";
import { weighbridgeAgent } from "../weighbridge-agent";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, PDF) are allowed"));
    }
  }
});

export function registerWeighbridgeRoutes(app: Express) {
  /**
   * Upload and process weighbridge slip with AI
   */
  app.post("/api/weighbridge/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!req.tenant || !req.tenant.id) {
        return res.status(400).json({ message: "Tenant not identified. Please include ?tenant= parameter" });
      }

      const tenantId = req.tenant.id;
      const fileName = req.file.originalname;
      
      // Save file to uploads directory
      const uploadDir = path.join(process.cwd(), "uploads", "weighbridge");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const safeFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeFileName);
      fs.writeFileSync(filePath, req.file.buffer);
      
      const imageUrl = `/uploads/weighbridge/${safeFileName}`;
      const imageBase64 = req.file.buffer.toString("base64");
      
      // Process with AI agent
      const result = await weighbridgeAgent.processAndSave(
        tenantId,
        imageBase64,
        fileName,
        imageUrl
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Error processing weighbridge upload:", error);
      res.status(500).json({ 
        message: "Failed to process weighbridge slip",
        error: error.message 
      });
    }
  });

  /**
   * Upload multiple weighbridge slips
   */
  app.post("/api/weighbridge/batch-upload", upload.array("files", 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const tenantId = req.tenant.id;
      const uploadDir = path.join(process.cwd(), "uploads", "weighbridge");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filesToProcess = [];
      
      for (const file of req.files) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(uploadDir, safeFileName);
        fs.writeFileSync(filePath, file.buffer);
        
        filesToProcess.push({
          imageBase64: file.buffer.toString("base64"),
          fileName: file.originalname,
          imageUrl: `/uploads/weighbridge/${safeFileName}`
        });
      }
      
      // Process all files
      const results = await weighbridgeAgent.batchProcess(tenantId, filesToProcess);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        totalProcessed: results.length,
        successful,
        failed,
        results
      });
    } catch (error: any) {
      console.error("Error processing batch upload:", error);
      res.status(500).json({ 
        message: "Failed to process weighbridge slips",
        error: error.message 
      });
    }
  });

  /**
   * Get all weighbridge slips for tenant
   */
  app.get("/api/weighbridge/slips", async (req, res) => {
    try {
      if (!req.tenant || !req.tenant.id) {
        return res.status(400).json({ message: "Tenant not identified. Please include ?tenant= parameter" });
      }
      const slips = await storage.getWeighbridgeSlips(req.tenant.id);
      res.json(slips);
    } catch (error: any) {
      console.error("Error fetching weighbridge slips:", error);
      res.status(500).json({ message: "Failed to fetch weighbridge slips", error: error.message });
    }
  });

  /**
   * Get single weighbridge slip
   */
  app.get("/api/weighbridge/slips/:id", async (req, res) => {
    try {
      const slip = await storage.getWeighbridgeSlipById(req.tenant.id, req.params.id);
      if (!slip) {
        return res.status(404).json({ message: "Weighbridge slip not found" });
      }
      res.json(slip);
    } catch (error: any) {
      console.error("Error fetching weighbridge slip:", error);
      res.status(500).json({ message: "Failed to fetch weighbridge slip" });
    }
  });

  /**
   * Update weighbridge slip (for manual verification/corrections)
   */
  app.patch("/api/weighbridge/slips/:id", async (req, res) => {
    try {
      const updated = await storage.updateWeighbridgeSlip(
        req.tenant.id,
        req.params.id,
        req.body
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Weighbridge slip not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating weighbridge slip:", error);
      res.status(500).json({ message: "Failed to update weighbridge slip" });
    }
  });

  /**
   * Delete weighbridge slip
   */
  app.delete("/api/weighbridge/slips/:id", async (req, res) => {
    try {
      await storage.deleteWeighbridgeSlip(req.tenant.id, req.params.id);
      res.json({ message: "Weighbridge slip deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting weighbridge slip:", error);
      res.status(500).json({ message: "Failed to delete weighbridge slip" });
    }
  });

  /**
   * Verify weighbridge slip
   */
  app.post("/api/weighbridge/slips/:id/verify", async (req, res) => {
    try {
      const userId = req.user?.id || "system";
      
      const updated = await storage.updateWeighbridgeSlip(
        req.tenant.id,
        req.params.id,
        {
          status: "verified",
          verifiedBy: userId,
          verifiedAt: new Date()
        }
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Weighbridge slip not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error verifying weighbridge slip:", error);
      res.status(500).json({ message: "Failed to verify weighbridge slip" });
    }
  });

  /**
   * Link weighbridge slip to a FleetLogix load
   */
  app.post("/api/weighbridge/slips/:id/link-load", async (req, res) => {
    try {
      const { loadId } = req.body;
      
      if (!loadId) {
        return res.status(400).json({ message: "loadId is required" });
      }

      const updated = await storage.updateWeighbridgeSlip(
        req.tenant.id,
        req.params.id,
        {
          linkedLoadId: loadId,
        }
      );
      
      if (!updated) {
        return res.status(404).json({ message: "Weighbridge slip not found" });
      }
      
      res.json({ message: "Successfully linked to load", slip: updated });
    } catch (error: any) {
      console.error("Error linking weighbridge slip to load:", error);
      res.status(500).json({ message: "Failed to link weighbridge slip to load" });
    }
  });
}
