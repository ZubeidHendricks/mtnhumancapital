import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCandidateSchema, insertJobSchema, insertIntegrityCheckSchema, insertRecruitmentSessionSchema, insertInterviewSchema, updateInterviewSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { IntegrityOrchestrator } from "./integrity-orchestrator";
import { RecruitmentOrchestrator } from "./recruitment-orchestrator";
import { cvParser } from "./cv-parser";
import { embeddingService } from "./embedding-service";
import { getOrCreateConversation, deleteConversation } from "./job-creation-agent";
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
      
      // Create job first without embedding
      const job = await storage.createJob(result.data);
      
      // Generate embedding in the background (don't block response)
      embeddingService.generateJobEmbedding({
        title: job.title,
        department: job.department,
        description: job.description,
        location: job.location,
        employmentType: job.employmentType,
        shiftStructure: job.shiftStructure,
        minYearsExperience: job.minYearsExperience,
        licenseRequirements: job.licenseRequirements,
        vehicleTypes: job.vehicleTypes,
        certificationsRequired: job.certificationsRequired,
        physicalRequirements: job.physicalRequirements,
        equipmentExperience: job.equipmentExperience,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        payRateUnit: job.payRateUnit,
      }).then(async (embedding) => {
        // Update job with embedding
        await storage.updateJob(job.id, {
          requirementsEmbedding: embedding as any,
        });
        console.log(`✓ Generated embedding for job ${job.id}: ${job.title}`);
      }).catch((error) => {
        console.error(`✗ Failed to generate embedding for job ${job.id}:`, error);
      });
      
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

  // AI-Powered Conversational Job Creation
  app.post("/api/jobs/conversation/chat", async (req, res) => {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ message: "Session ID and message are required" });
      }

      const agent = getOrCreateConversation(sessionId);
      const response = await agent.chat(message);

      res.json({
        ...response,
        jobSpec: agent.getJobSpec(), // Always return current collected data
      });
    } catch (error) {
      console.error("Error in job creation conversation:", error);
      res.status(500).json({ message: "Failed to process conversation" });
    }
  });

  app.post("/api/jobs/conversation/create", async (req, res) => {
    try {
      const { sessionId, isDraft = false } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const agent = getOrCreateConversation(sessionId);
      const jobSpec = agent.getJobSpec();

      // Validate required fields (title and department required for active jobs, but drafts can be partial)
      if (!isDraft && (!jobSpec.title || !jobSpec.department)) {
        return res.status(400).json({ message: "Missing required job information (title and department required)" });
      }
      
      // Create the job with collected data (use placeholders for missing required fields)
      const job = await storage.createJob({
        title: jobSpec.title || "Untitled Job (Draft)",
        department: jobSpec.department || "Unspecified",
        description: jobSpec.description,
        location: jobSpec.location,
        employmentType: jobSpec.employmentType,
        shiftStructure: jobSpec.shiftStructure,
        salaryMin: jobSpec.salaryMin,
        salaryMax: jobSpec.salaryMax,
        payRateUnit: jobSpec.payRateUnit,
        minYearsExperience: jobSpec.minYearsExperience,
        licenseRequirements: jobSpec.licenseRequirements,
        vehicleTypes: jobSpec.vehicleTypes,
        certificationsRequired: jobSpec.certificationsRequired,
        physicalRequirements: jobSpec.physicalRequirements,
        equipmentExperience: jobSpec.equipmentExperience as any,
        status: isDraft ? "Draft" : "Active",
      });

      // Generate embedding in background (skip for drafts since they might be incomplete)
      if (!isDraft) {
        const embeddingJobSpec = {
          ...jobSpec,
          title: jobSpec.title || "Untitled Job",
          department: jobSpec.department || "Unspecified",
        };
        
        embeddingService.generateJobEmbedding(embeddingJobSpec).then(async (embedding) => {
          await storage.updateJob(job.id, {
            requirementsEmbedding: embedding as any,
          });
          console.log(`✓ Generated embedding for job ${job.id}: ${job.title}`);
        }).catch((error) => {
          console.error(`✗ Failed to generate embedding for job ${job.id}:`, error);
        });
      }

      // Clean up conversation
      deleteConversation(sessionId);

      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job from conversation:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.delete("/api/jobs/conversation/:sessionId", async (req, res) => {
    try {
      deleteConversation(req.params.sessionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
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

      // Create or retrieve EVI configuration
      console.log("Creating/retrieving EVI configuration...");
      const configResponse = await fetch("https://api.hume.ai/v0/evi/configs", {
        method: "POST",
        headers: {
          "X-Hume-Api-Key": HUMAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Roleplay Facilitator",
          evi_version: "2",
          voice: {
            name: "ITO"
          },
          language_model: {
            model_provider: "OPEN_AI",
            model_resource: "gpt-3.5-turbo"
          },
          ellm_model: {
            allow_short_responses: false
          },
          event_messages: {
            on_new_chat: {
              enabled: true,
              text: "Hey there! I'm your roleplay practice partner. I can transform into any character you need to practice with—a tough interviewer, a friendly recruiter, a difficult stakeholder, you name it. Just tell me who you want me to be and what scenario you want to practice. What role should I take on?"
            }
          },
          timeouts: {
            inactivity: 600000
          }
        })
      });

      let configId: string | null = null;
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        configId = configData.id;
        console.log("Successfully created EVI config:", configId);
      } else {
        const errorText = await configResponse.text();
        console.error("Config creation failed:", configResponse.status, errorText);
        
        // Try to list existing configs and use the first one
        console.log("Trying to list existing configs...");
        const listResponse = await fetch("https://api.hume.ai/v0/evi/configs", {
          headers: {
            "X-Hume-Api-Key": HUMAI_API_KEY
          }
        });
        
        if (listResponse.ok) {
          const configsList = await listResponse.json();
          console.log("Configs list response:", JSON.stringify(configsList));
          if (configsList.configs_page && configsList.configs_page.length > 0) {
            configId = configsList.configs_page[0].id;
            console.log("Using existing config:", configId);
          } else {
            console.warn("No existing configs found");
          }
        } else {
          const listError = await listResponse.text();
          console.error("List configs failed:", listResponse.status, listError);
        }
      }
      
      // Only include configId if we have a valid one
      const response: any = { 
        accessToken: tokenData.access_token,
        websocketUrl: "wss://api.hume.ai/v0/evi/chat"
      };
      
      if (configId) {
        response.configId = configId;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error getting Hume AI config:", error);
      res.status(500).json({ message: `Failed to connect to Hume AI: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.post("/api/interview/video/session", async (req, res) => {
    try {
      const { candidateId, candidateName, jobRole } = req.body;
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

      const role = jobRole || "Entry-Level Consultant";
      
      // Jane Smith persona - Principal at Morrison & Blackwell consulting firm
      const conversationalContext = `You are Jane Smith, Principal at Morrison & Blackwell consulting. Conduct first-round case interview for ${role}. Professional yet approachable. Assess: communication, problem-solving, business intuition, cultural fit. Structure: intro & background (5min), case presentation (3min), candidate analysis with guidance (15min), Q&A (5min), wrap-up (2min). Case: SodaPop launching "Light Bolt" sports drink. Market: $15B, 8% growth. Dev cost: $2.5M. Unit cost: $0.35, retail $2.49. Marketing: $10M Y1. Target 12% share. Segments: fitness 35%, athletes 25%, health-conscious 20%, youth 15%, other 5%. Never discuss off-topic. If candidate refers to notes/devices, politely remind independent thinking required. If others present, request private space. Don't share assessment; redirect to recruiting team (2 weeks). Speak naturally, no formatting. Never mention AI.`;

      const customGreeting = `Hello! I'm Jane Smith, a Principal here at Morrison & Blackwell. Thanks for taking the time to speak with me today. I'm looking forward to learning more about you and walking through a case together. How are you doing today?`;

      const requestBody = {
        replica_id: process.env.TAVUS_REPLICA_ID || "default_replica",
        persona_id: process.env.TAVUS_PERSONA_ID || "default_persona",
        conversation_name: `${role} Interview: ${candidateName}`,
        conversational_context: conversationalContext,
        custom_greeting: customGreeting
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
        console.error("Tavus API error - Status:", response.status);
        console.error("Tavus API error - Response:", error);
        console.error("Tavus API error - Request body:", JSON.stringify(requestBody, null, 2));
        return res.status(response.status).json({ 
          message: "Failed to create Tavus video session",
          details: error,
          status: response.status
        });
      }

      const data = await response.json();

      if (!data || !data.conversation_url) {
        return res.status(500).json({
          message: "Invalid response from Tavus API"
        });
      }
      
      // Save interview record to database
      const interview = await storage.createInterview({
        candidateId: candidateId || null,
        jobId: null,
        type: "video",
        provider: "tavus",
        status: "in_progress",
        sessionId: data.conversation_id || null,
        conversationUrl: data.conversation_url,
        metadata: {
          jobRole: role,
          candidateName,
          persona: "Jane Smith",
          tavusData: data
        },
        startedAt: new Date()
      });
      
      res.json({
        sessionUrl: data.conversation_url,
        sessionId: data.conversation_id || "unknown",
        status: data.status || "created",
        candidateId,
        candidateName,
        interviewId: interview.id
      });
    } catch (error) {
      console.error("Error creating Tavus session:", error);
      res.status(500).json({ message: "Failed to create video session" });
    }
  });

  // Interview routes
  app.get("/api/interviews", async (req, res) => {
    try {
      const interviews = await storage.getAllInterviews();
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  app.get("/api/interviews/:id", async (req, res) => {
    try {
      const interview = await storage.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
    }
  });

  app.get("/api/candidates/:candidateId/interviews", async (req, res) => {
    try {
      const interviews = await storage.getInterviewsByCandidateId(req.params.candidateId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching candidate interviews:", error);
      res.status(500).json({ message: "Failed to fetch candidate interviews" });
    }
  });

  app.get("/api/jobs/:jobId/interviews", async (req, res) => {
    try {
      const interviews = await storage.getInterviewsByJobId(req.params.jobId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching job interviews:", error);
      res.status(500).json({ message: "Failed to fetch job interviews" });
    }
  });

  app.post("/api/interviews", async (req, res) => {
    try {
      const result = insertInterviewSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const interview = await storage.createInterview(result.data);
      res.status(201).json(interview);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  app.patch("/api/interviews/:id", async (req, res) => {
    try {
      const result = updateInterviewSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const interview = await storage.updateInterview(req.params.id, result.data);
      if (!interview) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      console.error("Error updating interview:", error);
      res.status(500).json({ message: "Failed to update interview" });
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

      // Set up initial reminder (24 hours from now)
      const nextReminderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.updateIntegrityCheck(checkId, {
        nextReminderAt,
        reminderEnabled: 1,
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

  app.post("/api/integrity-checks/:id/send-reminder", async (req, res) => {
    try {
      const { ReminderService } = await import("./reminder-service");
      const reminderService = new ReminderService(storage);
      
      await reminderService.sendReminder(req.params.id);
      res.json({ message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  app.patch("/api/integrity-checks/:id/reminder-config", async (req, res) => {
    try {
      const { intervalHours, enabled } = req.body;
      
      // Only apply provided values (respect undefined to keep existing values)
      const config: { intervalHours?: number; enabled?: boolean } = {};
      if (intervalHours !== undefined) config.intervalHours = intervalHours;
      if (enabled !== undefined) config.enabled = enabled;
      
      // If no values provided, return error
      if (Object.keys(config).length === 0) {
        return res.status(400).json({ message: "At least one of intervalHours or enabled must be provided" });
      }
      
      const { ReminderService } = await import("./reminder-service");
      const reminderService = new ReminderService(storage);
      await reminderService.configureReminder(req.params.id, config);
      
      const check = await storage.getIntegrityCheck(req.params.id);
      res.json(check);
    } catch (error) {
      console.error("Error configuring reminder:", error);
      res.status(500).json({ message: "Failed to configure reminder" });
    }
  });

  app.post("/api/reminders/check-all", async (req, res) => {
    try {
      const { ReminderService} = await import("./reminder-service");
      const reminderService = new ReminderService(storage);
      
      await reminderService.checkAndSendReminders();
      res.json({ message: "Reminders checked and sent successfully" });
    } catch (error) {
      console.error("Error checking reminders:", error);
      res.status(500).json({ message: "Failed to check reminders" });
    }
  });

  app.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.get("/api/system-settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  });

  app.put("/api/system-settings/:key", async (req, res) => {
    try {
      const { value, category, description } = req.body;
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.upsertSystemSetting(
        req.params.key,
        value,
        category || "general",
        description
      );
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  app.delete("/api/system-settings/:key", async (req, res) => {
    try {
      const success = await storage.deleteSystemSetting(req.params.key);
      if (!success) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ message: "Failed to delete system setting" });
    }
  });

  app.get("/api/tenant-config", async (req, res) => {
    try {
      const config = await storage.getTenantConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching tenant config:", error);
      res.status(500).json({ message: "Failed to fetch tenant config" });
    }
  });

  app.post("/api/tenant-config", async (req, res) => {
    try {
      if (req.body.modulesEnabled && typeof req.body.modulesEnabled !== 'object') {
        return res.status(400).json({ message: "modulesEnabled must be an object" });
      }
      
      if (req.body.modulesEnabled) {
        const validModules = ['recruitment', 'integrity', 'onboarding', 'hr_management'];
        for (const [key, value] of Object.entries(req.body.modulesEnabled)) {
          if (!validModules.includes(key)) {
            return res.status(400).json({ message: `Invalid module key: ${key}` });
          }
          if (typeof value !== 'boolean') {
            return res.status(400).json({ message: `Module ${key} must be a boolean` });
          }
        }
      }
      
      const existing = await storage.getTenantConfig();
      if (existing) {
        const updated = await storage.updateTenantConfig(existing.id, req.body);
        return res.json(updated);
      }
      
      const config = await storage.createTenantConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error creating tenant config:", error);
      res.status(500).json({ message: "Failed to create tenant config" });
    }
  });

  app.patch("/api/tenant-config/:id", async (req, res) => {
    try {
      if (req.body.modulesEnabled && typeof req.body.modulesEnabled !== 'object') {
        return res.status(400).json({ message: "modulesEnabled must be an object" });
      }
      
      if (req.body.modulesEnabled) {
        const validModules = ['recruitment', 'integrity', 'onboarding', 'hr_management'];
        for (const [key, value] of Object.entries(req.body.modulesEnabled)) {
          if (!validModules.includes(key)) {
            return res.status(400).json({ message: `Invalid module key: ${key}` });
          }
          if (typeof value !== 'boolean') {
            return res.status(400).json({ message: `Module ${key} must be a boolean` });
          }
        }
      }
      
      const config = await storage.updateTenantConfig(req.params.id, req.body);
      if (!config) {
        return res.status(404).json({ message: "Tenant config not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error updating tenant config:", error);
      res.status(500).json({ message: "Failed to update tenant config" });
    }
  });

  app.get("/api/env-status", async (req, res) => {
    try {
      const requiredSecrets = [
        { key: "GROQ_API_KEY", description: "Groq API for AI agents" },
        { key: "HUME_API_KEY", description: "Hume AI for voice interviews" },
        { key: "HUME_SECRET_KEY", description: "Hume AI secret key" },
        { key: "TAVUS_API_KEY", description: "Tavus for video interviews" },
        { key: "WHATSAPP_API_TOKEN", description: "WhatsApp for notifications" },
        { key: "WHATSAPP_PHONE_NUMBER_ID", description: "WhatsApp phone number" },
        { key: "WHATSAPP_VERIFY_TOKEN", description: "WhatsApp verification" },
        { key: "ELEVENLABS_API_KEY", description: "ElevenLabs for voice synthesis" },
      ];

      const status = requiredSecrets.map(secret => ({
        key: secret.key,
        description: secret.description,
        configured: !!process.env[secret.key],
      }));

      res.json({ secrets: status });
    } catch (error) {
      console.error("Error checking env status:", error);
      res.status(500).json({ message: "Failed to check environment status" });
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

  app.post("/api/onboarding/trigger/:candidateId", async (req, res) => {
    try {
      const { OnboardingOrchestrator } = await import("./onboarding-orchestrator");
      const orchestrator = new OnboardingOrchestrator(storage);
      
      const workflow = await orchestrator.startOnboarding(req.params.candidateId);
      
      res.status(201).json({
        message: "Onboarding workflow started",
        workflow,
      });
    } catch (error) {
      console.error("Error starting onboarding:", error);
      res.status(500).json({ message: "Failed to start onboarding workflow" });
    }
  });

  app.get("/api/onboarding/status/:candidateId", async (req, res) => {
    try {
      const { OnboardingOrchestrator } = await import("./onboarding-orchestrator");
      const orchestrator = new OnboardingOrchestrator(storage);
      
      const workflow = await orchestrator.getWorkflowByCandidateId(req.params.candidateId);
      
      res.json(workflow || null);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.get("/api/onboarding/workflows", async (req, res) => {
    try {
      const workflows = await storage.getAllOnboardingWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching onboarding workflows:", error);
      res.status(500).json({ message: "Failed to fetch onboarding workflows" });
    }
  });

  app.get("/api/onboarding/workflows/:id", async (req, res) => {
    try {
      const workflow = await storage.getOnboardingWorkflow(req.params.id);
      
      if (!workflow) {
        return res.status(404).json({ message: "Onboarding workflow not found" });
      }
      
      res.json(workflow);
    } catch (error) {
      console.error("Error fetching onboarding workflow:", error);
      res.status(500).json({ message: "Failed to fetch onboarding workflow" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
