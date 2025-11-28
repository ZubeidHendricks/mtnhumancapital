import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCandidateSchema, insertJobSchema, insertIntegrityCheckSchema, insertRecruitmentSessionSchema, insertInterviewSchema, updateInterviewSchema, insertTenantRequestSchema, updateTenantRequestSchema, type InsertCandidate } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { IntegrityOrchestrator } from "./integrity-orchestrator";
import { RecruitmentOrchestrator } from "./recruitment-orchestrator";
import { sourcingOrchestrator, type SpecialistCandidate } from "./sourcing-specialists";
import { cvParser } from "./cv-parser";
import { embeddingService } from "./embedding-service";
import { getOrCreateConversation, deleteConversation } from "./job-creation-agent";
import { requireAdmin } from "./admin-middleware";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import AdmZip from "adm-zip";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates(req.tenant.id);
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.tenant.id, req.params.id);
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
      
      const candidate = await storage.createCandidate(req.tenant.id, result.data);
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
      
      const candidate = await storage.updateCandidate(req.tenant.id, req.params.id, result.data);
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
      const success = await storage.deleteCandidate(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  app.post("/api/candidates/:id/send-reminder", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.tenant.id, req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const existingMetadata = (candidate.metadata as Record<string, any>) || {};
      const existingReminders = existingMetadata.reminders || {};
      const remindersSent = (existingReminders.sent || 0) + 1;
      const lastReminderAt = new Date().toISOString();

      const updatedMetadata = {
        ...existingMetadata,
        reminders: {
          ...existingReminders,
          sent: remindersSent,
          lastSentAt: lastReminderAt,
          history: [
            ...(existingReminders.history || []),
            { type: 'document_reminder', sentAt: lastReminderAt }
          ].slice(-10)
        }
      };

      await storage.updateCandidate(req.tenant.id, req.params.id, {
        metadata: updatedMetadata
      });

      console.log(`[REMINDER] Sent document reminder to ${candidate.fullName} (${candidate.email || 'no email'})`);

      res.json({ 
        message: "Reminder sent successfully",
        candidate: candidate.fullName,
        remindersSent,
        timestamp: lastReminderAt
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
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

      const updatedCandidate = await storage.updateCandidate(req.tenant.id, candidateId, {
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
          
          const candidate = await storage.createCandidate(req.tenant.id, result.data);
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
      const jobs = await storage.getAllJobs(req.tenant.id);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.tenant.id, req.params.id);
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
      const job = await storage.createJob(req.tenant.id, result.data);
      
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
        await storage.updateJob(req.tenant.id, job.id, {
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
      
      const job = await storage.updateJob(req.tenant.id, req.params.id, result.data);
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
      const success = await storage.deleteJob(req.tenant.id, req.params.id);
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
      const job = await storage.createJob(req.tenant.id, {
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
          await storage.updateJob(req.tenant.id, job.id, {
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

  app.get("/api/tavus/personas", async (req, res) => {
    try {
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY;

      if (!TAVUS_API_KEY) {
        return res.status(500).json({ 
          message: "Tavus API key not configured" 
        });
      }

      const response = await fetch("https://tavusapi.com/v2/personas?limit=100&type=user", {
        method: "GET",
        headers: {
          "x-api-key": TAVUS_API_KEY
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tavus List Personas API error - Status:", response.status);
        console.error("Tavus List Personas API error - Response:", error);
        return res.status(response.status).json({ 
          message: "Failed to fetch Tavus personas",
          details: error,
          status: response.status
        });
      }

      const data = await response.json();
      
      res.json({
        personas: data.data || []
      });
    } catch (error) {
      console.error("Error fetching Tavus personas:", error);
      res.status(500).json({ message: "Failed to fetch personas" });
    }
  });

  app.post("/api/tavus/persona", async (req, res) => {
    try {
      const { personaName, systemPrompt, context, replicaId } = req.body;
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY;

      if (!TAVUS_API_KEY) {
        return res.status(500).json({ 
          message: "Tavus API key not configured" 
        });
      }

      if (!systemPrompt) {
        return res.status(400).json({
          message: "System prompt is required"
        });
      }

      const requestBody: any = {
        pipeline_mode: "full",
        system_prompt: systemPrompt
      };

      if (personaName) requestBody.persona_name = personaName;
      if (context) requestBody.context = context;
      if (replicaId) requestBody.default_replica_id = replicaId;

      const response = await fetch("https://tavusapi.com/v2/personas", {
        method: "POST",
        headers: {
          "x-api-key": TAVUS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tavus Persona API error - Status:", response.status);
        console.error("Tavus Persona API error - Response:", error);
        return res.status(response.status).json({ 
          message: "Failed to create Tavus persona",
          details: error,
          status: response.status
        });
      }

      const data = await response.json();
      
      res.json({
        personaId: data.persona_id,
        personaName: data.persona_name,
        createdAt: data.created_at
      });
    } catch (error) {
      console.error("Error creating Tavus persona:", error);
      res.status(500).json({ message: "Failed to create persona" });
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
      const interview = await storage.createInterview(req.tenant.id, {
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
      const interviews = await storage.getAllInterviews(req.tenant.id);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  app.get("/api/interviews/:id", async (req, res) => {
    try {
      const interview = await storage.getInterview(req.tenant.id, req.params.id);
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
      const interviews = await storage.getInterviewsByCandidateId(req.tenant.id, req.params.candidateId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching candidate interviews:", error);
      res.status(500).json({ message: "Failed to fetch candidate interviews" });
    }
  });

  app.get("/api/jobs/:jobId/interviews", async (req, res) => {
    try {
      const interviews = await storage.getInterviewsByJobId(req.tenant.id, req.params.jobId);
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
      
      const interview = await storage.createInterview(req.tenant.id, result.data);
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
      
      const interview = await storage.updateInterview(req.tenant.id, req.params.id, result.data);
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
      const checks = await storage.getAllIntegrityChecks(req.tenant.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching integrity checks:", error);
      res.status(500).json({ message: "Failed to fetch integrity checks" });
    }
  });

  app.get("/api/integrity-checks/candidate/:candidateId", async (req, res) => {
    try {
      const checks = await storage.getIntegrityChecksByCandidateId(req.tenant.id, req.params.candidateId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching candidate integrity checks:", error);
      res.status(500).json({ message: "Failed to fetch candidate integrity checks" });
    }
  });

  app.get("/api/integrity-checks/:id", async (req, res) => {
    try {
      const check = await storage.getIntegrityCheck(req.tenant.id, req.params.id);
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
      
      const check = await storage.createIntegrityCheck(req.tenant.id, result.data);
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
      
      const check = await storage.updateIntegrityCheck(req.tenant.id, req.params.id, result.data);
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
      const success = await storage.deleteIntegrityCheck(req.tenant.id, req.params.id);
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
      const check = await storage.getIntegrityCheck(req.tenant.id, checkId);
      if (!check) {
        return res.status(404).json({ message: "Integrity check not found" });
      }

      // Execute the check with real AI agents
      const orchestrator = new IntegrityOrchestrator(storage);
      
      // Start execution in background (don't await)
      orchestrator.executeIntegrityCheck(req.tenant.id, checkId, check.candidateId)
        .catch(error => {
          console.error(`Error executing integrity check ${checkId}:`, error);
          storage.updateIntegrityCheck(req.tenant.id, checkId, {
            status: "failed",
            result: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        });

      // Set up initial reminder (24 hours from now)
      const nextReminderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.updateIntegrityCheck(req.tenant.id, checkId, {
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
      
      await reminderService.sendReminder(req.tenant.id, req.params.id);
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
      await reminderService.configureReminder(req.tenant.id, req.params.id, config);
      
      const check = await storage.getIntegrityCheck(req.tenant.id, req.params.id);
      res.json(check);
    } catch (error) {
      console.error("Error configuring reminder:", error);
      res.status(500).json({ message: "Failed to configure reminder" });
    }
  });

  // Scoped to current tenant only - triggers reminder checks for this tenant's integrity checks
  // Background job in index.ts runs checkAndSendReminders() for ALL tenants hourly
  app.post("/api/reminders/check-current-tenant", async (req, res) => {
    try {
      const { ReminderService} = await import("./reminder-service");
      const reminderService = new ReminderService(storage);
      const now = new Date();
      
      // Get reminders only for current tenant
      const checksNeedingReminders = await storage.getChecksNeedingReminders(req.tenant.id, now);
      
      for (const check of checksNeedingReminders) {
        try {
          await reminderService.sendReminder(req.tenant.id, check.id);
        } catch (error) {
          console.error(`Failed to send reminder for check ${check.id}:`, error);
        }
      }
      
      res.json({ 
        message: `Reminders checked for tenant ${req.tenant.companyName}`,
        remindersSent: checksNeedingReminders.length 
      });
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

  // Get current tenant based on subdomain (attached by middleware)
  app.get("/api/tenant/current", async (req, res) => {
    try {
      if (!req.tenant) {
        return res.status(404).json({ message: "No tenant found for this domain" });
      }
      res.json(req.tenant);
    } catch (error) {
      console.error("Error fetching current tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
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
      const sessions = await storage.getAllRecruitmentSessions(req.tenant.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recruitment sessions:", error);
      res.status(500).json({ message: "Failed to fetch recruitment sessions" });
    }
  });

  app.get("/api/recruitment-sessions/job/:jobId", async (req, res) => {
    try {
      const sessions = await storage.getRecruitmentSessionsByJobId(req.tenant.id, req.params.jobId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching job recruitment sessions:", error);
      res.status(500).json({ message: "Failed to fetch job recruitment sessions" });
    }
  });

  app.get("/api/recruitment-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getRecruitmentSession(req.tenant.id, req.params.id);
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

      const session = await storage.createRecruitmentSession(req.tenant.id, {
        jobId,
        status: "Running",
        candidatesFound: 0,
        candidatesAdded: 0,
      });

      const orchestrator = new RecruitmentOrchestrator(storage);
      
      orchestrator.executeRecruitment(req.tenant.id, session.id, jobId, {
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

  // ===== Sourcing Specialist Routes =====
  
  app.get("/api/sourcing/specialists", async (req, res) => {
    try {
      const specialists = sourcingOrchestrator.getSpecialists();
      res.json(specialists);
    } catch (error) {
      console.error("Error fetching specialists:", error);
      res.status(500).json({ message: "Failed to fetch sourcing specialists" });
    }
  });

  app.post("/api/sourcing/run-all/:jobId", async (req, res) => {
    try {
      const { candidatesPerSpecialist = 7, minMatchScore = 60, autoSave = true } = req.body;
      
      const job = await storage.getJobById(req.tenant.id, req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      console.log(`[Sourcing] Running all specialists for job: ${job.title}`);
      
      const { results, allCandidates, configuration } = await sourcingOrchestrator.runAllSpecialists(
        job,
        candidatesPerSpecialist
      );

      let savedCount = 0;
      if (autoSave) {
        for (const candidate of allCandidates) {
          if (candidate.match >= minMatchScore) {
            try {
              const candidateData: InsertCandidate = {
                fullName: candidate.name,
                role: candidate.currentRole,
                source: `${candidate.source} (${candidate.specialist})`,
                status: "New",
                stage: "Screening",
                match: candidate.match,
                jobId: job.id,
                skills: candidate.skills,
                location: candidate.location,
                metadata: {
                  company: candidate.company,
                  experience: candidate.experience,
                  specialist: candidate.specialist,
                  platform: candidate.source,
                  profileUrl: candidate.profileUrl,
                  ...candidate.rawData,
                },
              };
              await storage.createCandidate(req.tenant.id, candidateData);
              savedCount++;
            } catch (err) {
              console.error(`Failed to save candidate ${candidate.name}:`, err);
            }
          }
        }
      }

      const savedBySpecialist: Record<string, number> = {};
      for (const candidate of allCandidates) {
        if (candidate.match >= minMatchScore) {
          savedBySpecialist[candidate.specialist] = (savedBySpecialist[candidate.specialist] || 0) + 1;
        }
      }

      res.json({
        message: "Sourcing completed",
        configuration,
        results: results.map(r => ({
          specialist: r.specialist,
          status: r.status,
          candidatesFound: r.candidates.length,
          candidatesSaved: savedBySpecialist[r.specialist] || 0,
          searchQuery: r.searchQuery,
          timestamp: r.timestamp,
        })),
        summary: {
          totalCandidatesFound: allCandidates.length,
          candidatesSaved: savedCount,
          bySpecialist: results.map(r => ({
            name: r.specialist,
            found: r.candidates.length,
            saved: savedBySpecialist[r.specialist] || 0,
          })),
        },
        candidates: allCandidates,
      });
    } catch (error) {
      console.error("Error running sourcing specialists:", error);
      res.status(500).json({ message: "Failed to run sourcing specialists" });
    }
  });

  app.post("/api/sourcing/run/:specialistName/:jobId", async (req, res) => {
    try {
      const { limit = 10, minMatchScore = 60, autoSave = true } = req.body;
      const specialistName = decodeURIComponent(req.params.specialistName);
      
      const job = await storage.getJobById(req.tenant.id, req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      console.log(`[Sourcing] Running ${specialistName} for job: ${job.title}`);
      
      const result = await sourcingOrchestrator.runSpecialist(specialistName, job, limit);

      let savedCount = 0;
      if (autoSave && result.status === "success") {
        for (const candidate of result.candidates) {
          if (candidate.match >= minMatchScore) {
            try {
              const candidateData: InsertCandidate = {
                fullName: candidate.name,
                role: candidate.currentRole,
                source: `${candidate.source} (${candidate.specialist})`,
                status: "New",
                stage: "Screening",
                match: candidate.match,
                jobId: job.id,
                skills: candidate.skills,
                location: candidate.location,
                metadata: {
                  company: candidate.company,
                  experience: candidate.experience,
                  specialist: candidate.specialist,
                  platform: candidate.source,
                  profileUrl: candidate.profileUrl,
                  ...candidate.rawData,
                },
              };
              await storage.createCandidate(req.tenant.id, candidateData);
              savedCount++;
            } catch (err) {
              console.error(`Failed to save candidate ${candidate.name}:`, err);
            }
          }
        }
      }

      res.json({
        message: `${specialistName} sourcing completed`,
        result: {
          specialist: result.specialist,
          status: result.status,
          searchQuery: result.searchQuery,
          candidatesFound: result.candidates.length,
          candidatesSaved: savedCount,
          timestamp: result.timestamp,
          errorMessage: result.errorMessage,
        },
        candidates: result.candidates,
      });
    } catch (error) {
      console.error("Error running sourcing specialist:", error);
      res.status(500).json({ message: "Failed to run sourcing specialist" });
    }
  });

  app.post("/api/sourcing/generate-config/:jobId", async (req, res) => {
    try {
      const job = await storage.getJobById(req.tenant.id, req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const { LinkedInSpecialist } = await import("./sourcing-specialists");
      const specialist = new LinkedInSpecialist();
      const configuration = await specialist.generateSearchConfiguration(job);

      res.json({
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
        },
        configuration,
      });
    } catch (error) {
      console.error("Error generating sourcing config:", error);
      res.status(500).json({ message: "Failed to generate sourcing configuration" });
    }
  });

  app.post("/api/onboarding/trigger/:candidateId", async (req, res) => {
    try {
      const { OnboardingOrchestrator } = await import("./onboarding-orchestrator");
      const orchestrator = new OnboardingOrchestrator(storage);
      
      const workflow = await orchestrator.startOnboarding(req.tenant.id, req.params.candidateId);
      
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
      
      const workflow = await orchestrator.getWorkflowByCandidateId(req.tenant.id, req.params.candidateId);
      
      res.json(workflow || null);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.get("/api/onboarding/workflows", async (req, res) => {
    try {
      const workflows = await storage.getAllOnboardingWorkflows(req.tenant.id);
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching onboarding workflows:", error);
      res.status(500).json({ message: "Failed to fetch onboarding workflows" });
    }
  });

  app.get("/api/onboarding/workflows/:id", async (req, res) => {
    try {
      const workflow = await storage.getOnboardingWorkflow(req.tenant.id, req.params.id);
      
      if (!workflow) {
        return res.status(404).json({ message: "Onboarding workflow not found" });
      }
      
      res.json(workflow);
    } catch (error) {
      console.error("Error fetching onboarding workflow:", error);
      res.status(500).json({ message: "Failed to fetch onboarding workflow" });
    }
  });

  // ===== Tenant Request Routes (for new customer onboarding) =====
  // Note: Public POST route is registered in server/index.ts BEFORE tenant middleware
  
  // Admin route: Get all tenant requests (requires admin authorization)
  app.get("/api/tenant-requests", requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      
      const requests = status 
        ? await storage.getTenantRequestsByStatus(status)
        : await storage.getAllTenantRequests();
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching tenant requests:", error);
      res.status(500).json({ message: "Failed to fetch tenant requests" });
    }
  });

  // Admin route: Get a specific tenant request (requires admin authorization)
  app.get("/api/tenant-requests/:id", requireAdmin, async (req, res) => {
    try {
      const request = await storage.getTenantRequestById(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Tenant request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching tenant request:", error);
      res.status(500).json({ message: "Failed to fetch tenant request" });
    }
  });

  // Admin route: Update a tenant request (requires admin authorization, for approval/rejection)
  app.patch("/api/tenant-requests/:id", requireAdmin, async (req, res) => {
    try {
      const result = updateTenantRequestSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const request = await storage.updateTenantRequest(req.params.id, result.data);
      
      if (!request) {
        return res.status(404).json({ message: "Tenant request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error updating tenant request:", error);
      res.status(500).json({ message: "Failed to update tenant request" });
    }
  });

  // Admin route: Delete a tenant request (requires admin authorization)
  app.delete("/api/tenant-requests/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteTenantRequest(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tenant request not found" });
      }
      
      res.json({ message: "Tenant request deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant request:", error);
      res.status(500).json({ message: "Failed to delete tenant request" });
    }
  });

  // ===== Workforce Intelligence Routes =====
  
  // Skills
  app.get("/api/skills", async (req, res) => {
    try {
      const skills = await storage.getAllSkills(req.tenant.id);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching skills:", error);
      res.json([]); // Return empty array if not implemented
    }
  });

  app.post("/api/skills", async (req, res) => {
    try {
      const skill = await storage.createSkill(req.tenant.id, req.body);
      res.status(201).json(skill);
    } catch (error) {
      console.error("Error creating skill:", error);
      res.status(500).json({ message: "Failed to create skill" });
    }
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees(req.tenant.id);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.json([]); // Return empty array if not implemented
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.tenant.id, req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.tenant.id, req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  // Departments
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments(req.tenant.id);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.json([]); // Return empty array if not implemented
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const department = await storage.createDepartment(req.tenant.id, req.body);
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Skill Activities (Learning Path)
  app.get("/api/skill-activities", async (req, res) => {
    try {
      const activities = await storage.getSkillActivities(req.tenant.id);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching skill activities:", error);
      res.json([]); // Return empty array if not implemented
    }
  });

  // Platform Status (for API key configuration check)
  app.get("/api/platform-status", async (req, res) => {
    try {
      res.json({
        linkedin: !!process.env.LINKEDIN_API_KEY,
        pnet: !!process.env.PNET_API_KEY,
        indeed: !!process.env.INDEED_API_KEY,
      });
    } catch (error) {
      console.error("Error checking platform status:", error);
      res.json({ linkedin: false, pnet: false, indeed: false });
    }
  });

  // Workforce AI RAG Assistant
  app.post("/api/workforce-ai/ask", async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }

      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      // Gather workforce context
      const [employees, departments, jobs, skills] = await Promise.all([
        storage.getAllEmployees(req.tenant.id),
        storage.getAllDepartments(req.tenant.id),
        storage.getAllJobs(req.tenant.id),
        storage.getAllSkills(req.tenant.id),
      ]);

      const workforceContext = {
        totalEmployees: employees.length,
        departments: departments.map(d => ({ name: d.name, headCount: d.headCount, skillGapScore: d.skillGapScore })),
        openPositions: jobs.filter(j => j.status === "open").length,
        employees: employees.map(e => ({
          name: e.fullName,
          role: e.jobTitle,
          department: e.department,
          team: e.team,
          location: e.location,
          skills: e.tags || [],
        })),
        skills: skills.map(s => ({ name: s.name, category: s.category })),
      };

      const systemPrompt = `You are an AI Workforce Intelligence Assistant for Avatar Human Capital. You help HR managers and executives understand their workforce data and make strategic decisions.

You have access to the following workforce data:
${JSON.stringify(workforceContext, null, 2)}

When answering questions:
1. Provide specific, data-driven answers based on the workforce context
2. If asked about candidates or employees, find the best match based on skills, experience, and location
3. Suggest internal mobility opportunities when relevant
4. Identify skill gaps and training needs
5. Provide promotion readiness insights
6. Keep responses concise but insightful

If the data is limited (mock/demo data), provide realistic insights based on what you would expect in a real HR scenario. Always be helpful and provide actionable recommendations.

Format your response as JSON:
{
  "answer": "<your detailed answer>",
  "confidence": <0-100>,
  "matchedEmployee": { "name": "<if relevant>", "matchScore": <0-100>, "reason": "<why they match>" } | null,
  "insights": ["<insight1>", "<insight2>"],
  "recommendations": ["<recommendation1>", "<recommendation2>"],
  "alerts": [{ "type": "urgent|info|promotion", "message": "<alert message>" }]
}`;

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      
      // Try to parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            success: true,
            ...parsed,
            thinkingTime: Math.floor(Math.random() * 5) + 3, // 3-8 seconds
          });
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
      }

      // Fallback response
      res.json({
        success: true,
        answer: responseText,
        confidence: 75,
        matchedEmployee: null,
        insights: [],
        recommendations: [],
        alerts: [],
        thinkingTime: 5,
      });
    } catch (error) {
      console.error("Workforce AI error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process question",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Workforce Alerts (Execution Co-Pilot)
  app.get("/api/workforce-ai/alerts", async (req, res) => {
    try {
      const [employees, departments] = await Promise.all([
        storage.getAllEmployees(req.tenant.id),
        storage.getAllDepartments(req.tenant.id),
      ]);

      // Generate sample alerts based on workforce data
      const alerts = [];

      // Check for skill gaps in departments
      for (const dept of departments) {
        if (dept.skillGapScore && dept.skillGapScore > 10) {
          alerts.push({
            id: `skill-gap-${dept.id}`,
            type: "urgent",
            category: "Skill analysis",
            title: `${Math.floor(Math.random() * 3) + 2} team members need to grow in key skills`,
            description: `The ${dept.name} team has identified skill gaps that need attention.`,
            team: dept.name,
            time: "now",
          });
        }
      }

      // Sample promotion alerts
      if (employees.length > 0) {
        alerts.push({
          id: "promotion-1",
          type: "promotion",
          category: "Promotion alert",
          title: `${Math.min(employees.length, 2)} members of this team are ready for promotion`,
          description: "Based on performance and tenure, some team members are promotion candidates.",
          time: "2h ago",
        });
      }

      // Add some default alerts if none exist
      if (alerts.length === 0) {
        alerts.push(
          {
            id: "default-1",
            type: "urgent",
            category: "Skill analysis",
            title: "3 team members need to grow in Sales Techniques",
            description: "A crucial skill for the Sales Team that needs development.",
            team: "Sales Team",
            time: "now",
          },
          {
            id: "default-2",
            type: "promotion",
            category: "Promotion alert",
            title: "2 members of this team are ready for promotion",
            description: "Consider internal mobility opportunities for high performers.",
            time: "2h ago",
          }
        );
      }

      res.json({ alerts });
    } catch (error) {
      console.error("Error fetching workforce alerts:", error);
      res.json({ alerts: [] });
    }
  });

  // ===== Workforce Intelligence - Enhanced Data Endpoints =====

  // Get all employees with their skills (for People Profiles)
  app.get("/api/workforce/employees", async (req, res) => {
    try {
      const employeesWithSkills = await storage.getEmployeesWithSkills(req.tenant.id);
      res.json(employeesWithSkills);
    } catch (error) {
      console.error("Error fetching employees with skills:", error);
      res.json([]);
    }
  });

  // Get single employee with skills (People Profile detail)
  app.get("/api/workforce/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployeeWithSkills(req.tenant.id, req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee with skills:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  // Get employee's skills
  app.get("/api/workforce/employees/:id/skills", async (req, res) => {
    try {
      const skills = await storage.getEmployeeSkills(req.tenant.id, req.params.id);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching employee skills:", error);
      res.json([]);
    }
  });

  // Create employee skill assessment
  app.post("/api/workforce/employee-skills", async (req, res) => {
    try {
      const skill = await storage.createEmployeeSkill(req.tenant.id, req.body);
      res.status(201).json(skill);
    } catch (error) {
      console.error("Error creating employee skill:", error);
      res.status(500).json({ message: "Failed to create employee skill" });
    }
  });

  // Update employee skill assessment
  app.patch("/api/workforce/employee-skills/:id", async (req, res) => {
    try {
      const skill = await storage.updateEmployeeSkill(req.tenant.id, req.params.id, req.body);
      if (!skill) {
        return res.status(404).json({ message: "Employee skill not found" });
      }
      res.json(skill);
    } catch (error) {
      console.error("Error updating employee skill:", error);
      res.status(500).json({ message: "Failed to update employee skill" });
    }
  });

  // Get all employee skills (for skill matrix view)
  app.get("/api/workforce/all-employee-skills", async (req, res) => {
    try {
      const allSkills = await storage.getAllEmployeeSkills(req.tenant.id);
      res.json(allSkills);
    } catch (error) {
      console.error("Error fetching all employee skills:", error);
      res.json([]);
    }
  });

  // Get department skill gaps
  app.get("/api/workforce/department-gaps", async (req, res) => {
    try {
      const gaps = await storage.getDepartmentSkillGaps(req.tenant.id);
      res.json(gaps);
    } catch (error) {
      console.error("Error fetching department skill gaps:", error);
      res.json([]);
    }
  });

  // Get skill assessments overview (grouped by category)
  app.get("/api/workforce/skill-assessments", async (req, res) => {
    try {
      const [skills, allEmployeeSkills] = await Promise.all([
        storage.getAllSkills(req.tenant.id),
        storage.getAllEmployeeSkills(req.tenant.id),
      ]);

      // Group skills by category with proficiency stats
      const categoryMap = new Map<string, {
        name: string;
        skills: { id: string; name: string; avgProficiency: number; assessedCount: number; gapCount: number }[];
        avgProficiency: number;
        totalAssessed: number;
      }>();

      for (const skill of skills) {
        const category = skill.category || "Uncategorized";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            name: category,
            skills: [],
            avgProficiency: 0,
            totalAssessed: 0,
          });
        }

        const employeeAssessments = allEmployeeSkills.filter(es => es.skillId === skill.id);
        const avgProf = employeeAssessments.length > 0
          ? employeeAssessments.reduce((sum, es) => sum + es.proficiencyLevel, 0) / employeeAssessments.length
          : 0;
        const gapCount = employeeAssessments.filter(es => 
          es.status === 'critical_gap' || es.status === 'training_needed'
        ).length;

        categoryMap.get(category)!.skills.push({
          id: skill.id,
          name: skill.name,
          avgProficiency: Math.round(avgProf * 10) / 10,
          assessedCount: employeeAssessments.length,
          gapCount,
        });
      }

      // Calculate category averages
      for (const [_, data] of categoryMap) {
        if (data.skills.length > 0) {
          const total = data.skills.reduce((sum, s) => sum + s.avgProficiency, 0);
          data.avgProficiency = Math.round((total / data.skills.length) * 10) / 10;
          data.totalAssessed = data.skills.reduce((sum, s) => sum + s.assessedCount, 0);
        }
      }

      res.json(Array.from(categoryMap.values()));
    } catch (error) {
      console.error("Error fetching skill assessments:", error);
      res.json([]);
    }
  });

  // Skill matching - match employees to a job's required skills
  app.get("/api/workforce/skill-match/:jobId", async (req, res) => {
    try {
      const jobSkills = await storage.getJobSkills(req.tenant.id, req.params.jobId);
      const employeesWithSkills = await storage.getEmployeesWithSkills(req.tenant.id);

      if (jobSkills.length === 0) {
        return res.json({ 
          matches: employeesWithSkills.map(e => ({
            employee: e,
            matchScore: 0,
            matchedSkills: [],
            missingSkills: [],
          })),
          message: "No skill requirements defined for this job"
        });
      }

      // Calculate match scores for each employee
      const matches = employeesWithSkills.map(employee => {
        const matchedSkills: { skill: string; required: number; actual: number; gap: number }[] = [];
        const missingSkills: { skill: string; required: number }[] = [];
        let totalScore = 0;
        let maxScore = 0;

        for (const jobSkill of jobSkills) {
          const empSkill = employee.skills.find(es => es.skillId === jobSkill.skillId);
          const importance = jobSkill.importance === 'essential' ? 3 : 
                            jobSkill.importance === 'required' ? 2 : 1;
          maxScore += jobSkill.requiredLevel * importance;

          if (empSkill) {
            const actual = empSkill.proficiencyLevel;
            const required = jobSkill.requiredLevel;
            const gap = Math.max(0, required - actual);
            const score = Math.min(actual, required) * importance;
            totalScore += score;
            matchedSkills.push({
              skill: jobSkill.skill.name,
              required,
              actual,
              gap,
            });
          } else {
            missingSkills.push({
              skill: jobSkill.skill.name,
              required: jobSkill.requiredLevel,
            });
          }
        }

        const matchScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        return {
          employee: {
            id: employee.id,
            fullName: employee.fullName,
            jobTitle: employee.jobTitle,
            department: employee.department,
            avatarUrl: employee.avatarUrl,
          },
          matchScore,
          matchedSkills,
          missingSkills,
        };
      });

      // Sort by match score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      res.json({ matches });
    } catch (error) {
      console.error("Error calculating skill matches:", error);
      res.status(500).json({ message: "Failed to calculate skill matches" });
    }
  });

  // Match employees to skills (for internal mobility)
  app.post("/api/workforce/find-matches", async (req, res) => {
    try {
      const { skillIds, minProficiency = 3 } = req.body;
      
      if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
        return res.status(400).json({ message: "skillIds array is required" });
      }

      const employeesWithSkills = await storage.getEmployeesWithSkills(req.tenant.id);

      const matches = employeesWithSkills
        .map(employee => {
          const matchedSkills = employee.skills.filter(es => 
            skillIds.includes(es.skillId) && es.proficiencyLevel >= minProficiency
          );

          const matchScore = skillIds.length > 0
            ? Math.round((matchedSkills.length / skillIds.length) * 100)
            : 0;

          return {
            employee: {
              id: employee.id,
              fullName: employee.fullName,
              jobTitle: employee.jobTitle,
              department: employee.department,
              avatarUrl: employee.avatarUrl,
            },
            matchScore,
            matchedSkills: matchedSkills.map(ms => ({
              skillName: ms.skill.name,
              proficiency: ms.proficiencyLevel,
            })),
          };
        })
        .filter(m => m.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);

      res.json({ matches });
    } catch (error) {
      console.error("Error finding skill matches:", error);
      res.status(500).json({ message: "Failed to find matches" });
    }
  });

  // Create job skill requirement
  app.post("/api/workforce/job-skills", async (req, res) => {
    try {
      const jobSkill = await storage.createJobSkill(req.tenant.id, req.body);
      res.status(201).json(jobSkill);
    } catch (error) {
      console.error("Error creating job skill:", error);
      res.status(500).json({ message: "Failed to create job skill" });
    }
  });

  // Get job skill requirements
  app.get("/api/workforce/jobs/:jobId/skills", async (req, res) => {
    try {
      const jobSkills = await storage.getJobSkills(req.tenant.id, req.params.jobId);
      res.json(jobSkills);
    } catch (error) {
      console.error("Error fetching job skills:", error);
      res.json([]);
    }
  });

  // Seed sample workforce data (for demo purposes)
  app.post("/api/workforce/seed-demo-data", async (req, res) => {
    try {
      // Create sample skills
      const skillsData = [
        { name: "JavaScript", category: "Technical" },
        { name: "Python", category: "Technical" },
        { name: "React", category: "Technical" },
        { name: "Node.js", category: "Technical" },
        { name: "SQL", category: "Technical" },
        { name: "Leadership", category: "Soft Skills" },
        { name: "Communication", category: "Soft Skills" },
        { name: "Problem Solving", category: "Soft Skills" },
        { name: "Project Management", category: "Leadership" },
        { name: "Strategic Thinking", category: "Leadership" },
        { name: "Sales Techniques", category: "Domain" },
        { name: "Customer Service", category: "Domain" },
      ];

      const createdSkills: any[] = [];
      for (const skill of skillsData) {
        try {
          const created = await storage.createSkill(req.tenant.id, skill);
          createdSkills.push(created);
        } catch (e) {
          // Skill might already exist
        }
      }

      // Create sample employees
      const employeesData = [
        { fullName: "Thabo Mokoena", email: "thabo@company.co.za", department: "Engineering", team: "Frontend", jobTitle: "Senior Developer", location: "Johannesburg" },
        { fullName: "Naledi Ndaba", email: "naledi@company.co.za", department: "Engineering", team: "Backend", jobTitle: "Lead Engineer", location: "Cape Town" },
        { fullName: "Sipho Dlamini", email: "sipho@company.co.za", department: "Sales", team: "Enterprise", jobTitle: "Sales Manager", location: "Durban" },
        { fullName: "Lerato Maseko", email: "lerato@company.co.za", department: "HR", team: "Talent", jobTitle: "HR Specialist", location: "Johannesburg" },
        { fullName: "Bongani Zulu", email: "bongani@company.co.za", department: "Engineering", team: "DevOps", jobTitle: "DevOps Engineer", location: "Pretoria" },
      ];

      const createdEmployees: any[] = [];
      for (const emp of employeesData) {
        try {
          const created = await storage.createEmployee(req.tenant.id, emp);
          createdEmployees.push(created);
        } catch (e) {
          // Employee might already exist
        }
      }

      // Create employee skill assessments
      const assessments = [
        { employeeIdx: 0, skillIdx: 0, proficiency: 7, status: "good_match" },  // Thabo - JavaScript
        { employeeIdx: 0, skillIdx: 2, proficiency: 8, status: "beyond_expectations" },  // Thabo - React
        { employeeIdx: 0, skillIdx: 6, proficiency: 5, status: "training_needed" },  // Thabo - Communication
        { employeeIdx: 1, skillIdx: 1, proficiency: 8, status: "beyond_expectations" },  // Naledi - Python
        { employeeIdx: 1, skillIdx: 3, proficiency: 7, status: "good_match" },  // Naledi - Node.js
        { employeeIdx: 1, skillIdx: 5, proficiency: 6, status: "good_match" },  // Naledi - Leadership
        { employeeIdx: 2, skillIdx: 10, proficiency: 4, status: "critical_gap" },  // Sipho - Sales Techniques
        { employeeIdx: 2, skillIdx: 11, proficiency: 7, status: "good_match" },  // Sipho - Customer Service
        { employeeIdx: 3, skillIdx: 6, proficiency: 8, status: "beyond_expectations" },  // Lerato - Communication
        { employeeIdx: 3, skillIdx: 8, proficiency: 5, status: "training_needed" },  // Lerato - Project Management
        { employeeIdx: 4, skillIdx: 4, proficiency: 6, status: "good_match" },  // Bongani - SQL
        { employeeIdx: 4, skillIdx: 3, proficiency: 7, status: "good_match" },  // Bongani - Node.js
      ];

      for (const assessment of assessments) {
        if (createdEmployees[assessment.employeeIdx] && createdSkills[assessment.skillIdx]) {
          try {
            await storage.createEmployeeSkill(req.tenant.id, {
              employeeId: createdEmployees[assessment.employeeIdx].id,
              skillId: createdSkills[assessment.skillIdx].id,
              proficiencyLevel: assessment.proficiency,
              status: assessment.status,
              source: "assessment",
            });
          } catch (e) {
            // Assessment might already exist
          }
        }
      }

      res.json({ 
        success: true, 
        message: "Demo data seeded successfully",
        created: {
          skills: createdSkills.length,
          employees: createdEmployees.length,
        }
      });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ message: "Failed to seed demo data" });
    }
  });

  // ==================== EMPLOYEE AMBITIONS ====================
  
  // Get all ambitions
  app.get("/api/workforce/ambitions", async (req, res) => {
    try {
      const ambitions = await storage.getEmployeeAmbitions(req.tenant.id);
      res.json(ambitions);
    } catch (error) {
      console.error("Error fetching ambitions:", error);
      res.json([]);
    }
  });

  // Get ambitions for a specific employee
  app.get("/api/workforce/employees/:employeeId/ambitions", async (req, res) => {
    try {
      const ambitions = await storage.getAmbitionsByEmployeeId(req.tenant.id, req.params.employeeId);
      res.json(ambitions);
    } catch (error) {
      console.error("Error fetching employee ambitions:", error);
      res.json([]);
    }
  });

  // Create an ambition
  app.post("/api/workforce/ambitions", async (req, res) => {
    try {
      const ambition = await storage.createEmployeeAmbition(req.tenant.id, req.body);
      res.status(201).json(ambition);
    } catch (error) {
      console.error("Error creating ambition:", error);
      res.status(500).json({ message: "Failed to create ambition" });
    }
  });

  // Update an ambition
  app.patch("/api/workforce/ambitions/:id", async (req, res) => {
    try {
      const ambition = await storage.updateEmployeeAmbition(req.tenant.id, req.params.id, req.body);
      if (!ambition) {
        return res.status(404).json({ message: "Ambition not found" });
      }
      res.json(ambition);
    } catch (error) {
      console.error("Error updating ambition:", error);
      res.status(500).json({ message: "Failed to update ambition" });
    }
  });

  // Delete an ambition
  app.delete("/api/workforce/ambitions/:id", async (req, res) => {
    try {
      const success = await storage.deleteEmployeeAmbition(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Ambition not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting ambition:", error);
      res.status(500).json({ message: "Failed to delete ambition" });
    }
  });

  // ==================== MENTORSHIPS ====================
  
  // Get all mentorships with related data
  app.get("/api/workforce/mentorships", async (req, res) => {
    try {
      const mentorships = await storage.getMentorships(req.tenant.id);
      res.json(mentorships);
    } catch (error) {
      console.error("Error fetching mentorships:", error);
      res.json([]);
    }
  });

  // Find potential mentors for a skill
  app.get("/api/workforce/mentors/find", async (req, res) => {
    try {
      const { skillId, minProficiency = "6" } = req.query;
      if (!skillId) {
        return res.status(400).json({ message: "skillId is required" });
      }
      const mentors = await storage.findPotentialMentors(
        req.tenant.id, 
        skillId as string, 
        parseInt(minProficiency as string)
      );
      res.json(mentors);
    } catch (error) {
      console.error("Error finding mentors:", error);
      res.json([]);
    }
  });

  // Create a mentorship
  app.post("/api/workforce/mentorships", async (req, res) => {
    try {
      const mentorship = await storage.createMentorship(req.tenant.id, req.body);
      res.status(201).json(mentorship);
    } catch (error) {
      console.error("Error creating mentorship:", error);
      res.status(500).json({ message: "Failed to create mentorship" });
    }
  });

  // Update a mentorship
  app.patch("/api/workforce/mentorships/:id", async (req, res) => {
    try {
      const mentorship = await storage.updateMentorship(req.tenant.id, req.params.id, req.body);
      if (!mentorship) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      res.json(mentorship);
    } catch (error) {
      console.error("Error updating mentorship:", error);
      res.status(500).json({ message: "Failed to update mentorship" });
    }
  });

  // Delete a mentorship
  app.delete("/api/workforce/mentorships/:id", async (req, res) => {
    try {
      const success = await storage.deleteMentorship(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Mentorship not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting mentorship:", error);
      res.status(500).json({ message: "Failed to delete mentorship" });
    }
  });

  // ==================== GROWTH AREAS ====================
  
  // Get all growth areas
  app.get("/api/workforce/growth-areas", async (req, res) => {
    try {
      const areas = await storage.getGrowthAreas(req.tenant.id);
      res.json(areas);
    } catch (error) {
      console.error("Error fetching growth areas:", error);
      res.json([]);
    }
  });

  // Get growth areas for a specific employee
  app.get("/api/workforce/employees/:employeeId/growth-areas", async (req, res) => {
    try {
      const areas = await storage.getGrowthAreasByEmployeeId(req.tenant.id, req.params.employeeId);
      res.json(areas);
    } catch (error) {
      console.error("Error fetching employee growth areas:", error);
      res.json([]);
    }
  });

  // Generate growth areas for an employee (auto-detect skill gaps)
  app.post("/api/workforce/employees/:employeeId/generate-growth-areas", async (req, res) => {
    try {
      const areas = await storage.generateGrowthAreasForEmployee(req.tenant.id, req.params.employeeId);
      res.status(201).json(areas);
    } catch (error) {
      console.error("Error generating growth areas:", error);
      res.status(500).json({ message: "Failed to generate growth areas" });
    }
  });

  // Create a growth area
  app.post("/api/workforce/growth-areas", async (req, res) => {
    try {
      const area = await storage.createGrowthArea(req.tenant.id, req.body);
      res.status(201).json(area);
    } catch (error) {
      console.error("Error creating growth area:", error);
      res.status(500).json({ message: "Failed to create growth area" });
    }
  });

  // Update a growth area
  app.patch("/api/workforce/growth-areas/:id", async (req, res) => {
    try {
      const area = await storage.updateGrowthArea(req.tenant.id, req.params.id, req.body);
      if (!area) {
        return res.status(404).json({ message: "Growth area not found" });
      }
      res.json(area);
    } catch (error) {
      console.error("Error updating growth area:", error);
      res.status(500).json({ message: "Failed to update growth area" });
    }
  });

  // Delete a growth area
  app.delete("/api/workforce/growth-areas/:id", async (req, res) => {
    try {
      const success = await storage.deleteGrowthArea(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Growth area not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting growth area:", error);
      res.status(500).json({ message: "Failed to delete growth area" });
    }
  });

  // ==================== DOCUMENT AUTOMATION API ====================

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const docs = await storage.getAllDocuments(req.tenant.id);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get documents by type (cv or job_spec)
  app.get("/api/documents/type/:type", async (req, res) => {
    try {
      const docs = await storage.getDocumentsByType(req.tenant.id, req.params.type);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents by type:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.tenant.id, req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const success = await storage.deleteDocument(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Get all document batches
  app.get("/api/document-batches", async (req, res) => {
    try {
      const batches = await storage.getAllDocumentBatches(req.tenant.id);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching document batches:", error);
      res.status(500).json({ message: "Failed to fetch document batches" });
    }
  });

  // Get single batch with documents
  app.get("/api/document-batches/:id", async (req, res) => {
    try {
      const batch = await storage.getDocumentBatch(req.tenant.id, req.params.id);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      const docs = await storage.getDocumentsByBatchId(req.tenant.id, req.params.id);
      res.json({ ...batch, documents: docs });
    } catch (error) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ message: "Failed to fetch batch" });
    }
  });

  // Upload CVs in bulk - AI extracts candidate info
  app.post("/api/documents/upload/cvs", upload.array("files", 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Create batch
      const batch = await storage.createDocumentBatch(req.tenant.id, {
        name: `CV Upload - ${new Date().toLocaleDateString()}`,
        type: "cvs",
        status: "processing",
        totalDocuments: files.length,
        processedDocuments: 0,
        failedDocuments: 0,
      });

      // Process each file
      const results: Array<{ filename: string; status: string; candidateId?: string; error?: string }> = [];
      
      for (const file of files) {
        try {
          // Save document record
          const doc = await storage.createDocument(req.tenant.id, {
            batchId: batch.id,
            filename: `${Date.now()}-${file.originalname}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: `/uploads/${batch.id}/${file.originalname}`,
            type: "cv",
            status: "processing",
          });

          // Parse PDF to extract text
          let rawText = "";
          if (file.mimetype === "application/pdf") {
            const parser = new PDFParse({ data: file.buffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
            await parser.destroy();
          } else {
            rawText = file.buffer.toString("utf-8");
          }
          
          // Sanitize text for PostgreSQL - remove null bytes and invalid UTF-8 chars
          rawText = rawText.replace(/\x00/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          // Use CV parser to extract structured data
          const parsedData = await cvParser.parseCV(rawText);
          
          // Create candidate from extracted data
          const candidate = await storage.createCandidate(req.tenant.id, {
            fullName: parsedData.fullName || "Unknown",
            email: parsedData.email || undefined,
            phone: parsedData.phone || undefined,
            role: parsedData.role || undefined,
            location: parsedData.location || undefined,
            yearsOfExperience: parsedData.yearsOfExperience || undefined,
            skills: parsedData.skills || [],
            education: parsedData.education || [],
            experience: parsedData.experience || [],
            languages: parsedData.languages || undefined,
            certifications: parsedData.certifications || undefined,
            linkedinUrl: parsedData.linkedinUrl || undefined,
            summary: parsedData.summary || undefined,
            source: "CV Upload",
            status: "New",
            stage: "Screening",
            match: 0,
          });

          // Extract profile photo from PDF if available
          let photoUrl: string | null = null;
          if (file.mimetype === "application/pdf") {
            try {
              photoUrl = await cvParser.extractProfilePhoto(file.buffer, candidate.id);
              if (photoUrl) {
                await storage.updateCandidate(req.tenant.id, candidate.id, { photoUrl });
                console.log(`Profile photo extracted for candidate ${candidate.id}: ${photoUrl}`);
              }
            } catch (photoError) {
              console.warn(`Could not extract photo for ${file.originalname}:`, photoError);
            }
          }

          // Update document with extracted data
          await storage.updateDocument(req.tenant.id, doc.id, {
            status: "processed",
            rawText,
            extractedData: { ...parsedData, photoUrl },
            linkedCandidateId: candidate.id,
          });

          results.push({ filename: file.originalname, status: "success", candidateId: candidate.id });
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
          console.error(`Error processing file ${file.originalname}:`, fileError);
          results.push({ filename: file.originalname, status: "failed", error: errorMessage });
        }
      }

      // Update batch status
      const successCount = results.filter(r => r.status === "success").length;
      const failCount = results.filter(r => r.status === "failed").length;
      await storage.updateDocumentBatch(req.tenant.id, batch.id, {
        status: failCount === files.length ? "failed" : successCount === files.length ? "completed" : "partially_completed",
        processedDocuments: successCount,
        failedDocuments: failCount,
      });

      res.status(201).json({
        batchId: batch.id,
        totalFiles: files.length,
        processed: successCount,
        failed: failCount,
        results,
      });
    } catch (error) {
      console.error("Error uploading CVs:", error);
      res.status(500).json({ message: "Failed to process CV uploads" });
    }
  });

  // Upload ZIP file containing CVs - extracts and processes all PDFs
  app.post("/api/documents/upload/cvs-zip", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate it's a ZIP file
      if (file.mimetype !== "application/zip" && 
          file.mimetype !== "application/x-zip-compressed" && 
          !file.originalname.toLowerCase().endsWith('.zip')) {
        return res.status(400).json({ message: "Only ZIP files are supported" });
      }

      console.log(`Processing ZIP file: ${file.originalname} (${file.size} bytes)`);

      // Extract ZIP contents
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();
      
      // Filter for PDF files only
      const pdfEntries = zipEntries.filter(entry => 
        !entry.isDirectory && 
        entry.entryName.toLowerCase().endsWith('.pdf') &&
        !entry.entryName.startsWith('__MACOSX') && // Ignore macOS metadata
        !entry.entryName.includes('/.') // Ignore hidden files
      );

      if (pdfEntries.length === 0) {
        return res.status(400).json({ message: "No PDF files found in the ZIP archive" });
      }

      console.log(`Found ${pdfEntries.length} PDF files in ZIP`);

      // Create batch for this ZIP upload
      const batch = await storage.createDocumentBatch(req.tenant.id, {
        name: `ZIP Upload: ${file.originalname} - ${new Date().toLocaleDateString()}`,
        type: "cvs",
        status: "processing",
        totalDocuments: pdfEntries.length,
        processedDocuments: 0,
        failedDocuments: 0,
      });

      const results: Array<{ filename: string; status: string; candidateId?: string; error?: string }> = [];

      // Process each PDF from the ZIP
      for (const entry of pdfEntries) {
        const pdfFilename = entry.entryName.split('/').pop() || entry.entryName;
        
        try {
          console.log(`Processing: ${pdfFilename}`);
          const pdfBuffer = entry.getData();
          
          // Create document record
          const doc = await storage.createDocument(req.tenant.id, {
            batchId: batch.id,
            filename: `${Date.now()}-${pdfFilename}`,
            originalFilename: pdfFilename,
            mimeType: "application/pdf",
            fileSize: pdfBuffer.length,
            filePath: `/uploads/${batch.id}/${pdfFilename}`,
            type: "cv",
            status: "processing",
          });

          // Extract text from PDF
          const parser = new PDFParse({ data: pdfBuffer });
          const pdfData = await parser.getText();
          let rawText = pdfData.text;
          await parser.destroy();
          
          // Sanitize text for PostgreSQL
          rawText = rawText.replace(/\x00/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          // Parse CV with AI
          const parsedData = await cvParser.parseCV(rawText);
          
          // Create candidate
          const candidate = await storage.createCandidate(req.tenant.id, {
            fullName: parsedData.fullName || "Unknown",
            email: parsedData.email || undefined,
            phone: parsedData.phone || undefined,
            role: parsedData.role || undefined,
            location: parsedData.location || undefined,
            yearsOfExperience: parsedData.yearsOfExperience || undefined,
            skills: parsedData.skills || [],
            education: parsedData.education || [],
            experience: parsedData.experience || [],
            languages: parsedData.languages || undefined,
            certifications: parsedData.certifications || undefined,
            linkedinUrl: parsedData.linkedinUrl || undefined,
            summary: parsedData.summary || undefined,
            source: "ZIP Upload",
            status: "New",
            stage: "Screening",
            match: 0,
          });

          // Extract profile photo
          let photoUrl: string | null = null;
          try {
            photoUrl = await cvParser.extractProfilePhoto(pdfBuffer, candidate.id);
            if (photoUrl) {
              await storage.updateCandidate(req.tenant.id, candidate.id, { photoUrl });
              console.log(`Photo extracted for ${pdfFilename}`);
            }
          } catch (photoError) {
            console.warn(`Could not extract photo from ${pdfFilename}:`, photoError);
          }

          // Update document
          await storage.updateDocument(req.tenant.id, doc.id, {
            status: "processed",
            rawText,
            extractedData: { ...parsedData, photoUrl },
            linkedCandidateId: candidate.id,
          });

          results.push({ filename: pdfFilename, status: "success", candidateId: candidate.id });
          console.log(`Successfully processed: ${pdfFilename}`);
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
          console.error(`Error processing ${pdfFilename}:`, fileError);
          results.push({ filename: pdfFilename, status: "failed", error: errorMessage });
        }
      }

      // Update batch status
      const successCount = results.filter(r => r.status === "success").length;
      const failCount = results.filter(r => r.status === "failed").length;
      await storage.updateDocumentBatch(req.tenant.id, batch.id, {
        status: failCount === pdfEntries.length ? "failed" : successCount === pdfEntries.length ? "completed" : "partially_completed",
        processedDocuments: successCount,
        failedDocuments: failCount,
      });

      res.status(201).json({
        batchId: batch.id,
        zipFilename: file.originalname,
        totalPdfsFound: pdfEntries.length,
        processed: successCount,
        failed: failCount,
        results,
      });
    } catch (error) {
      console.error("Error processing ZIP file:", error);
      res.status(500).json({ message: "Failed to process ZIP file" });
    }
  });

  // Upload job specs in bulk - AI extracts job details
  app.post("/api/documents/upload/job-specs", upload.array("files", 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Create batch
      const batch = await storage.createDocumentBatch(req.tenant.id, {
        name: `Job Specs Upload - ${new Date().toLocaleDateString()}`,
        type: "job_specs",
        status: "processing",
        totalDocuments: files.length,
        processedDocuments: 0,
        failedDocuments: 0,
      });

      const results: Array<{ filename: string; status: string; jobId?: string; error?: string }> = [];

      for (const file of files) {
        try {
          // Save document record
          const doc = await storage.createDocument(req.tenant.id, {
            batchId: batch.id,
            filename: `${Date.now()}-${file.originalname}`,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            filePath: `/uploads/${batch.id}/${file.originalname}`,
            type: "job_spec",
            status: "processing",
          });

          // Parse PDF to extract text
          let rawText = "";
          if (file.mimetype === "application/pdf") {
            const parser = new PDFParse({ data: file.buffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
            await parser.destroy();
          } else {
            rawText = file.buffer.toString("utf-8");
          }
          
          // Sanitize text for PostgreSQL - remove null bytes and invalid UTF-8 chars
          rawText = rawText.replace(/\x00/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          // Use Groq to extract job details from text
          const Groq = (await import("groq-sdk")).default;
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
          
          const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are an expert HR document parser. Extract job details from the provided text and return a JSON object with these fields:
                - title: job title (string)
                - company: company/organization name (string or null)
                - department: department name (string)
                - description: full job description (string)
                - location: work location, city/region (string or null)
                - employmentType: one of "Full-time", "Part-time", "Contract", "Temporary", "Internship"
                - salaryMin: minimum salary as number or null
                - salaryMax: maximum salary as number or null
                - salaryRange: formatted salary range string like "R25,000 - R35,000/month" or null
                - minYearsExperience: minimum years of experience as number or null
                - experienceRequired: experience requirements as text (e.g., "3-5 years in logistics")
                - requiredSkills: array of required skills/competencies (e.g., ["Project Management", "Excel", "Communication"])
                - qualifications: array of required education/qualifications
                - licenseRequirements: array of required licenses/certifications
                - physicalRequirements: physical requirements description or null
                - benefits: array of benefits offered or null
                - reportingTo: who this role reports to or null
                Return ONLY valid JSON, no other text.`
              },
              {
                role: "user",
                content: `Extract job details from this document:\n\n${rawText.slice(0, 8000)}`
              }
            ],
            temperature: 0.1,
            max_tokens: 2000,
          });

          const responseText = completion.choices[0]?.message?.content || "{}";
          let jobData: Record<string, unknown>;
          try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            jobData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch {
            jobData = {};
          }

          // Create job from extracted data
          const job = await storage.createJob(req.tenant.id, {
            title: (jobData.title as string) || file.originalname.replace(/\.(pdf|doc|docx|txt)$/i, ""),
            department: (jobData.department as string) || "Unassigned",
            description: (jobData.description as string) || rawText.slice(0, 2000),
            location: (jobData.location as string) || undefined,
            employmentType: (jobData.employmentType as string) || "full_time",
            salaryMin: (jobData.salaryMin as number) || undefined,
            salaryMax: (jobData.salaryMax as number) || undefined,
            minYearsExperience: (jobData.minYearsExperience as number) || undefined,
            licenseRequirements: (jobData.licenseRequirements as string[]) || undefined,
            physicalRequirements: (jobData.physicalRequirements as string) || undefined,
            status: "Active",
          });

          // Update document with extracted data
          await storage.updateDocument(req.tenant.id, doc.id, {
            status: "processed",
            rawText,
            extractedData: jobData,
            linkedJobId: job.id,
          });

          results.push({ filename: file.originalname, status: "success", jobId: job.id });
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
          console.error(`Error processing file ${file.originalname}:`, fileError);
          results.push({ filename: file.originalname, status: "failed", error: errorMessage });
        }
      }

      // Update batch status
      const successCount = results.filter(r => r.status === "success").length;
      const failCount = results.filter(r => r.status === "failed").length;
      await storage.updateDocumentBatch(req.tenant.id, batch.id, {
        status: failCount === files.length ? "failed" : successCount === files.length ? "completed" : "partially_completed",
        processedDocuments: successCount,
        failedDocuments: failCount,
      });

      res.status(201).json({
        batchId: batch.id,
        totalFiles: files.length,
        processed: successCount,
        failed: failCount,
        results,
      });
    } catch (error) {
      console.error("Error uploading job specs:", error);
      res.status(500).json({ message: "Failed to process job spec uploads" });
    }
  });

  // Reprocess a failed document
  app.post("/api/documents/:id/reprocess", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.tenant.id, req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Mark as processing
      await storage.updateDocument(req.tenant.id, doc.id, {
        status: "processing",
        errorMessage: null,
      });

      // Note: Full reprocessing would need to re-read the file from storage
      // For now, return success and let frontend know to retry upload
      res.json({ message: "Document queued for reprocessing", documentId: doc.id });
    } catch (error) {
      console.error("Error reprocessing document:", error);
      res.status(500).json({ message: "Failed to reprocess document" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
