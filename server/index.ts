import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { registerRoutes } from "./routes";
import { resolveTenant } from "./tenant-middleware";
import { seedDefaultTenant } from "./seed-default-tenant";
import { storage } from "./storage";
import { insertTenantRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { dataCollectionService } from "./data-collection-service";
import whatsappWebhookRouter from "./routes/whatsapp-webhook";
import { authService } from "./auth-service";
import { registerFleetLogixRoutes } from "./fleetlogix-routes";

// Simple logging function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const app = express();

// Serve uploaded files (profile photos, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// PUBLIC route for tenant request submission (registered BEFORE tenant middleware)
// This allows anyone to submit a tenant request without needing an existing tenant
app.post("/api/tenant-requests", async (req, res) => {
  try {
    const result = insertTenantRequestSchema.safeParse(req.body);
    if (!result.success) {
      const validationError = fromZodError(result.error);
      return res.status(400).json({ message: validationError.message });
    }
    
    const request = await storage.createTenantRequest(result.data);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error submitting tenant request:", error);
    res.status(500).json({ message: "Failed to submit tenant request" });
  }
});

// PUBLIC route for WhatsApp webhook (Meta/Facebook will call this)
app.use("/api/whatsapp", whatsappWebhookRouter);

// PUBLIC route for authentication (no tenant middleware needed)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const result = await authService.loginByUsername(username, password);
    
    if (!result) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Health check endpoint for Docker
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// PUBLIC route for interview session by token (for candidates accessing their interview link)
app.get("/api/public/interview-session/:token", async (req, res) => {
  try {
    const session = await storage.getInterviewSessionByToken(req.params.token);
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }
    
    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ message: "Interview link has expired" });
    }
    
    // Check if session was already completed
    if (session.status === 'completed') {
      return res.status(410).json({ message: "Interview has already been completed" });
    }
    
    // Get candidate info for display
    const candidate = session.candidateId 
      ? await storage.getCandidateById(session.tenantId || '', session.candidateId)
      : null;
    
    res.json({ 
      session, 
      candidate: candidate ? { 
        id: candidate.id, 
        fullName: candidate.fullName 
      } : null 
    });
  } catch (error) {
    console.error("Error fetching interview session:", error);
    res.status(500).json({ message: "Failed to fetch interview session" });
  }
});

// PUBLIC route for getting Hume AI config for the interview (uses session token)
app.get("/api/public/interview-session/:token/config", async (req, res) => {
  try {
    const session = await storage.getInterviewSessionByToken(req.params.token);
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }
    
    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ message: "Interview link has expired" });
    }
    
    // Get Hume AI access token
    const apiKey = process.env.HUMAI_API_KEY;
    const secretKey = process.env.HUMAI_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      return res.status(500).json({ message: "Voice interview is not configured" });
    }
    
    // Fetch Hume AI access token
    const tokenResponse = await fetch('https://api.hume.ai/oauth2-cc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      return res.status(500).json({ message: "Failed to authenticate with voice service" });
    }
    
    const tokenData = await tokenResponse.json() as { access_token: string };
    
    // Mark session as started if it's the first time
    if (session.status === 'pending' || session.status === 'sent') {
      await storage.updateInterviewSessionByToken(req.params.token, {
        status: 'started',
        startedAt: new Date()
      });
    }
    
    res.json({ 
      accessToken: tokenData.access_token,
      sessionId: session.id,
      prompt: session.prompt
    });
  } catch (error) {
    console.error("Error getting interview config:", error);
    res.status(500).json({ message: "Failed to get interview configuration" });
  }
});

// PUBLIC route for saving interview results
app.post("/api/public/interview-session/:token/complete", async (req, res) => {
  try {
    const session = await storage.getInterviewSessionByToken(req.params.token);
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }
    
    const { transcripts, emotionAnalysis, overallScore, feedback, duration } = req.body;
    
    const updatedSession = await storage.updateInterviewSessionByToken(req.params.token, {
      status: 'completed',
      transcripts,
      emotionAnalysis,
      overallScore,
      feedback,
      duration,
      completedAt: new Date()
    });
    
    res.json(updatedSession);
  } catch (error) {
    console.error("Error completing interview session:", error);
    res.status(500).json({ message: "Failed to complete interview session" });
  }
});

// PUBLIC route: Candidate onboarding document upload portal - GET info
app.get("/api/public/onboarding-upload/:token", async (req, res) => {
  try {
    const workflow = await storage.getOnboardingWorkflowByUploadToken(req.params.token);
    if (!workflow) {
      return res.status(404).json({ message: "Upload link not found" });
    }

    if (workflow.uploadTokenExpiresAt && new Date(workflow.uploadTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This upload link has expired. Please contact HR for a new link." });
    }

    const candidate = await storage.getCandidate(workflow.tenantId!, workflow.candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const docRequests = await storage.getOnboardingDocumentRequests(workflow.tenantId!, workflow.id);

    const tenant = workflow.tenantId
      ? await storage.getTenantById(workflow.tenantId)
      : null;

    res.json({
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        role: candidate.role,
      },
      workflow: {
        id: workflow.id,
        status: workflow.status,
      },
      documentRequests: docRequests.map((r: any) => ({
        id: r.id,
        documentType: r.documentType,
        documentName: r.documentName,
        description: r.description,
        status: r.status,
        priority: r.priority,
        isRequired: r.isRequired,
        dueDate: r.dueDate,
        receivedAt: r.receivedAt,
      })),
      tenantConfig: tenant ? {
        companyName: tenant.companyName,
        primaryColor: tenant.primaryColor,
        logoUrl: tenant.logoUrl,
      } : null,
      expiresAt: workflow.uploadTokenExpiresAt,
    });
  } catch (error) {
    console.error("Error fetching onboarding upload portal:", error);
    res.status(500).json({ message: "Failed to load upload portal" });
  }
});

// PUBLIC route: Candidate onboarding document upload - POST file
const publicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload PDF, JPG, PNG, or Word documents.'));
    }
  },
});

app.post("/api/public/onboarding-upload/:token/:requestId", publicUpload.single("file"), async (req, res) => {
  try {
    const workflow = await storage.getOnboardingWorkflowByUploadToken(req.params.token);
    if (!workflow) {
      return res.status(404).json({ message: "Upload link not found" });
    }

    if (workflow.uploadTokenExpiresAt && new Date(workflow.uploadTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This upload link has expired. Please contact HR for a new link." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const request = await storage.getOnboardingDocumentRequest(workflow.tenantId!, req.params.requestId);
    if (!request || request.workflowId !== workflow.id) {
      return res.status(404).json({ message: "Document request not found" });
    }

    if (request.status === 'verified') {
      return res.status(400).json({ message: "This document has already been verified" });
    }

    // Save file to disk
    const fileName = `onboarding_${request.candidateId}_${request.documentType}_${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join("uploads/onboarding-documents", fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.buffer);

    // Create document record (documents table - linked via receivedDocumentId)
    const doc = await storage.createDocument(workflow.tenantId!, {
      filename: fileName,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: filePath,
      type: "onboarding",
      status: "uploaded",
      linkedCandidateId: request.candidateId,
    });

    // Also create a candidateDocuments record so it appears in the Document Library
    await storage.createCandidateDocument(workflow.tenantId!, {
      candidateId: request.candidateId,
      documentType: request.documentType || request.documentName,
      fileName: file.originalname,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      collectedVia: "portal",
      status: "received",
    });

    // Mark document request as received
    const { createOnboardingAgent } = await import("./onboarding-agent");
    const agent = createOnboardingAgent(storage);
    const updated = await agent.markDocumentReceived(workflow.tenantId!, req.params.requestId, doc.id);

    res.json({ documentRequest: updated, document: { id: doc.id, filename: doc.filename } });
  } catch (error) {
    console.error("Error uploading onboarding document:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// PUBLIC route: Integrity document upload portal - GET info
app.get("/api/public/integrity-upload/:token", async (req, res) => {
  try {
    const check = await storage.getIntegrityCheckByUploadToken(req.params.token);
    if (!check) {
      return res.status(404).json({ message: "Upload link not found" });
    }

    if (check.uploadTokenExpiresAt && new Date(check.uploadTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This upload link has expired. Please contact HR for a new link." });
    }

    const candidate = await storage.getCandidate(check.tenantId!, check.candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const docReqs = await storage.getIntegrityDocumentRequirements(check.tenantId!, check.candidateId);

    const tenant = check.tenantId
      ? await storage.getTenantById(check.tenantId)
      : null;

    res.json({
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        role: candidate.role,
      },
      documentRequirements: docReqs.map((r: any) => ({
        id: r.id,
        documentType: r.documentType,
        description: r.description,
        status: r.status,
        isRequired: 1,
        receivedAt: r.receivedAt,
      })),
      tenantConfig: tenant ? {
        companyName: tenant.companyName,
        primaryColor: tenant.primaryColor,
        logoUrl: tenant.logoUrl,
      } : null,
      expiresAt: check.uploadTokenExpiresAt,
    });
  } catch (error) {
    console.error("Error fetching integrity upload portal:", error);
    res.status(500).json({ message: "Failed to load upload portal" });
  }
});

// PUBLIC route: Integrity document upload - POST file
app.post("/api/public/integrity-upload/:token/:requirementId", publicUpload.single("file"), async (req, res) => {
  try {
    const check = await storage.getIntegrityCheckByUploadToken(req.params.token);
    if (!check) {
      return res.status(404).json({ message: "Upload link not found" });
    }

    if (check.uploadTokenExpiresAt && new Date(check.uploadTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This upload link has expired. Please contact HR for a new link." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const requirement = await storage.getIntegrityDocumentRequirement(check.tenantId!, req.params.requirementId);
    if (!requirement || requirement.candidateId !== check.candidateId) {
      return res.status(404).json({ message: "Document requirement not found" });
    }

    if (requirement.status === 'verified') {
      return res.status(400).json({ message: "This document has already been verified" });
    }

    // Save file to disk
    const fileName = `integrity_${requirement.candidateId}_${requirement.documentType}_${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join("uploads/integrity-documents", fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.buffer);

    // Create a document record
    const doc = await storage.createDocument(check.tenantId!, {
      filename: fileName,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: filePath,
      type: "integrity",
      status: "uploaded",
      linkedCandidateId: requirement.candidateId,
    });

    // Also create a candidateDocuments record
    await storage.createCandidateDocument(check.tenantId!, {
      candidateId: requirement.candidateId,
      documentType: requirement.documentType,
      fileName: file.originalname,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      collectedVia: "portal",
      status: "received",
    });

    // Mark the requirement as received with documentId
    const updated = await storage.updateIntegrityDocumentRequirement(check.tenantId!, req.params.requirementId, {
      status: "received",
      receivedAt: new Date(),
      metadata: { ...(requirement.metadata as any || {}), documentId: doc.id },
    });

    res.json({ requirement: updated, document: { id: doc.id, filename: doc.filename } });
  } catch (error) {
    console.error("Error uploading integrity document:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// PUBLIC route: Candidate offer response portal - GET details
app.get("/api/public/offer-response/:token", async (req, res) => {
  try {
    const offer = await storage.getOfferByResponseToken(req.params.token);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found or link is invalid" });
    }

    if (offer.responseTokenExpiresAt && new Date(offer.responseTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This offer response link has expired. Please contact HR for assistance." });
    }

    const candidate = await storage.getCandidate(offer.tenantId!, offer.candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    let jobTitle = candidate.role || "Position";
    if (offer.jobId) {
      const { jobs } = await import("@shared/schema");
      const job = await storage.getJob(offer.tenantId!, offer.jobId);
      if (job) jobTitle = job.title;
    }

    const tenant = offer.tenantId ? await storage.getTenantById(offer.tenantId) : null;

    res.json({
      candidateName: candidate.fullName,
      jobTitle,
      salary: `${offer.currency || "ZAR"} ${String(offer.salary).replace(/^R\s*/i, "")}`,
      startDate: offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "TBD",
      companyName: tenant?.companyName || "AHC Recruiting",
      status: offer.status,
      documentUrl: offer.documentPath || null,
      expiresAt: offer.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching offer response portal:", error);
    res.status(500).json({ message: "Failed to load offer response portal" });
  }
});

// PUBLIC route: Candidate offer response portal - POST accept/decline
app.post("/api/public/offer-response/:token", publicUpload.single("signedDocument"), async (req, res) => {
  try {
    const offer = await storage.getOfferByResponseToken(req.params.token);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found or link is invalid" });
    }

    if (offer.responseTokenExpiresAt && new Date(offer.responseTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This offer response link has expired. Please contact HR for assistance." });
    }

    if (offer.status === "accepted" || offer.status === "declined") {
      return res.status(400).json({ message: "This offer has already been responded to." });
    }

    const { response, declineReason } = req.body;
    if (response !== "accepted" && response !== "declined") {
      return res.status(400).json({ message: "Response must be 'accepted' or 'declined'" });
    }

    if (response === "accepted" && !req.file) {
      return res.status(400).json({ message: "A signed document is required to accept the offer" });
    }

    const updates: any = {
      status: response,
      respondedAt: new Date(),
    };

    if (response === "declined" && declineReason) {
      updates.declineReason = declineReason;
    }

    if (response === "accepted" && req.file) {
      const uploadDir = path.join(process.cwd(), "uploads", "signed-offers");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `signed_${offer.id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      updates.signedDocumentPath = `uploads/signed-offers/${fileName}`;
    }

    const updatedOffer = await storage.updateOffer(offer.tenantId!, offer.id, updates);

    // Look up candidate and job for notifications
    const candidate = await storage.getCandidate(offer.tenantId!, offer.candidateId);
    let jobTitle = candidate?.role || "Position";
    if (offer.jobId) {
      const job = await storage.getJob(offer.tenantId!, offer.jobId);
      if (job) jobTitle = job.title;
    }

    // Notify HR
    try {
      const { emailService } = await import("./email-service");
      await emailService.notifyHROfOfferResponse(
        candidate?.fullName || "Candidate",
        jobTitle,
        response,
        response === "declined" ? declineReason : undefined,
      );
    } catch (emailErr) {
      console.error("HR notification failed (non-blocking):", emailErr);
    }

    // Trigger pipeline transition
    try {
      const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
      const targetStage = response === "accepted" ? "integrity_checks" : "offer_declined";
      await pipelineOrchestrator.transitionCandidate(
        offer.candidateId,
        targetStage,
        offer.tenantId!,
        {
          triggeredBy: "candidate",
          reason: response === "accepted" ? "Candidate accepted offer" : "Candidate declined offer",
          skipPrerequisites: true,
        }
      );
    } catch (pipelineErr) {
      console.error("Pipeline transition failed (non-blocking):", pipelineErr);
    }

    res.json({ success: true, status: response });
  } catch (error) {
    console.error("Error processing offer response:", error);
    res.status(500).json({ message: "Failed to process offer response" });
  }
});

// Apply tenant resolution middleware ONLY to API routes to avoid blocking static assets
app.use('/api', resolveTenant);

// API endpoint to get current tenant configuration
app.get('/api/tenant/current', (req, res) => {
  if (!req.tenant) {
    return res.status(404).json({ message: 'No tenant found' });
  }
  res.json(req.tenant);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure default tenant exists before starting server
  await seedDefaultTenant();
  
  const server = await registerRoutes(app);
  
  // Register FleetLogix routes
  registerFleetLogixRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    // Serve static files in production
    const distPath = path.resolve(
      typeof __dirname !== "undefined" ? __dirname : import.meta.dirname,
      "public"
    );

    if (!fs.existsSync(distPath)) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start background reminder checker (runs every hour)
    const REMINDER_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    setInterval(async () => {
      try {
        log("Running scheduled reminder check...");
        const { ReminderService } = await import("./reminder-service");
        const { storage } = await import("./storage");
        const reminderService = new ReminderService(storage);
        await reminderService.checkAndSendReminders();
        log("Reminder check completed");
      } catch (error) {
        console.error("Error in scheduled reminder check:", error);
      }
    }, REMINDER_CHECK_INTERVAL);
    
    log("Background reminder checker started (runs every hour)");
    
    // Start background data collection service for KPI data sources
    dataCollectionService.start();
    log("Background data collection service started (checks every minute)");
  });
})();
