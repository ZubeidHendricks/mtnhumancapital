import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { format } from "date-fns";
import { storage } from "./storage";
import { insertCandidateSchema, insertJobSchema, insertIntegrityCheckSchema, insertRecruitmentSessionSchema, insertInterviewSchema, updateInterviewSchema, insertTenantRequestSchema, updateTenantRequestSchema, type InsertCandidate, insertIntegrityDocumentRequirementSchema, updateIntegrityDocumentRequirementSchema, insertCandidateDocumentSchema, updateCandidateDocumentSchema, documentTypes, insertInterviewSessionSchema, insertInterviewFeedbackSchema, updateInterviewFeedbackSchema, insertOfferSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { IntegrityOrchestrator } from "./integrity-orchestrator";
import { RecruitmentOrchestrator } from "./recruitment-orchestrator";
import { interviewOrchestrator } from "./interview-orchestrator";
import { transcriptProviderManager } from "./transcript-providers";
import { transcriptAnalysisAgent } from "./transcript-analysis-agent";
import { sourcingOrchestrator, type SpecialistCandidate } from "./sourcing-specialists";
import { scraperOrchestrator, type ScrapedCandidate, type ScraperResult } from "./web-scraper-agents";
import { cvParser } from "./cv-parser";
import { cvTemplateGenerator } from "./cv-template-generator";
import { Packer } from "docx";
import { embeddingService } from "./embedding-service";
import { getOrCreateConversation, deleteConversation } from "./job-creation-agent";
import { requireAdmin } from "./admin-middleware";
import { authService } from "./auth-service";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { pnetAPIService } from "./pnet-api-service";
import { pnetApplicationAgent } from "./pnet-application-agent";
import { pnetJobPostingAgent } from "./pnet-job-posting-agent";
import { registerWeighbridgeRoutes } from "./routes/weighbridge";
import type { EmployeeData } from "./document-generator";
import { registerFleetLogixRoutes } from "./fleetlogix-routes";
import { ragSupportService } from "./rag-support-service";
import { recordingStorage } from "./recording-storage";
import axios from "axios";

const upload = multer({ storage: multer.memoryStorage() });
const uploadLarge = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// Helper function to infer department from job title
function inferDepartmentFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  
  const departmentMappings: Record<string, string[]> = {
    'Engineering': ['engineer', 'developer', 'software', 'devops', 'backend', 'frontend', 'fullstack', 'architect', 'programmer', 'coder'],
    'Sales': ['sales', 'account executive', 'business development', 'bdr', 'sdr'],
    'Marketing': ['marketing', 'brand', 'content', 'seo', 'social media', 'digital marketing', 'growth'],
    'Human Resources': ['hr', 'human resources', 'recruiter', 'talent', 'people operations', 'people ops'],
    'Finance': ['finance', 'accountant', 'accounting', 'bookkeeper', 'financial', 'cfo', 'controller'],
    'Operations': ['operations', 'ops', 'logistics', 'supply chain', 'warehouse', 'driver', 'dispatcher'],
    'Customer Support': ['support', 'customer service', 'customer success', 'help desk', 'technical support'],
    'Design': ['designer', 'ui', 'ux', 'graphic', 'product design', 'creative'],
    'Product': ['product manager', 'product owner', 'scrum master', 'agile'],
    'Legal': ['legal', 'lawyer', 'attorney', 'counsel', 'compliance'],
    'Administration': ['admin', 'assistant', 'receptionist', 'office manager', 'secretary'],
    'IT': ['it ', 'information technology', 'system admin', 'network', 'security analyst', 'cybersecurity'],
    'Management': ['manager', 'director', 'head of', 'chief', 'vp ', 'vice president', 'ceo', 'coo', 'cto'],
  };
  
  for (const [department, keywords] of Object.entries(departmentMappings)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return department;
    }
  }
  
  return 'General';
}

// In-memory cache for Hume AI OAuth token and EVI config
let humeTokenCache: { token: string; expiresAt: number } | null = null;
let humeConfigIdCache: string | null = null;

async function getHumeAccessToken(apiKey: string, secretKey: string): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (humeTokenCache && Date.now() < humeTokenCache.expiresAt - 60000) {
    return humeTokenCache.token;
  }

  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
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
    throw new Error(`Hume token error (${tokenResponse.status}): ${error}`);
  }

  const tokenData = await tokenResponse.json() as { access_token: string; expires_in?: number };
  const expiresIn = (tokenData.expires_in || 3600) * 1000; // default 1 hour
  humeTokenCache = {
    token: tokenData.access_token,
    expiresAt: Date.now() + expiresIn
  };
  console.log("Obtained new Hume AI access token");
  return humeTokenCache.token;
}

async function getOrCreateHumeConfig(apiKey: string): Promise<string | null> {
  if (humeConfigIdCache) {
    return humeConfigIdCache;
  }

  const configResponse = await fetch("https://api.hume.ai/v0/evi/configs", {
    method: "POST",
    headers: {
      "X-Hume-Api-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Roleplay Facilitator",
      evi_version: "3",
      voice: { name: "ITO" },
      language_model: {
        model_provider: "OPEN_AI",
        model_resource: "gpt-4o-mini"
      },
      ellm_model: {
        allow_short_responses: true
      },
      event_messages: {
        on_new_chat: {
          enabled: true,
          text: "Hey! I'm your roleplay practice partner. Tell me who you'd like me to be and what scenario you want to practice."
        }
      },
      timeouts: {
        inactivity: { enabled: true, duration_secs: 600 }
      }
    })
  });

  if (configResponse.ok) {
    const configData = await configResponse.json() as { id: string };
    humeConfigIdCache = configData.id;
    console.log("Created EVI config:", humeConfigIdCache);
    return humeConfigIdCache;
  }

  // Fallback: use existing config
  const listResponse = await fetch("https://api.hume.ai/v0/evi/configs", {
    headers: { "X-Hume-Api-Key": apiKey }
  });

  if (listResponse.ok) {
    const configsList = await listResponse.json() as { configs_page?: { id: string }[] };
    if (configsList.configs_page && configsList.configs_page.length > 0) {
      humeConfigIdCache = configsList.configs_page[0].id;
      console.log("Using existing config:", humeConfigIdCache);
      return humeConfigIdCache;
    }
  }

  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {

  const { EmailService } = await import("./email-service");
  const emailService = new EmailService(storage);

  // ============= AUTHENTICATION =============
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
      
      res.json({
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          tenantId: result.user.tenantId,
          isSuperAdmin: result.user.isSuperAdmin
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { tenantId, username, password, role } = req.body;
      
      if (!tenantId || !username || !password) {
        return res.status(400).json({ message: "Tenant ID, username, and password are required" });
      }
      
      const result = await authService.register(tenantId, username, password, role || "user");
      
      res.status(201).json({
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          tenantId: result.user.tenantId,
          isSuperAdmin: result.user.isSuperAdmin
        }
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message === "Username already exists") {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const token = authHeader.substring(7);
      const user = await authService.getUserFromToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // ============= ADMIN: TENANT MANAGEMENT =============
  app.get("/api/admin/tenants", requireAdmin, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.get("/api/admin/tenants/:id", requireAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(parseInt(req.params.id));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/admin/tenants/:id/modules", requireAdmin, async (req, res) => {
    try {
      const { lmsEnabled, gamificationEnabled, aiLecturersEnabled, certificatesEnabled, paymentStatus, subscriptionTier } = req.body;
      const tenant = await storage.updateTenantModules(parseInt(req.params.id), {
        lmsEnabled,
        gamificationEnabled,
        aiLecturersEnabled,
        certificatesEnabled,
        paymentStatus,
        subscriptionTier
      });
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant modules:", error);
      res.status(500).json({ message: "Failed to update tenant modules" });
    }
  });

  // ============= LMS: ASSESSMENTS =============
  app.get("/api/lms/assessments", async (req, res) => {
    try {
      const assessments = await storage.getAllAssessments(req.tenant.id);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.post("/api/lms/assessments", async (req, res) => {
    try {
      const assessment = await storage.createAssessment(req.tenant.id, req.body);
      res.status(201).json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Failed to create assessment" });
    }
  });

  app.post("/api/lms/assessments/:id/submit", async (req, res) => {
    try {
      const { answers } = req.body;
      const result = await storage.submitAssessment(req.tenant.id, parseInt(req.params.id), req.user.id, answers);
      
      // Award points for passing
      if (result.passed) {
        await storage.awardPoints(req.tenant.id, req.user.id, result.score);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      res.status(500).json({ message: "Failed to submit assessment" });
    }
  });

  // ============= GAMIFICATION =============
  app.get("/api/gamification/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(req.tenant.id);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/gamification/achievements/:userId", async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.tenant.id, parseInt(req.params.userId));
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.post("/api/gamification/award-badge", async (req, res) => {
    try {
      const { userId, badgeType, title, points } = req.body;
      const achievement = await storage.awardBadge(req.tenant.id, userId, badgeType, title, points);
      res.status(201).json(achievement);
    } catch (error) {
      console.error("Error awarding badge:", error);
      res.status(500).json({ message: "Failed to award badge" });
    }
  });

  // ============= CERTIFICATES =============
  app.get("/api/certificates/templates", async (req, res) => {
    try {
      const templates = await storage.getCertificateTemplates(req.tenant.id);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching certificate templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/certificates/templates", upload.single("template"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Template file required" });
      }
      
      const fileName = `cert-template-${Date.now()}-${req.file.originalname}`;
      const filePath = path.join("uploads/certificates", fileName);
      
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, req.file.buffer);
      
      const template = await storage.createCertificateTemplate(req.tenant.id, {
        name: req.body.name,
        description: req.body.description,
        templateUrl: `/uploads/certificates/${fileName}`,
        placeholders: JSON.parse(req.body.placeholders || "[]"),
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating certificate template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.post("/api/certificates/issue", async (req, res) => {
    try {
      const { userId, courseId, templateId, metadata } = req.body;
      const certificate = await storage.issueCertificate(req.tenant.id, userId, courseId, templateId, metadata);
      res.status(201).json(certificate);
    } catch (error) {
      console.error("Error issuing certificate:", error);
      res.status(500).json({ message: "Failed to issue certificate" });
    }
  });

  app.get("/api/certificates/verify/:code", async (req, res) => {
    try {
      const certificate = await storage.verifyCertificate(req.params.code);
      res.json(certificate);
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(404).json({ message: "Certificate not found" });
    }
  });

  // ============= AI LECTURERS =============
  app.get("/api/ai-lecturers", async (req, res) => {
    try {
      const lecturers = await storage.getAILecturers(req.tenant.id);
      res.json(lecturers);
    } catch (error) {
      console.error("Error fetching AI lecturers:", error);
      res.status(500).json({ message: "Failed to fetch AI lecturers" });
    }
  });

  app.post("/api/ai-lecturers", async (req, res) => {
    try {
      const lecturer = await storage.createAILecturer(req.tenant.id, req.body);
      res.status(201).json(lecturer);
    } catch (error) {
      console.error("Error creating AI lecturer:", error);
      res.status(500).json({ message: "Failed to create AI lecturer" });
    }
  });

  app.post("/api/ai-lecturers/generate-video", async (req, res) => {
    try {
      const { lecturerId, courseId, moduleId, lessonId, script } = req.body;
      const video = await storage.generateLessonVideo(req.tenant.id, {
        lecturerId,
        courseId,
        moduleId,
        lessonId,
        script,
      });
      res.status(201).json(video);
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ message: "Failed to generate video" });
    }
  });

  app.get("/api/candidates", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const { data, total } = await storage.getCandidatesPaginated(req.tenant.id, page, limit);
      res.json({ data, total, page, limit });
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

  // Applications endpoint for dashboard (uses candidates data with pagination)
  app.get("/api/applications", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const { data: candidatesData, total } = await storage.getCandidatesPaginated(req.tenant.id, page, limit);
      const applications = candidatesData.map(candidate => ({
        id: candidate.id,
        candidateId: candidate.id,
        candidateName: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        stage: candidate.stage || 'New',
        status: candidate.status || 'Active',
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt
      }));
      res.json({ data: applications, total, page, limit });
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
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

  // AI-powered contact enrichment
  app.post("/api/candidates/:id/enrich-contact", async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.tenant.id, req.params.id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const metadata = candidate.metadata as any || {};
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(500).json({ message: "GROQ API key not configured" });
      }

      let enrichedData: any = {};
      let searchContext = "";

      // Step 1: Try web search for real contact info
      try {
        const searchQuery = `${candidate.fullName} ${metadata.company || ''} ${candidate.role || ''} email phone contact South Africa`;
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        const searchResponse = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const searchHtml = await searchResponse.text();

        const snippetMatches = searchHtml.match(/<a class="result__snippet"[^>]*>([^<]+)<\/a>/g) || [];
        const titleMatches = searchHtml.match(/<a class="result__a"[^>]*>([^<]+)<\/a>/g) || [];
        const snippets = snippetMatches.slice(0, 8).map((s: string) => s.replace(/<[^>]+>/g, '').trim()).join('\n');
        const titles = titleMatches.slice(0, 8).map((s: string) => s.replace(/<[^>]+>/g, '').trim()).join('\n');
        searchContext = `${titles}\n${snippets}`;
      } catch (searchError) {
        console.warn("Web search failed, will generate contact info:", searchError);
      }

      // Step 2: Use AI to extract or generate contact information
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'system',
            content: `You are a recruitment contact information specialist. Your job is to provide contact details for candidates. If search results contain real contact info, extract it. Otherwise, generate realistic professional contact information based on the candidate's profile. South African phone numbers start with +27 followed by 9 digits (e.g., +27 82 XXX XXXX). Generate professional emails using common patterns like firstname.lastname@company.co.za or firstname@gmail.com. Return ONLY valid JSON with no explanation.`
          }, {
            role: 'user',
            content: `Provide contact information for this candidate:
Name: ${candidate.fullName}
Company: ${metadata.company || 'Unknown'}
Role: ${candidate.role || 'Unknown'}
Location: ${metadata.location || candidate.location || 'South Africa'}
Source: ${candidate.source || 'Unknown'}

${searchContext ? `Web Search Results:\n${searchContext}\n` : ''}
Return JSON format:
{
  "email": "<professional email address>",
  "phone": "<South African mobile number in +27 format>",
  "linkedinUrl": "<linkedin profile URL>",
  "additionalInfo": "<any other relevant professional info>",
  "confidence": "high/medium/low",
  "source": "${searchContext ? 'web_search_and_ai' : 'ai_generated'}"
}`
          }],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      const groqData = await groqResponse.json() as any;
      const aiContent = groqData.choices?.[0]?.message?.content || '{}';
      
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enrichedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse AI enrichment response:", e);
      }

      // Update candidate with enriched data
      const updates: any = {};
      if (enrichedData.email && enrichedData.email !== 'null' && enrichedData.email !== null) {
        updates.email = enrichedData.email;
      }
      if (enrichedData.phone && enrichedData.phone !== 'null' && enrichedData.phone !== null) {
        updates.phone = enrichedData.phone;
      }
      if (enrichedData.linkedinUrl || enrichedData.additionalInfo) {
        updates.metadata = {
          ...metadata,
          linkedinUrl: enrichedData.linkedinUrl !== 'null' ? enrichedData.linkedinUrl : undefined,
          enrichedInfo: enrichedData.additionalInfo,
          enrichmentConfidence: enrichedData.confidence,
          enrichmentSource: enrichedData.source,
          enrichedAt: new Date().toISOString()
        };
      }

      if (Object.keys(updates).length > 0) {
        const updatedCandidate = await storage.updateCandidate(req.tenant.id, req.params.id, updates);
        res.json({
          success: true,
          enriched: enrichedData,
          candidate: updatedCandidate
        });
      } else {
        res.json({
          success: false,
          message: "No contact information found",
          enriched: enrichedData
        });
      }
    } catch (error) {
      console.error("Error enriching candidate contact:", error);
      res.status(500).json({ message: "Failed to enrich contact information" });
    }
  });

  // ============= PIPELINE WORKFLOW =============
  
  // Get candidate pipeline status with history and blockers
  app.get("/api/pipeline/candidates/:id/status", async (req, res) => {
    try {
      const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
      const status = await pipelineOrchestrator.getCandidatePipelineStatus(
        req.params.id, 
        req.tenant.id
      );
      
      if (!status) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error fetching pipeline status:", error);
      res.status(500).json({ message: "Failed to fetch pipeline status" });
    }
  });
  
  // Transition candidate to a new stage
  app.post("/api/pipeline/candidates/:id/transition", async (req, res) => {
    try {
      const { toStage, reason, skipPrerequisites } = req.body;
      
      if (!toStage) {
        return res.status(400).json({ message: "toStage is required" });
      }
      
      const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
      const result = await pipelineOrchestrator.transitionCandidate(
        req.params.id,
        toStage,
        req.tenant.id,
        {
          triggeredBy: "manual",
          triggeredByUserId: req.user?.id,
          reason,
          skipPrerequisites: skipPrerequisites === true,
        }
      );
      
      if (!result.success) {
        return res.status(400).json({
          message: result.error || "Transition failed",
          blockers: result.blockers,
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error transitioning candidate:", error);
      res.status(500).json({ message: "Failed to transition candidate" });
    }
  });
  
  // Get available transitions for a candidate
  app.get("/api/pipeline/candidates/:id/available-transitions", async (req, res) => {
    try {
      const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
      const status = await pipelineOrchestrator.getCandidatePipelineStatus(
        req.params.id, 
        req.tenant.id
      );
      
      if (!status) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      res.json({
        currentStage: status.currentStage,
        availableTransitions: status.availableTransitions,
      });
    } catch (error) {
      console.error("Error fetching available transitions:", error);
      res.status(500).json({ message: "Failed to fetch available transitions" });
    }
  });
  
  // Manually check and auto-advance integrity status
  app.post("/api/pipeline/candidates/:id/check-integrity", async (req, res) => {
    try {
      const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
      const advanced = await pipelineOrchestrator.checkAndAutoAdvanceIntegrity(
        req.params.id,
        req.tenant.id
      );
      
      res.json({ 
        advanced,
        message: advanced ? "Candidate advanced based on integrity check results" : "No advancement needed"
      });
    } catch (error) {
      console.error("Error checking integrity status:", error);
      res.status(500).json({ message: "Failed to check integrity status" });
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

  app.post("/api/candidates/:id/generate-cv-template", upload.single("cv"), async (req, res) => {
    try {
      const candidateId = req.params.id;
      const file = req.file;
      const { jobTitle } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No CV file uploaded" });
      }

      console.log(`Generating CV template for candidate ${candidateId}...`);

      const cvText = await cvParser.extractTextFromPDF(file.buffer);
      
      const templateData = await cvTemplateGenerator.extractTemplateData(cvText, jobTitle);
      
      const doc = cvTemplateGenerator.generateDocument(templateData);
      
      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CV_Template_${templateData.personalProfile.fullName.replace(/\s+/g, '_')}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating CV template:", error);
      res.status(500).json({ 
        message: "Failed to generate CV template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/cv-template/generate", upload.single("cv"), async (req, res) => {
    try {
      const file = req.file;
      const { jobTitle } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No CV file uploaded" });
      }

      console.log("Generating CV template from uploaded file...");

      const cvText = await cvParser.extractTextFromPDF(file.buffer);
      
      const templateData = await cvTemplateGenerator.extractTemplateData(cvText, jobTitle);
      
      const doc = cvTemplateGenerator.generateDocument(templateData);
      
      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CV_Template_${templateData.personalProfile.fullName.replace(/\s+/g, '_')}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating CV template:", error);
      res.status(500).json({ 
        message: "Failed to generate CV template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/cv-template/preview", upload.single("cv"), async (req, res) => {
    try {
      const file = req.file;
      const { jobTitle } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No CV file uploaded" });
      }

      console.log("Extracting CV data for preview...");

      const cvText = await cvParser.extractTextFromPDF(file.buffer);
      
      const templateData = await cvTemplateGenerator.extractTemplateData(cvText, jobTitle);
      
      res.json({
        message: "CV data extracted successfully",
        data: templateData,
      });
    } catch (error) {
      console.error("Error extracting CV data:", error);
      res.status(500).json({ 
        message: "Failed to extract CV data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============= CV TEMPLATES MANAGEMENT =============
  
  app.get("/api/cv-templates", async (req, res) => {
    try {
      const templates = await storage.getCvTemplates(req.tenant.id);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching CV templates:", error);
      res.status(500).json({ message: "Failed to fetch CV templates" });
    }
  });

  app.post("/api/cv-templates/upload", upload.single("template"), async (req, res) => {
    try {
      const file = req.file;
      const { name } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Only PDF and DOCX files are supported" });
      }

      const fileName = `cv-template-${Date.now()}-${file.originalname}`;
      const filePath = path.join("uploads/cv-templates", fileName);
      
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);

      let rawText = "";
      try {
        if (file.mimetype === "application/pdf") {
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(file.buffer);
          rawText = pdfData.text;
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          rawText = result.value;
        }
      } catch (textError) {
        console.error("Error extracting text from template:", textError);
      }

      const template = await storage.createCvTemplate(req.tenant.id, {
        tenantId: req.tenant.id,
        name: name || file.originalname,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: `/uploads/cv-templates/${fileName}`,
        isActive: 0,
        rawText: rawText || null,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error uploading CV template:", error);
      res.status(500).json({ message: "Failed to upload CV template" });
    }
  });

  app.patch("/api/cv-templates/:id/activate", async (req, res) => {
    try {
      const template = await storage.activateCvTemplate(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error activating CV template:", error);
      res.status(500).json({ message: "Failed to activate CV template" });
    }
  });

  app.delete("/api/cv-templates/:id", async (req, res) => {
    try {
      const template = await storage.getCvTemplateById(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (template.filePath) {
        const fullPath = path.join(process.cwd(), template.filePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      const success = await storage.deleteCvTemplate(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting CV template:", error);
      res.status(500).json({ message: "Failed to delete CV template" });
    }
  });

  app.get("/api/cv-templates/active", async (req, res) => {
    try {
      const template = await storage.getActiveCvTemplate(req.tenant.id);
      res.json(template || null);
    } catch (error) {
      console.error("Error fetching active CV template:", error);
      res.status(500).json({ message: "Failed to fetch active CV template" });
    }
  });

  // ============= DOCUMENT TEMPLATES MANAGEMENT =============
  
  app.get("/api/document-templates", async (req, res) => {
    try {
      const { type } = req.query;
      const templates = await storage.getDocumentTemplates(req.tenant.id, type as string | undefined);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching document templates:", error);
      res.status(500).json({ message: "Failed to fetch document templates" });
    }
  });

  app.post("/api/document-templates/upload", upload.single("template"), async (req, res) => {
    try {
      const file = req.file;
      const { name, templateType } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!templateType) {
        return res.status(400).json({ message: "Template type is required" });
      }

      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Only PDF and DOCX files are supported" });
      }

      const fileName = `doc-template-${templateType}-${Date.now()}-${file.originalname}`;
      const filePath = path.join("uploads/document-templates", fileName);
      
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);

      let rawText = "";
      try {
        if (file.mimetype === "application/pdf") {
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(file.buffer);
          rawText = pdfData.text;
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          rawText = result.value;
        }
      } catch (textError) {
        console.error("Error extracting text from template:", textError);
      }

      const template = await storage.createDocumentTemplate(req.tenant.id, {
        tenantId: req.tenant.id,
        templateType,
        name: name || file.originalname,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: `/uploads/document-templates/${fileName}`,
        isActive: 0,
        rawText: rawText || null,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error uploading document template:", error);
      res.status(500).json({ message: "Failed to upload document template" });
    }
  });

  app.patch("/api/document-templates/:id/activate", async (req, res) => {
    try {
      const template = await storage.activateDocumentTemplate(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error activating document template:", error);
      res.status(500).json({ message: "Failed to activate document template" });
    }
  });

  app.patch("/api/document-templates/:id/deactivate", async (req, res) => {
    try {
      const template = await storage.getDocumentTemplateById(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      const updated = await storage.deactivateDocumentTemplate(req.tenant.id, req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error deactivating document template:", error);
      res.status(500).json({ message: "Failed to deactivate document template" });
    }
  });

  app.delete("/api/document-templates/:id", async (req, res) => {
    try {
      const template = await storage.getDocumentTemplateById(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (template.filePath) {
        const fullPath = path.join(process.cwd(), template.filePath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      const success = await storage.deleteDocumentTemplate(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document template:", error);
      res.status(500).json({ message: "Failed to delete document template" });
    }
  });

  app.get("/api/document-templates/active/:type", async (req, res) => {
    try {
      const template = await storage.getActiveDocumentTemplate(req.tenant.id, req.params.type);
      res.json(template || null);
    } catch (error) {
      console.error("Error fetching active document template:", error);
      res.status(500).json({ message: "Failed to fetch active document template" });
    }
  });

  // ============= DOCUMENT GENERATION ENDPOINTS =============

  const documentGenerationSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    startDate: z.string().min(1, "Start date is required"),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    idNumber: z.string().optional(),
    address: z.string().optional(),
    department: z.string().optional(),
    salary: z.string().optional(),
    currency: z.string().optional(),
    manager: z.string().optional(),
    probationPeriod: z.string().optional(),
    workingHours: z.string().optional(),
    leaveEntitlement: z.string().optional(),
    benefits: z.array(z.string()).optional(),
    companyAddress: z.string().optional(),
  });

  // Fast preview endpoint — uses hardcoded content, no AI call
  app.get("/api/documents/preview/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['offer_letter', 'welcome_letter', 'employee_handbook', 'nda', 'employment_contract', 'executive_offer', 'company_policies', 'onboarding_checklist', 'it_request_form', 'benefits_enrollment'];

      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }

      const { createDocumentGenerator } = await import("./document-generator");
      const docGenerator = createDocumentGenerator(storage);
      const tenantConfig = await storage.getTenantConfig(req.tenant.id);
      const companyName = tenantConfig?.companyName || req.tenant.subdomain || 'Company';

      const result = await docGenerator.generatePreviewDocument(type as any, companyName);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ message: "Failed to generate preview", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/generate/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ['offer_letter', 'welcome_letter', 'employee_handbook', 'nda', 'employment_contract', 'executive_offer', 'company_policies', 'onboarding_checklist', 'it_request_form', 'benefits_enrollment'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }

      const parseResult = documentGenerationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const { createDocumentGenerator } = await import("./document-generator");
      const docGenerator = createDocumentGenerator(storage);

      const tenantConfig = await storage.getTenantConfig(req.tenant.id);
      const employeeData = {
        ...parseResult.data,
        companyName: tenantConfig?.companyName || req.tenant.subdomain || 'Company',
      };

      const result = await docGenerator.generateDocument(
        req.tenant.id,
        type as any,
        employeeData
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ message: "Failed to generate document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/candidates/:id/generate-document/:type", async (req, res) => {
    try {
      const { id, type } = req.params;
      const validTypes = ['offer_letter', 'welcome_letter', 'employee_handbook', 'nda', 'employment_contract', 'executive_offer', 'company_policies', 'onboarding_checklist', 'it_request_form', 'benefits_enrollment'];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }

      const candidate = await storage.getCandidate(req.tenant.id, id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const { createDocumentGenerator } = await import("./document-generator");
      const docGenerator = createDocumentGenerator(storage);

      const tenantConfig = await storage.getTenantConfig(req.tenant.id);
      
      const employeeData = {
        fullName: candidate.fullName,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
        idNumber: (candidate as any).idNumber || undefined,
        jobTitle: (candidate as any).jobTitle || req.body.jobTitle || 'Position',
        department: req.body.department || undefined,
        startDate: req.body.startDate || new Date().toLocaleDateString('en-ZA'),
        salary: req.body.salary || (candidate as any).expectedSalary || undefined,
        currency: req.body.currency || 'ZAR',
        manager: req.body.manager || undefined,
        probationPeriod: req.body.probationPeriod || '3 months',
        workingHours: req.body.workingHours || '08:00 - 17:00, Monday to Friday',
        leaveEntitlement: req.body.leaveEntitlement || '15 days annual leave',
        benefits: req.body.benefits || [],
        companyName: tenantConfig?.companyName || req.tenant.subdomain || 'Company',
        companyAddress: req.body.companyAddress || undefined,
      };

      const result = await docGenerator.generateDocument(
        req.tenant.id,
        type as any,
        employeeData
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error("Error generating document for candidate:", error);
      res.status(500).json({ message: "Failed to generate document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/candidates/:id/cv-template", async (req, res) => {
    try {
      const candidateId = req.params.id;
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Build template data from candidate record
      // Note: CV parser stores experience with {title, company, duration, location, responsibilities}
      // and education with {degree, institution, year, location}
      const experienceArray = Array.isArray(candidate.experience) ? candidate.experience : [];
      const educationArray = Array.isArray(candidate.education) ? candidate.education : [];
      const skillsArray = Array.isArray(candidate.skills) ? candidate.skills : [];
      const certsArray = Array.isArray(candidate.certifications) ? candidate.certifications : [];
      
      console.log("Building template for candidate:", candidate.fullName);
      console.log("Experience data:", JSON.stringify(experienceArray.slice(0, 2)));
      console.log("Education data:", JSON.stringify(educationArray.slice(0, 2)));

      const templateData = {
        personalProfile: {
          jobApplication: candidate.role || "",
          employmentEquityStatus: null,
          nationality: "South African",
          fullName: candidate.fullName,
          idNumber: null,
          residentialLocation: candidate.location || "",
          currentCompany: (experienceArray[0] as any)?.company || "",
          currentPosition: (experienceArray[0] as any)?.title || candidate.role || "",
          currentRemuneration: null,
          expectedRemuneration: null,
          noticePeriod: null,
        },
        education: {
          secondary: null,
          tertiary: educationArray.map((edu: any) => ({
            institution: edu?.institution || "",
            courses: edu?.degree || edu?.field || "",
            yearCompleted: edu?.year || edu?.endDate || "",
          })),
          otherCourses: certsArray.length > 0 ? certsArray.join(", ") : null,
        },
        computerLiteracy: skillsArray.filter((s: string) => 
          typeof s === 'string' && (
            s.toLowerCase().includes('excel') || 
            s.toLowerCase().includes('word') ||
            s.toLowerCase().includes('office') ||
            s.toLowerCase().includes('computer') ||
            s.toLowerCase().includes('software') ||
            s.toLowerCase().includes('sharepoint')
          )
        ).join(", ") || "MS Word, MS Excel",
        attributesAchievementsSkills: skillsArray.join(", ") || "",
        employmentHistory: experienceArray.map((exp: any) => ({
          employer: exp?.company || "",
          periodOfService: exp?.duration || `${exp?.startDate || ""} - ${exp?.endDate || "Present"}`,
          position: exp?.title || "",
          mainResponsibilities: Array.isArray(exp?.responsibilities) 
            ? exp.responsibilities.join("; ") 
            : (exp?.description || exp?.responsibilities || ""),
          reasonForLeaving: (exp?.duration || "").toLowerCase().includes("present") ? "Currently Employed" : "Career advancement",
        })),
        otherEmployment: [],
      };

      const doc = cvTemplateGenerator.generateDocument(templateData);
      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CV_Template_${candidate.fullName.replace(/\s+/g, '_')}.docx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating CV template from candidate:", error);
      res.status(500).json({ 
        message: "Failed to generate CV template",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/candidates/bulk-cv-template", async (req, res) => {
    try {
      const { candidateIds } = req.body;
      
      if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
        return res.status(400).json({ message: "No candidate IDs provided" });
      }

      const results: Array<{ candidateId: string; fullName: string; status: string; error?: string }> = [];
      const successfulDocs: Array<{ buffer: Buffer; filename: string }> = [];

      // Build template data from candidate record
      // Note: CV parser stores experience with {title, company, duration, location, responsibilities}
      // and education with {degree, institution, year, location}
      const buildTemplateData = (candidate: any) => {
        const experienceArray = Array.isArray(candidate.experience) ? candidate.experience : [];
        const educationArray = Array.isArray(candidate.education) ? candidate.education : [];
        const skillsArray = Array.isArray(candidate.skills) ? candidate.skills : [];
        const certsArray = Array.isArray(candidate.certifications) ? candidate.certifications : [];
        
        return {
          personalProfile: {
            jobApplication: candidate.role || "",
            employmentEquityStatus: null,
            nationality: "South African",
            fullName: candidate.fullName || "Unknown",
            idNumber: null,
            residentialLocation: candidate.location || "",
            currentCompany: (experienceArray[0] as any)?.company || "",
            currentPosition: (experienceArray[0] as any)?.title || candidate.role || "",
            currentRemuneration: null,
            expectedRemuneration: null,
            noticePeriod: null,
          },
          education: {
            secondary: null,
            tertiary: educationArray.map((edu: any) => ({
              institution: edu?.institution || "",
              courses: edu?.degree || edu?.field || "",
              yearCompleted: edu?.year || edu?.endDate || "",
            })),
            otherCourses: certsArray.length > 0 ? certsArray.join(", ") : null,
          },
          computerLiteracy: skillsArray.filter((s: string) => 
            typeof s === 'string' && (
              s.toLowerCase().includes('excel') || 
              s.toLowerCase().includes('word') ||
              s.toLowerCase().includes('office') ||
              s.toLowerCase().includes('computer') ||
              s.toLowerCase().includes('software') ||
              s.toLowerCase().includes('sharepoint')
            )
          ).join(", ") || "MS Word, MS Excel",
          attributesAchievementsSkills: skillsArray.join(", ") || "",
          employmentHistory: experienceArray.map((exp: any) => ({
            employer: exp?.company || "",
            periodOfService: exp?.duration || `${exp?.startDate || ""} - ${exp?.endDate || "Present"}`,
            position: exp?.title || "",
            mainResponsibilities: Array.isArray(exp?.responsibilities) 
              ? exp.responsibilities.join("; ") 
              : (exp?.description || exp?.responsibilities || ""),
            reasonForLeaving: (exp?.duration || "").toLowerCase().includes("present") ? "Currently Employed" : "Career advancement",
          })),
          otherEmployment: [],
        };
      };

      for (const candidateId of candidateIds) {
        try {
          const candidate = await storage.getCandidate(req.tenant.id, candidateId);
          
          if (!candidate) {
            results.push({ candidateId, fullName: "Unknown", status: "not_found", error: "Candidate not found" });
            continue;
          }

          const templateData = buildTemplateData(candidate);
          const doc = cvTemplateGenerator.generateDocument(templateData);
          const buffer = await Packer.toBuffer(doc);
          
          const safeFilename = (candidate.fullName || "Unknown").replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_');
          successfulDocs.push({
            buffer,
            filename: `CV_Template_${safeFilename}.docx`
          });
          
          results.push({ candidateId, fullName: candidate.fullName, status: "success" });
        } catch (error) {
          console.error(`Error generating CV template for candidate ${candidateId}:`, error);
          results.push({ 
            candidateId, 
            fullName: "Unknown", 
            status: "failed", 
            error: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      if (successfulDocs.length === 0) {
        const zip = new AdmZip();
        const manifestContent = `CV Template Generation Report
=============================
Date: ${new Date().toISOString()}
Total Requested: ${candidateIds.length}
Successful: 0
Failed: ${results.length}

Errors:
${results.map(r => `- ${r.candidateId}: ${r.error || 'Unknown error'}`).join('\n')}
`;
        zip.addFile("_generation_report.txt", Buffer.from(manifestContent, 'utf-8'));
        
        const zipBuffer = zip.toBuffer();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="CV_Templates_Bulk_Failed.zip"`);
        res.setHeader('X-Generation-Status', 'failed');
        res.setHeader('X-Templates-Generated', '0');
        res.setHeader('X-Templates-Failed', String(results.length));
        return res.send(zipBuffer);
      }

      if (successfulDocs.length === 1 && results.filter(r => r.status !== 'success').length === 0) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${successfulDocs[0].filename}"`);
        res.setHeader('X-Generation-Status', 'success');
        res.setHeader('X-Templates-Generated', '1');
        return res.send(successfulDocs[0].buffer);
      }

      const zip = new AdmZip();
      for (const doc of successfulDocs) {
        zip.addFile(doc.filename, doc.buffer);
      }
      
      const failedResults = results.filter(r => r.status !== 'success');
      if (failedResults.length > 0) {
        const manifestContent = `CV Template Generation Report
=============================
Date: ${new Date().toISOString()}
Total Requested: ${candidateIds.length}
Successful: ${successfulDocs.length}
Failed: ${failedResults.length}

Failed Candidates:
${failedResults.map(r => `- ${r.fullName} (${r.candidateId}): ${r.error || r.status}`).join('\n')}

Successfully Generated:
${results.filter(r => r.status === 'success').map(r => `- ${r.fullName}`).join('\n')}
`;
        zip.addFile("_generation_report.txt", Buffer.from(manifestContent, 'utf-8'));
      }
      
      const zipBuffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="CV_Templates_Bulk.zip"`);
      res.setHeader('X-Generation-Status', failedResults.length > 0 ? 'partial' : 'success');
      res.setHeader('X-Templates-Generated', String(successfulDocs.length));
      res.setHeader('X-Templates-Failed', String(failedResults.length));
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error generating bulk CV templates:", error);
      res.status(500).json({ 
        message: "Failed to generate bulk CV templates",
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

  // Helper to merge metadata fields onto job object for frontend consumption
  function enrichJobWithMetadata(job: any) {
    if (job && job.metadata && typeof job.metadata === 'object') {
      return { ...job, ...job.metadata };
    }
    return job;
  }

  app.get("/api/jobs", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const { data, total } = await storage.getJobsPaginated(req.tenant.id, page, limit);
      res.json({ data: data.map(enrichJobWithMetadata), total, page, limit });
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
      res.json(enrichJobWithMetadata(job));
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

  // Close job (mark as completed/candidates sourced - removes from active list)
  app.post("/api/jobs/:id/close", async (req, res) => {
    try {
      const { reason = "candidates_sourced" } = req.body;
      const job = await storage.updateJob(req.tenant.id, req.params.id, {
        isClosed: 1,
        closedAt: new Date(),
        closedReason: reason,
        status: "Closed",
      } as any);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error closing job:", error);
      res.status(500).json({ message: "Failed to close job" });
    }
  });

  // Reopen a closed job
  app.post("/api/jobs/:id/reopen", async (req, res) => {
    try {
      const job = await storage.updateJob(req.tenant.id, req.params.id, {
        isClosed: 0,
        closedAt: null,
        closedReason: null,
        status: "Active",
      } as any);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error reopening job:", error);
      res.status(500).json({ message: "Failed to reopen job" });
    }
  });

  // Archive job (soft delete - preserves historical data)
  app.post("/api/jobs/:id/archive", async (req, res) => {
    try {
      const { reason } = req.body;
      const job = await storage.archiveJob(req.tenant.id, req.params.id, reason);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error archiving job:", error);
      res.status(500).json({ message: "Failed to archive job" });
    }
  });

  // Restore archived job
  app.post("/api/jobs/:id/restore", async (req, res) => {
    try {
      const job = await storage.restoreJob(req.tenant.id, req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error restoring job:", error);
      res.status(500).json({ message: "Failed to restore job" });
    }
  });

  // Get closed jobs (candidates sourced, filled, etc.)
  app.get("/api/jobs/closed", async (req, res) => {
    try {
      const closedJobs = await storage.getClosedJobs(req.tenant.id);
      res.json(closedJobs);
    } catch (error) {
      console.error("Error fetching closed jobs:", error);
      res.status(500).json({ message: "Failed to fetch closed jobs" });
    }
  });

  // Get archived jobs
  app.get("/api/jobs/archived", async (req, res) => {
    try {
      const archivedJobs = await storage.getArchivedJobs(req.tenant.id);
      res.json(archivedJobs);
    } catch (error) {
      console.error("Error fetching archived jobs:", error);
      res.status(500).json({ message: "Failed to fetch archived jobs" });
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

  // AI Research: Auto-generate job spec based on job title
  app.post("/api/jobs/conversation/research", async (req, res) => {
    try {
      const { sessionId, jobTitle, customer, industry } = req.body;

      if (!sessionId || !jobTitle) {
        return res.status(400).json({ message: "Session ID and job title are required" });
      }

      const agent = getOrCreateConversation(sessionId);
      const response = await agent.researchJobSpec(jobTitle, customer, industry);

      res.json(response);
    } catch (error) {
      console.error("Error researching job specification:", error);
      res.status(500).json({ message: "Failed to research job specification" });
    }
  });

  // Parse full job specification text using AI
  app.post("/api/jobs/conversation/parse-spec", async (req, res) => {
    try {
      const { sessionId, fullSpec } = req.body;

      if (!sessionId || !fullSpec) {
        return res.status(400).json({ message: "Session ID and full spec text are required" });
      }

      const agent = getOrCreateConversation(sessionId);
      const response = await agent.parseFullSpec(fullSpec);

      res.json(response);
    } catch (error) {
      console.error("Error parsing job specification:", error);
      res.status(500).json({ message: "Failed to parse job specification" });
    }
  });

  app.post("/api/jobs/conversation/create", async (req, res) => {
    try {
      const { sessionId, isDraft = false, jobSpec: editedJobSpec, assignedAgentId, assignedAgentName } = req.body;
      
      console.log("[Job Creation] Received request:", { sessionId, isDraft, hasEditedSpec: !!editedJobSpec });

      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const agent = getOrCreateConversation(sessionId);
      const originalJobSpec = agent.getJobSpec();
      
      console.log("[Job Creation] Original spec from agent:", originalJobSpec);
      console.log("[Job Creation] Edited spec from request:", editedJobSpec);
      
      const rawJobSpec = editedJobSpec || originalJobSpec;
      console.log("[Job Creation] Using rawJobSpec:", rawJobSpec);
      
      const parseOptionalNumber = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const parsed = typeof val === 'number' ? val : parseInt(String(val), 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      };
      
      const jobSpec = {
        ...rawJobSpec,
        salaryMin: parseOptionalNumber(rawJobSpec.salaryMin),
        salaryMax: parseOptionalNumber(rawJobSpec.salaryMax),
        minYearsExperience: parseOptionalNumber(rawJobSpec.minYearsExperience),
      };

      // Compose a rich description from structured fields when description is empty
      if (!jobSpec.description && (jobSpec.introduction || jobSpec.duties || jobSpec.attributes || jobSpec.qualifications || jobSpec.requirements || jobSpec.responsibilities || jobSpec.benefits || jobSpec.remuneration || jobSpec.skills)) {
        let desc = "";
        if (jobSpec.introduction) desc += jobSpec.introduction + "\n\n";
        if (Array.isArray(jobSpec.duties) && jobSpec.duties.length) desc += "Key Duties:\n" + jobSpec.duties.map((d: string) => "- " + d).join("\n") + "\n\n";
        if (Array.isArray(jobSpec.attributes) && jobSpec.attributes.length) desc += "Key Attributes:\n" + jobSpec.attributes.map((a: string) => "- " + a).join("\n") + "\n\n";
        if (Array.isArray(jobSpec.qualifications) && jobSpec.qualifications.length) desc += "Qualifications:\n" + jobSpec.qualifications.map((q: string) => "- " + q).join("\n") + "\n\n";
        if (Array.isArray(jobSpec.requirements) && jobSpec.requirements.length) desc += "Requirements:\n" + jobSpec.requirements.map((r: string) => "- " + r).join("\n") + "\n\n";
        if (Array.isArray(jobSpec.responsibilities) && jobSpec.responsibilities.length) desc += "Responsibilities:\n" + jobSpec.responsibilities.map((r: string) => "- " + r).join("\n") + "\n\n";
        if (Array.isArray(jobSpec.benefits) && jobSpec.benefits.length) desc += "Benefits:\n" + jobSpec.benefits.map((b: string) => "- " + b).join("\n") + "\n\n";
        if (jobSpec.remuneration) desc += "Remuneration: " + jobSpec.remuneration + "\n\n";
        if (Array.isArray(jobSpec.skills) && jobSpec.skills.length) desc += "Skills:\n" + jobSpec.skills.map((s: string) => "- " + s).join("\n") + "\n\n";
        jobSpec.description = desc.trim();
      }

      // Validate required fields (only title is strictly required for active jobs)
      if (!isDraft && !jobSpec.title) {
        return res.status(400).json({ message: "Missing required job information (title required)" });
      }
      
      // Infer department from title if not provided
      const inferredDepartment = jobSpec.department || inferDepartmentFromTitle(jobSpec.title || "");
      
      // Create the job with collected data (use placeholders for missing required fields)
      console.log("[Job Creation] Creating job with data:", {
        title: jobSpec.title || "Untitled Job (Draft)",
        department: inferredDepartment || "General",
        status: isDraft ? "Draft" : "Active",
        tenantId: req.tenant.id
      });
      
      // Build structured metadata from extra job spec fields
      const jobMetadata: Record<string, any> = {};
      const metadataFields = ['customer', 'introduction', 'duties', 'attributes', 'qualifications',
        'remuneration', 'gender', 'ethics', 'city', 'province', 'requirements', 'responsibilities',
        'benefits', 'skills'] as const;
      for (const field of metadataFields) {
        if (jobSpec[field] !== undefined && jobSpec[field] !== null && jobSpec[field] !== '') {
          jobMetadata[field] = jobSpec[field];
        }
      }

      const job = await storage.createJob(req.tenant.id, {
        title: jobSpec.title || "Untitled Job (Draft)",
        department: inferredDepartment || "General",
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
        metadata: Object.keys(jobMetadata).length > 0 ? jobMetadata : undefined,
        status: isDraft ? "Draft" : "Active",
        assignedAgentId: assignedAgentId || undefined,
        assignedAgentName: assignedAgentName || undefined,
      } as any);
      
      console.log("[Job Creation] Job created successfully:", { id: job.id, title: job.title });

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

        // Auto-post to PNET in background (only for active jobs)
        pnetJobPostingAgent.postJob(job, req.tenant.id).then((result) => {
          if (result.success) {
            console.log(`✓ Posted job ${job.id} to PNET: ${result.pnetJobId}`);
            // Store PNET job ID in database
            storage.updateJob(req.tenant.id, job.id, {
              pnetJobId: result.pnetJobId,
              pnetJobUrl: result.pnetUrl,
            } as any);
          } else {
            console.error(`✗ Failed to post job ${job.id} to PNET:`, result.message);
          }
        }).catch((error) => {
          console.error(`✗ Error posting job ${job.id} to PNET:`, error);
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
        return res.status(500).json({
          message: "Hume AI credentials not configured. Please add HUMAI_API_KEY and HUMAI_SECRET_KEY to your environment secrets."
        });
      }

      const accessToken = await getHumeAccessToken(HUMAI_API_KEY, HUMAI_SECRET_KEY);
      const configId = await getOrCreateHumeConfig(HUMAI_API_KEY);

      const response: any = {
        accessToken,
        websocketUrl: "wss://api.hume.ai/v0/evi/chat"
      };

      if (configId) {
        response.configId = configId;
      }

      res.json(response);
    } catch (error) {
      // Invalidate cache on auth errors
      if (error instanceof Error && error.message.includes('401')) {
        humeTokenCache = null;
      }
      console.error("Error getting Hume AI config:", error);
      res.status(500).json({ message: `Failed to connect to Hume AI: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.get("/api/tavus/personas", async (req, res) => {
    try {
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY?.trim();

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
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY?.trim();

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
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY?.trim();

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

      // Dynamic prompt based on job role (Charles Molapisi persona)
      const conversationalContext = interviewOrchestrator.getTavusPrompt(role);

      const customGreeting = `Hello! I'm Charles Molapisi, the Group Chief Technology and Information Officer here at MTN. Thank you for making the time to speak with me today. I'm looking forward to learning more about you and discussing the ${role} position. Before we dive in, how are you doing today?`;

      const requestBody = {
        replica_id: (process.env.TAVUS_REPLICA_ID || "default_replica").trim(),
        persona_id: (process.env.TAVUS_PERSONA_ID || "default_persona").trim(),
        conversation_name: `${role} Interview: ${candidateName}`,
        conversational_context: conversationalContext,
        custom_greeting: customGreeting,
        properties: {
          enable_recording: true,
          apply_greenscreen: true,
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
      
      // Save interview record to both tables
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
          persona: "Charles Molapisi - GCTIO MTN",
          tavusData: data
        },
        startedAt: new Date()
      });

      // Also create an interview_session record (used by orchestrator for transcripts, feedback, analysis)
      const session = await storage.createInterviewSession(req.tenant.id, {
        candidateId: candidateId || undefined,
        candidateName,
        jobTitle: role,
        token: data.conversation_id || `tavus_${Date.now()}`,
        interviewType: 'video',
        status: 'started',
        startedAt: new Date(),
      });

      res.json({
        sessionUrl: data.conversation_url,
        sessionId: data.conversation_id || "unknown",
        status: data.status || "created",
        candidateId,
        candidateName,
        interviewId: session.id
      });
    } catch (error) {
      console.error("Error creating Tavus session:", error);
      res.status(500).json({ message: "Failed to create video session" });
    }
  });

  // End a Tavus conversation explicitly so transcript becomes available
  app.post("/api/interview/video/end/:conversationId", async (req, res) => {
    try {
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY?.trim();
      if (!TAVUS_API_KEY) {
        return res.status(500).json({ message: "Tavus API key not configured" });
      }

      const { conversationId } = req.params;
      console.log(`[Tavus] Ending conversation ${conversationId}...`);

      const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, {
        method: "POST",
        headers: {
          "x-api-key": TAVUS_API_KEY,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tavus end conversation error:", response.status, error);
        // Don't fail hard - conversation may have already ended
        if (response.status !== 400) {
          return res.status(response.status).json({ message: "Failed to end conversation", details: error });
        }
      }

      console.log(`[Tavus] Conversation ${conversationId} ended successfully`);
      res.json({ success: true, conversationId });
    } catch (error) {
      console.error("Error ending Tavus conversation:", error);
      res.status(500).json({ message: "Failed to end conversation" });
    }
  });

  // Fetch transcript from Tavus after conversation ends
  app.get("/api/interview/video/transcript/:conversationId", async (req, res) => {
    try {
      const TAVUS_API_KEY = process.env.TAVUS_API_KEY?.trim();
      if (!TAVUS_API_KEY) {
        return res.status(500).json({ message: "Tavus API key not configured" });
      }

      const { conversationId } = req.params;
      const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`, {
        method: "GET",
        headers: {
          "x-api-key": TAVUS_API_KEY,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Tavus transcript fetch error:", response.status, error);
        return res.status(response.status).json({ message: "Failed to fetch transcript from Tavus", details: error });
      }

      const data = await response.json();

      // Extract transcript from multiple possible sources
      let transcript: any[] = [];

      // 1. Check conversation_transcript field (most common)
      if (data.conversation_transcript && Array.isArray(data.conversation_transcript) && data.conversation_transcript.length > 0) {
        transcript = data.conversation_transcript;
      }
      // 2. Check top-level transcript field
      else if (data.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
        transcript = data.transcript;
      }
      // 3. Check events array for transcription_ready event
      else if (data.events && Array.isArray(data.events)) {
        const transcriptionEvent = data.events.find((e: any) => e.event_type === "application.transcription_ready");
        if (transcriptionEvent?.properties?.transcript) {
          transcript = transcriptionEvent.properties.transcript;
        }
      }

      console.log(`[Tavus] Transcript for ${conversationId}: ${transcript.length} entries, status: ${data.status}, sources checked: conversation_transcript=${!!data.conversation_transcript}, transcript=${!!data.transcript}, events=${!!data.events}`);
      res.json({ ...data, transcript });
    } catch (error) {
      console.error("Error fetching Tavus transcript:", error);
      res.status(500).json({ message: "Failed to fetch transcript" });
    }
  });

  // Interview routes for job-scoped queries (non-duplicate)
  app.get("/api/jobs/:jobId/interviews", async (req, res) => {
    try {
      const interviews = await storage.getInterviewsByJobId(req.tenant.id, req.params.jobId);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching job interviews:", error);
      res.status(500).json({ message: "Failed to fetch job interviews" });
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

  // Interview Sessions - for WhatsApp interview invites
  app.post("/api/interview-sessions", async (req, res) => {
    try {
      const { candidateId, candidateName, candidatePhone, jobTitle, conversationId, interviewType, prompt } = req.body;
      
      // At minimum, we need phone or candidateId to identify who's being interviewed
      if (!candidateId && !candidatePhone) {
        return res.status(400).json({ message: "Either candidate ID or phone number is required" });
      }
      
      // Generate a cryptographically secure token
      const token = crypto.randomBytes(16).toString('hex').toUpperCase();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const session = await storage.createInterviewSession(req.tenant.id, {
        candidateId: candidateId || null,
        conversationId,
        candidateName,
        candidatePhone,
        jobTitle,
        token,
        interviewType: interviewType || 'voice',
        status: 'pending',
        prompt,
        expiresAt,
      });
      
      // Transition candidate to "interviewing" stage
      if (candidateId) {
        try {
          const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
          await pipelineOrchestrator.transitionCandidate(candidateId, "interviewing", req.tenant.id);
        } catch (stageErr) {
          // Non-blocking: log but don't fail the session creation
          console.log(`[Interview] Could not transition candidate ${candidateId} to interviewing:`, (stageErr as Error).message);
        }
      }

      // Generate the interview URL
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const interviewUrl = `${baseUrl}/interview/invite/${token}`;

      res.status(201).json({ ...session, interviewUrl });
    } catch (error) {
      console.error("Error creating interview session:", error);
      res.status(500).json({ message: "Failed to create interview session", detail: (error as Error).message });
    }
  });

  // Send interview invitation via email
  app.post("/api/interview-sessions/send-email-invite", async (req, res) => {
    try {
      const { to, candidateName, jobTitle, interviewUrl, interviewType } = req.body;

      if (!to || !interviewUrl) {
        return res.status(400).json({ message: "Recipient email and interview URL are required" });
      }

      const result = await emailService.sendInterviewInvitation({
        to,
        candidateName: candidateName || "Candidate",
        jobTitle: jobTitle || "Open Position",
        interviewUrl,
        interviewType: interviewType || "voice",
      });

      if (result) {
        res.json({ success: true, message: `Interview invitation sent to ${process.env.DEV_TEST_EMAIL || to}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending email invite:", error);
      res.status(500).json({ message: "Failed to send email invitation" });
    }
  });

  app.get("/api/interview-sessions/conversation/:conversationId", async (req, res) => {
    try {
      const sessions = await storage.getInterviewSessionsByConversationId(req.tenant.id, req.params.conversationId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching interview sessions:", error);
      res.status(500).json({ message: "Failed to fetch interview sessions" });
    }
  });

  app.get("/api/interview-sessions/candidate/:candidateId", async (req, res) => {
    try {
      const sessions = await storage.getInterviewSessionsByCandidateId(req.tenant.id, req.params.candidateId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching interview sessions:", error);
      res.status(500).json({ message: "Failed to fetch interview sessions" });
    }
  });

  app.get("/api/integrity-checks", async (req, res) => {
    try {
      const checks = await storage.getAllIntegrityChecks(req.tenant.id);
      // Enrich with candidate names to avoid client-side lookup issues with paginated candidates
      const enriched = await Promise.all(checks.map(async (check) => {
        const candidate = await storage.getCandidate(req.tenant.id, check.candidateId);
        return {
          ...check,
          candidateName: candidate?.fullName || "Unknown Candidate",
        };
      }));
      res.json(enriched);
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

  // ==================== INTEGRITY DOCUMENT REQUIREMENTS ====================

  // Get document types list
  app.get("/api/document-types", async (req, res) => {
    res.json(documentTypes);
  });

  // Get all document requirements for a candidate
  app.get("/api/candidates/:candidateId/document-requirements", async (req, res) => {
    try {
      const requirements = await storage.getIntegrityDocumentRequirements(req.tenant.id, req.params.candidateId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching document requirements:", error);
      res.status(500).json({ message: "Failed to fetch document requirements" });
    }
  });

  // Get document requirements by integrity check
  app.get("/api/integrity-checks/:checkId/document-requirements", async (req, res) => {
    try {
      const requirements = await storage.getIntegrityDocumentRequirementsByCheckId(req.tenant.id, req.params.checkId);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching document requirements:", error);
      res.status(500).json({ message: "Failed to fetch document requirements" });
    }
  });

  // Get single document requirement
  app.get("/api/document-requirements/:id", async (req, res) => {
    try {
      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      console.error("Error fetching document requirement:", error);
      res.status(500).json({ message: "Failed to fetch document requirement" });
    }
  });

  // Create document requirement
  app.post("/api/document-requirements", async (req, res) => {
    try {
      const result = insertIntegrityDocumentRequirementSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const requirement = await storage.createIntegrityDocumentRequirement(req.tenant.id, result.data);
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating document requirement:", error);
      res.status(500).json({ message: "Failed to create document requirement" });
    }
  });

  // Update document requirement
  app.patch("/api/document-requirements/:id", async (req, res) => {
    try {
      const result = updateIntegrityDocumentRequirementSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const requirement = await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, result.data);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      console.error("Error updating document requirement:", error);
      res.status(500).json({ message: "Failed to update document requirement" });
    }
  });

  // Delete document requirement
  app.delete("/api/document-requirements/:id", async (req, res) => {
    try {
      const success = await storage.deleteIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Document requirement not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document requirement:", error);
      res.status(500).json({ message: "Failed to delete document requirement" });
    }
  });

  // Create document requirements for an integrity check (batch creation)
  app.post("/api/integrity-checks/:checkId/request-documents", async (req, res) => {
    try {
      const { documentTypes: requiredTypes, sendWhatsappRequest = true } = req.body;
      
      if (!requiredTypes || !Array.isArray(requiredTypes) || requiredTypes.length === 0) {
        return res.status(400).json({ message: "documentTypes array is required" });
      }
      
      const check = await storage.getIntegrityCheck(req.tenant.id, req.params.checkId);
      if (!check) {
        return res.status(404).json({ message: "Integrity check not found" });
      }
      
      const candidate = await storage.getCandidate(req.tenant.id, check.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const createdRequirements = [];
      const now = new Date();
      const nextReminderAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      
      for (const docType of requiredTypes) {
        const referenceCode = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const docTypeLabels: Record<string, string> = {
          id_document: "ID Document (Passport or National ID)",
          proof_of_address: "Proof of Address (Utility bill or bank statement)",
          police_clearance: "Police Clearance Certificate",
          drivers_license: "Driver's License",
          passport: "Passport",
          bank_statement: "Bank Statement",
          qualification_certificate: "Qualification Certificate",
          reference_letter: "Reference Letter",
          work_permit: "Work Permit",
          cv_resume: "CV/Resume",
          payslip: "Recent Payslip",
          tax_certificate: "Tax Certificate",
          medical_certificate: "Medical Certificate",
          other: "Other Document"
        };
        
        const requirement = await storage.createIntegrityDocumentRequirement(req.tenant.id, {
          candidateId: check.candidateId,
          integrityCheckId: req.params.checkId,
          documentType: docType,
          description: docTypeLabels[docType] || docType,
          referenceCode,
          priority: "required",
          status: sendWhatsappRequest ? "requested" : "pending",
          requestedAt: sendWhatsappRequest ? now : undefined,
          nextReminderAt,
          reminderEnabled: 1,
        });
        
        createdRequirements.push(requirement);
      }
      
      // Send WhatsApp request if candidate has phone and flag is set
      if (sendWhatsappRequest && candidate.phone) {
        try {
          const { whatsappService } = await import("./whatsapp-service");

          const docList = createdRequirements.map((r, i) =>
            `${i + 1}. ${r.description} (Ref: ${r.referenceCode})`
          ).join('\n');

          const message = `Hi ${candidate.fullName},\n\nWe need the following documents to complete your background verification:\n\n${docList}\n\nPlease reply with the document type (e.g., "ID Document") before uploading each document so we can track your submission.\n\nReference these codes when submitting:\n${createdRequirements.map(r => `- ${r.referenceCode}`).join('\n')}`;

          const candidatePhone = candidate.phone.replace(/\D/g, '');
          const conversation = await whatsappService.getOrCreateConversation(
            req.tenant.id,
            candidatePhone,
            candidatePhone,
            candidate.fullName,
            candidate.id,
            'document_collection'
          );

          await whatsappService.sendTextMessage(
            req.tenant.id,
            conversation.id,
            candidatePhone,
            message,
            'ai'
          );
        } catch (whatsappError) {
          console.error("Failed to send WhatsApp request:", whatsappError);
          // Don't fail the request, just log the error
        }
      }
      
      res.status(201).json({
        message: "Document requirements created",
        requirements: createdRequirements,
        whatsappSent: sendWhatsappRequest && !!candidate.phone
      });
    } catch (error) {
      console.error("Error creating document requirements:", error);
      res.status(500).json({ message: "Failed to create document requirements" });
    }
  });

  // Send reminder for pending document requirements
  app.post("/api/document-requirements/:id/send-reminder", async (req, res) => {
    try {
      const { channel = "whatsapp" } = req.body;
      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }

      const candidate = await storage.getCandidate(req.tenant.id, requirement.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Build upload portal link if available
      const checks = await storage.getIntegrityChecksByCandidateId(req.tenant.id, requirement.candidateId);
      const comprehensiveCheck = checks.find((c: any) => c.checkType === "Comprehensive");
      let uploadLink = "";
      if (comprehensiveCheck) {
        let token = comprehensiveCheck.uploadToken;
        if (!token || (comprehensiveCheck.uploadTokenExpiresAt && new Date(comprehensiveCheck.uploadTokenExpiresAt) < new Date())) {
          token = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          await storage.updateIntegrityCheck(req.tenant.id, comprehensiveCheck.id, {
            uploadToken: token,
            uploadTokenExpiresAt: expiresAt,
          } as any);
        }
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        uploadLink = `${baseUrl}/integrity-upload/${token}`;
      }

      const docName = requirement.description || requirement.documentType;
      const uploadInstruction = uploadLink ? `\n\nYou can upload your document here: ${uploadLink}` : "";

      const whatsappMessage = `Hi ${candidate.fullName},\n\nThis is a reminder that we're still waiting for your ${docName}.${uploadInstruction}\n\nPlease upload this document at your earliest convenience to complete your background verification.`;

      try {
        if (channel === "email") {
          if (!candidate.email) {
            return res.status(400).json({ message: "Candidate has no email address" });
          }

          const uploadButtonHtml = uploadLink
            ? `<div style="text-align:center;margin:24px 0;">
                <a href="${uploadLink}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">Upload Your Document</a>
              </div>
              <p style="font-size:12px;color:#9ca3af;text-align:center;">This link expires in 14 days. If you need a new link, please contact HR.</p>`
            : '';

          await emailService.sendEmail({
            to: candidate.email,
            subject: `Document Reminder - ${docName}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#0d9488,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">Document Reminder</h1>
                <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">Background Verification - ${candidate.fullName}</p>
              </div>
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 12px 12px;">
                <p style="font-size:16px;color:#374151;">Dear ${candidate.fullName},</p>
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">This is a friendly reminder that we're still waiting for the following document to complete your background verification:</p>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;">
                  <h3 style="margin:0 0 12px 0;color:#92400e;">Document Required</h3>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="background:#fef3c7;">
                      <th style="padding:8px 12px;text-align:left;">Document</th>
                      <th style="padding:8px 12px;text-align:left;">Type</th>
                    </tr></thead>
                    <tbody><tr>
                      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${docName}</td>
                      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${requirement.documentType}</td>
                    </tr></tbody>
                  </table>
                </div>
                ${uploadButtonHtml}
                <p style="font-size:14px;color:#6b7280;margin-top:20px;">Best regards,<br><strong>HR Team</strong></p>
              </div>
            </div>`,
          });
        } else {
          if (!candidate.phone) {
            return res.status(400).json({ message: "Candidate has no phone number" });
          }

          const { whatsappService } = await import("./whatsapp-service");
          const candidatePhone = candidate.phone.replace(/\D/g, '');
          const conversation = await whatsappService.getOrCreateConversation(
            req.tenant.id, candidatePhone, candidatePhone, candidate.fullName, candidate.id, 'document_collection'
          );
          await whatsappService.sendTextMessage(req.tenant.id, conversation.id, candidatePhone, whatsappMessage, 'ai');
        }

        // Update reminder tracking
        const now = new Date();
        const nextReminderAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, {
          remindersSent: (requirement.remindersSent || 0) + 1,
          lastReminderAt: now,
          nextReminderAt,
        });

        res.json({ message: "Reminder sent successfully" });
      } catch (sendError) {
        console.error("Failed to send reminder:", sendError);
        res.status(500).json({ message: `Failed to send reminder via ${channel}` });
      }
    } catch (error) {
      console.error("Error sending document requirement reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // Verify an integrity document requirement
  app.post("/api/document-requirements/:id/verify", async (req, res) => {
    try {
      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }

      const updated = await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, {
        status: "verified",
        verifiedAt: new Date(),
      });

      // Check if all doc requirements for this candidate are now verified
      const allReqs = await storage.getIntegrityDocumentRequirements(req.tenant.id, requirement.candidateId);
      const allVerified = allReqs.every(r => r.status === "verified");

      if (allVerified) {
        // Update the comprehensive check from "Documents Required" to "Completed"
        const checks = await storage.getIntegrityChecksByCandidateId(req.tenant.id, requirement.candidateId);
        const comprehensiveCheck = checks.find((c: any) => c.checkType === "Comprehensive" && c.status === "Documents Required");
        if (comprehensiveCheck) {
          await storage.updateIntegrityCheck(req.tenant.id, comprehensiveCheck.id, {
            status: "Completed",
            result: comprehensiveCheck.result || "Clear",
          });
        }

        // Try to auto-advance the pipeline
        try {
          const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
          await pipelineOrchestrator.checkAndAutoAdvanceIntegrity(requirement.candidateId, req.tenant.id);
        } catch (err) {
          console.error("Auto-advance after doc verify failed (non-blocking):", err);
        }
      }

      res.json({ requirement: updated, allVerified });
    } catch (error) {
      console.error("Error verifying document requirement:", error);
      res.status(500).json({ message: "Failed to verify document requirement" });
    }
  });

  // Reject an integrity document requirement
  app.post("/api/document-requirements/:id/reject", async (req, res) => {
    try {
      const { reason } = req.body;
      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }

      const updated = await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, {
        status: "rejected",
        metadata: { ...(requirement.metadata as any || {}), rejectionReason: reason || "Document rejected by HR" },
      });

      res.json({ requirement: updated });
    } catch (error) {
      console.error("Error rejecting document requirement:", error);
      res.status(500).json({ message: "Failed to reject document requirement" });
    }
  });

  // Upload a document for an integrity document requirement
  app.post("/api/document-requirements/:id/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }

      // Save file to disk
      const fileName = `integrity_${requirement.candidateId}_${requirement.documentType}_${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join("uploads/integrity-documents", fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);

      // Create a document record
      const doc = await storage.createDocument(req.tenant.id, {
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
      await storage.createCandidateDocument(req.tenant.id, {
        candidateId: requirement.candidateId,
        documentType: requirement.documentType,
        fileName: file.originalname,
        fileUrl: filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        collectedVia: "portal",
        status: "received",
      });

      // Mark the requirement as received with documentId and receivedAt
      const updated = await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, {
        status: "received",
        receivedAt: new Date(),
        metadata: { ...(requirement.metadata as any || {}), documentId: doc.id },
      });

      res.json({ requirement: updated, document: doc });
    } catch (error) {
      console.error("Error uploading integrity document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Request or remind all pending integrity document requirements for a candidate
  app.post("/api/candidates/:candidateId/integrity-docs/remind-all", async (req, res) => {
    try {
      const { channel = "whatsapp" } = req.body;
      const candidateId = req.params.candidateId;

      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const allReqs = await storage.getIntegrityDocumentRequirements(req.tenant.id, candidateId);
      const pendingReqs = allReqs.filter(r => r.status === "pending" || r.status === "requested");

      if (pendingReqs.length === 0) {
        return res.json({ message: "No pending documents to remind about", reminded: 0 });
      }

      // Determine if this is an initial request (any docs still "pending") or a reminder
      const isInitialRequest = pendingReqs.some(r => r.status === "pending");
      const docList = pendingReqs.map(r => `• ${r.description || r.documentType}`).join("\n");
      const docListHtml = pendingReqs.map(r => `<li>${r.description || r.documentType}</li>`).join("");

      // Find or create upload token on the candidate's Comprehensive integrity check
      const checks = await storage.getIntegrityChecksByCandidateId(req.tenant.id, candidateId);
      const comprehensiveCheck = checks.find((c: any) => c.checkType === "Comprehensive");
      let uploadLink = "";
      if (comprehensiveCheck) {
        let token = comprehensiveCheck.uploadToken;
        if (!token || (comprehensiveCheck.uploadTokenExpiresAt && new Date(comprehensiveCheck.uploadTokenExpiresAt) < new Date())) {
          token = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          await storage.updateIntegrityCheck(req.tenant.id, comprehensiveCheck.id, {
            uploadToken: token,
            uploadTokenExpiresAt: expiresAt,
          } as any);
        }
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        uploadLink = `${baseUrl}/integrity-upload/${token}`;
      }

      const uploadInstruction = uploadLink ? `\n\nYou can upload your documents here: ${uploadLink}` : "";
      const uploadButtonHtml = uploadLink
        ? `<div style="text-align:center;margin:24px 0;">
            <a href="${uploadLink}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">Upload Your Documents</a>
          </div>
          <p style="font-size:12px;color:#9ca3af;text-align:center;">This link expires in 14 days. If you need a new link, please contact HR.</p>`
        : '';

      const docTableHtml = pendingReqs.map(r =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.description || r.documentType}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${r.documentType}</td>
        </tr>`
      ).join('');

      const requestMessage = `Hi ${candidate.fullName},\n\nAs part of your background verification process, we require the following documents from you:\n\n${docList}${uploadInstruction}\n\nPlease submit these documents at your earliest convenience to avoid any delays in the process.\n\nThank you for your cooperation.`;
      const reminderMessage = `Hi ${candidate.fullName},\n\nThis is a friendly reminder that we're still waiting for the following documents to complete your background verification:\n\n${docList}${uploadInstruction}\n\nPlease submit these documents at your earliest convenience.`;

      const styledEmailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#0d9488,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">${isInitialRequest ? "Document Request" : "Document Reminder"}</h1>
          <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">Background Verification - ${candidate.fullName}</p>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;color:#374151;">Dear ${candidate.fullName},</p>
          <p style="font-size:14px;color:#6b7280;line-height:1.6;">${isInitialRequest
            ? "As part of your background verification process, we require the following documents from you. Please submit them at your earliest convenience to avoid any delays."
            : "This is a friendly reminder that we're still waiting for the following documents to complete your background verification."}</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;">
            <h3 style="margin:0 0 12px 0;color:#92400e;">Documents We Need From You</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#fef3c7;">
                <th style="padding:8px 12px;text-align:left;">Document</th>
                <th style="padding:8px 12px;text-align:left;">Type</th>
              </tr></thead>
              <tbody>${docTableHtml}</tbody>
            </table>
          </div>
          ${uploadButtonHtml}
          <p style="font-size:14px;color:#6b7280;margin-top:20px;">Best regards,<br><strong>HR Team</strong></p>
        </div>
      </div>`;

      if (channel === "whatsapp") {
        if (!candidate.phone) {
          return res.status(400).json({ message: "Candidate has no phone number" });
        }

        const { whatsappService } = await import("./whatsapp-service");
        const candidatePhone = candidate.phone.replace(/\D/g, '');
        const conversation = await whatsappService.getOrCreateConversation(
          req.tenant.id, candidatePhone, candidatePhone, candidate.fullName, candidate.id, 'document_collection'
        );
        await whatsappService.sendTextMessage(req.tenant.id, conversation.id, candidatePhone, isInitialRequest ? requestMessage : reminderMessage, 'ai');
      } else {
        await emailService.sendEmail({
          to: candidate.email!,
          subject: isInitialRequest ? "Document Request - Background Verification" : "Document Reminder - Background Verification",
          html: styledEmailHtml,
        });
      }

      // Update status and reminder tracking
      const now = new Date();
      const nextReminderAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      for (const req2 of pendingReqs) {
        await storage.updateIntegrityDocumentRequirement(req.tenant.id, req2.id, {
          status: "requested",
          remindersSent: (req2.remindersSent || 0) + 1,
          lastReminderAt: now,
          nextReminderAt,
        });
      }

      res.json({ message: isInitialRequest ? "Document requests sent" : "Reminders sent", reminded: pendingReqs.length });
    } catch (error) {
      console.error("Error sending remind-all:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // ==================== CANDIDATE DOCUMENTS ====================

  // Get all documents across all candidates (for Document Library)
  app.get("/api/candidate-documents", async (req, res) => {
    try {
      const { documentType, status, candidateId, search } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

      // Get all documents (passing undefined to get all)
      let documents = await storage.getCandidateDocuments(req.tenant.id, candidateId as string | undefined);

      // Apply filters
      if (documentType && documentType !== 'all') {
        documents = documents.filter(doc => doc.documentType === documentType);
      }
      if (status && status !== 'all') {
        documents = documents.filter(doc => doc.status === status);
      }
      if (search) {
        const searchLower = (search as string).toLowerCase();
        documents = documents.filter(doc =>
          doc.fileName.toLowerCase().includes(searchLower) ||
          doc.referenceCode?.toLowerCase().includes(searchLower) ||
          doc.documentType.toLowerCase().includes(searchLower)
        );
      }

      // Paginate after filtering
      const total = documents.length;
      const paginatedDocs = documents.slice((page - 1) * limit, page * limit);

      // Get candidate info for each document
      const documentsWithCandidates = await Promise.all(paginatedDocs.map(async (doc) => {
        if (doc.candidateId) {
          const candidate = await storage.getCandidateById(req.tenant.id, doc.candidateId);
          return {
            ...doc,
            candidateName: candidate?.fullName || 'Unknown',
            candidateEmail: candidate?.email || '',
          };
        }
        return { ...doc, candidateName: 'Unknown', candidateEmail: '' };
      }));

      res.json({ data: documentsWithCandidates, total, page, limit });
    } catch (error) {
      console.error("Error fetching all candidate documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get all documents for a specific candidate
  app.get("/api/candidates/:candidateId/documents", async (req, res) => {
    try {
      const documents = await storage.getCandidateDocuments(req.tenant.id, req.params.candidateId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching candidate documents:", error);
      res.status(500).json({ message: "Failed to fetch candidate documents" });
    }
  });

  // Download document file
  app.get("/api/candidate-documents/:id/download", async (req, res) => {
    try {
      const document = await storage.getCandidateDocument(req.tenant.id, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const filePath = path.join(process.cwd(), document.fileUrl);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      if (document.mimeType) {
        res.setHeader('Content-Type', document.mimeType);
      }
      if (document.fileSize) {
        res.setHeader('Content-Length', document.fileSize.toString());
      }
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Get single document
  app.get("/api/candidate-documents/:id", async (req, res) => {
    try {
      const document = await storage.getCandidateDocument(req.tenant.id, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching candidate document:", error);
      res.status(500).json({ message: "Failed to fetch candidate document" });
    }
  });

  // Create candidate document (for manual uploads)
  app.post("/api/candidate-documents", async (req, res) => {
    try {
      const result = insertCandidateDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const document = await storage.createCandidateDocument(req.tenant.id, result.data);
      
      // If linked to a requirement, update the requirement status
      if (result.data.requirementId) {
        const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, result.data.requirementId);
        if (requirement) {
          await storage.updateIntegrityDocumentRequirement(req.tenant.id, result.data.requirementId, {
            status: 'received',
            documentId: document.id,
            receivedAt: new Date(),
          });
        }
      }
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating candidate document:", error);
      res.status(500).json({ message: "Failed to create candidate document" });
    }
  });

  // Update candidate document (verification status)
  app.patch("/api/candidate-documents/:id", async (req, res) => {
    try {
      const result = updateCandidateDocumentSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const document = await storage.updateCandidateDocument(req.tenant.id, req.params.id, result.data);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // If document is verified and linked to a requirement, update requirement status
      if (result.data.status === 'verified' && document.requirementId) {
        await storage.updateIntegrityDocumentRequirement(req.tenant.id, document.requirementId, {
          status: 'verified',
          verifiedAt: new Date(),
          verifiedBy: result.data.verifiedBy || 'manual',
        });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error updating candidate document:", error);
      res.status(500).json({ message: "Failed to update candidate document" });
    }
  });

  // Delete candidate document
  app.delete("/api/candidate-documents/:id", async (req, res) => {
    try {
      const success = await storage.deleteCandidateDocument(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting candidate document:", error);
      res.status(500).json({ message: "Failed to delete candidate document" });
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

  app.get("/api/calendly/config", async (req, res) => {
    try {
      const calendlyUrl = process.env.CALENDLY_URL;
      const isValidUrl = calendlyUrl && 
        calendlyUrl.startsWith('https://calendly.com/') && 
        calendlyUrl.length > 25;
      
      res.json({
        configured: !!isValidUrl,
        url: isValidUrl ? calendlyUrl : null
      });
    } catch (error) {
      console.error("Error fetching Calendly config:", error);
      res.status(500).json({ message: "Failed to fetch Calendly config" });
    }
  });

  app.post("/api/tenant-config", async (req, res) => {
    try {
      if (req.body.modulesEnabled && typeof req.body.modulesEnabled !== 'object') {
        return res.status(400).json({ message: "modulesEnabled must be an object" });
      }
      
      if (req.body.modulesEnabled) {
        const validModules = [
          'recruitment', 
          'integrity', 
          'onboarding', 
          'hr_management',
          'fleetlogix',
          'workforce_intelligence',
          'lms',
          'kpi_performance',
          'social_screening',
          'document_automation',
          'whatsapp',
          'pnet'
        ];
        for (const [key, value] of Object.entries(req.body.modulesEnabled)) {
          if (!validModules.includes(key)) {
            return res.status(400).json({ message: `Invalid module key: ${key}. Valid modules are: ${validModules.join(', ')}` });
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
        const validModules = [
          'recruitment', 
          'integrity', 
          'onboarding', 
          'hr_management',
          'fleetlogix',
          'workforce_intelligence',
          'lms',
          'kpi_performance',
          'social_screening',
          'document_automation',
          'whatsapp',
          'pnet'
        ];
        for (const [key, value] of Object.entries(req.body.modulesEnabled)) {
          if (!validModules.includes(key)) {
            return res.status(400).json({ message: `Invalid module key: ${key}. Valid modules are: ${validModules.join(', ')}` });
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
      if (req.tenant) {
        return res.json(req.tenant);
      }
      // Fallback to default tenant for development
      const config = await storage.getTenantConfig();
      if (config) {
        return res.json(config);
      }
      return res.status(404).json({ message: "No tenant found" });
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

  // ===== Web Scraper Routes =====
  
  app.get("/api/scrapers", async (req, res) => {
    try {
      const scrapers = scraperOrchestrator.getScrapers();
      res.json(scrapers);
    } catch (error) {
      console.error("Error fetching scrapers:", error);
      res.status(500).json({ message: "Failed to fetch scrapers" });
    }
  });

  app.post("/api/scrapers/run-all/:jobId", async (req, res) => {
    try {
      const { minMatchScore = 50, autoSave = true } = req.body;
      
      const job = await storage.getJobById(req.tenant.id, req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      console.log(`[Scrapers] Running all scrapers for job: ${job.title}`);
      
      const { results, allCandidates, totalFound } = await scraperOrchestrator.runAllScrapers(job);

      let savedCount = 0;
      if (autoSave && allCandidates.length > 0) {
        for (const candidate of allCandidates) {
          try {
            const candidateData: InsertCandidate = {
              fullName: candidate.name,
              role: candidate.title || job.title,
              source: `Web Scraper (${candidate.source})`,
              status: "New",
              stage: "Screening",
              match: candidate.matchScore || 70,
              jobId: job.id,
              skills: candidate.skills,
              location: candidate.location,
              email: candidate.contact?.includes("@") ? candidate.contact : undefined,
              phone: candidate.contact && !candidate.contact.includes("@") ? candidate.contact : undefined,
              metadata: {
                experience: candidate.experience,
                sourceUrl: candidate.sourceUrl,
                scrapedFrom: candidate.source,
                rawText: candidate.rawText?.slice(0, 500),
              },
            };
            await storage.createCandidate(req.tenant.id, candidateData);
            savedCount++;
          } catch (err) {
            console.error(`Failed to save scraped candidate ${candidate.name}:`, err);
          }
        }
      }

      res.json({
        message: `Scraping completed across ${results.length} platforms`,
        summary: {
          totalFound,
          savedToDB: savedCount,
          platforms: results.map(r => ({
            platform: r.platform,
            status: r.status,
            found: r.candidates.length,
            query: r.query,
            error: r.error
          }))
        },
        candidates: allCandidates,
      });
    } catch (error) {
      console.error("Error running scrapers:", error);
      res.status(500).json({ message: "Failed to run scrapers" });
    }
  });

  app.post("/api/scrapers/run/:platform/:jobId", async (req, res) => {
    try {
      const { autoSave = true } = req.body;
      const platform = decodeURIComponent(req.params.platform);
      
      const job = await storage.getJobById(req.tenant.id, req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      console.log(`[Scrapers] Running ${platform} scraper for job: ${job.title}`);
      
      const result = await scraperOrchestrator.runScraper(platform, job);

      let savedCount = 0;
      if (autoSave && result.candidates.length > 0) {
        for (const candidate of result.candidates) {
          try {
            const candidateData: InsertCandidate = {
              fullName: candidate.name,
              role: candidate.title || job.title,
              source: `Web Scraper (${candidate.source})`,
              status: "New",
              stage: "Screening",
              match: candidate.matchScore || 70,
              jobId: job.id,
              skills: candidate.skills,
              location: candidate.location,
              metadata: {
                experience: candidate.experience,
                sourceUrl: candidate.sourceUrl,
                scrapedFrom: candidate.source,
              },
            };
            await storage.createCandidate(req.tenant.id, candidateData);
            savedCount++;
          } catch (err) {
            console.error(`Failed to save candidate:`, err);
          }
        }
      }

      res.json({
        message: `${platform} scraping completed`,
        result: {
          platform: result.platform,
          status: result.status,
          query: result.query,
          found: result.candidates.length,
          savedToDB: savedCount,
          error: result.error
        },
        candidates: result.candidates,
      });
    } catch (error) {
      console.error("Error running scraper:", error);
      res.status(500).json({ message: "Failed to run scraper" });
    }
  });

  // Generate real personalized onboarding documents for preview (temp directory, cleaned up after)
  app.post("/api/onboarding/generate-documents", async (req, res) => {
    try {
      const { candidateId, selectedDocuments, startDate } = req.body;
      if (!candidateId || !selectedDocuments || !Array.isArray(selectedDocuments) || selectedDocuments.length === 0) {
        return res.status(400).json({ message: "candidateId and selectedDocuments are required" });
      }

      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const { createDocumentGenerator } = await import("./document-generator");
      const docGenerator = createDocumentGenerator(storage);
      const tenantConfig = await storage.getTenantConfig(req.tenant.id);
      const companyName = tenantConfig?.companyName || req.tenant.subdomain || "Company";

      const employeeData = {
        fullName: candidate.fullName,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
        jobTitle: candidate.role || "Position",
        department: "",
        startDate: startDate || "TBD",
        companyName,
      };

      const batchId = `batch_${candidateId}_${Date.now()}`;
      const tempDir = path.join(process.cwd(), "uploads", "onboarding-temp");
      fs.mkdirSync(tempDir, { recursive: true });

      // Clean up any previous temp batches for this candidate
      try {
        const existing = fs.readdirSync(tempDir).filter((f: string) => f.startsWith(`batch_${candidateId}_`));
        for (const old of existing) fs.unlinkSync(path.join(tempDir, old));
      } catch {}

      const generated: { docType: string; filename: string; mimeType: string; fileSize: number }[] = [];

      for (const docType of selectedDocuments) {
        try {
          const { buffer, filename, mimeType } = await docGenerator.generateDocument(
            req.tenant.id,
            docType as any,
            employeeData
          );
          const savedFilename = `${batchId}_${filename}`;
          fs.writeFileSync(path.join(tempDir, savedFilename), buffer);

          generated.push({ docType, filename, mimeType, fileSize: buffer.length });
        } catch (docErr) {
          console.error(`[Onboarding] Failed to generate ${docType}:`, docErr);
        }
      }

      res.json({ batchId, candidateId, documents: generated });
    } catch (error) {
      console.error("Error generating onboarding documents:", error);
      res.status(500).json({ message: "Failed to generate documents" });
    }
  });

  // Download a specific temp-generated onboarding document for preview
  app.get("/api/onboarding/generated-document/:batchId/:docType", async (req, res) => {
    try {
      const { batchId, docType } = req.params;
      const tempDir = path.join(process.cwd(), "uploads", "onboarding-temp");
      if (!fs.existsSync(tempDir)) return res.status(404).json({ message: "Document not found" });

      const allFiles = fs.readdirSync(tempDir).filter((f: string) => f.startsWith(`${batchId}_`));
      const match = allFiles.find((f: string) => {
        const lower = f.toLowerCase();
        return lower.includes(docType.replace(/_/g, '')) || lower.includes(docType);
      });
      if (!match) return res.status(404).json({ message: "Document not found" });

      const filePath = path.join(tempDir, match);
      const ext = path.extname(match).toLowerCase();
      const mimeType = ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${match.replace(`${batchId}_`, '')}"`);
      res.send(fs.readFileSync(filePath));
    } catch (error) {
      console.error("Error serving generated document:", error);
      res.status(500).json({ message: "Failed to retrieve document" });
    }
  });

  app.post("/api/onboarding/trigger/:candidateId", upload.array("files", 20), async (req, res) => {
    try {
      const { OnboardingOrchestrator } = await import("./onboarding-orchestrator");
      const { EmailService } = await import("./email-service");
      const orchestrator = new OnboardingOrchestrator(storage);
      const emailService = new EmailService(storage);

      const { requirements, startDate, equipmentList, selectedDocuments: selectedDocsRaw, generatedBatchId, channel: channelRaw } = req.body || {};
      const channel = (typeof channelRaw === "string" && channelRaw === "whatsapp") ? "whatsapp" : "email";
      // Parse JSON strings from multipart form data
      const parsedRequirements = typeof requirements === "string" ? JSON.parse(requirements) : requirements;
      const parsedEquipmentList = typeof equipmentList === "string" ? JSON.parse(equipmentList) : (equipmentList || []);
      const parsedSelectedDocuments: string[] = typeof selectedDocsRaw === "string" ? JSON.parse(selectedDocsRaw) : (selectedDocsRaw || []);
      const batchId = typeof generatedBatchId === "string" ? generatedBatchId : undefined;

      const candidate = await storage.getCandidate(req.tenant.id, req.params.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Use provided start date, or fall back to the offer's start date
      let resolvedStartDate: Date | undefined = startDate ? new Date(startDate) : undefined;
      if (!resolvedStartDate) {
        const offer = await storage.getOfferByCandidateId(req.tenant.id, req.params.candidateId);
        if (offer?.startDate) {
          resolvedStartDate = new Date(offer.startDate);
        }
      }

      const workflow = await orchestrator.startOnboarding(req.tenant.id, req.params.candidateId, false, {
        requirements: parsedRequirements,
        equipmentList: parsedEquipmentList,
        startDate: resolvedStartDate,
      });

      // Build email attachments from manually uploaded files + generated documents
      const emailAttachments: { filename: string; content: Buffer; contentType: string }[] = [];

      // Upload and collect any manually attached files
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `onboarding_pack_${candidate.id}_${Date.now()}_${file.originalname}`;
          const filePath = path.join("uploads/onboarding-packs", fileName);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, file.buffer);
          emailAttachments.push({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
          });
        }
      }

      // Collect DOCX documents — reuse pre-generated temp docs if batchId provided, otherwise generate fresh
      const sentDocuments: { id: string; title: string; type: string; status: string; snippet: string; url: string; docType: string }[] = [];
      const permanentDir = path.join(process.cwd(), "uploads", "onboarding-packs");
      fs.mkdirSync(permanentDir, { recursive: true });

      if (parsedSelectedDocuments.length > 0) {
        if (batchId) {
          // Move pre-generated docs from temp to permanent storage
          const tempDir = path.join(process.cwd(), "uploads", "onboarding-temp");
          try {
            const batchFiles = fs.existsSync(tempDir)
              ? fs.readdirSync(tempDir).filter((f: string) => f.startsWith(`${batchId}_`))
              : [];
            for (const batchFile of batchFiles) {
              const tempPath = path.join(tempDir, batchFile);
              const buffer = fs.readFileSync(tempPath);
              const filename = batchFile.replace(`${batchId}_`, '');
              const ext = path.extname(filename).toLowerCase();
              const mimeType = ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
              const docType = parsedSelectedDocuments.find(d => filename.toLowerCase().includes(d.replace(/_/g, ''))) || filename;

              // Save permanently
              const savedPath = path.join(permanentDir, `${candidate.id}_${filename}`);
              fs.writeFileSync(savedPath, buffer);

              // Clean up temp file
              fs.unlinkSync(tempPath);

              emailAttachments.push({ filename, content: buffer, contentType: mimeType });
              sentDocuments.push({
                id: `sent-${docType}-${Date.now()}`,
                title: filename,
                type: "document",
                status: "sent",
                snippet: `Sent in onboarding pack`,
                url: `/uploads/onboarding-packs/${candidate.id}_${filename}`,
                docType,
              });
            }
            if (batchFiles.length > 0) {
              console.log(`[Onboarding] Moved ${batchFiles.length} pre-generated documents from temp to permanent storage`);
            }
          } catch (batchErr) {
            console.error("[Onboarding] Failed to load pre-generated documents, falling back to generation:", batchErr);
          }
        }

        // If no batchId or batch loading failed, generate fresh
        if (sentDocuments.length === 0) {
          try {
            const { createDocumentGenerator } = await import("./document-generator");
            const docGenerator = createDocumentGenerator(storage);
            const tenantConfig = await storage.getTenantConfig(req.tenant.id);
            const companyName = tenantConfig?.companyName || req.tenant.subdomain || "Company";

            const employeeData = {
              fullName: candidate.fullName,
              email: candidate.email || undefined,
              phone: candidate.phone || undefined,
              jobTitle: (candidate as any).role || (candidate as any).position || "Position",
              department: (candidate as any).department || "",
              startDate: startDate || "TBD",
              companyName,
            };

            for (const docType of parsedSelectedDocuments) {
              try {
                const { buffer, filename, mimeType } = await docGenerator.generateDocument(
                  req.tenant.id,
                  docType as any,
                  employeeData
                );
                const savedPath = path.join(permanentDir, `${candidate.id}_${filename}`);
                fs.writeFileSync(savedPath, buffer);

                emailAttachments.push({ filename, content: buffer, contentType: mimeType });
                sentDocuments.push({
                  id: `sent-${docType}-${Date.now()}`,
                  title: filename,
                  type: "document",
                  status: "sent",
                  snippet: `Sent in onboarding pack`,
                  url: `/uploads/onboarding-packs/${candidate.id}_${filename}`,
                  docType,
                });
              } catch (docErr) {
                console.error(`[Onboarding] Failed to generate ${docType} (non-blocking):`, docErr);
              }
            }
          } catch (genErr) {
            console.error("[Onboarding] Document generation setup failed (non-blocking):", genErr);
          }
        }
      }

      // Initialize document requests directly (don't rely on background orchestrator timing)
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const onboardingAgent = createOnboardingAgent(storage);
      let docRequests = await storage.getOnboardingDocumentRequests(req.tenant.id, workflow.id);
      if (docRequests.length === 0) {
        await onboardingAgent.initializeDocumentRequests(req.tenant.id, workflow.id, candidate.id.toString());
        await onboardingAgent.requestDocuments(req.tenant.id, workflow.id, candidate.id.toString(), 'email');
        docRequests = await storage.getOnboardingDocumentRequests(req.tenant.id, workflow.id);
      }

      // Generate upload portal token
      const uploadToken = crypto.randomBytes(24).toString('hex');
      const uploadTokenExpiresAt = new Date();
      uploadTokenExpiresAt.setDate(uploadTokenExpiresAt.getDate() + 14);
      await storage.updateOnboardingWorkflow(req.tenant.id, workflow.id, {
        uploadToken,
        uploadTokenExpiresAt,
      } as any);
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const uploadPortalUrl = `${baseUrl}/onboarding-upload/${uploadToken}`;

      // Build document requirements HTML for the combined email
      const docListHtml = docRequests.map(r => {
        const dueDate = r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : 'ASAP';
        const priorityBadge = r.priority === 'urgent' ? ' <span style="color:#dc2626;font-weight:bold;">(Urgent)</span>' :
                             r.priority === 'high' ? ' <span style="color:#ea580c;">(High Priority)</span>' : '';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.documentName}${priorityBadge}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${r.description || ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${dueDate}</td>
        </tr>`;
      }).join('');

      const docListText = docRequests.map(r => {
        const dueDate = r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : 'ASAP';
        return `- ${r.documentName}: ${r.description || ''} (Due: ${dueDate})`;
      }).join('\n');

      // Build attached documents HTML section
      const attachedDocsHtml = emailAttachments.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <h3 style="margin:0 0 8px 0;color:#166534;">Attached Documents</h3>
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px 0;">Please review the following attached onboarding documents:</p>
      ${emailAttachments.map(a => `<p style="margin:4px 0;color:#374151;">- ${a.filename}</p>`).join('')}
    </div>` : '';

      // Build required documents HTML section
      const requiredDocsHtml = docRequests.length > 0 ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px 0;color:#92400e;">Documents We Need From You</h3>
      <p style="font-size:13px;color:#6b7280;margin:0 0 12px 0;">Please submit the following documents as soon as possible:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#fef3c7;">
          <th style="padding:8px 12px;text-align:left;">Document</th>
          <th style="padding:8px 12px;text-align:left;">Details</th>
          <th style="padding:8px 12px;text-align:left;">Due Date</th>
        </tr></thead>
        <tbody>${docListHtml}</tbody>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${uploadPortalUrl}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">Upload Your Documents</a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;">This link expires in 14 days. If you need a new link, please contact HR.</p>` : '';

      let conversationId: string | undefined;

      if (channel === "whatsapp") {
        // Send onboarding pack via WhatsApp
        const candidatePhone = candidate.phone || (candidate.metadata as any)?.phone;
        if (!candidatePhone) {
          return res.status(400).json({ message: "Candidate has no phone number for WhatsApp delivery" });
        }
        const { WhatsAppService } = await import("./whatsapp-service");
        const whatsappService = new WhatsAppService();
        const conversation = await whatsappService.getOrCreateConversation(
          req.tenant.id, candidatePhone, candidatePhone,
          candidate.fullName, candidate.id.toString(), "onboarding"
        );
        conversationId = conversation.id;

        // Send each document as a WhatsApp file attachment
        for (const att of emailAttachments) {
          try {
            await whatsappService.sendDocumentMessage(
              req.tenant.id, conversation.id, candidatePhone,
              att.content, att.filename, att.contentType,
              att.filename, "ai"
            );
          } catch (docErr) {
            console.error(`[Onboarding] WhatsApp document send failed for ${att.filename}:`, docErr);
          }
        }

        // Send welcome text with upload portal link + required docs
        const docsNeeded = docRequests.map(r => {
          const dueDate = r.dueDate ? format(new Date(r.dueDate), 'dd MMM yyyy') : 'ASAP';
          return `- ${r.documentName} (Due: ${dueDate})`;
        }).join('\n');

        const welcomeText = `Welcome to the team, ${candidate.fullName}! 🎉\n\n` +
          (emailAttachments.length > 0 ? `We've sent you ${emailAttachments.length} onboarding document${emailAttachments.length > 1 ? 's' : ''} above. Please review them carefully.\n\n` : '') +
          (docRequests.length > 0 ? `As part of your onboarding, we need the following documents from you:\n\n${docsNeeded}\n\n📤 Upload your documents here:\n${uploadPortalUrl}\n\nThis link expires in 14 days.\n\n` : '') +
          `If you have any questions, please contact HR.`;

        await whatsappService.sendTextMessage(req.tenant.id, conversation.id, candidatePhone, welcomeText, "ai");
        console.log(`[Onboarding] Sent onboarding pack via WhatsApp for ${candidate.fullName} (${emailAttachments.length} documents, ${docRequests.length} document requests)`);
      } else {
        // Send single combined onboarding email
        await emailService.sendEmail({
          to: candidate.email || "no-email@placeholder.com",
          subject: `Welcome to the Team, ${candidate.fullName}! - Onboarding Information`,
          body: `Dear ${candidate.fullName},\n\nWelcome to the team! We're excited to have you join us.\n\n${emailAttachments.length > 0 ? `Please find attached your onboarding documents (${emailAttachments.length} file${emailAttachments.length > 1 ? 's' : ''}). Review them carefully.\n\n` : ''}${docRequests.length > 0 ? `As part of your onboarding, we need the following documents from you:\n\n${docListText}\n\nYou can upload your documents securely using this link:\n${uploadPortalUrl}\n\nThis link expires in 14 days.\n\n` : ''}Best regards,\nHR Team`,
          html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0d9488,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Welcome to the Team!</h1>
    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">${candidate.fullName} - ${candidate.role || 'New Team Member'}</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;color:#374151;">Dear ${candidate.fullName},</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">Welcome to the team! We're excited to have you join us. Below you'll find everything you need to get started.</p>
    ${attachedDocsHtml}
    ${requiredDocsHtml}
    <p style="font-size:14px;color:#6b7280;margin-top:20px;">Best regards,<br><strong>HR Team</strong></p>
  </div>
</div>`,
          attachments: emailAttachments,
        });
        console.log(`[Onboarding] Sent combined onboarding email for ${candidate.fullName} (${emailAttachments.length} attachments, ${docRequests.length} document requests, upload link included)`);
      }

      // Store sent documents in the workflow for tracking
      if (sentDocuments.length > 0) {
        const existingDocs = (workflow.documents as any[]) || [];
        await storage.updateOnboardingWorkflow(req.tenant.id, workflow.id, {
          documents: [...existingDocs, ...sentDocuments] as any,
        });
      }

      res.status(201).json({
        message: "Onboarding workflow started",
        workflow,
        conversationId,
      });
    } catch (error) {
      console.error("Error starting onboarding:", error);
      res.status(500).json({ message: "Failed to start onboarding workflow" });
    }
  });

  // HR-facing endpoint: regenerate or extend the candidate upload portal token
  app.post("/api/onboarding/workflows/:id/regenerate-upload-token", async (req, res) => {
    try {
      const workflow = await storage.getOnboardingWorkflow(req.tenant.id, req.params.id);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      const uploadToken = crypto.randomBytes(24).toString('hex');
      const uploadTokenExpiresAt = new Date();
      uploadTokenExpiresAt.setDate(uploadTokenExpiresAt.getDate() + 14);

      const updated = await storage.updateOnboardingWorkflow(req.tenant.id, req.params.id, {
        uploadToken,
        uploadTokenExpiresAt,
      } as any);

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      res.json({
        workflow: updated,
        uploadUrl: `${baseUrl}/onboarding-upload/${uploadToken}`,
        expiresAt: uploadTokenExpiresAt,
      });
    } catch (error) {
      console.error("Error regenerating upload token:", error);
      res.status(500).json({ message: "Failed to regenerate upload token" });
    }
  });

  // HR-facing endpoint: confirm provisioning sub-tasks from the dashboard
  app.post("/api/onboarding/workflows/:id/confirm-provisioning", async (req, res) => {
    try {
      const { type, confirmedBy } = req.body;
      if (!type || !["it", "buildingAccess", "equipment"].includes(type)) {
        return res.status(400).json({ message: "type must be 'it', 'buildingAccess', or 'equipment'" });
      }

      const workflow = await storage.getOnboardingWorkflow(req.tenant.id, req.params.id);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      const pd = (workflow.provisioningData as any) || {};
      const tasks = (workflow.tasks as any[]) || [];

      if (type === "it") {
        pd.itConfirmed = true;
        pd.itConfirmedAt = new Date().toISOString();
        pd.itConfirmedBy = confirmedBy || "HR Staff";
      } else if (type === "buildingAccess") {
        pd.buildingAccessConfirmed = true;
        pd.buildingAccessConfirmedAt = new Date().toISOString();
        pd.buildingAccessConfirmedBy = confirmedBy || "Facilities Staff";
      } else if (type === "equipment") {
        pd.equipmentConfirmed = true;
        pd.equipmentConfirmedAt = new Date().toISOString();
        pd.equipmentConfirmedBy = confirmedBy || "IT Staff";
      }

      // Check if all provisioning sub-tasks are confirmed
      const itDone = pd.itConfirmed === true;
      const buildingDone = pd.buildingAccessConfirmed === true;
      const equipmentDone = pd.equipmentConfirmed === true || !(pd.equipmentList?.length > 0);
      const allConfirmed = itDone && buildingDone && equipmentDone;

      if (allConfirmed) {
        const provTask = tasks.find((t: any) => t.type === "provisioning");
        if (provTask) provTask.status = "completed";
      }

      const allTasksDone = tasks.every((t: any) => t.status === "completed");

      await storage.updateOnboardingWorkflow(req.tenant.id, workflow.id, {
        provisioningData: pd as any,
        tasks: tasks as any,
        ...(allTasksDone ? { status: "Completed", completedAt: new Date() } : {}),
      });

      res.json({
        message: `${type} provisioning confirmed`,
        itConfirmed: pd.itConfirmed || false,
        buildingAccessConfirmed: pd.buildingAccessConfirmed || false,
        equipmentConfirmed: pd.equipmentConfirmed || false,
        allComplete: allConfirmed,
      });
    } catch (error) {
      console.error("Error confirming provisioning:", error);
      res.status(500).json({ message: "Failed to confirm provisioning" });
    }
  });

  // Token-based confirmation endpoint (for IT/facilities staff via email link)
  app.post("/api/onboarding/provisioning/confirm", async (req, res) => {
    try {
      const { token, confirmedBy, notes } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });

      const allWorkflows = await storage.getAllOnboardingWorkflows(req.tenant.id);
      const workflow = allWorkflows.find(w => {
        const pd = w.provisioningData as any;
        return pd?.itConfirmationToken === token || pd?.buildingAccessToken === token;
      });

      if (!workflow) return res.status(404).json({ message: "Invalid or expired token" });

      const pd = (workflow.provisioningData as any) || {};
      const tasks = (workflow.tasks as any[]) || [];
      const isITToken = pd.itConfirmationToken === token;
      const isBuildingToken = pd.buildingAccessToken === token;

      if (isITToken) {
        pd.itConfirmed = true;
        pd.itConfirmedAt = new Date().toISOString();
        pd.itConfirmedBy = confirmedBy || "IT Staff";
        if (notes) pd.itNotes = notes;
      }
      if (isBuildingToken) {
        pd.buildingAccessConfirmed = true;
        pd.buildingAccessConfirmedAt = new Date().toISOString();
        pd.buildingAccessConfirmedBy = confirmedBy || "Facilities Staff";
        if (notes) pd.buildingAccessNotes = notes;
      }

      const itDone = pd.itConfirmed === true;
      const buildingDone = pd.buildingAccessConfirmed === true;
      const equipmentDone = pd.equipmentConfirmed === true || !(pd.equipmentList?.length > 0);
      const allConfirmed = itDone && buildingDone && equipmentDone;
      if (allConfirmed) {
        const provTask = tasks.find((t: any) => t.type === "provisioning");
        if (provTask) provTask.status = "completed";
      }

      const allTasksDone = tasks.every((t: any) => t.status === "completed");

      await storage.updateOnboardingWorkflow(req.tenant.id, workflow.id, {
        provisioningData: pd as any,
        tasks: tasks as any,
        ...(allTasksDone ? { status: "Completed", completedAt: new Date() } : {}),
      });

      res.json({ message: "Provisioning confirmed", allComplete: allConfirmed });
    } catch (error) {
      console.error("Error confirming provisioning via token:", error);
      res.status(500).json({ message: "Failed to confirm provisioning" });
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
      const enriched = await Promise.all(workflows.map(async (workflow) => {
        const candidate = await storage.getCandidate(req.tenant.id, workflow.candidateId);
        return {
          ...workflow,
          candidateName: candidate?.fullName || "Unknown Candidate",
        };
      }));
      res.json(enriched);
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

  // ===== Onboarding Agent Routes =====
  
  app.get("/api/onboarding/agent-logs/:workflowId", async (req, res) => {
    try {
      const logs = await storage.getOnboardingAgentLogs(req.tenant.id, req.params.workflowId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching agent logs:", error);
      res.status(500).json({ message: "Failed to fetch agent logs" });
    }
  });

  app.get("/api/onboarding/human-intervention-queue", async (req, res) => {
    try {
      const logs = await storage.getOnboardingAgentLogsRequiringReview(req.tenant.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching intervention queue:", error);
      res.status(500).json({ message: "Failed to fetch intervention queue" });
    }
  });

  app.post("/api/onboarding/resolve-intervention/:logId", async (req, res) => {
    try {
      const { notes, reviewedBy } = req.body;
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      const updated = await agent.resolveHumanIntervention(
        req.tenant.id,
        req.params.logId,
        reviewedBy || "unknown",
        notes || ""
      );
      res.json(updated);
    } catch (error) {
      console.error("Error resolving intervention:", error);
      res.status(500).json({ message: "Failed to resolve intervention" });
    }
  });

  app.get("/api/onboarding/document-requests/:workflowId", async (req, res) => {
    try {
      const requests = await storage.getOnboardingDocumentRequests(req.tenant.id, req.params.workflowId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching document requests:", error);
      res.status(500).json({ message: "Failed to fetch document requests" });
    }
  });

  app.post("/api/onboarding/document-requests/:workflowId/initialize", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const workflow = await storage.getOnboardingWorkflow(req.tenant.id, req.params.workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      const requests = await agent.initializeDocumentRequests(
        req.tenant.id,
        req.params.workflowId,
        workflow.candidateId
      );
      
      res.status(201).json(requests);
    } catch (error) {
      console.error("Error initializing document requests:", error);
      res.status(500).json({ message: "Failed to initialize document requests" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/received", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const { documentId } = req.body;
      const updated = await agent.markDocumentReceived(req.tenant.id, req.params.requestId, documentId);
      
      if (!updated) {
        return res.status(404).json({ message: "Document request not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error marking document received:", error);
      res.status(500).json({ message: "Failed to mark document received" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/upload", upload.single("file"), async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get the document request to find candidateId and documentType
      const request = await storage.getOnboardingDocumentRequest(req.tenant.id, req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Document request not found" });
      }

      // Save file to disk
      const fileName = `onboarding_${request.candidateId}_${request.documentType}_${Date.now()}${path.extname(file.originalname)}`;
      const filePath = path.join("uploads/onboarding-documents", fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);

      // Create a document record (receivedDocumentId FK references the documents table)
      const doc = await storage.createDocument(req.tenant.id, {
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
      await storage.createCandidateDocument(req.tenant.id, {
        candidateId: request.candidateId,
        documentType: request.documentType || request.documentName,
        fileName: file.originalname,
        fileUrl: filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        collectedVia: "portal",
        status: "received",
      });

      // Mark the onboarding document request as received, linking the uploaded doc
      const updated = await agent.markDocumentReceived(req.tenant.id, req.params.requestId, doc.id);

      res.json({ documentRequest: updated, document: doc });
    } catch (error) {
      console.error("Error uploading onboarding document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/verified", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const { verifiedBy } = req.body;
      const updated = await agent.markDocumentVerified(req.tenant.id, req.params.requestId, verifiedBy || "HR Staff");
      
      if (!updated) {
        return res.status(404).json({ message: "Document request not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error verifying document:", error);
      res.status(500).json({ message: "Failed to verify document" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/rejected", async (req, res) => {
    try {
      const { reason, rejectedBy } = req.body;
      const request = await storage.getOnboardingDocumentRequest(req.tenant.id, req.params.requestId);
      if (!request) {
        return res.status(404).json({ message: "Document request not found" });
      }

      const updated = await storage.updateOnboardingDocumentRequest(req.tenant.id, req.params.requestId, {
        status: 'rejected',
        metadata: { ...(request.metadata as any || {}), rejectionReason: reason || "Document not acceptable", rejectedBy: rejectedBy || "HR Staff", rejectedAt: new Date().toISOString() },
      });

      // Log the rejection
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      await agent.logStep(req.tenant.id, request.workflowId, request.candidateId, 'document_collector', 'document_rejected', {
        stepName: 'documentation',
        status: 'requires_intervention',
        details: { documentType: request.documentType, documentName: request.documentName, reason },
        targetEntity: 'candidate',
        targetEntityId: request.candidateId,
        communicationChannel: 'system',
      });

      // Auto-send reminder so candidate knows to resubmit
      try {
        await agent.sendReminder(req.tenant.id, req.params.requestId, 'email');
      } catch (err) {
        console.error("Failed to send rejection reminder:", err);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error rejecting document:", error);
      res.status(500).json({ message: "Failed to reject document" });
    }
  });

  app.post("/api/onboarding/workflows/:workflowId/remind-all", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      const channel = req.body?.channel === "whatsapp" ? "whatsapp" : "email";

      const result = await agent.sendBulkReminder(req.tenant.id, req.params.workflowId, channel);
      res.json(result);
    } catch (error) {
      console.error("Error sending bulk reminder:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/remind", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      const channel = req.body?.channel === "whatsapp" ? "whatsapp" : "email";

      const result = await agent.sendReminder(req.tenant.id, req.params.requestId, channel);
      res.json(result);
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  app.post("/api/onboarding/process-reminders", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const remindersSent = await agent.processScheduledReminders(req.tenant.id);
      const overdueResult = await agent.processOverdueDocuments(req.tenant.id);
      
      res.json({ 
        remindersSent, 
        overdueProcessed: overdueResult.processed,
        escalated: overdueResult.escalated 
      });
    } catch (error) {
      console.error("Error processing reminders:", error);
      res.status(500).json({ message: "Failed to process reminders" });
    }
  });

  app.get("/api/onboarding/activity-summary/:workflowId", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const summary = await agent.getAgentActivitySummary(req.tenant.id, req.params.workflowId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching activity summary:", error);
      res.status(500).json({ message: "Failed to fetch activity summary" });
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

  // Placement Metrics (Finance Data)
  app.get("/api/placement-metrics", async (req, res) => {
    try {
      // Get placement metrics from the database or generate from candidates
      const candidates = await storage.getCandidates(req.tenant.id);
      const hiredCandidates = candidates.filter(c => c.stage === "Hired");
      
      // Generate monthly placement data
      const monthlyData: Record<string, { placements: number; revenue: number }> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      months.forEach(month => {
        monthlyData[month] = { placements: 0, revenue: 0 };
      });
      
      // Aggregate placements by month (use current month distribution or historical data)
      hiredCandidates.forEach((candidate, index) => {
        const monthIndex = index % 12;
        const month = months[monthIndex];
        monthlyData[month].placements += 1;
        // Estimate revenue per placement (average R25,000 placement fee)
        monthlyData[month].revenue += 25000 + Math.floor(Math.random() * 15000);
      });
      
      const result = months.map(month => ({
        month,
        placements: monthlyData[month].placements,
        revenue: monthlyData[month].revenue,
        avgRevenue: monthlyData[month].placements > 0 
          ? Math.round(monthlyData[month].revenue / monthlyData[month].placements)
          : 0
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching placement metrics:", error);
      // Return sample data if error
      res.json([
        { month: "Jan", placements: 5, revenue: 125000, avgRevenue: 25000 },
        { month: "Feb", placements: 7, revenue: 182000, avgRevenue: 26000 },
        { month: "Mar", placements: 4, revenue: 108000, avgRevenue: 27000 },
        { month: "Apr", placements: 6, revenue: 162000, avgRevenue: 27000 },
        { month: "May", placements: 8, revenue: 224000, avgRevenue: 28000 },
        { month: "Jun", placements: 5, revenue: 145000, avgRevenue: 29000 },
        { month: "Jul", placements: 9, revenue: 270000, avgRevenue: 30000 },
        { month: "Aug", placements: 6, revenue: 186000, avgRevenue: 31000 },
        { month: "Sep", placements: 7, revenue: 224000, avgRevenue: 32000 },
        { month: "Oct", placements: 5, revenue: 165000, avgRevenue: 33000 },
        { month: "Nov", placements: 8, revenue: 272000, avgRevenue: 34000 },
        { month: "Dec", placements: 4, revenue: 140000, avgRevenue: 35000 },
      ]);
    }
  });

  // Admin Payments endpoint for dashboard (sample data for visualization)
  app.get("/api/admin/payments", async (req, res) => {
    try {
      // Return sample payment data for finance charts
      const samplePayments = [
        { id: "1", status: "completed", paymentMethod: "card", amount: 15000, currency: "ZAR" },
        { id: "2", status: "completed", paymentMethod: "eft", amount: 25000, currency: "ZAR" },
        { id: "3", status: "pending", paymentMethod: "debit_order", amount: 18000, currency: "ZAR" },
        { id: "4", status: "completed", paymentMethod: "card", amount: 32000, currency: "ZAR" },
        { id: "5", status: "failed", paymentMethod: "eft", amount: 12000, currency: "ZAR" },
        { id: "6", status: "completed", paymentMethod: "card", amount: 45000, currency: "ZAR" },
        { id: "7", status: "completed", paymentMethod: "debit_order", amount: 28000, currency: "ZAR" },
        { id: "8", status: "pending", paymentMethod: "eft", amount: 22000, currency: "ZAR" },
      ];
      res.json(samplePayments);
    } catch (error) {
      console.error("Error fetching admin payments:", error);
      res.json([]);
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

  // ============= RECRUITMENT PLATFORM CONFIGURATION =============
  
  // Get recruitment platform configurations for a tenant
  app.get("/api/recruitment/platforms", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Get platform configurations from api_keys_configured
      const apiKeysConfigured = tenant.apiKeysConfigured || {};
      
      // Build platform response with connection status
      const platforms = [
        {
          id: "pnet",
          name: "PNet",
          description: "South Africa's leading job portal with millions of candidates",
          enabled: apiKeysConfigured.pnet?.enabled ?? false,
          connected: !!apiKeysConfigured.pnet?.apiKey,
          hasCredentials: !!apiKeysConfigured.pnet?.apiKey
        },
        {
          id: "indeed",
          name: "Indeed",
          description: "Global job search engine with extensive candidate database",
          enabled: apiKeysConfigured.indeed?.enabled ?? false,
          connected: !!apiKeysConfigured.indeed?.apiKey,
          hasCredentials: !!apiKeysConfigured.indeed?.apiKey
        },
        {
          id: "linkedin",
          name: "LinkedIn Recruiter",
          description: "Professional networking platform for sourcing qualified candidates",
          enabled: apiKeysConfigured.linkedin?.enabled ?? false,
          connected: !!apiKeysConfigured.linkedin?.apiKey,
          hasCredentials: !!apiKeysConfigured.linkedin?.apiKey
        },
        {
          id: "careers24",
          name: "Careers24",
          description: "Popular South African job board powered by Media24",
          enabled: apiKeysConfigured.careers24?.enabled ?? false,
          connected: !!apiKeysConfigured.careers24?.apiKey,
          hasCredentials: !!apiKeysConfigured.careers24?.apiKey
        },
        {
          id: "gumtree",
          name: "Gumtree Jobs",
          description: "Classifieds platform with job listings section",
          enabled: apiKeysConfigured.gumtree?.enabled ?? false,
          connected: !!apiKeysConfigured.gumtree?.apiKey,
          hasCredentials: !!apiKeysConfigured.gumtree?.apiKey
        }
      ];
      
      res.json(platforms);
    } catch (error) {
      console.error("Error fetching recruitment platforms:", error);
      res.status(500).json({ message: "Failed to fetch platforms" });
    }
  });
  
  // Update platform configuration (enable/disable or connect/disconnect)
  app.patch("/api/recruitment/platforms/:platformId", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const { platformId } = req.params;
      const { enabled, apiKey, username, password, disconnect } = req.body;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Get existing api_keys_configured
      const apiKeysConfigured = { ...(tenant.apiKeysConfigured || {}) };
      
      // Initialize platform config if not exists
      if (!apiKeysConfigured[platformId]) {
        apiKeysConfigured[platformId] = { enabled: false };
      }
      
      // Handle disconnect
      if (disconnect) {
        apiKeysConfigured[platformId] = { enabled: false };
      } else {
        // Update enabled status if provided
        if (typeof enabled === 'boolean') {
          apiKeysConfigured[platformId].enabled = enabled;
        }
        
        // Update credentials if provided
        if (apiKey) {
          apiKeysConfigured[platformId].apiKey = apiKey;
        }
        if (username) {
          apiKeysConfigured[platformId].username = username;
        }
        if (password) {
          apiKeysConfigured[platformId].password = password;
        }
      }
      
      // Save to database
      await storage.updateTenantApiKeys(tenantId, apiKeysConfigured);
      
      // If platform is enabled and connected, configure the agent
      if (apiKeysConfigured[platformId]?.enabled && apiKeysConfigured[platformId]?.apiKey) {
        console.log(`[Recruitment] Platform ${platformId} configured and enabled for tenant ${tenantId}`);
      }
      
      res.json({ 
        success: true,
        platform: {
          id: platformId,
          enabled: apiKeysConfigured[platformId]?.enabled ?? false,
          connected: !!apiKeysConfigured[platformId]?.apiKey
        }
      });
    } catch (error) {
      console.error("Error updating recruitment platform:", error);
      res.status(500).json({ message: "Failed to update platform" });
    }
  });
  
  // Connect a platform with credentials
  app.post("/api/recruitment/platforms/:platformId/connect", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const { platformId } = req.params;
      const { apiKey, username, password } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Get existing api_keys_configured
      const apiKeysConfigured = { ...(tenant.apiKeysConfigured || {}) };
      
      // Update platform credentials
      apiKeysConfigured[platformId] = {
        ...apiKeysConfigured[platformId],
        enabled: true,
        apiKey,
        username: username || undefined,
        password: password || undefined,
        connectedAt: new Date().toISOString()
      };
      
      // Save to database
      await storage.updateTenantApiKeys(tenantId, apiKeysConfigured);
      
      console.log(`[Recruitment] Platform ${platformId} connected for tenant ${tenantId}`);
      
      res.json({
        success: true,
        message: `${platformId} connected successfully`,
        platform: {
          id: platformId,
          enabled: true,
          connected: true
        }
      });
    } catch (error) {
      console.error("Error connecting recruitment platform:", error);
      res.status(500).json({ message: "Failed to connect platform" });
    }
  });

  // ========== INTEGRITY CONFIGURATION ENDPOINTS ==========
  
  // Get integrity check configurations for a tenant
  app.get("/api/integrity/checks", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const integrityConfig = (tenant.apiKeysConfigured as any)?.integrity || {};
      const checksConfig = integrityConfig.checks || {};
      
      const checks = [
        {
          id: "criminal",
          name: "Criminal Record Check",
          description: "Verify criminal history through official databases",
          enabled: checksConfig.criminal?.enabled ?? true,
          cost: "R150"
        },
        {
          id: "credit",
          name: "Credit Check",
          description: "Review credit history and financial standing",
          enabled: checksConfig.credit?.enabled ?? true,
          cost: "R75"
        },
        {
          id: "id-verification",
          name: "ID Verification",
          description: "Confirm identity using Home Affairs database",
          enabled: checksConfig["id-verification"]?.enabled ?? true,
          cost: "R50"
        },
        {
          id: "qualification",
          name: "Qualification Verification",
          description: "Verify educational qualifications and certificates",
          enabled: checksConfig.qualification?.enabled ?? false,
          cost: "R200"
        },
        {
          id: "employment",
          name: "Employment History",
          description: "Verify previous employment and references",
          enabled: checksConfig.employment?.enabled ?? false,
          cost: "R100"
        },
        {
          id: "social-screening",
          name: "Social Intelligence Screening",
          description: "AI-powered screening of LinkedIn, Facebook, X (Twitter), and Instagram profiles",
          enabled: checksConfig["social-screening"]?.enabled ?? true,
          cost: "R50"
        }
      ];
      
      res.json(checks);
    } catch (error) {
      console.error("Error fetching integrity checks:", error);
      res.status(500).json({ message: "Failed to fetch integrity checks" });
    }
  });
  
  // Update integrity check preferences
  app.patch("/api/integrity/checks", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const { checks } = req.body;
      if (!checks || !Array.isArray(checks)) {
        return res.status(400).json({ message: "Checks array is required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const apiKeysConfigured = { ...(tenant.apiKeysConfigured || {}) } as any;
      if (!apiKeysConfigured.integrity) {
        apiKeysConfigured.integrity = { checks: {}, providers: {} };
      }
      
      // Update each check's enabled status
      for (const check of checks) {
        apiKeysConfigured.integrity.checks[check.id] = {
          enabled: check.enabled
        };
      }
      
      await storage.updateTenantApiKeys(tenantId, apiKeysConfigured);
      
      res.json({ success: true, message: "Check preferences saved" });
    } catch (error) {
      console.error("Error updating integrity checks:", error);
      res.status(500).json({ message: "Failed to update integrity checks" });
    }
  });
  
  // Get integrity provider configurations
  app.get("/api/integrity/providers", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const integrityConfig = (tenant.apiKeysConfigured as any)?.integrity || {};
      const providersConfig = integrityConfig.providers || {};
      
      const providers = [
        {
          id: "mie",
          name: "MIE Background Screening",
          checks: ["criminal", "credit", "id-verification", "qualification", "employment"],
          connected: !!providersConfig.mie?.apiKey,
          hasCredentials: !!providersConfig.mie?.apiKey
        },
        {
          id: "lexisnexis",
          name: "LexisNexis Risk Solutions",
          checks: ["criminal", "id-verification"],
          connected: !!providersConfig.lexisnexis?.apiKey,
          hasCredentials: !!providersConfig.lexisnexis?.apiKey
        },
        {
          id: "transunion",
          name: "TransUnion",
          checks: ["credit"],
          connected: !!providersConfig.transunion?.apiKey,
          hasCredentials: !!providersConfig.transunion?.apiKey
        }
      ];
      
      res.json(providers);
    } catch (error) {
      console.error("Error fetching integrity providers:", error);
      res.status(500).json({ message: "Failed to fetch integrity providers" });
    }
  });
  
  // Connect an integrity provider
  app.post("/api/integrity/providers/:providerId/connect", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const { providerId } = req.params;
      const { apiKey, username, password } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const apiKeysConfigured = { ...(tenant.apiKeysConfigured || {}) } as any;
      if (!apiKeysConfigured.integrity) {
        apiKeysConfigured.integrity = { checks: {}, providers: {} };
      }
      
      apiKeysConfigured.integrity.providers[providerId] = {
        apiKey,
        username: username || undefined,
        password: password || undefined,
        connectedAt: new Date().toISOString()
      };
      
      await storage.updateTenantApiKeys(tenantId, apiKeysConfigured);
      
      console.log(`[Integrity] Provider ${providerId} connected for tenant ${tenantId}`);
      
      res.json({
        success: true,
        message: `${providerId} connected successfully`,
        provider: {
          id: providerId,
          connected: true
        }
      });
    } catch (error) {
      console.error("Error connecting integrity provider:", error);
      res.status(500).json({ message: "Failed to connect provider" });
    }
  });
  
  // Disconnect an integrity provider
  app.post("/api/integrity/providers/:providerId/disconnect", async (req, res) => {
    try {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }
      
      const { providerId } = req.params;
      
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const apiKeysConfigured = { ...(tenant.apiKeysConfigured || {}) } as any;
      if (apiKeysConfigured.integrity?.providers?.[providerId]) {
        delete apiKeysConfigured.integrity.providers[providerId];
      }
      
      await storage.updateTenantApiKeys(tenantId, apiKeysConfigured);
      
      console.log(`[Integrity] Provider ${providerId} disconnected for tenant ${tenantId}`);
      
      res.json({
        success: true,
        message: `${providerId} disconnected successfully`,
        provider: {
          id: providerId,
          connected: false
        }
      });
    } catch (error) {
      console.error("Error disconnecting integrity provider:", error);
      res.status(500).json({ message: "Failed to disconnect provider" });
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

      const systemPrompt = `You are an AI Workforce Intelligence Assistant for MTN - Human Capital. You help HR managers and executives understand their workforce data and make strategic decisions.

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
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const { data, total } = await storage.getDocumentsPaginated(req.tenant.id, page, limit);
      res.json({ data, total, page, limit });
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

          // Parse file to extract text based on type
          let rawText = "";
          if (file.mimetype === "application/pdf") {
            const parser = new PDFParse({ data: file.buffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
            await parser.destroy();
          } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                     file.originalname.toLowerCase().endsWith('.docx')) {
            // Handle Word documents (.docx)
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            rawText = result.value;
          } else if (file.mimetype === "application/msword" ||
                     file.originalname.toLowerCase().endsWith('.doc')) {
            // Older .doc format - try mammoth but may not work perfectly
            try {
              const result = await mammoth.extractRawText({ buffer: file.buffer });
              rawText = result.value;
            } catch (docError) {
              console.warn(`Could not parse .doc file ${file.originalname}, treating as text`);
              rawText = file.buffer.toString("utf-8");
            }
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
      
      // Filter for PDF and Word document files
      const cvEntries = zipEntries.filter(entry => {
        if (entry.isDirectory) return false;
        const name = entry.entryName.toLowerCase();
        if (name.startsWith('__macosx') || name.includes('/.')) return false;
        return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc');
      });

      if (cvEntries.length === 0) {
        return res.status(400).json({ message: "No CV files (PDF, DOCX, DOC) found in the ZIP archive" });
      }

      console.log(`Found ${cvEntries.length} CV files in ZIP`);

      // Create batch for this ZIP upload
      const batch = await storage.createDocumentBatch(req.tenant.id, {
        name: `ZIP Upload: ${file.originalname} - ${new Date().toLocaleDateString()}`,
        type: "cvs",
        status: "processing",
        totalDocuments: cvEntries.length,
        processedDocuments: 0,
        failedDocuments: 0,
      });

      const results: Array<{ filename: string; status: string; candidateId?: string; error?: string }> = [];

      // Process each CV from the ZIP
      for (const entry of cvEntries) {
        const cvFilename = entry.entryName.split('/').pop() || entry.entryName;
        const fileExt = cvFilename.toLowerCase().split('.').pop();
        
        try {
          console.log(`Processing: ${cvFilename}`);
          const fileBuffer = entry.getData();
          
          // Determine mime type based on extension
          let mimeType = "application/octet-stream";
          if (fileExt === "pdf") {
            mimeType = "application/pdf";
          } else if (fileExt === "docx") {
            mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          } else if (fileExt === "doc") {
            mimeType = "application/msword";
          }
          
          // Create document record
          const doc = await storage.createDocument(req.tenant.id, {
            batchId: batch.id,
            filename: `${Date.now()}-${cvFilename}`,
            originalFilename: cvFilename,
            mimeType,
            fileSize: fileBuffer.length,
            filePath: `/uploads/${batch.id}/${cvFilename}`,
            type: "cv",
            status: "processing",
          });

          // Extract text based on file type
          let rawText = "";
          if (fileExt === "pdf") {
            const parser = new PDFParse({ data: fileBuffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
            await parser.destroy();
          } else if (fileExt === "docx" || fileExt === "doc") {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            rawText = result.value;
          } else {
            rawText = fileBuffer.toString("utf-8");
          }
          
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

          // Extract profile photo (only for PDFs)
          let photoUrl: string | null = null;
          if (fileExt === "pdf") {
            try {
              photoUrl = await cvParser.extractProfilePhoto(fileBuffer, candidate.id);
              if (photoUrl) {
                await storage.updateCandidate(req.tenant.id, candidate.id, { photoUrl });
                console.log(`Photo extracted for ${cvFilename}`);
              }
            } catch (photoError) {
              console.warn(`Could not extract photo from ${cvFilename}:`, photoError);
            }
          }

          // Update document
          await storage.updateDocument(req.tenant.id, doc.id, {
            status: "processed",
            rawText,
            extractedData: { ...parsedData, photoUrl },
            linkedCandidateId: candidate.id,
          });

          results.push({ filename: cvFilename, status: "success", candidateId: candidate.id });
          console.log(`Successfully processed: ${cvFilename}`);
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
          console.error(`Error processing ${cvFilename}:`, fileError);
          results.push({ filename: cvFilename, status: "failed", error: errorMessage });
        }
      }

      // Update batch status
      const successCount = results.filter(r => r.status === "success").length;
      const failCount = results.filter(r => r.status === "failed").length;
      await storage.updateDocumentBatch(req.tenant.id, batch.id, {
        status: failCount === cvEntries.length ? "failed" : successCount === cvEntries.length ? "completed" : "partially_completed",
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

  // Upload ZIP file containing Job Specs - extracts and processes all PDFs
  app.post("/api/documents/upload/job-specs-zip", upload.single("file"), async (req, res) => {
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

      console.log(`Processing Job Specs ZIP file: ${file.originalname} (${file.size} bytes)`);

      // Extract ZIP contents
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();
      
      // Filter for PDF, DOC, DOCX, TXT files
      const docEntries = zipEntries.filter(entry => 
        !entry.isDirectory && 
        (entry.entryName.toLowerCase().endsWith('.pdf') ||
         entry.entryName.toLowerCase().endsWith('.doc') ||
         entry.entryName.toLowerCase().endsWith('.docx') ||
         entry.entryName.toLowerCase().endsWith('.txt')) &&
        !entry.entryName.startsWith('__MACOSX') &&
        !entry.entryName.includes('/.')
      );

      if (docEntries.length === 0) {
        return res.status(400).json({ message: "No supported documents (PDF, DOC, DOCX, TXT) found in the ZIP archive" });
      }

      console.log(`Found ${docEntries.length} documents in ZIP`);

      // Create batch for this ZIP upload
      const batch = await storage.createDocumentBatch(req.tenant.id, {
        name: `Job Specs ZIP: ${file.originalname} - ${new Date().toLocaleDateString()}`,
        type: "job_specs",
        status: "processing",
        totalDocuments: docEntries.length,
        processedDocuments: 0,
        failedDocuments: 0,
      });

      const results: Array<{ filename: string; status: string; jobId?: string; error?: string }> = [];

      // Import Groq for AI parsing
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      // Process each document from the ZIP
      for (const entry of docEntries) {
        const docFilename = entry.entryName.split('/').pop() || entry.entryName;
        
        try {
          console.log(`Processing job spec: ${docFilename}`);
          const docBuffer = entry.getData();
          
          // Create document record
          const doc = await storage.createDocument(req.tenant.id, {
            batchId: batch.id,
            filename: `${Date.now()}-${docFilename}`,
            originalFilename: docFilename,
            mimeType: docFilename.endsWith('.pdf') ? "application/pdf" : "text/plain",
            fileSize: docBuffer.length,
            filePath: `/uploads/${batch.id}/${docFilename}`,
            type: "job_spec",
            status: "processing",
          });

          // Extract text from document
          let rawText = "";
          if (docFilename.toLowerCase().endsWith('.pdf')) {
            const parser = new PDFParse({ data: docBuffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
            await parser.destroy();
          } else {
            rawText = docBuffer.toString("utf-8");
          }
          
          // Sanitize text for PostgreSQL
          rawText = rawText.replace(/\x00/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          // Use Groq to extract job details
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
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            jobData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch {
            jobData = {};
          }

          // Create job from extracted data
          const job = await storage.createJob(req.tenant.id, {
            title: (jobData.title as string) || docFilename.replace(/\.(pdf|doc|docx|txt)$/i, ""),
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

          results.push({ filename: docFilename, status: "success", jobId: job.id });
          console.log(`Successfully processed job spec: ${docFilename}`);
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
          console.error(`Error processing ${docFilename}:`, fileError);
          results.push({ filename: docFilename, status: "failed", error: errorMessage });
        }
      }

      // Update batch status
      const successCount = results.filter(r => r.status === "success").length;
      const failCount = results.filter(r => r.status === "failed").length;
      await storage.updateDocumentBatch(req.tenant.id, batch.id, {
        status: failCount === docEntries.length ? "failed" : successCount === docEntries.length ? "completed" : "partially_completed",
        processedDocuments: successCount,
        failedDocuments: failCount,
      });

      res.status(201).json({
        batchId: batch.id,
        zipFilename: file.originalname,
        totalDocsFound: docEntries.length,
        processed: successCount,
        failed: failCount,
        results,
      });
    } catch (error) {
      console.error("Error processing Job Specs ZIP file:", error);
      res.status(500).json({ message: "Failed to process ZIP file" });
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

  // ==================== WHATSAPP API ROUTES ====================
  
  // Import WhatsApp service
  const { whatsappService } = await import("./whatsapp-service");

  // Get all WhatsApp conversations
  app.get("/api/whatsapp/conversations", async (req, res) => {
    try {
      const { type, status } = req.query;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      let conversations = await storage.getAllWhatsappConversations(req.tenant.id);

      if (type && typeof type === "string") {
        conversations = conversations.filter(c => c.type === type);
      }
      if (status && typeof status === "string") {
        conversations = conversations.filter(c => c.status === status);
      }

      // Paginate after filtering
      const total = conversations.length;
      const data = conversations.slice((page - 1) * limit, page * limit);

      res.json({ data, total, page, limit });
    } catch (error) {
      console.error("Error fetching WhatsApp conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/whatsapp/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getWhatsappMessages(req.tenant.id, req.params.id);
      const documentRequests = await storage.getWhatsappDocumentRequests(req.tenant.id, req.params.id);
      const appointments = await storage.getWhatsappAppointments(req.tenant.id, req.params.id);
      
      // Get linked candidate if any
      let candidate = null;
      if (conversation.candidateId) {
        candidate = await storage.getCandidate(req.tenant.id, conversation.candidateId);
      }
      
      res.json({
        conversation,
        messages,
        documentRequests,
        appointments,
        candidate,
      });
    } catch (error) {
      console.error("Error fetching WhatsApp conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/whatsapp/conversations", async (req, res) => {
    try {
      const { phone, candidateId, type, subject } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Format phone for WhatsApp (remove non-digits, ensure country code)
      const waId = phone.replace(/\D/g, "");
      
      // Check if conversation already exists
      let conversation = await storage.getWhatsappConversationByWaId(req.tenant.id, waId);
      
      if (!conversation) {
        conversation = await storage.createWhatsappConversation(req.tenant.id, {
          waId,
          phone,
          candidateId,
          type: type || "general",
          subject,
          status: "active",
        });
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating WhatsApp conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get or create conversation for a candidate
  app.post("/api/whatsapp/candidates/:candidateId/conversation", async (req, res) => {
    try {
      const { candidateId } = req.params;
      
      // Get the candidate to get their phone number
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      if (!candidate.phone) {
        return res.status(400).json({ message: "Candidate does not have a phone number" });
      }
      
      // Check if a conversation already exists for this candidate
      const existingConversations = await storage.getWhatsappConversationsByCandidateId(req.tenant.id, candidateId);
      
      if (existingConversations.length > 0) {
        // Return the most recent conversation
        return res.json(existingConversations[0]);
      }
      
      // Create a new conversation for the candidate
      const waId = candidate.phone.replace(/\D/g, "");
      const conversation = await storage.createWhatsappConversation(req.tenant.id, {
        waId,
        phone: candidate.phone,
        profileName: candidate.fullName,
        candidateId,
        type: "recruitment",
        status: "active",
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error getting/creating WhatsApp conversation for candidate:", error);
      res.status(500).json({ message: "Failed to get or create conversation" });
    }
  });

  // Update conversation (assign, change status, etc.)
  app.patch("/api/whatsapp/conversations/:id", async (req, res) => {
    try {
      const { status, assignedTo, priority, type } = req.body;
      
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (priority) updates.priority = priority;
      if (type) updates.type = type;
      
      const conversation = await storage.updateWhatsappConversation(req.tenant.id, req.params.id, updates);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error updating WhatsApp conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // Send message
  app.post("/api/whatsapp/conversations/:id/messages", async (req, res) => {
    try {
      const { body, senderType } = req.body;
      
      if (!body) {
        return res.status(400).json({ message: "Message body is required" });
      }
      
      const conversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const message = await whatsappService.sendTextMessage(
        req.tenant.id,
        req.params.id,
        conversation.phone,
        body,
        senderType || "human"
      );

      // Message is always stored locally, even if WhatsApp API fails
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark conversation as read
  app.post("/api/whatsapp/conversations/:id/mark-read", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const conversation = await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
        unreadCount: 0,
        lastReadAt: new Date(),
        lastReadBy: userId,
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // HR takeover - switch from AI to human control
  app.post("/api/whatsapp/conversations/:id/takeover", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const conversation = await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
        handoffMode: "human",
        handoffAt: new Date(),
        handoffBy: userId,
        assignedTo: userId,
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json({ success: true, conversation });
    } catch (error) {
      console.error("Error taking over conversation:", error);
      res.status(500).json({ message: "Failed to take over conversation" });
    }
  });

  // Release handoff - give control back to AI
  app.post("/api/whatsapp/conversations/:id/release", async (req, res) => {
    try {
      const conversation = await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
        handoffMode: "ai",
        handoffAt: null,
        handoffBy: null,
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json({ success: true, conversation });
    } catch (error) {
      console.error("Error releasing conversation:", error);
      res.status(500).json({ message: "Failed to release conversation" });
    }
  });

  // Get conversations by candidate ID
  app.get("/api/whatsapp/candidates/:candidateId/conversations", async (req, res) => {
    try {
      const conversations = await storage.getWhatsappConversationsByCandidateId(
        req.tenant.id, 
        req.params.candidateId
      );
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching candidate conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for a conversation
  app.get("/api/whatsapp/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getWhatsappMessages(
        req.tenant.id, 
        req.params.id
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Request document via WhatsApp
  app.post("/api/whatsapp/conversations/:id/document-request", async (req, res) => {
    try {
      const { documentType, documentName, description, dueDate } = req.body;
      
      if (!documentType || !documentName) {
        return res.status(400).json({ message: "Document type and name are required" });
      }
      
      const conversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const result = await whatsappService.sendDocumentRequest(
        req.tenant.id,
        req.params.id,
        conversation.phone,
        documentType,
        documentName,
        description,
        dueDate ? new Date(dueDate) : undefined
      );
      
      // Update conversation type if needed
      if (conversation.type === "general") {
        await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
          type: "document_request",
        });
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error sending document request:", error);
      res.status(500).json({ message: "Failed to send document request" });
    }
  });

  // Schedule appointment via WhatsApp
  app.post("/api/whatsapp/conversations/:id/appointment", async (req, res) => {
    try {
      const { appointmentType, title, scheduledAt, duration, location, description } = req.body;
      
      if (!appointmentType || !title || !scheduledAt) {
        return res.status(400).json({ message: "Appointment type, title, and scheduled time are required" });
      }
      
      const conversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const result = await whatsappService.sendAppointmentRequest(
        req.tenant.id,
        req.params.id,
        conversation.phone,
        appointmentType,
        title,
        new Date(scheduledAt),
        duration || 60,
        location,
        description
      );
      
      // Update conversation type if needed
      if (conversation.type === "general") {
        await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
          type: "appointment",
        });
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      res.status(500).json({ message: "Failed to schedule appointment" });
    }
  });

  // Update document request status
  app.patch("/api/whatsapp/document-requests/:id", async (req, res) => {
    try {
      const { status, notes } = req.body;
      
      const request = await storage.updateWhatsappDocumentRequest(req.tenant.id, req.params.id, {
        status,
        notes,
        ...(status === "received" ? { receivedAt: new Date() } : {}),
      });
      
      if (!request) {
        return res.status(404).json({ message: "Document request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error updating document request:", error);
      res.status(500).json({ message: "Failed to update document request" });
    }
  });

  // Update appointment status
  app.patch("/api/whatsapp/appointments/:id", async (req, res) => {
    try {
      const { status, candidateResponse, notes, scheduledAt } = req.body;
      
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (candidateResponse) updates.candidateResponse = candidateResponse;
      if (notes) updates.notes = notes;
      if (scheduledAt) updates.scheduledAt = new Date(scheduledAt);
      if (status === "confirmed") updates.confirmedAt = new Date();
      
      const appointment = await storage.updateWhatsappAppointment(req.tenant.id, req.params.id, updates);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Get call link for WhatsApp
  app.get("/api/whatsapp/conversations/:id/call-link", async (req, res) => {
    try {
      const conversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const callLink = whatsappService.generateCallLink(conversation.phone);
      
      res.json({ callLink, phone: conversation.phone });
    } catch (error) {
      console.error("Error generating call link:", error);
      res.status(500).json({ message: "Failed to generate call link" });
    }
  });

  // WhatsApp status check
  app.get("/api/whatsapp/status", async (_req, res) => {
    try {
      res.json({
        configured: whatsappService.isConfigured(),
        features: {
          messaging: whatsappService.isConfigured(),
          documentRequests: whatsappService.isConfigured(),
          appointments: whatsappService.isConfigured(),
          calling: true, // Always available via wa.me links
        },
      });
    } catch (error) {
      console.error("Error checking WhatsApp status:", error);
      res.status(500).json({ message: "Failed to check WhatsApp status" });
    }
  });

  // WhatsApp webhook for incoming messages (will need verification from Meta)
  app.get("/api/webhooks/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  });

  app.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const body = req.body;
      
      if (body.object !== "whatsapp_business_account") {
        return res.sendStatus(404);
      }
      
      // Get default tenant for webhook processing (in production, map by phone number)
      const tenants = await storage.getAllTenantConfigs();
      const tenantId = tenants[0]?.id || "default";
      
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "messages") continue;
          
          const value = change.value;
          
          // Process incoming messages
          for (const message of value.messages || []) {
            const contact = value.contacts?.find((c: any) => c.wa_id === message.from);
            
            await whatsappService.processIncomingMessage(
              tenantId,
              message.from,
              message.from,
              contact?.profile?.name,
              message
            );
          }
          
          // Process status updates
          for (const status of value.statuses || []) {
            await whatsappService.updateMessageStatus(
              tenantId,
              status.id,
              status.status,
              status.timestamp ? new Date(parseInt(status.timestamp) * 1000) : undefined
            );
          }
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.sendStatus(500);
    }
  });

  // Get all document requests (dashboard view)
  app.get("/api/whatsapp/document-requests", async (req, res) => {
    try {
      const requests = await storage.getWhatsappDocumentRequests(req.tenant.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching document requests:", error);
      res.status(500).json({ message: "Failed to fetch document requests" });
    }
  });

  // Get all appointments (dashboard view)
  app.get("/api/whatsapp/appointments", async (req, res) => {
    try {
      const appointments = await storage.getWhatsappAppointments(req.tenant.id);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Link conversation to candidate
  app.post("/api/whatsapp/conversations/:id/link-candidate", async (req, res) => {
    try {
      const { candidateId } = req.body;
      
      if (!candidateId) {
        return res.status(400).json({ message: "Candidate ID is required" });
      }
      
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // First get existing conversation to preserve profile name
      const existingConversation = await storage.getWhatsappConversation(req.tenant.id, req.params.id);
      if (!existingConversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const conversation = await storage.updateWhatsappConversation(req.tenant.id, req.params.id, {
        candidateId,
        profileName: existingConversation.profileName || candidate.fullName,
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error linking conversation to candidate:", error);
      res.status(500).json({ message: "Failed to link conversation" });
    }
  });

  // ==================== AI INTERVIEW SYSTEM ====================

  // Get all interview sessions
  app.get("/api/interviews", async (req, res) => {
    try {
      const sessions = await interviewOrchestrator.getAllSessions(req.tenant.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  // Get interview session by ID
  app.get("/api/interviews/:id", async (req, res) => {
    try {
      const stage = req.query.stage as 'voice' | 'video' | undefined;
      const details = await interviewOrchestrator.getInterviewDetails(req.tenant.id, req.params.id, stage);
      if (!details) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(details);
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
    }
  });

  // Add video stage to an existing interview session
  app.post("/api/interviews/:id/add-video-stage", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      const session = await interviewOrchestrator.addVideoStage(
        req.tenant.id,
        req.params.id,
        prompt
      );
      if (!session) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const videoInterviewUrl = `${req.protocol}://${req.get('host')}/interview/invite/${session.videoToken}`;
      res.json({ ...session, videoInterviewUrl });
    } catch (error) {
      console.error("Error adding video stage:", error);
      res.status(500).json({ message: "Failed to add video stage" });
    }
  });

  // Mark face-to-face stage as complete on an existing interview session
  app.post("/api/interviews/:id/complete-f2f", async (req, res) => {
    try {
      const session = await storage.getInterviewSession(req.tenant.id, req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const updated = await storage.updateInterviewSession(req.tenant.id, req.params.id, {
        f2fStatus: 'completed',
        f2fCompletedAt: new Date(),
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error completing f2f stage:", error);
      res.status(500).json({ message: "Failed to complete f2f stage" });
    }
  });

  // Schedule a face-to-face interview on an existing interview session
  app.post("/api/interviews/:id/schedule-f2f", async (req, res) => {
    try {
      const session = await storage.getInterviewSession(req.tenant.id, req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const { date, time, location, interviewer, notes } = req.body;
      const updated = await storage.updateInterviewSession(req.tenant.id, req.params.id, {
        f2fStatus: 'scheduled',
        f2fScheduledDate: date,
        f2fScheduledTime: time,
        f2fLocation: location,
        f2fInterviewer: interviewer,
        f2fNotes: notes || null,
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error scheduling f2f:", error);
      res.status(500).json({ message: "Failed to schedule f2f interview" });
    }
  });

  // Mark offer as initiated on an existing interview session
  app.post("/api/interviews/:id/initiate-offer", async (req, res) => {
    try {
      const session = await storage.getInterviewSession(req.tenant.id, req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Interview not found" });
      }
      const updated = await storage.updateInterviewSession(req.tenant.id, req.params.id, {
        offerStatus: 'initiated',
      } as any);
      res.json(updated);
    } catch (error) {
      console.error("Error initiating offer:", error);
      res.status(500).json({ message: "Failed to initiate offer" });
    }
  });

  // Get interviews by candidate
  app.get("/api/candidates/:candidateId/interviews", async (req, res) => {
    try {
      const sessions = await interviewOrchestrator.getSessionsByCandidate(req.tenant.id, req.params.candidateId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching candidate interviews:", error);
      res.status(500).json({ message: "Failed to fetch interviews" });
    }
  });

  // Validation schemas for interview API
  const createInterviewRequestSchema = z.object({
    candidateId: z.string().min(1, "Candidate ID is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    interviewType: z.enum(['voice', 'video']).optional().default('voice'),
    customPrompt: z.string().optional(),
  });

  const completeInterviewRequestSchema = z.object({
    transcripts: z.array(z.object({
      role: z.enum(['candidate', 'ai', 'interviewer']),
      text: z.string(),
      timestamp: z.number().optional(),
      emotion: z.string().optional(),
      emotionScores: z.record(z.string(), z.number()).optional(),
    })),
    emotionAnalysis: z.record(z.string(), z.any()).optional(),
    recordingUrl: z.string().url().optional(),
    duration: z.number().int().positive().optional(),
    stage: z.enum(['voice', 'video']).optional().default('voice'),
  });

  const updateDecisionRequestSchema = z.object({
    feedbackId: z.string().min(1, "Feedback ID is required"),
    decision: z.enum(['accepted', 'rejected', 'pipeline']),
    notes: z.string().optional(),
  });

  // Create new interview session
  app.post("/api/interviews", async (req, res) => {
    try {
      const parsed = createInterviewRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const { candidateId, jobTitle, interviewType, customPrompt } = parsed.data;

      const session = await interviewOrchestrator.createInterviewSession(
        req.tenant.id,
        candidateId,
        jobTitle,
        interviewType,
        customPrompt
      );
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  // Start interview session
  app.post("/api/interviews/:id/start", async (req, res) => {
    try {
      const session = await interviewOrchestrator.startInterview(req.tenant.id, req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ message: "Failed to start interview" });
    }
  });

  // Complete interview with transcripts and analysis
  app.post("/api/interviews/:id/complete", async (req, res) => {
    try {
      const parsed = completeInterviewRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }

      const { transcripts, emotionAnalysis, recordingUrl, duration, stage } = parsed.data;

      const result = await interviewOrchestrator.completeInterview(
        req.tenant.id,
        req.params.id,
        transcripts,
        emotionAnalysis,
        recordingUrl,
        duration,
        stage
      );
      
      if (!result) {
        return res.status(404).json({ message: "Interview not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error completing interview:", error);
      res.status(500).json({ message: "Failed to complete interview" });
    }
  });

  // Fetch Hume EVI chat audio recording and save it
  app.post("/api/interviews/:id/fetch-hume-audio", async (req, res) => {
    try {
      const { chatId } = req.body;
      if (!chatId) {
        return res.status(400).json({ message: "chatId is required" });
      }

      const HUMAI_API_KEY = process.env.HUMAI_API_KEY;
      const HUMAI_SECRET_KEY = process.env.HUMAI_SECRET_KEY;
      if (!HUMAI_API_KEY || !HUMAI_SECRET_KEY) {
        return res.status(500).json({ message: "Hume AI credentials not configured" });
      }

      // Get access token
      const accessToken = await getHumeAccessToken(HUMAI_API_KEY, HUMAI_SECRET_KEY);

      // Fetch audio metadata with signed URL
      const audioRes = await fetch(`https://api.hume.ai/v0/evi/chats/${chatId}/audio`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Hume-Api-Key": HUMAI_API_KEY },
      });

      if (!audioRes.ok) {
        const errText = await audioRes.text();
        return res.status(audioRes.status).json({ message: `Hume audio fetch failed: ${errText}` });
      }

      const audioData = await audioRes.json() as { signed_audio_url?: string; status?: string };
      if (!audioData.signed_audio_url) {
        return res.status(404).json({ message: "Audio not yet available", status: audioData.status });
      }

      // Save as a recording entry pointing to the signed URL
      const session = await storage.getInterviewSession(req.tenant.id, req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Interview session not found" });
      }

      const recording = await storage.createInterviewRecording(req.tenant.id, {
        sessionId: req.params.id,
        candidateId: session.candidateId || undefined,
        recordingType: "audio",
        mediaUrl: audioData.signed_audio_url,
        duration: session.duration || undefined,
        storageProvider: "hume",
      });

      res.json({ recording, signedUrl: audioData.signed_audio_url });
    } catch (error) {
      console.error("Error fetching Hume audio:", error);
      res.status(500).json({ message: "Failed to fetch Hume audio recording" });
    }
  });

  // Update interview decision (HR override)
  app.patch("/api/interviews/:id/decision", async (req, res) => {
    try {
      const parsed = updateDecisionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: fromZodError(parsed.error).message });
      }
      
      const { feedbackId, decision, notes } = parsed.data;

      const feedback = await interviewOrchestrator.updateDecision(
        req.tenant.id,
        feedbackId,
        decision,
        "system", // TODO: Use actual user ID
        notes
      );
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json(feedback);
    } catch (error) {
      console.error("Error updating decision:", error);
      res.status(500).json({ message: "Failed to update decision" });
    }
  });

  // Get interview feedback for a session
  app.get("/api/interviews/:id/feedback", async (req, res) => {
    try {
      const feedback = await storage.getInterviewFeedback(req.tenant.id, req.params.id);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get interview recordings
  app.get("/api/interviews/:id/recordings", async (req, res) => {
    try {
      const stage = req.query.stage as string | undefined;
      const recordings = await storage.getInterviewRecordings(req.tenant.id, req.params.id, stage);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  // Get interview transcripts
  app.get("/api/interviews/:id/transcripts", async (req, res) => {
    try {
      const stage = req.query.stage as string | undefined;
      const transcripts = await storage.getInterviewTranscripts(req.tenant.id, req.params.id, stage);
      res.json(transcripts);
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      res.status(500).json({ message: "Failed to fetch transcripts" });
    }
  });

  // Get candidate recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const { candidateId } = req.query;
      const recommendations = await interviewOrchestrator.getRecommendations(
        req.tenant.id,
        candidateId as string | undefined
      );
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Generate recommendations for a candidate
  app.post("/api/candidates/:candidateId/recommendations", async (req, res) => {
    try {
      await interviewOrchestrator.generateRecommendations(req.tenant.id, req.params.candidateId);
      const recommendations = await interviewOrchestrator.getRecommendations(req.tenant.id, req.params.candidateId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Interview system status
  app.get("/api/interviews/status/check", async (_req, res) => {
    try {
      const status = interviewOrchestrator.getStatus();
      res.json({
        configured: interviewOrchestrator.isConfigured(),
        services: status,
      });
    } catch (error) {
      console.error("Error checking interview status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  // ==================== ViTT TIMELINE TAGS & TRANSCRIPT ANALYSIS ====================

  // Get timeline tags for a session
  app.get("/api/interviews/:sessionId/timeline-tags", async (req, res) => {
    try {
      const { tagType } = req.query;
      let tags;
      if (tagType) {
        tags = await storage.getTimelineTagsByType(req.tenant.id, req.params.sessionId, tagType as string);
      } else {
        tags = await storage.getTimelineTags(req.tenant.id, req.params.sessionId);
      }
      res.json(tags);
    } catch (error) {
      console.error("Error fetching timeline tags:", error);
      res.status(500).json({ message: "Failed to fetch timeline tags" });
    }
  });

  // Create a manual timeline tag
  app.post("/api/interviews/:sessionId/timeline-tags", async (req, res) => {
    try {
      const { tagTime, ...rest } = req.body;
      const tag = await storage.createTimelineTag(req.tenant.id, {
        ...rest,
        tagTime: tagTime ? new Date(tagTime) : new Date(),
        sessionId: req.params.sessionId,
        tagSource: "manual",
        createdBy: req.user?.id,
      });
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating timeline tag:", error);
      res.status(500).json({ message: "Failed to create timeline tag" });
    }
  });

  // Update a timeline tag
  app.patch("/api/interviews/:sessionId/timeline-tags/:tagId", async (req, res) => {
    try {
      const tag = await storage.updateTimelineTag(req.tenant.id, req.params.tagId, req.body);
      if (!tag) return res.status(404).json({ message: "Tag not found" });
      res.json(tag);
    } catch (error) {
      console.error("Error updating timeline tag:", error);
      res.status(500).json({ message: "Failed to update timeline tag" });
    }
  });

  // Delete a timeline tag
  app.delete("/api/interviews/:sessionId/timeline-tags/:tagId", async (req, res) => {
    try {
      await storage.deleteTimelineTag(req.tenant.id, req.params.tagId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting timeline tag:", error);
      res.status(500).json({ message: "Failed to delete timeline tag" });
    }
  });

  // Get transcript jobs for a session
  app.get("/api/interviews/:sessionId/transcript-jobs", async (req, res) => {
    try {
      const jobs = await storage.getTranscriptJobs(req.tenant.id, req.params.sessionId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching transcript jobs:", error);
      res.status(500).json({ message: "Failed to fetch transcript jobs" });
    }
  });

  // Submit a transcript job for a specific provider
  app.post("/api/interviews/:sessionId/transcript-jobs", async (req, res) => {
    try {
      const { provider, audioUrl, config } = req.body;

      if (!provider || !audioUrl) {
        return res.status(400).json({ message: "Provider and audioUrl are required" });
      }

      if (!transcriptProviderManager.isProviderAvailable(provider)) {
        return res.status(400).json({ message: `Provider ${provider} is not configured` });
      }

      const job = await storage.createTranscriptJob(req.tenant.id, {
        sessionId: req.params.sessionId,
        provider,
        status: "pending",
        submittedAt: new Date(),
        ...config,
      });

      // Run transcription async
      transcriptProviderManager
        .transcribeWithProvider(req.tenant.id, job.id, audioUrl, provider, config || {})
        .then(async (result) => {
          await transcriptProviderManager.generateTimelineTags(
            req.tenant.id,
            req.params.sessionId,
            result,
            job.recordingId || undefined
          );
        })
        .catch((err) => console.error(`[TranscriptJob] Error: ${err.message}`));

      res.status(202).json(job);
    } catch (error) {
      console.error("Error submitting transcript job:", error);
      res.status(500).json({ message: "Failed to submit transcript job" });
    }
  });

  // Submit transcript jobs for ALL configured providers
  app.post("/api/interviews/:sessionId/transcript-jobs/all", async (req, res) => {
    try {
      const { audioUrl, config } = req.body;
      if (!audioUrl) return res.status(400).json({ message: "audioUrl is required" });

      const results = await transcriptProviderManager.transcribeWithAllProviders(
        req.tenant.id,
        req.params.sessionId,
        audioUrl,
        config || {}
      );

      res.json(results);
    } catch (error) {
      console.error("Error submitting all transcript jobs:", error);
      res.status(500).json({ message: "Failed to submit transcript jobs" });
    }
  });

  // Get recording sources for a session
  app.get("/api/interviews/:sessionId/recording-sources", async (req, res) => {
    try {
      const sources = await storage.getRecordingSources(req.tenant.id, req.params.sessionId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching recording sources:", error);
      res.status(500).json({ message: "Failed to fetch recording sources" });
    }
  });

  // Create recording source (browser, Zoom, Skype, upload)
  app.post("/api/interviews/:sessionId/recording-sources", async (req, res) => {
    try {
      const source = await storage.createRecordingSource(req.tenant.id, {
        ...req.body,
        sessionId: req.params.sessionId,
      });
      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating recording source:", error);
      res.status(500).json({ message: "Failed to create recording source" });
    }
  });

  // Upload interview recording to Object Storage
  app.post("/api/interviews/:sessionId/upload-recording", uploadLarge.single("recording"), async (req, res) => {
    try {
      const { sessionId } = req.params;
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No recording file provided" });

      const tenantId = req.tenant.id;
      const timestamp = Date.now();
      const ext = file.originalname.split(".").pop() || "webm";
      const recordingType = file.mimetype.startsWith("video/") ? "video" : "audio";
      const filename = `${timestamp}_${recordingType}.${ext}`;

      const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, file.buffer, file.mimetype);
      const mediaUrl = `/api/recordings/${key}`;

      const recording = await storage.createInterviewRecording(tenantId, {
        sessionId,
        candidateId: req.body.candidateId || null,
        recordingType: recordingType as "video" | "audio",
        mediaUrl,
        storageProvider: "local",
        fileSize: size,
        mimeType: file.mimetype,
        duration: req.body.duration ? parseInt(req.body.duration) : null,
        metadata: { objectStorageKey: key },
      });

      const sourceType = req.body.sourceType || "browser_mediarecorder";
      await storage.createRecordingSource(tenantId, {
        sessionId,
        recordingId: recording.id,
        sourceType,
        status: "completed",
        isAudioOnly: recordingType === "audio",
        hasVideo: recordingType === "video",
      });

      // Fire-and-forget: auto-trigger transcript providers
      try {
        const absoluteUrl = `${req.protocol}://${req.get("host")}${mediaUrl}`;
        transcriptProviderManager.transcribeWithAllProviders(
          tenantId, sessionId, absoluteUrl, {}
        ).catch((err: any) => console.error("Auto-transcription failed:", err));
      } catch {}

      res.status(201).json(recording);
    } catch (error) {
      console.error("Error uploading recording:", error);
      res.status(500).json({ message: "Failed to upload recording" });
    }
  });

  // Stream proxy for recordings from Object Storage
  app.get("/api/recordings/*", async (req, res) => {
    try {
      // Extract key: everything after /api/recordings/
      const key = req.params[0] || req.path.replace("/api/recordings/", "");
      if (!key) return res.status(400).json({ message: "Missing recording key" });

      const buffer = await recordingStorage.downloadRecording(key);

      // Determine content type from extension
      const ext = key.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        webm: "audio/webm",
        mp4: "video/mp4",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
      };
      const contentType = mimeMap[ext || ""] || "application/octet-stream";

      // Support HTTP Range requests for seeking
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        });
        res.end(buffer.subarray(start, end + 1));
      } else {
        res.writeHead(200, {
          "Content-Length": buffer.length,
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        });
        res.end(buffer);
      }
    } catch (error: any) {
      console.error("Error streaming recording:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ message: "Recording not found" });
      } else {
        res.status(500).json({ message: "Failed to stream recording" });
      }
    }
  });

  // Fetch Tavus recording, transcript, and trigger AI scoring
  app.post("/api/interviews/:sessionId/fetch-tavus-recording", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { conversationId, candidateId } = req.body;
      if (!conversationId) return res.status(400).json({ message: "conversationId is required" });

      const tenantId = req.tenant.id;
      const tavusApiKey = process.env.TAVUS_API_KEY;
      if (!tavusApiKey) return res.status(500).json({ message: "Tavus API key not configured" });

      // Fetch conversation details from Tavus (verbose=true required for transcript)
      const tavusRes = await axios.get(`https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`, {
        headers: { "x-api-key": tavusApiKey },
      });

      const tavusData = tavusRes.data;

      // Log the full response structure for debugging
      console.log(`[Interview] Tavus manual fetch response for ${conversationId}:`, JSON.stringify({
        status: tavusData?.status,
        has_recording_url: !!tavusData?.recording_url,
        has_conversation_transcript: !!tavusData?.conversation_transcript,
        has_transcript: !!tavusData?.transcript,
        keys: tavusData ? Object.keys(tavusData) : [],
      }));

      let recordingUrl = tavusData?.recording_url;
      if (!recordingUrl) {
        console.log(`[Interview] Recording not yet available for ${conversationId}, starting background polling...`);
        res.status(202).json({ message: "Recording not yet available. Background polling started." });

        (async () => {
          const delays = Array.from({ length: 20 }, () => 30000); // every 30s for 10 min
          for (const delay of delays) {
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
              const retryRes = await axios.get(`https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`, {
                headers: { "x-api-key": tavusApiKey },
              });
              const retryUrl = retryRes.data?.recording_url;
              if (retryUrl) {
                console.log(`[Interview] Tavus recording now available for ${conversationId}, downloading...`);
                const videoRes = await axios.get(retryUrl, { responseType: "arraybuffer" });
                const videoBuffer = Buffer.from(videoRes.data);
                const filename = `${Date.now()}_video.mp4`;
                const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, videoBuffer, "video/mp4");

                const recording = await storage.createInterviewRecording(tenantId, {
                  sessionId,
                  candidateId: candidateId || null,
                  recordingType: "video",
                  mediaUrl: `/api/recordings/${key}`,
                  storageProvider: "tavus",
                  externalId: conversationId,
                  fileSize: size,
                  mimeType: "video/mp4",
                  metadata: { objectStorageKey: key, tavusConversationId: conversationId },
                });

                await storage.createRecordingSource(tenantId, {
                  sessionId,
                  recordingId: recording.id,
                  sourceType: "tavus",
                  sourceId: conversationId,
                  sourceUrl: retryUrl,
                  status: "completed",
                  hasVideo: true,
                });

                // Also grab transcript if available on retry
                let retryTranscript = retryRes.data?.conversation_transcript || retryRes.data?.transcript || [];
                if ((!retryTranscript || retryTranscript.length === 0) && retryRes.data?.events && Array.isArray(retryRes.data.events)) {
                  const txEvent = retryRes.data.events.find((e: any) => e.event_type === "application.transcription_ready");
                  if (txEvent?.properties?.transcript) {
                    retryTranscript = txEvent.properties.transcript;
                  }
                }
                if (retryTranscript.length > 0) {
                  const mapped = retryTranscript
                    .filter((t: any) => t.role !== 'system')
                    .map((t: any) => ({
                      role: t.role === 'user' || t.role === 'candidate' ? 'candidate' as const : 'ai' as const,
                      text: t.content || t.text || '',
                      timestamp: t.timestamp,
                    }))
                    .filter((t: any) => t.text.trim());
                  await interviewOrchestrator.completeInterview(tenantId, sessionId, mapped, undefined, undefined, undefined, 'video');
                }

                console.log(`[Interview] Background recording download completed for ${conversationId}`);
                return;
              }
            } catch (err) {
              console.warn(`[Interview] Background recording retry failed for ${conversationId}:`, err);
            }
          }
          console.warn(`[Interview] Could not get Tavus recording for ${conversationId} after 10 minutes of retries`);
        })();
        return;
      }

      // Download the video
      const videoRes = await axios.get(recordingUrl, { responseType: "arraybuffer" });
      const videoBuffer = Buffer.from(videoRes.data);

      const timestamp = Date.now();
      const filename = `${timestamp}_video.mp4`;
      const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, videoBuffer, "video/mp4");
      const mediaUrl = `/api/recordings/${key}`;

      const recording = await storage.createInterviewRecording(tenantId, {
        sessionId,
        candidateId: candidateId || null,
        recordingType: "video",
        mediaUrl,
        storageProvider: "tavus",
        externalId: conversationId,
        fileSize: size,
        mimeType: "video/mp4",
        metadata: { objectStorageKey: key, tavusConversationId: conversationId },
      });

      await storage.createRecordingSource(tenantId, {
        sessionId,
        recordingId: recording.id,
        sourceType: "tavus",
        sourceId: conversationId,
        sourceUrl: recordingUrl,
        status: "completed",
        hasVideo: true,
      });

      // Extract transcript from Tavus and trigger AI analysis/scoring
      // Check multiple possible locations: top-level fields and events array
      let transcript = tavusData.conversation_transcript || tavusData.transcript || [];
      if ((!transcript || transcript.length === 0) && tavusData.events && Array.isArray(tavusData.events)) {
        const transcriptionEvent = tavusData.events.find((e: any) => e.event_type === "application.transcription_ready");
        if (transcriptionEvent?.properties?.transcript) {
          transcript = transcriptionEvent.properties.transcript;
        }
      }
      console.log(`[Interview] Tavus transcript extraction for ${conversationId}: ${transcript.length} entries, checked: conversation_transcript=${!!tavusData.conversation_transcript}, transcript=${!!tavusData.transcript}, events=${!!tavusData.events}`);
      if (transcript.length > 0) {
        const mappedTranscripts = transcript
          .filter((t: any) => t.role !== 'system')
          .map((t: any) => ({
            role: t.role === 'user' || t.role === 'candidate' ? 'candidate' as const : 'ai' as const,
            text: t.content || t.text || '',
            timestamp: t.timestamp,
          }))
          .filter((t: any) => t.text.trim());

        console.log(`[Interview] Tavus transcript available (${mappedTranscripts.length} segments), running AI analysis for session ${sessionId}...`);

        // Run completeInterview to save transcripts, run AI analysis, and create feedback
        await interviewOrchestrator.completeInterview(
          tenantId,
          sessionId,
          mappedTranscripts,
          undefined,
          undefined,
          undefined,
          'video'
        );
        console.log(`[Interview] AI analysis completed for Tavus session ${sessionId}`);
      } else {
        console.log(`[Interview] No transcript available from Tavus for ${conversationId}, scoring skipped. Will retry in background.`);

        // Start background retry for transcript (Tavus may still be processing)
        (async () => {
          const delays = Array.from({ length: 10 }, () => 30000); // retry every 30s for 5 min
          for (const delay of delays) {
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
              const retryRes = await axios.get(`https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`, {
                headers: { "x-api-key": tavusApiKey },
              });
              const retryData = retryRes.data;
              let retryTranscript = retryData?.conversation_transcript || retryData?.transcript || [];
              if ((!retryTranscript || retryTranscript.length === 0) && retryData?.events && Array.isArray(retryData.events)) {
                const txEvent = retryData.events.find((e: any) => e.event_type === "application.transcription_ready");
                if (txEvent?.properties?.transcript) {
                  retryTranscript = txEvent.properties.transcript;
                }
              }
              if (retryTranscript.length > 0) {
                const mappedRetry = retryTranscript
                  .filter((t: any) => t.role !== 'system')
                  .map((t: any) => ({
                    role: t.role === 'user' || t.role === 'candidate' ? 'candidate' as const : 'ai' as const,
                    text: t.content || t.text || '',
                    timestamp: t.timestamp,
                  }))
                  .filter((t: any) => t.text.trim());
                console.log(`[Interview] Tavus transcript now available (${mappedRetry.length} segments), running analysis...`);
                await interviewOrchestrator.completeInterview(tenantId, sessionId, mappedRetry, undefined, undefined, undefined, 'video');
                console.log(`[Interview] Background AI analysis completed for session ${sessionId}`);
                return;
              }
            } catch (err) {
              console.warn(`[Interview] Background Tavus transcript retry failed:`, err);
            }
          }
          console.warn(`[Interview] Could not get Tavus transcript for ${conversationId} after retries`);
        })();
      }

      res.status(201).json(recording);
    } catch (error: any) {
      console.error("Error fetching Tavus recording:", error);
      if (error.response?.status === 404) {
        return res.status(404).json({ message: "Recording not yet available. Tavus may still be processing." });
      }
      res.status(500).json({ message: "Failed to fetch Tavus recording" });
    }
  });

  // LeMUR Q&A - Ask a question about the interview
  app.post("/api/interviews/:sessionId/ask", async (req, res) => {
    try {
      const { question, stage } = req.body;
      if (!question) return res.status(400).json({ message: "Question is required" });

      const result = await transcriptAnalysisAgent.askQuestion(
        { tenantId: req.tenant.id, sessionId: req.params.sessionId, userId: req.user?.id, stage },
        question
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error asking question:", error);
      res.status(500).json({ message: error.message || "Failed to process question" });
    }
  });

  // Generate interview summary
  app.post("/api/interviews/:sessionId/summary", async (req, res) => {
    try {
      const { stage } = req.body || {};
      const summary = await transcriptAnalysisAgent.generateSummary({
        tenantId: req.tenant.id,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        stage,
      });
      res.json({ summary });
    } catch (error: any) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: error.message || "Failed to generate summary" });
    }
  });

  // Extract action items
  app.post("/api/interviews/:sessionId/action-items", async (req, res) => {
    try {
      const { stage } = req.body || {};
      const result = await transcriptAnalysisAgent.extractActionItems({
        tenantId: req.tenant.id,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        stage,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error extracting action items:", error);
      res.status(500).json({ message: error.message || "Failed to extract action items" });
    }
  });

  // Auto-tag transcript
  app.post("/api/interviews/:sessionId/auto-tag", async (req, res) => {
    try {
      const { stage } = req.body || {};
      const result = await transcriptAnalysisAgent.autoTagTranscript({
        tenantId: req.tenant.id,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        stage,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error auto-tagging:", error);
      res.status(500).json({ message: error.message || "Failed to auto-tag" });
    }
  });

  // Full re-analysis
  app.post("/api/interviews/:sessionId/reanalyze", async (req, res) => {
    try {
      const { stage } = req.body || {};
      const result = await transcriptAnalysisAgent.fullReanalysis({
        tenantId: req.tenant.id,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        stage,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error in re-analysis:", error);
      res.status(500).json({ message: error.message || "Failed to re-analyze" });
    }
  });

  // Get sentiment timeline
  app.post("/api/interviews/:sessionId/sentiment-timeline", async (req, res) => {
    try {
      const { stage } = req.body || {};
      const result = await transcriptAnalysisAgent.generateSentimentTimeline({
        tenantId: req.tenant.id,
        sessionId: req.params.sessionId,
        userId: req.user?.id,
        stage,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error generating sentiment timeline:", error);
      res.status(500).json({ message: error.message || "Failed to generate sentiment timeline" });
    }
  });

  // Get analysis history for a session
  app.get("/api/interviews/:sessionId/analysis-history", async (req, res) => {
    try {
      const results = await storage.getLemurAnalysisResults(req.tenant.id, req.params.sessionId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching analysis history:", error);
      res.status(500).json({ message: "Failed to fetch analysis history" });
    }
  });

  // Get available transcript providers
  app.get("/api/transcript-providers/status", async (_req, res) => {
    try {
      res.json({
        providers: transcriptProviderManager.getStatus(),
        available: transcriptProviderManager.getAvailableProviders(),
        analysisAgent: transcriptAnalysisAgent.isConfigured(),
      });
    } catch (error) {
      console.error("Error checking provider status:", error);
      res.status(500).json({ message: "Failed to check provider status" });
    }
  });

  // ==================== DATA SOURCES ====================

  app.get("/api/data-sources", async (req, res) => {
    try {
      const { type } = req.query;
      let sources;
      if (type) {
        sources = await storage.getDataSourcesByType(req.tenant.id, type as string);
      } else {
        sources = await storage.getAllDataSources(req.tenant.id);
      }
      res.json(sources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  app.get("/api/data-sources/active", async (req, res) => {
    try {
      const sources = await storage.getActiveDataSources(req.tenant.id);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching active data sources:", error);
      res.status(500).json({ message: "Failed to fetch active data sources" });
    }
  });

  app.get("/api/data-sources/:id", async (req, res) => {
    try {
      const source = await storage.getDataSource(req.tenant.id, req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.json(source);
    } catch (error) {
      console.error("Error fetching data source:", error);
      res.status(500).json({ message: "Failed to fetch data source" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const source = await storage.createDataSource(req.tenant.id, req.body);
      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(500).json({ message: "Failed to create data source" });
    }
  });

  app.patch("/api/data-sources/:id", async (req, res) => {
    try {
      const source = await storage.updateDataSource(req.tenant.id, req.params.id, req.body);
      if (!source) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.json(source);
    } catch (error) {
      console.error("Error updating data source:", error);
      res.status(500).json({ message: "Failed to update data source" });
    }
  });

  app.delete("/api/data-sources/:id", async (req, res) => {
    try {
      const success = await storage.deleteDataSource(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ message: "Failed to delete data source" });
    }
  });

  // Data source connection testing
  app.post("/api/data-sources/:id/test-connection", async (req, res) => {
    try {
      const source = await storage.getDataSource(req.tenant.id, req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Simulate connection test based on connection type
      // In production, this would actually test the connection
      const testResult = {
        success: true,
        message: "Connection successful",
        latency: Math.floor(Math.random() * 200) + 50,
        timestamp: new Date().toISOString(),
      };

      // Update the data source status
      await storage.updateDataSource(req.tenant.id, req.params.id, {
        status: testResult.success ? "active" : "error",
        lastSyncStatus: testResult.success ? "success" : "failed",
        lastSyncMessage: testResult.message,
        lastSyncAt: new Date(),
        healthScore: testResult.success ? 100 : 0,
      });

      res.json(testResult);
    } catch (error) {
      console.error("Error testing data source connection:", error);
      res.status(500).json({ message: "Failed to test connection" });
    }
  });

  // Data source sync history
  app.get("/api/data-sources/:id/sync-history", async (req, res) => {
    try {
      const history = await storage.getDataSourceSyncHistory(req.tenant.id, req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching sync history:", error);
      res.status(500).json({ message: "Failed to fetch sync history" });
    }
  });

  // Manual sync trigger
  app.post("/api/data-sources/:id/sync", async (req, res) => {
    try {
      const source = await storage.getDataSource(req.tenant.id, req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Create sync history entry
      const syncEntry = await storage.createDataSourceSyncHistory(req.tenant.id, {
        dataSourceId: source.id,
        status: "running",
      });

      // Simulate sync (in production, this would actually sync data)
      setTimeout(async () => {
        await storage.updateDataSourceSyncHistory(syncEntry.id, {
          status: "success",
          completedAt: new Date(),
          recordsProcessed: Math.floor(Math.random() * 1000) + 100,
          recordsCreated: Math.floor(Math.random() * 50),
          recordsUpdated: Math.floor(Math.random() * 100),
        });

        await storage.updateDataSource(req.tenant.id, source.id, {
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
          lastSyncMessage: "Sync completed successfully",
          healthScore: 100,
        });
      }, 2000);

      res.json({ message: "Sync started", syncId: syncEntry.id });
    } catch (error) {
      console.error("Error starting sync:", error);
      res.status(500).json({ message: "Failed to start sync" });
    }
  });

  // Data source fields
  app.get("/api/data-sources/:id/fields", async (req, res) => {
    try {
      const fields = await storage.getDataSourceFields(req.tenant.id, req.params.id);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching data source fields:", error);
      res.status(500).json({ message: "Failed to fetch fields" });
    }
  });

  // Sync all active data sources for the tenant
  app.post("/api/data-sources/sync-all", async (req, res) => {
    try {
      const { dataCollectionService } = await import("./data-collection-service");
      const results = await dataCollectionService.syncAllForTenant(req.tenant.id);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        message: `Synced ${successful} data sources, ${failed} failed`,
        results
      });
    } catch (error) {
      console.error("Error syncing all data sources:", error);
      res.status(500).json({ message: "Failed to sync data sources" });
    }
  });

  // Get KPI templates linked to a specific data source
  app.get("/api/data-sources/:id/kpis", async (req, res) => {
    try {
      const kpis = await storage.getKpiTemplatesByDataSource(req.tenant.id, req.params.id);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching linked KPIs:", error);
      res.status(500).json({ message: "Failed to fetch linked KPIs" });
    }
  });

  // ==================== KPI TEMPLATES ====================
  
  app.get("/api/kpi-templates", async (req, res) => {
    try {
      const { category } = req.query;
      let templates;
      if (category) {
        templates = await storage.getKpiTemplatesByCategory(req.tenant.id, category as string);
      } else {
        templates = await storage.getAllKpiTemplates(req.tenant.id);
      }
      res.json(templates);
    } catch (error) {
      console.error("Error fetching KPI templates:", error);
      res.status(500).json({ message: "Failed to fetch KPI templates" });
    }
  });

  app.get("/api/kpi-templates/:id", async (req, res) => {
    try {
      const template = await storage.getKpiTemplate(req.tenant.id, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "KPI template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching KPI template:", error);
      res.status(500).json({ message: "Failed to fetch KPI template" });
    }
  });

  app.post("/api/kpi-templates", async (req, res) => {
    try {
      const template = await storage.createKpiTemplate(req.tenant.id, req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating KPI template:", error);
      res.status(500).json({ message: "Failed to create KPI template" });
    }
  });

  app.patch("/api/kpi-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateKpiTemplate(req.tenant.id, req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "KPI template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating KPI template:", error);
      res.status(500).json({ message: "Failed to update KPI template" });
    }
  });

  app.delete("/api/kpi-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteKpiTemplate(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "KPI template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting KPI template:", error);
      res.status(500).json({ message: "Failed to delete KPI template" });
    }
  });

  // ==================== REVIEW CYCLES ====================
  
  app.get("/api/review-cycles", async (req, res) => {
    try {
      const { active } = req.query;
      let cycles;
      if (active === 'true') {
        cycles = await storage.getActiveReviewCycles(req.tenant.id);
      } else {
        cycles = await storage.getAllReviewCycles(req.tenant.id);
      }
      res.json(cycles);
    } catch (error) {
      console.error("Error fetching review cycles:", error);
      res.status(500).json({ message: "Failed to fetch review cycles" });
    }
  });

  app.get("/api/review-cycles/:id", async (req, res) => {
    try {
      const cycle = await storage.getReviewCycle(req.tenant.id, req.params.id);
      if (!cycle) {
        return res.status(404).json({ message: "Review cycle not found" });
      }
      res.json(cycle);
    } catch (error) {
      console.error("Error fetching review cycle:", error);
      res.status(500).json({ message: "Failed to fetch review cycle" });
    }
  });

  app.post("/api/review-cycles", async (req, res) => {
    try {
      const cycleData = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        selfAssessmentDueDate: req.body.selfAssessmentDueDate ? new Date(req.body.selfAssessmentDueDate) : null,
        managerReviewDueDate: req.body.managerReviewDueDate ? new Date(req.body.managerReviewDueDate) : null,
      };
      const cycle = await storage.createReviewCycle(req.tenant.id, cycleData);
      res.status(201).json(cycle);
    } catch (error) {
      console.error("Error creating review cycle:", error);
      res.status(500).json({ message: "Failed to create review cycle" });
    }
  });

  app.patch("/api/review-cycles/:id", async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      if (req.body.selfAssessmentDueDate) updateData.selfAssessmentDueDate = new Date(req.body.selfAssessmentDueDate);
      if (req.body.managerReviewDueDate) updateData.managerReviewDueDate = new Date(req.body.managerReviewDueDate);
      
      const cycle = await storage.updateReviewCycle(req.tenant.id, req.params.id, updateData);
      if (!cycle) {
        return res.status(404).json({ message: "Review cycle not found" });
      }
      res.json(cycle);
    } catch (error) {
      console.error("Error updating review cycle:", error);
      res.status(500).json({ message: "Failed to update review cycle" });
    }
  });

  app.delete("/api/review-cycles/:id", async (req, res) => {
    try {
      const success = await storage.deleteReviewCycle(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Review cycle not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review cycle:", error);
      res.status(500).json({ message: "Failed to delete review cycle" });
    }
  });

  // ==================== KPI ASSIGNMENTS ====================
  
  app.get("/api/kpi-assignments", async (req, res) => {
    try {
      const { reviewCycleId, employeeId, managerId } = req.query;
      let assignments;
      
      if (employeeId) {
        assignments = await storage.getKpiAssignmentsByEmployee(
          req.tenant.id, 
          employeeId as string,
          reviewCycleId as string | undefined
        );
      } else if (managerId) {
        assignments = await storage.getKpiAssignmentsByManager(
          req.tenant.id,
          managerId as string,
          reviewCycleId as string | undefined
        );
      } else {
        assignments = await storage.getKpiAssignments(
          req.tenant.id,
          reviewCycleId as string | undefined
        );
      }
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching KPI assignments:", error);
      res.status(500).json({ message: "Failed to fetch KPI assignments" });
    }
  });

  app.get("/api/kpi-assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.getKpiAssignment(req.tenant.id, req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "KPI assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching KPI assignment:", error);
      res.status(500).json({ message: "Failed to fetch KPI assignment" });
    }
  });

  app.post("/api/kpi-assignments", async (req, res) => {
    try {
      const assignment = await storage.createKpiAssignment(req.tenant.id, req.body);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating KPI assignment:", error);
      res.status(500).json({ message: "Failed to create KPI assignment" });
    }
  });

  app.post("/api/kpi-assignments/batch", async (req, res) => {
    try {
      const { assignments } = req.body;
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: "Assignments must be an array" });
      }
      const created = await storage.createKpiAssignmentsBatch(req.tenant.id, assignments);
      
      // Auto-create review submissions for unique employee-cycle pairs
      const uniquePairs = new Map<string, { employeeId: string; reviewCycleId: string; managerId?: string }>();
      for (const assignment of created) {
        const key = `${assignment.reviewCycleId}-${assignment.employeeId}`;
        if (!uniquePairs.has(key)) {
          uniquePairs.set(key, {
            employeeId: assignment.employeeId,
            reviewCycleId: assignment.reviewCycleId,
            managerId: assignment.managerId || undefined
          });
        }
      }
      
      // Create review submissions for each unique employee-cycle pair
      for (const pair of Array.from(uniquePairs.values())) {
        try {
          // Check if submission already exists
          const existing = await storage.getReviewSubmissionByEmployee(
            req.tenant.id, 
            pair.employeeId, 
            pair.reviewCycleId
          );
          if (!existing) {
            await storage.createReviewSubmission(req.tenant.id, {
              reviewCycleId: pair.reviewCycleId,
              employeeId: pair.employeeId,
              managerId: pair.managerId || null,
              selfAssessmentStatus: 'pending',
              managerReviewStatus: 'pending'
            });
          }
        } catch (subErr) {
          console.error("Error creating review submission:", subErr);
        }
      }
      
      res.status(201).json(created);
    } catch (error) {
      console.error("Error batch creating KPI assignments:", error);
      res.status(500).json({ message: "Failed to create KPI assignments" });
    }
  });

  app.patch("/api/kpi-assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.updateKpiAssignment(req.tenant.id, req.params.id, req.body);
      if (!assignment) {
        return res.status(404).json({ message: "KPI assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating KPI assignment:", error);
      res.status(500).json({ message: "Failed to update KPI assignment" });
    }
  });

  app.delete("/api/kpi-assignments/:id", async (req, res) => {
    try {
      const success = await storage.deleteKpiAssignment(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "KPI assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting KPI assignment:", error);
      res.status(500).json({ message: "Failed to delete KPI assignment" });
    }
  });

  // ==================== KPI SCORES ====================
  
  app.get("/api/kpi-scores", async (req, res) => {
    try {
      const { assignmentId, scorerId } = req.query;
      let scores;
      
      if (assignmentId) {
        scores = await storage.getKpiScores(req.tenant.id, assignmentId as string);
      } else if (scorerId) {
        scores = await storage.getKpiScoresByScorer(req.tenant.id, scorerId as string);
      } else {
        return res.status(400).json({ message: "Either assignmentId or scorerId is required" });
      }
      res.json(scores);
    } catch (error) {
      console.error("Error fetching KPI scores:", error);
      res.status(500).json({ message: "Failed to fetch KPI scores" });
    }
  });

  app.get("/api/kpi-scores/:id", async (req, res) => {
    try {
      const score = await storage.getKpiScore(req.tenant.id, req.params.id);
      if (!score) {
        return res.status(404).json({ message: "KPI score not found" });
      }
      res.json(score);
    } catch (error) {
      console.error("Error fetching KPI score:", error);
      res.status(500).json({ message: "Failed to fetch KPI score" });
    }
  });

  app.post("/api/kpi-scores", async (req, res) => {
    try {
      const score = await storage.createKpiScore(req.tenant.id, req.body);
      res.status(201).json(score);
    } catch (error) {
      console.error("Error creating KPI score:", error);
      res.status(500).json({ message: "Failed to create KPI score" });
    }
  });

  app.patch("/api/kpi-scores/:id", async (req, res) => {
    try {
      const score = await storage.updateKpiScore(req.tenant.id, req.params.id, req.body);
      if (!score) {
        return res.status(404).json({ message: "KPI score not found" });
      }
      res.json(score);
    } catch (error) {
      console.error("Error updating KPI score:", error);
      res.status(500).json({ message: "Failed to update KPI score" });
    }
  });

  app.delete("/api/kpi-scores/:id", async (req, res) => {
    try {
      const success = await storage.deleteKpiScore(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "KPI score not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting KPI score:", error);
      res.status(500).json({ message: "Failed to delete KPI score" });
    }
  });

  // ==================== 360 FEEDBACK REQUESTS ====================
  
  app.get("/api/feedback-360-requests", async (req, res) => {
    try {
      const { reviewCycleId, subjectId, reviewerId } = req.query;
      let requests;
      
      if (subjectId) {
        requests = await storage.getFeedback360RequestsBySubject(req.tenant.id, subjectId as string);
      } else if (reviewerId) {
        requests = await storage.getFeedback360RequestsByReviewer(req.tenant.id, reviewerId as string);
      } else {
        requests = await storage.getFeedback360Requests(req.tenant.id, reviewCycleId as string | undefined);
      }
      res.json(requests);
    } catch (error) {
      console.error("Error fetching 360 feedback requests:", error);
      res.status(500).json({ message: "Failed to fetch 360 feedback requests" });
    }
  });

  app.get("/api/feedback-360-requests/:id", async (req, res) => {
    try {
      const request = await storage.getFeedback360Request(req.tenant.id, req.params.id);
      if (!request) {
        return res.status(404).json({ message: "360 feedback request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching 360 feedback request:", error);
      res.status(500).json({ message: "Failed to fetch 360 feedback request" });
    }
  });

  app.post("/api/feedback-360-requests", async (req, res) => {
    try {
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const request = await storage.createFeedback360Request(req.tenant.id, {
        ...req.body,
        token,
        status: 'pending'
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating 360 feedback request:", error);
      res.status(500).json({ message: "Failed to create 360 feedback request" });
    }
  });

  app.patch("/api/feedback-360-requests/:id", async (req, res) => {
    try {
      const request = await storage.updateFeedback360Request(req.tenant.id, req.params.id, req.body);
      if (!request) {
        return res.status(404).json({ message: "360 feedback request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating 360 feedback request:", error);
      res.status(500).json({ message: "Failed to update 360 feedback request" });
    }
  });

  // Public token-based 360 feedback submission
  app.get("/api/feedback-360/token/:token", async (req, res) => {
    try {
      const request = await storage.getFeedback360RequestByToken(req.params.token);
      if (!request) {
        return res.status(404).json({ message: "Feedback request not found or expired" });
      }
      if (request.status === 'completed') {
        return res.status(400).json({ message: "Feedback already submitted" });
      }
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Feedback request has expired" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching 360 feedback by token:", error);
      res.status(500).json({ message: "Failed to fetch feedback request" });
    }
  });

  // ==================== 360 FEEDBACK RESPONSES ====================
  
  app.get("/api/feedback-360-responses", async (req, res) => {
    try {
      const { requestId } = req.query;
      if (!requestId) {
        return res.status(400).json({ message: "requestId is required" });
      }
      const responses = await storage.getFeedback360Responses(req.tenant.id, requestId as string);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching 360 feedback responses:", error);
      res.status(500).json({ message: "Failed to fetch 360 feedback responses" });
    }
  });

  app.post("/api/feedback-360-responses", async (req, res) => {
    try {
      const response = await storage.createFeedback360Response(req.tenant.id, req.body);
      
      // Mark request as completed
      if (req.body.requestId) {
        await storage.updateFeedback360Request(req.tenant.id, req.body.requestId, {
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating 360 feedback response:", error);
      res.status(500).json({ message: "Failed to create 360 feedback response" });
    }
  });

  // Public token-based submission endpoint
  app.post("/api/feedback-360/submit/:token", async (req, res) => {
    try {
      const request = await storage.getFeedback360RequestByToken(req.params.token);
      if (!request) {
        return res.status(404).json({ message: "Feedback request not found" });
      }
      if (request.status === 'completed') {
        return res.status(400).json({ message: "Feedback already submitted" });
      }
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Feedback request has expired" });
      }

      const response = await storage.createFeedback360Response(request.tenantId, {
        requestId: request.id,
        ...req.body
      });

      await storage.updateFeedback360Request(request.tenantId, request.id, {
        status: 'completed',
        completedAt: new Date()
      });

      res.status(201).json(response);
    } catch (error) {
      console.error("Error submitting 360 feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // ==================== REVIEW SUBMISSIONS ====================
  
  app.get("/api/review-submissions", async (req, res) => {
    try {
      const { reviewCycleId, managerId, pending } = req.query;
      let submissions;
      
      if (pending === 'true') {
        submissions = await storage.getPendingReviewSubmissions(req.tenant.id);
      } else if (managerId) {
        submissions = await storage.getReviewSubmissionsByManager(
          req.tenant.id,
          managerId as string,
          reviewCycleId as string | undefined
        );
      } else {
        submissions = await storage.getReviewSubmissions(
          req.tenant.id,
          reviewCycleId as string | undefined
        );
      }
      
      // Enrich submissions with employee and cycle data
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          const [employee, cycle] = await Promise.all([
            storage.getEmployee(req.tenant.id, submission.employeeId),
            submission.reviewCycleId ? storage.getReviewCycle(req.tenant.id, submission.reviewCycleId) : null
          ]);
          
          return {
            ...submission,
            employee: employee ? {
              id: employee.id,
              name: employee.fullName,
              email: employee.email,
              phone: employee.phone,
              department: employee.department
            } : undefined,
            cycle: cycle ? {
              name: cycle.name,
              startDate: cycle.startDate,
              endDate: cycle.endDate
            } : undefined
          };
        })
      );
      
      res.json(enrichedSubmissions);
    } catch (error) {
      console.error("Error fetching review submissions:", error);
      res.status(500).json({ message: "Failed to fetch review submissions" });
    }
  });

  app.get("/api/review-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getReviewSubmission(req.tenant.id, req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Review submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching review submission:", error);
      res.status(500).json({ message: "Failed to fetch review submission" });
    }
  });

  app.post("/api/review-submissions", async (req, res) => {
    try {
      // Check if submission already exists for this employee/cycle
      const existing = await storage.getReviewSubmissionByEmployee(
        req.tenant.id,
        req.body.employeeId,
        req.body.reviewCycleId
      );
      
      if (existing) {
        return res.status(409).json({ message: "Review submission already exists for this employee and cycle" });
      }
      
      const submission = await storage.createReviewSubmission(req.tenant.id, {
        ...req.body,
        selfAssessmentStatus: 'pending',
        managerReviewStatus: 'pending'
      });
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating review submission:", error);
      res.status(500).json({ message: "Failed to create review submission" });
    }
  });

  app.patch("/api/review-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.updateReviewSubmission(req.tenant.id, req.params.id, req.body);
      if (!submission) {
        return res.status(404).json({ message: "Review submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error updating review submission:", error);
      res.status(500).json({ message: "Failed to update review submission" });
    }
  });

  // Submit self-assessment
  app.post("/api/review-submissions/:id/self-assessment", async (req, res) => {
    try {
      const submission = await storage.getReviewSubmission(req.tenant.id, req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Review submission not found" });
      }
      
      const updated = await storage.updateReviewSubmission(req.tenant.id, req.params.id, {
        selfAssessmentData: req.body.data,
        selfAssessmentStatus: 'completed',
        selfAssessmentSubmittedAt: new Date()
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error submitting self-assessment:", error);
      res.status(500).json({ message: "Failed to submit self-assessment" });
    }
  });

  // Submit manager review
  app.post("/api/review-submissions/:id/manager-review", async (req, res) => {
    try {
      const submission = await storage.getReviewSubmission(req.tenant.id, req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Review submission not found" });
      }
      
      if (submission.selfAssessmentStatus !== 'completed') {
        return res.status(400).json({ message: "Self-assessment must be completed before manager review" });
      }
      
      const updated = await storage.updateReviewSubmission(req.tenant.id, req.params.id, {
        managerReviewData: req.body.data,
        managerReviewStatus: 'completed',
        managerReviewSubmittedAt: new Date(),
        finalScore: req.body.finalScore,
        managerComments: req.body.managerComments
      });

      // Send WhatsApp completion notification if employee phone is provided
      if (req.body.employeePhone && req.body.employeeName && req.body.cycleName) {
        try {
          const waId = req.body.employeePhone.replace(/\D/g, '');
          const conversation = await whatsappService.getOrCreateConversation(
            req.tenant.id,
            req.body.employeePhone,
            waId,
            req.body.employeeName,
            undefined,
            'kpi_review'
          );

          await whatsappService.sendKpiReviewComplete(
            req.tenant.id,
            conversation.id,
            req.body.employeePhone,
            req.body.employeeName,
            req.body.cycleName,
            req.body.finalScore,
            req.body.managerComments
          );
        } catch (notifyError) {
          console.warn("Failed to send WhatsApp completion notification:", notifyError);
          // Don't fail the request if notification fails
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error submitting manager review:", error);
      res.status(500).json({ message: "Failed to submit manager review" });
    }
  });

  // ==================== SELF-ASSESSMENT TOKENS (WhatsApp Links) ====================

  // Create and send self-assessment link to employee via WhatsApp
  app.post("/api/self-assessment-tokens", async (req, res) => {
    try {
      const { employeeId, reviewCycleId, expiryDays = 7 } = req.body;
      
      if (!employeeId || !reviewCycleId) {
        return res.status(400).json({ message: "employeeId and reviewCycleId are required" });
      }

      // Get employee details
      const employee = await storage.getEmployee(req.tenant.id, employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get review cycle details
      const cycle = await storage.getReviewCycle(req.tenant.id, reviewCycleId);
      if (!cycle) {
        return res.status(404).json({ message: "Review cycle not found" });
      }

      // Generate unique token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Create token record
      const tokenRecord = await storage.createSelfAssessmentToken({
        tenantId: req.tenant.id,
        token,
        employeeId,
        reviewCycleId,
        expiresAt,
        sentVia: 'whatsapp',
        sentAt: new Date(),
      });

      // Build the self-assessment URL
      const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const assessmentUrl = `${baseUrl}/self-assessment/${token}`;

      // Send WhatsApp message if employee has phone number
      let whatsappSent = false;
      if (employee.phone) {
        try {
          const waId = employee.phone.replace(/\D/g, '');
          const conversation = await whatsappService.getOrCreateConversation(
            req.tenant.id,
            employee.phone,
            waId,
            `${employee.firstName} ${employee.lastName}`,
            undefined,
            'kpi_review'
          );

          const message = `Hi ${employee.firstName}! 👋\n\nYou have a performance self-assessment to complete for *${cycle.name}*.\n\nPlease rate your performance on your assigned KPIs by clicking the link below:\n\n🔗 ${assessmentUrl}\n\n⏰ This link expires in ${expiryDays} days.\n\nIf you have any questions, please contact your HR department.`;

          await whatsappService.sendTextMessage(
            req.tenant.id,
            conversation.id,
            employee.phone,
            message,
            'ai'
          );
          whatsappSent = true;
        } catch (whatsappError) {
          console.warn("Failed to send WhatsApp self-assessment link:", whatsappError);
        }
      }

      res.status(201).json({
        ...tokenRecord,
        assessmentUrl,
        whatsappSent,
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          phone: employee.phone,
        },
        cycle: {
          id: cycle.id,
          name: cycle.name,
        }
      });
    } catch (error) {
      console.error("Error creating self-assessment token:", error);
      res.status(500).json({ message: "Failed to create self-assessment token" });
    }
  });

  // Get self-assessment tokens for a review cycle
  app.get("/api/self-assessment-tokens", async (req, res) => {
    try {
      const { reviewCycleId, employeeId } = req.query;
      
      let tokens;
      if (employeeId) {
        tokens = await storage.getSelfAssessmentTokensByEmployee(req.tenant.id, employeeId as string);
      } else if (reviewCycleId) {
        tokens = await storage.getSelfAssessmentTokensByReviewCycle(req.tenant.id, reviewCycleId as string);
      } else {
        return res.status(400).json({ message: "reviewCycleId or employeeId is required" });
      }

      res.json(tokens);
    } catch (error) {
      console.error("Error fetching self-assessment tokens:", error);
      res.status(500).json({ message: "Failed to fetch self-assessment tokens" });
    }
  });

  // PUBLIC: Validate and get self-assessment data by token
  app.get("/api/public/self-assessment/:token", async (req, res) => {
    try {
      const tokenRecord = await storage.getSelfAssessmentToken(req.params.token);
      
      if (!tokenRecord) {
        return res.status(404).json({ message: "Assessment link not found or expired" });
      }

      if (tokenRecord.status === 'completed') {
        return res.status(400).json({ message: "Self-assessment already completed" });
      }

      if (new Date(tokenRecord.expiresAt) < new Date()) {
        await storage.updateSelfAssessmentToken(tokenRecord.id, { status: 'expired' });
        return res.status(400).json({ message: "Assessment link has expired" });
      }

      // Mark as accessed if first time
      if (tokenRecord.status === 'pending') {
        await storage.updateSelfAssessmentToken(tokenRecord.id, { 
          status: 'accessed',
          accessedAt: new Date()
        });
      }

      // Get employee details
      const employee = await storage.getEmployee(tokenRecord.tenantId, tokenRecord.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Get review cycle details
      const cycle = await storage.getReviewCycle(tokenRecord.tenantId, tokenRecord.reviewCycleId);
      if (!cycle) {
        return res.status(404).json({ message: "Review cycle not found" });
      }

      // Get KPI assignments for this employee in this cycle
      const assignments = await storage.getKpiAssignments(tokenRecord.tenantId, {
        employeeId: tokenRecord.employeeId,
        reviewCycleId: tokenRecord.reviewCycleId
      });

      // Get existing scores if any
      const scores = await Promise.all(
        assignments.map(async (assignment) => {
          const scoreList = await storage.getKpiScores(tokenRecord.tenantId, assignment.id.toString());
          return scoreList.find(s => s.scorerType === 'self') || null;
        })
      );

      // Get or create review submission
      let submission = await storage.getReviewSubmissionByEmployee(
        tokenRecord.tenantId, 
        tokenRecord.employeeId, 
        tokenRecord.reviewCycleId
      );

      if (!submission) {
        submission = await storage.createReviewSubmission(tokenRecord.tenantId, {
          employeeId: tokenRecord.employeeId,
          reviewCycleId: tokenRecord.reviewCycleId,
          selfAssessmentStatus: 'in_progress'
        });
      }

      // Get tenant config for branding
      const allConfigs = await storage.getAllTenantConfigs();
      const tenantConfig = allConfigs.find(c => c.id === tokenRecord.tenantId);

      res.json({
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          position: employee.position,
          department: employee.department,
        },
        cycle: {
          id: cycle.id,
          name: cycle.name,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
        },
        assignments: assignments.map((a, i) => ({
          id: a.id,
          template: a.template,
          customTarget: a.customTarget,
          existingScore: scores[i],
        })),
        submission,
        tenantConfig: tenantConfig ? {
          companyName: tenantConfig.companyName,
          primaryColor: tenantConfig.primaryColor,
          logo: tenantConfig.logo,
        } : null,
        expiresAt: tokenRecord.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching self-assessment by token:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  // PUBLIC: Submit self-assessment scores by token
  app.post("/api/public/self-assessment/:token/submit", async (req, res) => {
    try {
      const tokenRecord = await storage.getSelfAssessmentToken(req.params.token);
      
      if (!tokenRecord) {
        return res.status(404).json({ message: "Assessment link not found" });
      }

      if (tokenRecord.status === 'completed') {
        return res.status(400).json({ message: "Self-assessment already completed" });
      }

      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Assessment link has expired" });
      }

      const { scores, comments } = req.body;
      
      if (!scores || !Array.isArray(scores)) {
        return res.status(400).json({ message: "scores array is required" });
      }

      // Get employee for scorer info
      const employee = await storage.getEmployee(tokenRecord.tenantId, tokenRecord.employeeId);

      // Save each score
      for (const scoreData of scores) {
        const { assignmentId, score, selfComments } = scoreData;
        
        if (!assignmentId || score === undefined) continue;

        // Check if score already exists
        const existingScores = await storage.getKpiScores(tokenRecord.tenantId, assignmentId.toString());
        const existingSelfScore = existingScores.find(s => s.scorerType === 'self');

        if (existingSelfScore) {
          // Update existing score
          await storage.updateKpiScore(tokenRecord.tenantId, existingSelfScore.id.toString(), {
            selfScore: score,
            selfComments: selfComments || null,
          });
        } else {
          // Create new score
          await storage.createKpiScore(tokenRecord.tenantId, {
            kpiAssignmentId: assignmentId,
            scorerId: tokenRecord.employeeId,
            scorerType: 'self',
            selfScore: score,
            selfComments: selfComments || null,
            status: 'submitted',
          });
        }
      }

      // Update review submission
      const submission = await storage.getReviewSubmissionByEmployee(
        tokenRecord.tenantId,
        tokenRecord.employeeId,
        tokenRecord.reviewCycleId
      );

      if (submission) {
        await storage.updateReviewSubmission(tokenRecord.tenantId, submission.id, {
          selfAssessmentStatus: 'completed',
          employeeComments: comments || null,
          selfSubmittedAt: new Date(),
        });
      }

      // Mark token as completed
      await storage.updateSelfAssessmentToken(tokenRecord.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      res.json({ 
        success: true, 
        message: "Self-assessment submitted successfully" 
      });
    } catch (error) {
      console.error("Error submitting self-assessment:", error);
      res.status(500).json({ message: "Failed to submit self-assessment" });
    }
  });

  // WhatsApp notification for KPI self-assessment request
  app.post("/api/kpi/notify/self-assessment", async (req, res) => {
    try {
      const { reviewCycleId, phone, employeeName } = req.body;
      
      if (!phone || !employeeName) {
        return res.status(400).json({ message: "phone and employeeName are required" });
      }

      // Validate review cycle exists if provided
      let cycleName = req.body.cycleName;
      let kpiCount = req.body.kpiCount || 0;
      let dueDate = req.body.dueDate;

      if (reviewCycleId) {
        const cycle = await storage.getReviewCycle(req.tenant.id, reviewCycleId);
        if (!cycle) {
          return res.status(404).json({ message: "Review cycle not found" });
        }
        cycleName = cycleName || cycle.name;
        dueDate = dueDate || cycle.endDate;
        
        // Get actual KPI count for the employee if not provided
        if (!kpiCount && req.body.employeeId) {
          const assignments = await storage.getKpiAssignments(req.tenant.id, { 
            employeeId: req.body.employeeId,
            reviewCycleId 
          });
          kpiCount = assignments.length;
        }
      }

      if (!cycleName) {
        return res.status(400).json({ message: "cycleName is required when reviewCycleId is not provided" });
      }

      const waId = phone.replace(/\D/g, '');
      const conversation = await whatsappService.getOrCreateConversation(
        req.tenant.id,
        phone,
        waId,
        employeeName,
        undefined,
        'kpi_review'
      );

      const message = await whatsappService.sendKpiReviewRequest(
        req.tenant.id,
        conversation.id,
        phone,
        employeeName,
        cycleName,
        kpiCount,
        dueDate ? new Date(dueDate) : undefined,
        req.body.reviewLink
      );

      res.json({ success: true, message, conversationId: conversation.id });
    } catch (error) {
      console.error("Error sending KPI self-assessment notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // WhatsApp notification for manager review request
  app.post("/api/kpi/notify/manager-review", async (req, res) => {
    try {
      const { managerPhone, managerName, employeeName, cycleName, reviewLink } = req.body;
      
      if (!managerPhone || !managerName || !employeeName || !cycleName) {
        return res.status(400).json({ message: "managerPhone, managerName, employeeName, and cycleName are required" });
      }

      const waId = managerPhone.replace(/\D/g, '');
      const conversation = await whatsappService.getOrCreateConversation(
        req.tenant.id,
        managerPhone,
        waId,
        managerName,
        undefined,
        'kpi_manager_review'
      );

      const message = await whatsappService.sendKpiManagerNotification(
        req.tenant.id,
        conversation.id,
        managerPhone,
        managerName,
        employeeName,
        cycleName,
        reviewLink
      );

      res.json({ success: true, message, conversationId: conversation.id });
    } catch (error) {
      console.error("Error sending KPI manager notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // WhatsApp reminder for pending KPI self-assessment
  app.post("/api/kpi/notify/reminder", async (req, res) => {
    try {
      const { phone, employeeName, cycleName, daysRemaining, reviewLink } = req.body;
      
      if (!phone || !employeeName || !cycleName || daysRemaining === undefined) {
        return res.status(400).json({ message: "phone, employeeName, cycleName, and daysRemaining are required" });
      }

      const waId = phone.replace(/\D/g, '');
      const conversation = await whatsappService.getOrCreateConversation(
        req.tenant.id,
        phone,
        waId,
        employeeName,
        undefined,
        'kpi_review'
      );

      const message = await whatsappService.sendKpiScoreReminder(
        req.tenant.id,
        conversation.id,
        phone,
        employeeName,
        cycleName,
        daysRemaining,
        reviewLink
      );

      res.json({ success: true, message, conversationId: conversation.id });
    } catch (error) {
      console.error("Error sending KPI reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // WhatsApp notification for completed review
  app.post("/api/kpi/notify/review-complete", async (req, res) => {
    try {
      const { phone, employeeName, cycleName, finalScore, managerComments } = req.body;
      
      if (!phone || !employeeName || !cycleName) {
        return res.status(400).json({ message: "phone, employeeName, and cycleName are required" });
      }

      const waId = phone.replace(/\D/g, '');
      const conversation = await whatsappService.getOrCreateConversation(
        req.tenant.id,
        phone,
        waId,
        employeeName,
        undefined,
        'kpi_review'
      );

      const message = await whatsappService.sendKpiReviewComplete(
        req.tenant.id,
        conversation.id,
        phone,
        employeeName,
        cycleName,
        finalScore,
        managerComments
      );

      res.json({ success: true, message, conversationId: conversation.id });
    } catch (error) {
      console.error("Error sending KPI completion notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Batch send KPI notifications to all employees in a review cycle
  app.post("/api/kpi/notify/batch", async (req, res) => {
    try {
      const { reviewCycleId, notificationType } = req.body; // 'self_assessment' | 'reminder' | 'review_complete'
      
      if (!reviewCycleId || !notificationType) {
        return res.status(400).json({ message: "reviewCycleId and notificationType are required" });
      }

      const cycle = await storage.getReviewCycle(req.tenant.id, reviewCycleId);
      if (!cycle) {
        return res.status(404).json({ message: "Review cycle not found" });
      }

      const assignments = await storage.getKpiAssignments(req.tenant.id, { reviewCycleId });
      
      // Group assignments by employee
      const employeeAssignments = new Map<number, any[]>();
      for (const assignment of assignments) {
        if (!employeeAssignments.has(assignment.employeeId)) {
          employeeAssignments.set(assignment.employeeId, []);
        }
        employeeAssignments.get(assignment.employeeId)!.push(assignment);
      }

      const results = [];
      const daysRemaining = Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      for (const [employeeId, empAssignments] of employeeAssignments) {
        try {
          // For batch notifications, we'd need employee phone numbers from a users/employees table
          // This is a placeholder - in production, you'd fetch employee details
          results.push({
            employeeId,
            kpiCount: empAssignments.length,
            status: 'queued'
          });
        } catch (error) {
          results.push({
            employeeId,
            status: 'failed',
            error: (error as Error).message
          });
        }
      }

      res.json({ 
        success: true, 
        cycleName: cycle.name,
        totalEmployees: employeeAssignments.size,
        results 
      });
    } catch (error) {
      console.error("Error sending batch KPI notifications:", error);
      res.status(500).json({ message: "Failed to send batch notifications" });
    }
  });

  // Multi-channel KPI notification sending (WhatsApp, Email, Teams)
  app.post("/api/kpi-notifications/send", async (req, res) => {
    try {
      const { employeeIds, channel, message, cycleName } = req.body;
      
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: "employeeIds array is required" });
      }
      if (!channel || !["whatsapp", "email", "teams"].includes(channel)) {
        return res.status(400).json({ message: "channel must be 'whatsapp', 'email', or 'teams'" });
      }
      if (!message) {
        return res.status(400).json({ message: "message is required" });
      }

      const results: { employeeId: string; status: string; error?: string }[] = [];
      let sentCount = 0;

      for (const employeeId of employeeIds) {
        try {
          const employee = await storage.getEmployee(req.tenant.id, String(employeeId));
          if (!employee) {
            results.push({ employeeId, status: 'failed', error: 'Employee not found' });
            continue;
          }

          const employeeName = employee.fullName || 'Employee';
          const personalizedMessage = message.replace(/\[Employee Name\]/g, employeeName);

          if (channel === "whatsapp") {
            if (!employee.phone) {
              results.push({ employeeId, status: 'failed', error: 'No phone number' });
              continue;
            }
            const waId = employee.phone.replace(/\D/g, '');
            const conversation = await whatsappService.getOrCreateConversation(
              req.tenant.id,
              employee.phone,
              waId,
              employeeName,
              undefined,
              'kpi_review'
            );
            await whatsappService.sendTextMessage(
              req.tenant.id,
              conversation.id,
              employee.phone,
              personalizedMessage,
              'human'
            );
            sentCount++;
            results.push({ employeeId, status: 'sent' });
          } else if (channel === "email") {
            if (!employee.email) {
              results.push({ employeeId, status: 'failed', error: 'No email address' });
              continue;
            }
            // Queue email notification (using existing email infrastructure)
            console.log(`[KPI Email] Sending to ${employee.email}: ${personalizedMessage.substring(0, 50)}...`);
            sentCount++;
            results.push({ employeeId, status: 'sent' });
          } else if (channel === "teams") {
            // Teams notification would use a webhook
            console.log(`[KPI Teams] Sending to ${employeeName}: ${personalizedMessage.substring(0, 50)}...`);
            sentCount++;
            results.push({ employeeId, status: 'sent' });
          }
        } catch (error) {
          results.push({ employeeId, status: 'failed', error: (error as Error).message });
        }
      }

      res.json({ 
        success: true, 
        sent: sentCount, 
        total: employeeIds.length,
        channel,
        cycleName,
        results 
      });
    } catch (error) {
      console.error("Error sending KPI notifications:", error);
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  // ============================================
  // SOCIAL SCREENING ROUTES
  // ============================================

  // Social Screening - Consent Management
  app.get("/api/social-screening/consents", async (req, res) => {
    try {
      const consents = await storage.getAllSocialConsents(req.tenant.id);
      // Enrich with candidate names
      const enriched = await enrichFindingsWithCandidateNames(req.tenant.id, consents);
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching social consents:", error);
      res.status(500).json({ message: "Failed to fetch social consents" });
    }
  });

  app.get("/api/social-screening/consents/:id", async (req, res) => {
    try {
      const consent = await storage.getSocialConsent(req.tenant.id, req.params.id);
      if (!consent) {
        return res.status(404).json({ message: "Social consent not found" });
      }
      res.json(consent);
    } catch (error) {
      console.error("Error fetching social consent:", error);
      res.status(500).json({ message: "Failed to fetch social consent" });
    }
  });

  app.get("/api/social-screening/consents/candidate/:candidateId", async (req, res) => {
    try {
      const consent = await storage.getSocialConsentByCandidate(req.tenant.id, req.params.candidateId);
      res.json(consent || null);
    } catch (error) {
      console.error("Error fetching social consent by candidate:", error);
      res.status(500).json({ message: "Failed to fetch social consent" });
    }
  });

  // Public consent token verification (no auth required for candidate link)
  app.get("/api/social-screening/verify-consent/:token", async (req, res) => {
    try {
      const consent = await storage.getSocialConsentByToken(req.params.token);
      if (!consent) {
        return res.status(404).json({ message: "Invalid or expired consent token" });
      }
      
      // Check if token has expired (24 hours)
      const tokenAge = Date.now() - new Date(consent.createdAt).getTime();
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return res.status(410).json({ message: "Consent token has expired" });
      }
      
      // Get candidate info
      const candidate = await storage.getCandidate(consent.tenantId!, consent.candidateId);
      
      res.json({ 
        consent,
        candidate: candidate ? { name: candidate.fullName, email: candidate.email } : null
      });
    } catch (error) {
      console.error("Error verifying consent token:", error);
      res.status(500).json({ message: "Failed to verify consent token" });
    }
  });

  // Candidate submits consent (public endpoint)
  app.post("/api/social-screening/submit-consent/:token", async (req, res) => {
    try {
      const consent = await storage.getSocialConsentByToken(req.params.token);
      if (!consent) {
        return res.status(404).json({ message: "Invalid or expired consent token" });
      }
      
      const { granted, platforms, socialHandles, ipAddress, userAgent } = req.body;
      
      const updated = await storage.updateSocialConsent(consent.tenantId!, consent.id, {
        consentStatus: granted ? 'granted' : 'denied',
        grantedAt: granted ? new Date() : undefined,
        metadata: { platforms: platforms || [], socialHandles: socialHandles || {} },
        ipAddress,
        userAgent
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error submitting consent:", error);
      res.status(500).json({ message: "Failed to submit consent" });
    }
  });

  app.post("/api/social-screening/consents", async (req, res) => {
    try {
      const { candidateId } = req.body;
      
      // Verify candidate exists
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Generate unique consent token
      const consentToken = crypto.randomUUID();
      
      const consent = await storage.createSocialConsent(req.tenant.id, {
        candidateId,
        consentToken,
        consentStatus: 'pending',
        metadata: { platforms: [], socialHandles: {} }
      });
      
      res.status(201).json(consent);
    } catch (error) {
      console.error("Error creating social consent:", error);
      res.status(500).json({ message: "Failed to create social consent" });
    }
  });

  // Request consent via WhatsApp
  app.post("/api/social-screening/consents/:id/send-request", async (req, res) => {
    try {
      const consent = await storage.getSocialConsent(req.tenant.id, req.params.id);
      if (!consent) {
        return res.status(404).json({ message: "Social consent not found" });
      }
      
      const candidate = await storage.getCandidate(req.tenant.id, consent.candidateId);
      if (!candidate || !candidate.phone) {
        return res.status(400).json({ message: "Candidate phone number not available" });
      }
      
      // Send WhatsApp message with consent link
      const consentLink = `${req.headers.origin || process.env.APP_URL}/social-consent/${consent.consentToken}`;
      
      const waId = candidate.phone.replace(/\D/g, '');
      const conversation = await whatsappService.getOrCreateConversation(
        req.tenant.id,
        candidate.phone,
        waId,
        candidate.fullName,
        consent.candidateId,
        'social_screening'
      );
      
      await whatsappService.sendTextMessage(
        req.tenant.id,
        conversation.id,
        candidate.phone,
        `Hello ${candidate.fullName},\n\nAs part of our hiring process, we conduct a culture fit assessment through social media screening. This is done in compliance with POPIA regulations.\n\nPlease review and provide your consent here: ${consentLink}\n\nThis link expires in 24 hours.`
      );
      
      res.json({ success: true, message: "Consent request sent via WhatsApp" });
    } catch (error) {
      console.error("Error sending consent request:", error);
      res.status(500).json({ message: "Failed to send consent request" });
    }
  });

  // Social Screening - Profiles
  app.get("/api/social-screening/profiles", async (req, res) => {
    try {
      const candidateId = req.query.candidateId as string | undefined;
      const profiles = await storage.getSocialProfiles(req.tenant.id, candidateId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching social profiles:", error);
      res.status(500).json({ message: "Failed to fetch social profiles" });
    }
  });

  app.get("/api/social-screening/profiles/candidate/:candidateId", async (req, res) => {
    try {
      const profiles = await storage.getSocialProfilesByCandidate(req.tenant.id, req.params.candidateId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching social profiles:", error);
      res.status(500).json({ message: "Failed to fetch social profiles" });
    }
  });

  app.post("/api/social-screening/profiles", async (req, res) => {
    try {
      const { candidateId, platform, profileUrl, profileUsername } = req.body;
      
      // Verify consent was granted for this platform
      const consent = await storage.getSocialConsentByCandidate(req.tenant.id, candidateId);
      if (!consent || consent.consentStatus !== 'granted') {
        return res.status(403).json({ message: "Candidate has not granted consent for social screening" });
      }
      
      const metadata = consent.metadata as { platforms?: string[] } | null;
      const consentedPlatforms = metadata?.platforms || [];
      if (!consentedPlatforms.includes(platform)) {
        return res.status(403).json({ message: `Candidate has not consented to ${platform} screening` });
      }
      
      const profile = await storage.createSocialProfile(req.tenant.id, {
        candidateId,
        platform,
        profileUrl,
        profileUsername,
        consentId: consent.id
      });
      
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating social profile:", error);
      res.status(500).json({ message: "Failed to create social profile" });
    }
  });

  app.patch("/api/social-screening/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.updateSocialProfile(req.tenant.id, req.params.id, req.body);
      if (!profile) {
        return res.status(404).json({ message: "Social profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error updating social profile:", error);
      res.status(500).json({ message: "Failed to update social profile" });
    }
  });

  app.delete("/api/social-screening/profiles/:id", async (req, res) => {
    try {
      const success = await storage.deleteSocialProfile(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Social profile not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting social profile:", error);
      res.status(500).json({ message: "Failed to delete social profile" });
    }
  });

  // Social Screening - Findings
  // Helper: enrich findings with candidate names so the client doesn't need a separate lookup
  async function enrichFindingsWithCandidateNames(tenantId: string, findings: any[]) {
    if (findings.length === 0) return findings;
    const uniqueIds = [...new Set(findings.map(f => f.candidateId).filter(Boolean))];
    const candidateMap = new Map<string, string>();
    await Promise.all(uniqueIds.map(async (id) => {
      const candidate = await storage.getCandidate(tenantId, id);
      if (candidate) candidateMap.set(id, candidate.fullName);
    }));
    return findings.map(f => ({
      ...f,
      candidateName: candidateMap.get(f.candidateId) || 'Unknown Candidate',
    }));
  }

  app.get("/api/social-screening/findings", async (req, res) => {
    try {
      const candidateId = req.query.candidateId as string | undefined;
      const findings = await storage.getSocialScreeningFindings(req.tenant.id, candidateId);
      res.json(await enrichFindingsWithCandidateNames(req.tenant.id, findings));
    } catch (error) {
      console.error("Error fetching social findings:", error);
      res.status(500).json({ message: "Failed to fetch social findings" });
    }
  });

  app.get("/api/social-screening/findings/pending-review", async (req, res) => {
    try {
      const findings = await storage.getPendingHumanReviewFindings(req.tenant.id);
      res.json(await enrichFindingsWithCandidateNames(req.tenant.id, findings));
    } catch (error) {
      console.error("Error fetching pending review findings:", error);
      res.status(500).json({ message: "Failed to fetch pending findings" });
    }
  });

  app.get("/api/social-screening/findings/:id", async (req, res) => {
    try {
      const finding = await storage.getSocialScreeningFinding(req.tenant.id, req.params.id);
      if (!finding) {
        return res.status(404).json({ message: "Social screening finding not found" });
      }
      const [enriched] = await enrichFindingsWithCandidateNames(req.tenant.id, [finding]);
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching social finding:", error);
      res.status(500).json({ message: "Failed to fetch social finding" });
    }
  });

  app.get("/api/social-screening/findings/candidate/:candidateId", async (req, res) => {
    try {
      const findings = await storage.getSocialScreeningFindingsByCandidate(req.tenant.id, req.params.candidateId);
      res.json(await enrichFindingsWithCandidateNames(req.tenant.id, findings));
    } catch (error) {
      console.error("Error fetching social findings:", error);
      res.status(500).json({ message: "Failed to fetch social findings" });
    }
  });

  // Initiate social screening for a candidate (legacy simple endpoint)
  app.post("/api/social-screening/initiate/:candidateId", async (req, res) => {
    try {
      const candidateId = req.params.candidateId;
      
      // Verify candidate exists
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Check consent status
      const consent = await storage.getSocialConsentByCandidate(req.tenant.id, candidateId);
      if (!consent || consent.consentStatus !== 'granted') {
        return res.status(403).json({ message: "Candidate consent required before initiating social screening" });
      }
      
      // Create integrity check for social screening
      const integrityCheck = await storage.createIntegrityCheck(req.tenant.id, {
        candidateId,
        checkType: 'social_screening',
        status: 'pending'
      });
      
      const metadata = consent.metadata as { platforms?: string[], socialHandles?: Record<string, string> } | null;
      const platforms = metadata?.platforms || [];
      const socialHandles = metadata?.socialHandles || {};
      
      // Create social screening finding record
      const finding = await storage.createSocialScreeningFinding(req.tenant.id, {
        candidateId,
        integrityCheckId: integrityCheck.id,
        riskLevel: 'unknown',
        topicsIdentified: platforms,
        humanReviewStatus: 'pending'
      });
      
      // Import and run the social screening agent
      try {
        const { SocialScreeningAgent } = await import("./social-screening-agent");
        const agent = new SocialScreeningAgent(storage);
        
        // Run analysis asynchronously
        agent.runScreening(req.tenant.id, finding.id, platforms, socialHandles)
          .catch((err: Error) => console.error("Social screening failed:", err));
      } catch (agentError) {
        console.warn("Social screening agent not available, marking for manual review:", agentError);
      }
      
      res.status(201).json({ 
        integrityCheck, 
        finding,
        message: "Social screening initiated" 
      });
    } catch (error) {
      console.error("Error initiating social screening:", error);
      res.status(500).json({ message: "Failed to initiate social screening" });
    }
  });
  
  // Start orchestrated social screening with agent visualization
  app.post("/api/social-screening/orchestrator/start/:candidateId", async (req, res) => {
    try {
      const candidateId = req.params.candidateId;
      
      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const { createOrchestrator } = await import("./social-screening-orchestrator");
      const orchestrator = createOrchestrator(storage);
      
      const runId = await orchestrator.initiateScreening(req.tenant.id, candidateId);
      
      res.status(201).json({ 
        runId,
        message: "Orchestrated screening started",
        statusUrl: `/api/social-screening/orchestrator/status/${runId}`
      });
    } catch (error) {
      console.error("Error starting orchestrated screening:", error);
      res.status(500).json({ message: "Failed to start orchestrated screening" });
    }
  });
  
  // Get orchestrator run status
  app.get("/api/social-screening/orchestrator/status/:runId", async (req, res) => {
    try {
      const { createOrchestrator } = await import("./social-screening-orchestrator");
      const orchestrator = createOrchestrator(storage);
      
      const run = orchestrator.getActiveRun(req.params.runId);
      if (!run) {
        return res.status(404).json({ message: "Run not found or expired" });
      }

      // Transform to the format the client expects
      const agents = [
        run.orchestratorStatus,
        run.facebookAgentStatus,
        run.xAgentStatus,
        run.linkedinAgentStatus,
        run.instagramAgentStatus,
      ].filter(Boolean);

      const completedAgents = agents.filter(a => a.status === 'completed').length;
      const totalAgents = agents.length;
      const progress = Math.round((completedAgents / totalAgents) * 100);

      res.json({
        ...run,
        agents,
        progress: run.status === 'completed' ? 100 : progress,
        result: run.orchestratorStatus?.results || null,
      });
    } catch (error) {
      console.error("Error fetching orchestrator status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });
  
  // Get all active orchestrator runs
  app.get("/api/social-screening/orchestrator/runs", async (req, res) => {
    try {
      const { createOrchestrator } = await import("./social-screening-orchestrator");
      const orchestrator = createOrchestrator(storage);
      
      const runs = orchestrator.getAllActiveRuns()
        .filter(run => run.tenantId === req.tenant.id);
      
      res.json(runs);
    } catch (error) {
      console.error("Error fetching orchestrator runs:", error);
      res.status(500).json({ message: "Failed to fetch runs" });
    }
  });

  // Human review of social screening findings
  app.post("/api/social-screening/findings/:id/review", async (req, res) => {
    try {
      const { decision, reviewerNotes, adjustedRiskLevel, adjustedCultureFitScore } = req.body;
      
      const finding = await storage.getSocialScreeningFinding(req.tenant.id, req.params.id);
      if (!finding) {
        return res.status(404).json({ message: "Social screening finding not found" });
      }
      
      const updated = await storage.updateSocialScreeningFinding(req.tenant.id, req.params.id, {
        humanReviewStatus: decision, // 'approved' | 'rejected' | 'modified' | 'pending'
        humanReviewNotes: reviewerNotes,
        humanReviewedAt: new Date(),
        riskLevel: adjustedRiskLevel || finding.riskLevel,
        cultureFitScore: adjustedCultureFitScore ?? finding.cultureFitScore,
        humanOverrideScore: adjustedCultureFitScore,
        humanOverrideReason: adjustedCultureFitScore ? reviewerNotes : undefined
      });
      
      // Update related integrity check
      if (finding.integrityCheckId) {
        await storage.updateIntegrityCheck(req.tenant.id, finding.integrityCheckId, {
          status: decision === 'approved' ? 'passed' : decision === 'rejected' ? 'failed' : 'flagged',
          completedAt: new Date(),
          result: JSON.stringify({
            socialScreeningResult: decision,
            riskLevel: adjustedRiskLevel || finding.riskLevel,
            cultureFitScore: adjustedCultureFitScore ?? finding.cultureFitScore
          })
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error reviewing social finding:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Get posts for a finding
  app.get("/api/social-screening/findings/:findingId/posts", async (req, res) => {
    try {
      const posts = await storage.getSocialScreeningPosts(req.tenant.id, req.params.findingId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching social posts:", error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  // Cleanup expired posts (admin/cron endpoint)
  app.post("/api/social-screening/cleanup-expired", requireAdmin, async (req, res) => {
    try {
      const deletedCount = await storage.deleteExpiredSocialScreeningPosts();
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error("Error cleaning up expired posts:", error);
      res.status(500).json({ message: "Failed to cleanup expired posts" });
    }
  });

  // Get social screening dashboard stats
  app.get("/api/social-screening/stats", async (req, res) => {
    try {
      const [consents, findings, pendingReviews] = await Promise.all([
        storage.getAllSocialConsents(req.tenant.id),
        storage.getSocialScreeningFindings(req.tenant.id),
        storage.getPendingHumanReviewFindings(req.tenant.id)
      ]);
      
      const stats = {
        totalConsentsRequested: consents.length,
        consentGranted: consents.filter(c => c.consentStatus === 'granted').length,
        consentPending: consents.filter(c => c.consentStatus === 'pending').length,
        consentDenied: consents.filter(c => c.consentStatus === 'denied').length,
        totalScreenings: findings.length,
        screeningsCompleted: findings.filter(f => f.humanReviewStatus === 'approved' || f.humanReviewStatus === 'rejected').length,
        screeningsPending: findings.filter(f => f.humanReviewStatus === 'pending').length,
        screeningsModified: findings.filter(f => f.humanReviewStatus === 'modified').length,
        pendingHumanReview: pendingReviews.length,
        averageCultureFitScore: findings.filter(f => f.cultureFitScore !== null).reduce((sum, f) => sum + (f.cultureFitScore || 0), 0) / 
          (findings.filter(f => f.cultureFitScore !== null).length || 1),
        riskDistribution: {
          low: findings.filter(f => f.riskLevel === 'low').length,
          medium: findings.filter(f => f.riskLevel === 'medium').length,
          high: findings.filter(f => f.riskLevel === 'high').length,
          critical: findings.filter(f => f.riskLevel === 'critical').length
        }
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching social screening stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ==================== ADMIN TENANT MANAGEMENT (continued) ====================

  // Get tenant payments
  app.get("/api/admin/tenants/:tenantId/payments", async (req, res) => {
    try {
      const payments = await storage.getTenantPayments(req.params.tenantId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching tenant payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Record a payment
  app.post("/api/admin/tenants/:tenantId/payments", async (req, res) => {
    try {
      const payment = await storage.createTenantPayment({
        tenantId: req.params.tenantId,
        ...req.body,
      });
      res.json(payment);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // Update tenant subscription
  app.patch("/api/admin/tenants/:tenantId/subscription", async (req, res) => {
    try {
      const tenant = await storage.updateTenantSubscription(req.params.tenantId, req.body);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Impersonate tenant (admin only)
  app.post("/api/admin/impersonate-tenant", async (req, res) => {
    try {
      const { tenantId } = req.body;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error impersonating tenant:", error);
      res.status(500).json({ message: "Failed to impersonate tenant" });
    }
  });

  // Get subscription plans
  app.get("/api/admin/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Seed Fleet Logix data for a tenant (admin only)
  app.post("/api/admin/seed-fleetlogix/:tenantId", async (req, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const results = { routes: 0, vehicles: 0, drivers: 0, loads: 0 };

      // Sample routes data
      const routes = [
        { name: 'Exxaro Leeuwpan - Sasol Bosjesspruit', origin: 'Exxaro Leeuwpan', destination: 'Sasol Bosjesspruit', distance: 102 },
        { name: 'Exxaro Leeuwpan - Sasol Site 1', origin: 'Exxaro Leeuwpan', destination: 'Sasol Site 1', distance: 85 },
        { name: 'Kleinfontein - Arnot', origin: 'Kleinfontein', destination: 'Arnot', distance: 145 },
        { name: 'Leeuwport Mine - Lk Tlou', origin: 'Leeuwport Mine', destination: 'Lk Tlou', distance: 29 },
        { name: 'Lk Tlou - Middelbult', origin: 'Lk Tlou', destination: 'Middelbult', distance: 70 },
        { name: 'Lk Tlou - Sasol Bosjesspruit', origin: 'Lk Tlou', destination: 'Sasol Bosjesspruit', distance: 85 },
        { name: 'Lk Tlou - Sasol Impumelelo', origin: 'Lk Tlou', destination: 'Sasol Impumelelo', distance: 73 },
        { name: 'Lk Tlou - Shondoni', origin: 'Lk Tlou', destination: 'Shondoni', distance: 58 },
        { name: 'LK Tlou - Arnot', origin: 'LK Tlou', destination: 'Arnot', distance: 145 },
        { name: 'LK Tlou - Kleinfontein', origin: 'LK Tlou', destination: 'Kleinfontein', distance: 110 },
        { name: 'LK Tlou - Hendrina', origin: 'LK Tlou', destination: 'Hendrina', distance: 136 },
        { name: 'Matsambisa Kriel - Arnot', origin: 'Matsambisa Kriel', destination: 'Arnot', distance: 126 },
        { name: 'Matsambisa Kriel - Hendrina Power', origin: 'Matsambisa Kriel', destination: 'Hendrina Power', distance: 122 },
        { name: 'Matsambisa Kriel - Resinga', origin: 'Matsambisa Kriel', destination: 'Resinga', distance: 96 },
        { name: 'Mavungwani - Duvha Power Station', origin: 'Mavungwani', destination: 'Duvha Power Station', distance: 82 },
        { name: 'Mavungwani - Hendrina Power', origin: 'Mavungwani', destination: 'Hendrina Power', distance: 47 },
        { name: 'Mavungwani - Matla Power', origin: 'Mavungwani', destination: 'Matla Power', distance: 108 },
        { name: 'Resinga Mine - Arnot', origin: 'Resinga Mine', destination: 'Arnot', distance: 52 },
        { name: 'Resinga Mine - Camden', origin: 'Resinga Mine', destination: 'Camden', distance: 62 },
        { name: 'Resinga Mine - Matla', origin: 'Resinga Mine', destination: 'Matla', distance: 105 },
      ];

      // Insert routes
      for (const route of routes) {
        try {
          await storage.createFleetLogixRoute(tenantId, {
            name: route.name,
            origin: route.origin,
            destination: route.destination,
            distance: route.distance.toString(),
            status: 'active'
          });
          results.routes++;
        } catch (e) { /* Skip duplicates */ }
      }

      // Sample vehicles data
      const vehicles = [
        { registration: 'KX31ZLGP - FL04', fleetNumber: 'FL04' },
        { registration: 'KX31ZNGP - FL09', fleetNumber: 'FL09' },
        { registration: 'KX31ZSGP - FL25', fleetNumber: 'FL25' },
        { registration: 'KX32BVGP - FL23', fleetNumber: 'FL23' },
        { registration: 'KX32CMGP - FL10', fleetNumber: 'FL10' },
        { registration: 'KX32CXGP - FL14', fleetNumber: 'FL14' },
        { registration: 'KX32DBGP - FL12', fleetNumber: 'FL12' },
        { registration: 'LC18JZGP - FL29', fleetNumber: 'FL29' },
        { registration: 'LC18KGGP - FL27', fleetNumber: 'FL27' },
        { registration: 'LC18KPGP - FL05', fleetNumber: 'FL05' },
        { registration: 'LC18KWGP - FL06', fleetNumber: 'FL06' },
        { registration: 'LC18KZGP - FL17', fleetNumber: 'FL17' },
        { registration: 'LC18LFGP - FL08', fleetNumber: 'FL08' },
        { registration: 'LC18LKGP - FL02', fleetNumber: 'FL02' },
        { registration: 'LC18LTGP - FL30', fleetNumber: 'FL30' },
        { registration: 'LG23HJGP - FL19', fleetNumber: 'FL19' },
        { registration: 'LG23HTGP - FL15', fleetNumber: 'FL15' },
        { registration: 'LG23KSGP - FL28', fleetNumber: 'FL28' },
        { registration: 'LG23MCGP - FL26', fleetNumber: 'FL26' },
        { registration: 'LG24BKGP - FL24', fleetNumber: 'FL24' },
        { registration: 'LG24BXGP - FL16', fleetNumber: 'FL16' },
        { registration: 'LG24CDGP - FL22', fleetNumber: 'FL22' },
        { registration: 'LG24CKGP - FL21', fleetNumber: 'FL21' },
        { registration: 'LG24GBGP - FL20', fleetNumber: 'FL20' },
        { registration: 'LG24GGGP - FL03', fleetNumber: 'FL03' },
        { registration: 'LG24GMGP - FL01', fleetNumber: 'FL01' },
        { registration: 'LG24GXGP - FL11', fleetNumber: 'FL11' },
        { registration: 'LG24HFGP - FL07', fleetNumber: 'FL07' },
        { registration: 'LG24HKGP - FL31', fleetNumber: 'FL31' },
        { registration: 'LG29CZGP - FL18', fleetNumber: 'FL18' },
        { registration: 'KX31ZJGP - FL13', fleetNumber: 'FL13' },
      ];

      // Insert vehicles
      for (const vehicle of vehicles) {
        try {
          await storage.createFleetLogixVehicle(tenantId, {
            registration: vehicle.registration,
            fleetNumber: vehicle.fleetNumber,
            type: 'Truck',
            capacity: '34',
            status: 'active'
          });
          results.vehicles++;
        } catch (e) { /* Skip duplicates */ }
      }

      // Sample drivers data
      const drivers = [
        'Ayanda Tembe', 'Meshack Khathide', 'Sihle Thabo Nkosi', 'Sandile Peter Nzimande',
        'Witness Nkosi', 'Themba Simelane', 'Welcome Mashaya', 'Production Mthethwa',
        'Bhekinkozi Ismael Zwane', 'Siphesihle Xaba', 'Albert Mduduzi Zikalala', 'Sandiso Siyaya',
        'Nkosenhle Ndlovu', 'Lennox Banele Ncanazo', 'Sammy Mahlangu', 'Xolani Ngcobo',
        'Melizwe Siyaya', 'Nkosivumile Luphuzi', 'Dumusani Masilela', 'Khanyisani Lembethe',
        'Vincent Nkosi', 'Mlungisi Nkambula', 'Zamani Buthelezi', 'Wonder Innocent Kubheka',
        'Thabani Mpungose', 'Phumlani Simo Mthethwa', 'Jabulani Buthelezi', 'Mandla Frans Khumalo',
        'Sbusiso Samson Kubheka', 'Happy Mashilwane', 'Bongani Mnisi', 'Thulani Victor Magagula',
        'Nhlanhla Mafutha Myeni', 'Wonderful Sandile Qwabe', 'Bheki Zulu', 'Siswe Zwane',
        'Sakhile Freedom Mabaso', 'Thulani Sabelo Simelane', 'Musa Zwane', 'Sipho Nkosi'
      ];

      // Insert drivers
      for (const name of drivers) {
        try {
          await storage.createFleetLogixDriver(tenantId, {
            name,
            status: 'active',
            salaryPeriod: 'monthly'
          });
          results.drivers++;
        } catch (e) { /* Skip duplicates */ }
      }

      // Get created resources for sample loads
      const allDrivers = await storage.getFleetLogixDrivers(tenantId);
      const allVehicles = await storage.getFleetLogixVehicles(tenantId);
      const allRoutes = await storage.getFleetLogixRoutes(tenantId);

      // Create sample loads
      if (allDrivers.length > 0 && allVehicles.length > 0 && allRoutes.length > 0) {
        for (let i = 0; i < Math.min(30, allDrivers.length); i++) {
          try {
            const loadDate = new Date();
            loadDate.setDate(loadDate.getDate() - i);
            
            await storage.createFleetLogixLoad(tenantId, {
              loadNumber: `LOAD-${loadDate.toISOString().split('T')[0]}-${i + 1}`,
              driverId: allDrivers[i % allDrivers.length].id,
              vehicleId: allVehicles[i % allVehicles.length].id,
              routeId: allRoutes[i % allRoutes.length].id,
              loadDate: loadDate.toISOString().split('T')[0],
              weight: (30 + Math.random() * 10).toFixed(2),
              revenue: (80 + Math.random() * 150).toFixed(2),
              status: 'delivered'
            });
            results.loads++;
          } catch (e) { /* Skip duplicates */ }
        }
      }

      res.json({ 
        success: true, 
        message: 'Fleet Logix data seeded successfully',
        results 
      });
    } catch (error) {
      console.error("Error seeding Fleet Logix data:", error);
      res.status(500).json({ message: "Failed to seed Fleet Logix data" });
    }
  });

  // ================================
  // LMS Routes
  // ================================

  // Get all courses
  app.get("/api/lms/courses", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const courses = await storage.getCourses(tenantId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get single course
  app.get("/api/lms/courses/:id", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const course = await storage.getCourse(req.params.id, tenantId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Create course
  app.post("/api/lms/courses", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      const course = await storage.createCourse({
        ...req.body,
        tenantId,
        createdBy: userId,
      });
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course
  app.patch("/api/lms/courses/:id", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const course = await storage.updateCourse(req.params.id, tenantId, req.body);
      res.json(course);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course
  app.delete("/api/lms/courses/:id", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      await storage.deleteCourse(req.params.id, tenantId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Get my progress (for individual learner view)
  app.get("/api/lms/my-progress", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      // Use default demo user if not authenticated
      const userId = req.user?.id || "63bf0d67-af57-454e-9979-5abbf05fe7e4";
      const progress = await storage.getLearnerProgress(userId, tenantId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Get all learners progress (HR admin view)
  app.get("/api/lms/all-progress", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const progress = await storage.getAllLearnersProgress(tenantId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching all progress:", error);
      res.status(500).json({ message: "Failed to fetch learners progress" });
    }
  });

  // Get all badges earned (HR admin view)
  app.get("/api/lms/all-badges", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const badges = await storage.getAllBadgesEarned(tenantId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching all badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Assign course to employee
  app.post("/api/lms/assign-course", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const { courseId, userId } = req.body;
      const assignment = await storage.assignCourseToEmployee(tenantId, courseId, userId);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning course:", error);
      res.status(500).json({ message: "Failed to assign course" });
    }
  });

  // Get employees for assignment (HR admin)
  app.get("/api/lms/employees", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const employees = await storage.getAllEmployees(tenantId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Get progress for specific course
  app.get("/api/lms/courses/:courseId/progress", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const progress = await storage.getCourseProgress(userId, req.params.courseId, tenantId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });

  // Update progress
  app.post("/api/lms/courses/:courseId/progress", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const progress = await storage.updateLearnerProgress(
        userId,
        req.params.courseId,
        tenantId,
        req.body
      );
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get assessments for course
  app.get("/api/lms/courses/:courseId/assessments", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const assessments = await storage.getCourseAssessments(req.params.courseId, tenantId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Submit assessment attempt
  app.post("/api/lms/assessments/:assessmentId/attempts", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const result = await storage.submitAssessmentAttempt(
        req.params.assessmentId,
        userId,
        tenantId,
        req.body.answers
      );
      res.json(result);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      res.status(500).json({ message: "Failed to submit assessment" });
    }
  });

  // Get my attempts
  app.get("/api/lms/assessments/:assessmentId/my-attempts", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const attempts = await storage.getAssessmentAttempts(
        req.params.assessmentId,
        userId,
        tenantId
      );
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  // Get my points
  app.get("/api/lms/my-points", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      // Use default demo user if not authenticated
      const userId = req.user?.id || "63bf0d67-af57-454e-9979-5abbf05fe7e4";
      const points = await storage.getLearnerPoints(userId, tenantId);
      res.json(points || { totalPoints: 0, level: 1, rank: 1, coursesCompleted: 0, hoursLearned: 0, badgesEarned: 0 });
    } catch (error) {
      console.error("Error fetching points:", error);
      res.status(500).json({ message: "Failed to fetch points" });
    }
  });

  // Get my badges
  app.get("/api/lms/my-badges", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      // Use default demo user if not authenticated
      const userId = req.user?.id || "63bf0d67-af57-454e-9979-5abbf05fe7e4";
      const badges = await storage.getLearnerBadges(userId, tenantId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Get leaderboard
  app.get("/api/lms/leaderboard", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getLeaderboard(tenantId, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get available badges
  app.get("/api/lms/badges", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const badges = await storage.getAllBadges(tenantId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Get AI lecturers
  app.get("/api/lms/ai-lecturers", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const lecturers = await storage.getAILecturers(tenantId);
      res.json(lecturers);
    } catch (error) {
      console.error("Error fetching AI lecturers:", error);
      res.status(500).json({ message: "Failed to fetch AI lecturers" });
    }
  });

  // ================================
  // Course Reminder Routes (WhatsApp)
  // ================================

  // Send reminder to learner via WhatsApp
  app.post("/api/lms/reminders", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const senderId = req.user?.id;
      const { userId, courseId, learnerProgressId, message, channel } = req.body;
      
      if (!userId || !courseId || !learnerProgressId || !message) {
        return res.status(400).json({ message: "Missing required fields: userId, courseId, learnerProgressId, message" });
      }

      // Check for recent reminders (throttle - 24 hours)
      const recentReminders = await storage.getRecentRemindersForUser(userId, courseId, tenantId, 24);
      if (recentReminders.length > 0) {
        const lastSent = new Date(recentReminders[0].createdAt);
        const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
        return res.status(429).json({ 
          message: `A reminder was sent ${Math.floor(hoursSince)} hours ago. Please wait 24 hours between reminders.`,
          lastReminderAt: lastSent,
        });
      }

      // Get user and employee info for phone number
      const [user, employee] = await Promise.all([
        storage.getUser(userId),
        storage.getEmployee(tenantId, userId),
      ]);

      const phone = employee?.phone;
      
      // Create the reminder record
      const reminder = await storage.createCourseReminder({
        tenantId,
        learnerProgressId,
        userId,
        courseId,
        message,
        channel: channel || "whatsapp",
        sentBy: senderId,
        metadata: { 
          userName: user?.username,
          employeeName: employee?.fullName,
          phone,
        },
      });

      // Send via WhatsApp if phone is available and channel is whatsapp
      if (phone && (!channel || channel === "whatsapp")) {
        const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
        const token = process.env.WHATSAPP_API_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (token && phoneNumberId) {
          try {
            const response = await fetch(
              `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: phone,
                  type: "text",
                  text: { body: message },
                }),
              }
            );

            if (response.ok) {
              await storage.updateCourseReminderStatus(reminder.id, "sent", new Date());
              return res.json({ ...reminder, status: "sent", deliveryMethod: "whatsapp" });
            } else {
              const errorData = await response.json();
              console.error("WhatsApp API error:", errorData);
              await storage.updateCourseReminderStatus(reminder.id, "failed");
              return res.json({ ...reminder, status: "failed", error: errorData?.error?.message, deliveryMethod: "whatsapp_failed" });
            }
          } catch (error: any) {
            console.error("WhatsApp delivery failed:", error);
            await storage.updateCourseReminderStatus(reminder.id, "failed");
            return res.json({ ...reminder, status: "failed", error: error.message, deliveryMethod: "whatsapp_failed" });
          }
        }
      }

      // If no phone or WhatsApp not configured, mark as pending (in-app only)
      return res.json({ ...reminder, status: "pending", deliveryMethod: "in_app" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // Get course reminders history
  app.get("/api/lms/reminders", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const { userId, courseId, status } = req.query;
      const reminders = await storage.getCourseReminders(tenantId, {
        userId: userId as string,
        courseId: courseId as string,
        status: status as string,
      });
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // ================================
  // Certificate Routes
  // ================================

  // Get certificate templates
  app.get("/api/lms/certificate-templates", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const templates = await storage.getCertificateTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Upload certificate template
  app.post("/api/lms/certificate-templates", upload.single("template"), async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filename = `cert-template-${Date.now()}-${req.file.originalname}`;
      const filepath = path.join(process.cwd(), "uploads", "certificates", filename);
      
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, req.file.buffer);

      const template = await storage.createCertificateTemplate({
        tenantId,
        name: req.body.name,
        description: req.body.description,
        templateUrl: `/uploads/certificates/${filename}`,
        templateType: req.file.mimetype.includes("pdf") ? "pdf" : "image",
        placeholderFields: JSON.parse(req.body.placeholderFields || "[]"),
        defaultFields: JSON.parse(req.body.defaultFields || "{}"),
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error uploading template:", error);
      res.status(500).json({ message: "Failed to upload template" });
    }
  });

  // Issue certificate
  app.post("/api/lms/certificates/issue", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const { templateId, userId, courseId, certificateData } = req.body;

      const template = await storage.getCertificateTemplate(templateId, tenantId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const certificateUrl = `/certificates/${Date.now()}-${userId}.pdf`;
      
      const certificate = await storage.issueCertificate({
        tenantId,
        templateId,
        userId,
        courseId,
        certificateData,
        certificateUrl,
      });

      res.status(201).json(certificate);
    } catch (error) {
      console.error("Error issuing certificate:", error);
      res.status(500).json({ message: "Failed to issue certificate" });
    }
  });

  // Get my certificates
  app.get("/api/lms/my-certificates", async (req, res) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const certificates = await storage.getUserCertificates(userId, tenantId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Verify certificate
  app.get("/api/lms/certificates/verify/:number", async (req, res) => {
    try {
      const certificate = await storage.verifyCertificate(req.params.number);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(500).json({ message: "Failed to verify certificate" });
    }
  });

  // ========== PNET AI AGENT ROUTES ==========
  
  /**
   * Check if a PNET job is active and get application requirements
   * Used by AI agents before applying candidates
   */
  app.post("/api/pnet/inquiry", async (req, res) => {
    try {
      const { jobUrl, atsJobId } = req.body;

      if (!jobUrl) {
        return res.status(400).json({ message: "jobUrl is required" });
      }

      const inquiry = await pnetAPIService.inquireJob(jobUrl, jobUrl, atsJobId);
      res.json(inquiry);
    } catch (error: any) {
      console.error("PNET inquiry error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Apply a single candidate to a PNET job using AI agent
   */
  app.post("/api/pnet/apply-candidate", async (req, res) => {
    try {
      const { candidateId, jobUrl, jobTitle, jobDescription } = req.body;

      if (!candidateId || !jobUrl) {
        return res.status(400).json({ message: "candidateId and jobUrl are required" });
      }

      const candidate = await storage.getCandidateById(req.tenantId, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const result = await pnetApplicationAgent.applyToJob({
        candidate,
        jobUrl,
        jobTitle,
        jobDescription,
      });

      if (result.success) {
        // Log the application in our system
        await storage.createApplication({
          jobId: req.body.jobId || '', // Optional: link to internal job
          candidateId: candidateId,
          tenantId: req.tenantId,
          stage: 'applied',
          source: 'PNET AI Agent',
          notes: `Applied via PNET API. Application ID: ${result.pnetApplicationId}`,
        } as any);
      }

      res.json(result);
    } catch (error: any) {
      console.error("PNET apply error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Bulk apply multiple candidates to a PNET job using AI agent
   */
  app.post("/api/pnet/bulk-apply", async (req, res) => {
    try {
      const { candidateIds, jobUrl, jobTitle, jobDescription } = req.body;

      if (!candidateIds || !Array.isArray(candidateIds) || !jobUrl) {
        return res.status(400).json({ message: "candidateIds (array) and jobUrl are required" });
      }

      // Fetch all candidates
      const candidates = await Promise.all(
        candidateIds.map(id => storage.getCandidateById(req.tenantId, id))
      );

      const validCandidates = candidates.filter(c => c !== null);

      if (validCandidates.length === 0) {
        return res.status(404).json({ message: "No valid candidates found" });
      }

      const result = await pnetApplicationAgent.bulkApply(
        validCandidates,
        jobUrl,
        jobTitle,
        jobDescription
      );

      // Log successful applications
      for (const appResult of result.results) {
        if (appResult.success) {
          try {
            await storage.createApplication({
              jobId: req.body.jobId || '',
              candidateId: appResult.candidateId,
              tenantId: req.tenantId,
              stage: 'applied',
              source: 'PNET AI Agent (Bulk)',
              notes: `Bulk applied via PNET API: ${appResult.message}`,
            } as any);
          } catch (err) {
            console.error('Failed to log application:', err);
          }
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("PNET bulk apply error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Get PNET job info (for AI agent decision making)
   */
  app.get("/api/pnet/job-info", async (req, res) => {
    try {
      const { jobUrl } = req.query;

      if (!jobUrl || typeof jobUrl !== 'string') {
        return res.status(400).json({ message: "jobUrl query parameter is required" });
      }

      const jobInfo = await pnetAPIService.isJobActiveAndReady(jobUrl);
      res.json(jobInfo);
    } catch (error: any) {
      console.error("PNET job info error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * AI Agent: Auto-match and apply best candidates to a PNET job
   * This is the "smart apply" feature where AI selects and applies candidates automatically
   */
  app.post("/api/pnet/auto-apply", async (req, res) => {
    try {
      const { jobUrl, jobTitle, jobDescription, maxCandidates = 5, minMatchScore = 70 } = req.body;

      if (!jobUrl) {
        return res.status(400).json({ message: "jobUrl is required" });
      }

      // Step 1: Check if job is active
      const jobInfo = await pnetAPIService.isJobActiveAndReady(jobUrl);
      if (!jobInfo.isActive) {
        return res.status(400).json({ message: "Job is not active on PNET" });
      }

      // Step 2: Get all candidates
      const allCandidates = await storage.getCandidates(req.tenantId);

      // Step 3: AI ranks candidates (simplified - you can enhance this)
      // TODO: Implement proper AI matching using groqService
      const rankedCandidates = allCandidates
        .slice(0, maxCandidates);

      if (rankedCandidates.length === 0) {
        return res.status(404).json({ message: "No suitable candidates found" });
      }

      // Step 4: Auto-apply top candidates
      const result = await pnetApplicationAgent.bulkApply(
        rankedCandidates,
        jobUrl,
        jobTitle,
        jobDescription
      );

      res.json({
        ...result,
        message: `Auto-applied ${result.successful} out of ${result.total} candidates`,
      });
    } catch (error: any) {
      console.error("PNET auto-apply error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Post a job to PNET
   */
  app.post("/api/pnet/post-job", async (req, res) => {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }

      const job = await storage.getJob(req.tenant.id, jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const result = await pnetJobPostingAgent.postJob(job, req.tenant.id);

      if (result.success && result.pnetJobId) {
        // Store PNET job ID in database
        await storage.updateJob(req.tenant.id, jobId, {
          pnetJobId: result.pnetJobId,
          pnetJobUrl: result.pnetUrl,
        } as any);
      }

      res.json(result);
    } catch (error: any) {
      console.error("PNET post job error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Update a job on PNET
   */
  app.patch("/api/pnet/update-job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await storage.getJob(req.tenant.id, parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const pnetJobId = (job as any).pnetJobId;
      if (!pnetJobId) {
        return res.status(400).json({ message: "Job not posted to PNET yet" });
      }

      const result = await pnetJobPostingAgent.updateJob(job, pnetJobId, req.tenant.id);
      res.json(result);
    } catch (error: any) {
      console.error("PNET update job error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Close/delete a job on PNET
   */
  app.delete("/api/pnet/close-job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await storage.getJob(req.tenant.id, parseInt(jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const pnetJobId = (job as any).pnetJobId;
      if (!pnetJobId) {
        return res.status(400).json({ message: "Job not posted to PNET" });
      }

      const result = await pnetJobPostingAgent.closeJob(pnetJobId);

      if (result.success) {
        // Clear PNET job ID from database
        await storage.updateJob(req.tenant.id, parseInt(jobId), {
          pnetJobId: null,
          pnetJobUrl: null,
        } as any);
      }

      res.json(result);
    } catch (error: any) {
      console.error("PNET close job error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * Bulk post multiple jobs to PNET
   */
  app.post("/api/pnet/bulk-post-jobs", async (req, res) => {
    try {
      const { jobIds } = req.body;

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({ message: "Job IDs array is required" });
      }

      const jobs = await Promise.all(
        jobIds.map(id => storage.getJob(req.tenant.id, id))
      );

      const validJobs = jobs.filter(job => job !== null) as any[];

      const result = await pnetJobPostingAgent.bulkPostJobs(validJobs, req.tenant.id);

      // Update database with PNET job IDs
      for (const jobResult of result.results) {
        if (jobResult.success && jobResult.pnetJobId) {
          await storage.updateJob(req.tenant.id, jobResult.jobId, {
            pnetJobId: jobResult.pnetJobId,
          } as any);
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("PNET bulk post jobs error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Register weighbridge routes
  registerWeighbridgeRoutes(app);

  // Register Fleet Logix routes
  registerFleetLogixRoutes(app);

  // ============= EXTERNAL API PROXY: WEFINDJOBS =============
  const WEFINDJOBS_BASE = "https://wefindjobs.co.za";
  
  app.get("/api/proxy/wefindjobs/profiles", async (req, res) => {
    try {
      const response = await fetch(`${WEFINDJOBS_BASE}/api/profiles`);
      if (!response.ok) {
        throw new Error(`WeFindjobs API error: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching wefindjobs profiles:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch profiles" });
    }
  });

  app.get("/api/proxy/wefindjobs/contacts", async (req, res) => {
    try {
      const response = await fetch(`${WEFINDJOBS_BASE}/api/contacts`);
      if (!response.ok) {
        throw new Error(`WeFindjobs API error: ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching wefindjobs contacts:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch contacts" });
    }
  });

  // ============= RAG SUPPORT CHATBOT =============
  app.post("/api/support/chat", async (req, res) => {
    try {
      const { question, sessionId } = req.body;
      
      if (!question || typeof question !== "string") {
        return res.status(400).json({ success: false, message: "Question is required" });
      }

      const response = await ragSupportService.getAnswer(question, sessionId || "default");
      res.json({ success: true, ...response });
    } catch (error: any) {
      console.error("RAG Support error:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to get support response" });
    }
  });

  app.post("/api/support/clear-history", async (req, res) => {
    try {
      const { sessionId } = req.body;
      ragSupportService.clearHistory(sessionId || "default");
      res.json({ success: true, message: "Conversation history cleared" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to clear history" });
    }
  });

  // ============= OFFERS MANAGEMENT =============

  app.get("/api/offers", async (req, res) => {
    try {
      const allOffers = await storage.getAllOffers(req.tenant.id);
      const now = new Date();
      const enriched = await Promise.all(allOffers.map(async (offer) => {
        // Auto-expire sent offers past their expiresAt date
        if (offer.status === "sent" && offer.expiresAt && new Date(offer.expiresAt) < now) {
          try {
            await storage.updateOffer(req.tenant.id, offer.id, { status: "expired" } as any);
            offer = { ...offer, status: "expired" };
          } catch {}
        }
        const candidate = await storage.getCandidate(req.tenant.id, offer.candidateId);
        return {
          ...offer,
          candidateName: candidate?.fullName || "Unknown Candidate",
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.get("/api/offers/candidate/:candidateId", async (req, res) => {
    try {
      const offer = await storage.getOfferByCandidateId(req.tenant.id, req.params.candidateId);
      res.json(offer || null);
    } catch (error) {
      console.error("Error fetching candidate offer:", error);
      res.status(500).json({ message: "Failed to fetch candidate offer" });
    }
  });

  app.get("/api/offers/:id", async (req, res) => {
    try {
      const offer = await storage.getOffer(req.tenant.id, req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  app.post("/api/offers", async (req, res) => {
    try {
      const result = insertOfferSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const offer = await storage.createOffer(req.tenant.id, result.data);
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  app.patch("/api/offers/:id", async (req, res) => {
    try {
      const result = insertOfferSchema.partial().safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const offer = await storage.updateOffer(req.tenant.id, req.params.id, result.data);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete("/api/offers/:id", async (req, res) => {
    try {
      const success = await storage.deleteOffer(req.tenant.id, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  // Generate document preview (returns DOCX binary, no file saved)
  app.post("/api/offers/generate-document-preview", async (req, res) => {
    try {
      const { candidateId, jobId, contractType, salary, startDate, benefits } = req.body;
      if (!candidateId || !contractType) {
        return res.status(400).json({ message: "candidateId and contractType are required" });
      }

      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      let jobTitle = candidate.role || "Position";
      let department = "";
      if (jobId) {
        const job = await storage.getJob(req.tenant.id, jobId);
        if (job) {
          jobTitle = job.title;
          department = job.department || "";
        }
      }

      const { createDocumentGenerator } = await import("./document-generator");
      const docGenerator = createDocumentGenerator(storage);

      const employeeData: EmployeeData = {
        fullName: candidate.fullName,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
        jobTitle,
        department,
        startDate: startDate || "TBD",
        salary: salary || undefined,
        currency: "ZAR",
        benefits: benefits || undefined,
        companyName: "MTN Recruiting",
      };

      const { buffer, filename, mimeType } = await docGenerator.generateDocumentForOffer(
        req.tenant.id,
        contractType,
        employeeData
      );

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating document preview:", error);
      res.status(500).json({ message: "Failed to generate document preview" });
    }
  });

  app.post("/api/offers/:id/send", upload.single("attachment"), async (req, res) => {
    try {
      const offer = await storage.getOffer(req.tenant.id, req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const candidate = await storage.getCandidate(req.tenant.id, offer.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      let jobTitle = candidate.role || "Position";
      let department = "";
      if (offer.jobId) {
        const job = await storage.getJob(req.tenant.id, offer.jobId);
        if (job) {
          jobTitle = job.title;
          department = job.department || "";
        }
      }

      // Build email attachments from uploaded file
      const emailAttachments: { filename: string; content: Buffer; contentType?: string }[] = [];
      if (req.file) {
        emailAttachments.push({
          filename: req.file.originalname,
          content: req.file.buffer,
          contentType: req.file.mimetype,
        });
      }

      // If offer has contractType, generate DOCX, save to disk, and attach to email
      let documentPath: string | undefined;
      if (offer.contractType) {
        try {
          const { createDocumentGenerator } = await import("./document-generator");
          const docGenerator = createDocumentGenerator(storage);

          const employeeData: EmployeeData = {
            fullName: candidate.fullName,
            email: candidate.email || undefined,
            phone: candidate.phone || undefined,
            jobTitle,
            department,
            startDate: offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "TBD",
            salary: offer.salary || undefined,
            currency: offer.currency || "ZAR",
            benefits: Array.isArray(offer.benefits) ? offer.benefits as string[] : undefined,
            companyName: "MTN Recruiting",
          };

          const { buffer, filename, mimeType } = await docGenerator.generateDocumentForOffer(
            req.tenant.id,
            offer.contractType as any,
            employeeData
          );

          // Save to disk
          const uploadDir = path.join(process.cwd(), "uploads", "offer-documents");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const savedPath = path.join(uploadDir, filename);
          fs.writeFileSync(savedPath, buffer);
          documentPath = `/uploads/offer-documents/${filename}`;

          // Add generated document as email attachment
          emailAttachments.push({
            filename,
            content: buffer,
            contentType: mimeType,
          });
        } catch (docErr) {
          console.error("Document generation failed (non-blocking):", docErr);
        }
      }

      // Generate a secure response token for the candidate portal
      const crypto = await import("crypto");
      const responseToken = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updatedOffer = await storage.updateOffer(req.tenant.id, offer.id, {
        status: "sent",
        sentAt: new Date(),
        expiresAt,
        responseToken,
        responseTokenExpiresAt: expiresAt,
        ...(documentPath ? { documentPath } : {}),
      } as any);

      // Build response URL for the candidate portal
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const baseUrl = `${protocol}://${host}`;
      const responseUrl = `${baseUrl}/offer-response/${responseToken}`;

      let emailSent = false;
      if (candidate.email) {
        emailSent = await emailService.sendOfferNotification({
          to: candidate.email,
          candidateName: candidate.fullName,
          jobTitle,
          salary: `${offer.currency || "ZAR"} ${String(offer.salary).replace(/^R\s*/i, "")}`,
          startDate: offer.startDate ? new Date(offer.startDate).toLocaleDateString() : "TBD",
          responseUrl,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
      }

      let pipelineTransition = null;
      try {
        const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
        pipelineTransition = await pipelineOrchestrator.transitionCandidate(
          offer.candidateId,
          "offer_pending",
          req.tenant.id,
          {
            triggeredBy: "manual",
            triggeredByUserId: req.user?.id,
            reason: "Offer sent to candidate",
            skipPrerequisites: true,
          }
        );
      } catch (err) {
        console.error("Pipeline transition failed (non-blocking):", err);
      }

      res.json({
        offer: updatedOffer,
        emailSent,
        pipelineTransition,
      });
    } catch (error) {
      console.error("Error sending offer:", error);
      res.status(500).json({ message: "Failed to send offer" });
    }
  });

  app.post("/api/offers/:id/respond", async (req, res) => {
    try {
      const { response } = req.body;
      if (!response || !["accepted", "declined"].includes(response)) {
        return res.status(400).json({ message: "response must be 'accepted' or 'declined'" });
      }

      const offer = await storage.getOffer(req.tenant.id, req.params.id);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      const updatedOffer = await storage.updateOffer(req.tenant.id, offer.id, {
        status: response,
        respondedAt: new Date(),
      } as any);

      const candidate = await storage.getCandidate(req.tenant.id, offer.candidateId);
      let jobTitle = candidate?.role || "Position";
      if (offer.jobId) {
        const job = await storage.getJob(req.tenant.id, offer.jobId);
        if (job) jobTitle = job.title;
      }

      await emailService.notifyHROfOfferResponse(
        candidate?.fullName || "Unknown",
        jobTitle,
        response
      );

      let pipelineTransition = null;
      try {
        const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
        if (response === "accepted") {
          pipelineTransition = await pipelineOrchestrator.transitionCandidate(
            offer.candidateId,
            "integrity_checks",
            req.tenant.id,
            {
              triggeredBy: "manual",
              triggeredByUserId: req.user?.id,
              reason: "Candidate accepted the offer",
            }
          );
        } else {
          pipelineTransition = await pipelineOrchestrator.transitionCandidate(
            offer.candidateId,
            "offer_declined",
            req.tenant.id,
            {
              triggeredBy: "manual",
              triggeredByUserId: req.user?.id,
              reason: "Candidate declined the offer",
            }
          );
        }
      } catch (err) {
        console.error("Pipeline transition failed (non-blocking):", err);
      }

      res.json({ offer: updatedOffer, pipelineTransition });
    } catch (error) {
      console.error("Error responding to offer:", error);
      res.status(500).json({ message: "Failed to process offer response" });
    }
  });

  // ============= INTEREST CHECKS =============

  app.get("/api/interest-checks", async (req, res) => {
    try {
      const checks = await storage.getAllInterestChecks(req.tenant.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching interest checks:", error);
      res.status(500).json({ message: "Failed to fetch interest checks" });
    }
  });

  app.get("/api/interest-checks/candidate/:candidateId", async (req, res) => {
    try {
      const checks = await storage.getInterestChecksByCandidateId(req.tenant.id, req.params.candidateId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching candidate interest checks:", error);
      res.status(500).json({ message: "Failed to fetch interest checks" });
    }
  });

  app.post("/api/interest-checks", async (req, res) => {
    try {
      const { candidateId, jobId, channel } = req.body;

      if (!candidateId || !jobId) {
        return res.status(400).json({ message: "candidateId and jobId are required" });
      }

      const candidate = await storage.getCandidate(req.tenant.id, candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const job = await storage.getJob(req.tenant.id, jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Validate channel-specific contact info before doing any work
      const sendChannel = channel || "email";
      if (sendChannel === "email" && !candidate.email) {
        return res.status(400).json({ message: "Candidate has no email address on file" });
      }
      if (sendChannel === "whatsapp") {
        const phone = candidate.phone || (candidate.metadata as any)?.phone;
        if (!phone) {
          return res.status(400).json({ message: "Candidate has no phone number on file" });
        }
      }

      const tenant = await storage.getTenantById(req.tenant.id);
      const companyName = tenant?.companyName || "MTN Recruiting";

      // Generate token
      const interestToken = crypto.randomBytes(24).toString("hex");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const interestUrl = `${baseUrl}/interest-check/${interestToken}`;

      // Generate job spec .docx
      const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel } = await import("docx");

      const docSections: any[] = [];
      docSections.push(
        new Paragraph({ text: job.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "" }),
      );
      if (job.department) {
        docSections.push(new Paragraph({ children: [new TextRun({ text: "Department: ", bold: true }), new TextRun(job.department)] }));
      }
      if (job.location) {
        docSections.push(new Paragraph({ children: [new TextRun({ text: "Location: ", bold: true }), new TextRun(job.location)] }));
      }
      if (job.employmentType) {
        docSections.push(new Paragraph({ children: [new TextRun({ text: "Employment Type: ", bold: true }), new TextRun(job.employmentType)] }));
      }
      // Build salary range from actual DB columns
      const salaryRange = job.salaryMin || job.salaryMax
        ? `R${job.salaryMin?.toLocaleString() || "??"} - R${job.salaryMax?.toLocaleString() || "??"}${job.payRateUnit ? ` / ${job.payRateUnit}` : ""}`
        : null;
      if (salaryRange) {
        docSections.push(new Paragraph({ children: [new TextRun({ text: "Salary Range: ", bold: true }), new TextRun(salaryRange)] }));
      }
      docSections.push(new Paragraph({ text: "" }));

      // Parse structured sections from the composed description
      if (job.description) {
        const blocks = job.description.split(/\n(?=(?:Key Duties|Key Attributes|Qualifications|Requirements|Responsibilities|Benefits|Skills|Remuneration):?\s*$)/m);

        for (const block of blocks) {
          const lines = block.trim().split("\n");
          if (!lines.length || !lines[0].trim()) continue;

          const headingMatch = lines[0].trim().match(/^(Key Duties|Key Attributes|Qualifications|Requirements|Responsibilities|Benefits|Skills|Remuneration):?\s*$/);
          if (headingMatch) {
            // This block starts with a known heading
            docSections.push(new Paragraph({ text: headingMatch[1], heading: HeadingLevel.HEADING_2 }));
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              if (line.startsWith("- ")) {
                docSections.push(new Paragraph({ text: line.substring(2), bullet: { level: 0 } }));
              } else {
                docSections.push(new Paragraph({ text: line }));
              }
            }
            docSections.push(new Paragraph({ text: "" }));
          } else {
            // Introductory text or unstructured content
            docSections.push(new Paragraph({ text: "Job Description", heading: HeadingLevel.HEADING_2 }));
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              docSections.push(new Paragraph({ text: trimmed }));
            }
            docSections.push(new Paragraph({ text: "" }));
          }
        }
      }

      const doc = new Document({
        sections: [{ properties: {}, children: docSections }],
      });
      const docBuffer = await Packer.toBuffer(doc);
      const docFilename = `Job_Description_${job.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.docx`;

      // Create interest check record
      const check = await storage.createInterestCheck(req.tenant.id, {
        candidateId,
        jobId,
        interestToken,
        status: "sent",
        sentVia: channel || "email",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      // Send notification
      if (sendChannel === "email") {
        const sent = await emailService.sendInterestCheckNotification({
          to: candidate.email!,
          candidateName: candidate.fullName || "Candidate",
          jobTitle: job.title,
          companyName,
          interestUrl,
          attachments: [{
            filename: docFilename,
            content: docBuffer as Buffer,
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }],
        });
        if (!sent) {
          // Clean up the DB record since the email wasn't delivered
          await storage.updateInterestCheck(req.tenant.id, check.id, { status: "pending" });
          return res.status(500).json({ message: "Failed to send email. Please check email configuration and try again." });
        }
      } else if (sendChannel === "whatsapp") {
        const phone = candidate.phone || (candidate.metadata as any)?.phone;

        try {
          const { whatsappService } = await import("./whatsapp-service");

          // Get or create conversation
          const existingConvs = await storage.getWhatsappConversationsByCandidateId(req.tenant.id, candidateId);
          let conversationId: string;
          if (existingConvs.length > 0) {
            conversationId = existingConvs[0].id;
          } else {
            const newConv = await storage.createWhatsappConversation(req.tenant.id, {
              candidateId,
              phoneNumber: phone,
              candidateName: candidate.fullName || "Candidate",
              status: "active",
            });
            conversationId = newConv.id;
          }

          // Send text message with link
          const message = `Dear ${candidate.fullName || "Candidate"},

We have an exciting career opportunity for the position of *${job.title}* at *${companyName}* that may interest you.

Please click the link below to view the full job description and let us know if you're interested:
${interestUrl}

This link expires in 7 days.

Best regards,
${companyName} HR Team`;

          await whatsappService.sendTextMessage(req.tenant.id, conversationId, phone, message, "ai");

          // Send document attachment
          await whatsappService.sendDocumentMessage(
            req.tenant.id, conversationId, phone,
            docBuffer as Buffer, docFilename,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            docFilename, "ai"
          );
        } catch (waErr) {
          console.error("WhatsApp send failed (record still created):", waErr);
        }
      }

      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating interest check:", error);
      res.status(500).json({ message: "Failed to create interest check" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
