import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCandidateSchema, insertJobSchema, insertIntegrityCheckSchema, insertRecruitmentSessionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { IntegrityOrchestrator } from "./integrity-orchestrator";
import { RecruitmentOrchestrator } from "./recruitment-orchestrator";
import { cvParser } from "./cv-parser";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  app.post("/api/candidates", async (req, res) => {
    try {
      const result = insertCandidateSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const candidate = await storage.createCandidate(result.data);
      res.status(201).json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      const result = insertCandidateSchema.partial().safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const candidate = await storage.updateCandidate(req.params.id, result.data);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ message: "Failed to update candidate" });
    }
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const success = await storage.deleteCandidate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  app.post("/api/candidates/:id/upload-cv", upload.single("cv"), async (req, res) => {
    try {
      const candidateId = req.params.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files are supported" });
      }

      console.log(`Processing CV upload for candidate ${candidateId}...`);

      const cvData = await cvParser.parsePDFCV(file.buffer);

      const updatedCandidate = await storage.updateCandidate(candidateId, {
        fullName: cvData.fullName,
        email: cvData.email || undefined,
        phone: cvData.phone || undefined,
        role: cvData.role || undefined,
        location: cvData.location || undefined,
        summary: cvData.summary || undefined,
        yearsOfExperience: cvData.yearsOfExperience || undefined,
        skills: cvData.skills,
        education: cvData.education as any,
        experience: cvData.experience as any,
        languages: cvData.languages || undefined,
        certifications: cvData.certifications || undefined,
        linkedinUrl: cvData.linkedinUrl || undefined,
        cvUrl: `cv_${candidateId}_${Date.now()}.pdf`,
      });

      res.json({
        message: "CV uploaded and parsed successfully",
        candidate: updatedCandidate,
        parsedData: cvData,
      });
    } catch (error) {
      console.error("Error uploading CV:", error);
      res.status(500).json({ 
        message: "Failed to upload CV",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/candidates/bulk-import", async (req, res) => {
    try {
      const { candidates } = req.body;
      
      if (!Array.isArray(candidates)) {
        return res.status(400).json({ message: "Candidates must be an array" });
      }

      const imported = [];
      const failed = [];

      for (const candidateData of candidates) {
        try {
          const result = insertCandidateSchema.safeParse(candidateData);
          if (!result.success) {
            failed.push({ data: candidateData, error: result.error.message });
            continue;
          }
          
          const candidate = await storage.createCandidate(result.data);
          imported.push(candidate);
        } catch (error) {
          failed.push({ data: candidateData, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      res.status(201).json({
        success: imported.length,
        failed: failed.length,
        imported,
        errors: failed
      });
    } catch (error) {
      console.error("Error bulk importing candidates:", error);
      res.status(500).json({ message: "Failed to bulk import candidates" });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const result = insertJobSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const job = await storage.createJob(result.data);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const result = insertJobSchema.partial().safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const job = await storage.updateJob(req.params.id, result.data);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const success = await storage.deleteJob(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.get("/api/interview/voice/config", async (req, res) => {
    try {
      const HUMAI_API_KEY = process.env.HUMAI_API_KEY;
      const HUMAI_SECRET_KEY = process.env.HUMAI_SECRET_KEY;

      if (!HUMAI_API_KEY || !HUMAI_SECRET_KEY) {
        console.error("Hume AI credentials missing:", { 
          hasApiKey: !!HUMAI_API_KEY, 
          hasSecretKey: !!HUMAI_SECRET_KEY 
        });
        return res.status(500).json({ 
          message: "Hume AI credentials not configured. Please add HUMAI_API_KEY and HUMAI_SECRET_KEY to your environment secrets." 
        });
      }

      console.log("Requesting Hume AI access token...");
      
      // Encode credentials as Basic Auth (base64 of "apiKey:secretKey")
      const credentials = Buffer.from(`${HUMAI_API_KEY}:${HUMAI_SECRET_KEY}`).toString('base64');
      
      const tokenResponse = await fetch("https://api.hume.ai/oauth2-cc/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Hume AI token error - Status:", tokenResponse.status);
        console.error("Hume AI token error - Response:", error);
        return res.status(tokenResponse.status).json({ 
          message: `Failed to get Hume AI access token: ${error}`,
          status: tokenResponse.status
        });
      }

      const tokenData = await tokenResponse.json();
      console.log("Successfully obtained Hume AI access token");
      
      res.json({ 
        accessToken: tokenData.access_token,
        websocketUrl: "wss://api.hume.ai/v0/evi/chat",
        configId: "default"
      });
    } catch (error) {
      console.error("Error getting Hume AI config:", error);
      res.status(500).json({ message: `Failed to connect to Hume AI: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.post("/api/interview/video/session", async (req, res) => {
    try {
      const { candidateId, candidateName } = req.body;
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY;

      if (!TAVUS_API_KEY) {
        return res.status(500).json({ 
          message: "Tavus API key not configured" 
        });
      }

      if (!candidateName) {
        return res.status(400).json({
          message: "Candidate name is required"
        });
      }

      const requestBody = {
        replica_id: process.env.TAVUS_REPLICA_ID || "default_replica",
        persona_id: process.env.TAVUS_PERSONA_ID || "default_persona",
        conversation_name: `Interview: ${candidateName}`,
        conversational_context: `You are a professional HR interviewer conducting a video interview with ${candidateName} for a Senior Backend Developer position at Avatar Human Capital. Ask thoughtful questions about their technical expertise, leadership experience, problem-solving skills, and cultural fit. Be friendly but professional. The interview should last about 15-20 minutes.`,
        custom_greeting: `Hello ${candidateName}! Thank you for joining us today. I'm excited to learn more about your experience and discuss the Senior Backend Developer role with Avatar Human Capital.`,
        properties: {
          candidate_id: candidateId,
          position: "Senior Backend Developer",
          created_at: new Date().toISOString()
        }
      };

      const response = await fetch("https://tavusapi.com/v2/conversations", {
        method: "POST",
        headers: {
          "x-api-key": TAVUS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tavus error:", error);
        return res.status(response.status).json({ 
          message: "Failed to create Tavus video session",
          details: error
        });
      }

      const data = await response.json();

      if (!data || !data.conversation_url) {
        return res.status(500).json({
          message: "Invalid response from Tavus API"
        });
      }
      
      res.json({
        sessionUrl: data.conversation_url,
        sessionId: data.conversation_id || "unknown",
        status: data.status || "created",
        candidateId,
        candidateName
      });
    } catch (error) {
      console.error("Error creating Tavus session:", error);
      res.status(500).json({ message: "Failed to create video session" });
    }
  });

  app.get("/api/integrity-checks", async (req, res) => {
    try {
      const checks = await storage.getAllIntegrityChecks();
      res.json(checks);
    } catch (error) {
      console.error("Error fetching integrity checks:", error);
      res.status(500).json({ message: "Failed to fetch integrity checks" });
    }
  });

  app.get("/api/integrity-checks/candidate/:candidateId", async (req, res) => {
    try {
      const checks = await storage.getIntegrityChecksByCandidateId(req.params.candidateId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching candidate integrity checks:", error);
      res.status(500).json({ message: "Failed to fetch candidate integrity checks" });
    }
  });

  app.get("/api/integrity-checks/:id", async (req, res) => {
    try {
      const check = await storage.getIntegrityCheck(req.params.id);
      if (!check) {
        return res.status(404).json({ message: "Integrity check not found" });
      }
      res.json(check);
    } catch (error) {
      console.error("Error fetching integrity check:", error);
      res.status(500).json({ message: "Failed to fetch integrity check" });
    }
  });

  app.post("/api/integrity-checks", async (req, res) => {
    try {
      const result = insertIntegrityCheckSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const check = await storage.createIntegrityCheck(result.data);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating integrity check:", error);
      res.status(500).json({ message: "Failed to create integrity check" });
    }
  });

  app.patch("/api/integrity-checks/:id", async (req, res) => {
    try {
      const result = insertIntegrityCheckSchema.partial().safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const check = await storage.updateIntegrityCheck(req.params.id, result.data);
      if (!check) {
        return res.status(404).json({ message: "Integrity check not found" });
      }
      res.json(check);
    } catch (error) {
      console.error("Error updating integrity check:", error);
      res.status(500).json({ message: "Failed to update integrity check" });
    }
  });

  app.delete("/api/integrity-checks/:id", async (req, res) => {
    try {
      const success = await storage.deleteIntegrityCheck(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Integrity check not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting integrity check:", error);
      res.status(500).json({ message: "Failed to delete integrity check" });
    }
  });

  app.post("/api/integrity-checks/:id/execute", async (req, res) => {
    try {
      const checkId = req.params.id;
      
      // Get the integrity check
      const check = await storage.getIntegrityCheck(checkId);
      if (!check) {
        return res.status(404).json({ message: "Integrity check not found" });
      }

      // Execute the check with real AI agents
      const orchestrator = new IntegrityOrchestrator(storage);
      
      // Start execution in background (don't await)
      orchestrator.executeIntegrityCheck(checkId, check.candidateId)
        .catch(error => {
          console.error(`Error executing integrity check ${checkId}:`, error);
          storage.updateIntegrityCheck(checkId, {
            status: "failed",
            result: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        });

      // Return immediately with pending status
      res.json({
        message: "Integrity check execution started",
        checkId,
        status: "in_progress"
      });
    } catch (error) {
      console.error("Error starting integrity check execution:", error);
      res.status(500).json({ message: "Failed to start integrity check execution" });
    }
  });

  app.get("/api/recruitment-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllRecruitmentSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recruitment sessions:", error);
      res.status(500).json({ message: "Failed to fetch recruitment sessions" });
    }
  });

  app.get("/api/recruitment-sessions/job/:jobId", async (req, res) => {
    try {
      const sessions = await storage.getRecruitmentSessionsByJobId(req.params.jobId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching job recruitment sessions:", error);
      res.status(500).json({ message: "Failed to fetch job recruitment sessions" });
    }
  });

  app.get("/api/recruitment-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getRecruitmentSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Recruitment session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching recruitment session:", error);
      res.status(500).json({ message: "Failed to fetch recruitment session" });
    }
  });

  app.post("/api/recruitment-sessions", async (req, res) => {
    try {
      const { jobId, maxCandidates, minMatchScore } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const session = await storage.createRecruitmentSession({
        jobId,
        status: "Running",
        candidatesFound: 0,
        candidatesAdded: 0,
      });

      const orchestrator = new RecruitmentOrchestrator(storage);
      
      orchestrator.executeRecruitment(session.id, jobId, {
        maxCandidates: maxCandidates || 20,
        minMatchScore: minMatchScore || 60,
      })
        .catch(error => {
          console.error(`Error executing recruitment ${session.id}:`, error);
        });

      res.status(201).json({
        message: "Recruitment session started",
        session,
      });
    } catch (error) {
      console.error("Error creating recruitment session:", error);
      res.status(500).json({ message: "Failed to create recruitment session" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
