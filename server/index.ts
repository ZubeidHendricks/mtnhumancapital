import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { resolveTenant } from "./tenant-middleware";
import { seedDefaultTenant } from "./seed-default-tenant";
import { storage } from "./storage";
import { insertTenantRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { dataCollectionService } from "./data-collection-service";

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

// Apply tenant resolution middleware ONLY to API routes to avoid blocking static assets
app.use('/api', resolveTenant);

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
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
