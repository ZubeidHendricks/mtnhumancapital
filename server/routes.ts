import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertCandidateSchema, insertJobSchema, insertIntegrityCheckSchema, insertRecruitmentSessionSchema, insertInterviewSchema, updateInterviewSchema, insertTenantRequestSchema, updateTenantRequestSchema, type InsertCandidate, insertIntegrityDocumentRequirementSchema, updateIntegrityDocumentRequirementSchema, insertCandidateDocumentSchema, updateCandidateDocumentSchema, documentTypes, insertInterviewSessionSchema, insertInterviewFeedbackSchema, updateInterviewFeedbackSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { IntegrityOrchestrator } from "./integrity-orchestrator";
import { RecruitmentOrchestrator } from "./recruitment-orchestrator";
import { interviewOrchestrator } from "./interview-orchestrator";
import { sourcingOrchestrator, type SpecialistCandidate } from "./sourcing-specialists";
import { cvParser } from "./cv-parser";
import { cvTemplateGenerator } from "./cv-template-generator";
import { Packer } from "docx";
import { embeddingService } from "./embedding-service";
import { getOrCreateConversation, deleteConversation } from "./job-creation-agent";
import { requireAdmin } from "./admin-middleware";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import AdmZip from "adm-zip";
import mammoth from "mammoth";
import { pnetAPIService } from "./pnet-api-service";
import { pnetApplicationAgent } from "./pnet-application-agent";
import { pnetJobPostingAgent } from "./pnet-job-posting-agent";
import { registerWeighbridgeRoutes } from "./routes/weighbridge";
import { registerFleetLogixRoutes } from "./fleetlogix-routes";

const upload = multer({ storage: multer.memoryStorage() });

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

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  // Applications endpoint for dashboard (uses candidates data)
  app.get("/api/applications", async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates(req.tenant.id);
      // Return candidates as applications with relevant fields
      const applications = candidates.map(candidate => ({
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
      res.json(applications);
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
      const { sessionId, isDraft = false, jobSpec: editedJobSpec } = req.body;
      
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
        status: isDraft ? "Draft" : "Active",
      });
      
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

  // Interview routes - enhanced with candidate info
  app.get("/api/interviews", async (req, res) => {
    try {
      const interviews = await storage.getAllInterviews(req.tenant.id);
      // Enrich interviews with candidate names
      const enrichedInterviews = await Promise.all(
        interviews.map(async (interview) => {
          let candidateName = null;
          if (interview.candidateId) {
            const candidate = await storage.getCandidate(req.tenant.id, interview.candidateId);
            candidateName = candidate?.fullName || null;
          }
          return {
            ...interview,
            candidateName,
            jobTitle: (interview.metadata as any)?.jobRole || interview.type + " Interview",
            interviewType: interview.type,
          };
        })
      );
      res.json(enrichedInterviews);
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
      // Enrich with candidate info
      let candidateName = null;
      if (interview.candidateId) {
        const candidate = await storage.getCandidate(req.tenant.id, interview.candidateId);
        candidateName = candidate?.fullName || null;
      }
      
      // Fetch transcripts and feedback if linked to a session
      let transcripts: any[] = [];
      let feedback: any[] = [];
      let recordings: any[] = [];
      
      if (interview.sessionId) {
        transcripts = await storage.getInterviewTranscripts(req.tenant.id, interview.sessionId);
        feedback = await storage.getInterviewFeedback(req.tenant.id, interview.sessionId);
        recordings = await storage.getInterviewRecordings(req.tenant.id, interview.sessionId);
      }
      
      // Return in InterviewDetails format expected by frontend
      res.json({
        session: {
          ...interview,
          candidateName,
          jobTitle: (interview.metadata as any)?.jobRole || interview.type + " Interview",
          interviewType: interview.type,
        },
        recordings,
        transcripts,
        feedback,
      });
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
      
      // Generate the interview URL
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const interviewUrl = `${baseUrl}/interview/invite/${token}`;
      
      res.status(201).json({ ...session, interviewUrl });
    } catch (error) {
      console.error("Error creating interview session:", error);
      res.status(500).json({ message: "Failed to create interview session" });
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
          const { WhatsAppService } = await import("./whatsapp-service");
          const whatsappService = new WhatsAppService(storage);
          
          const docList = createdRequirements.map((r, i) => 
            `${i + 1}. ${r.description} (Ref: ${r.referenceCode})`
          ).join('\n');
          
          const message = `Hi ${candidate.fullName},\n\nWe need the following documents to complete your background verification:\n\n${docList}\n\nPlease reply with the document type (e.g., "ID Document") before uploading each document so we can track your submission.\n\nReference these codes when submitting:\n${createdRequirements.map(r => `- ${r.referenceCode}`).join('\n')}`;
          
          await whatsappService.sendMessage(candidate.phone.replace(/\D/g, ''), message);
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
      const requirement = await storage.getIntegrityDocumentRequirement(req.tenant.id, req.params.id);
      if (!requirement) {
        return res.status(404).json({ message: "Document requirement not found" });
      }
      
      const candidate = await storage.getCandidate(req.tenant.id, requirement.candidateId);
      if (!candidate || !candidate.phone) {
        return res.status(400).json({ message: "Candidate has no phone number" });
      }
      
      try {
        const { WhatsAppService } = await import("./whatsapp-service");
        const whatsappService = new WhatsAppService(storage);
        
        const message = `Hi ${candidate.fullName},\n\nThis is a reminder that we're still waiting for your ${requirement.description}.\n\nReference code: ${requirement.referenceCode}\n\nPlease upload this document at your earliest convenience to complete your background verification.\n\nReply with "${requirement.documentType}" before sending the document.`;
        
        await whatsappService.sendMessage(candidate.phone.replace(/\D/g, ''), message);
        
        // Update reminder tracking
        const now = new Date();
        const nextReminderAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        
        await storage.updateIntegrityDocumentRequirement(req.tenant.id, req.params.id, {
          remindersSent: (requirement.remindersSent || 0) + 1,
          lastReminderAt: now,
          nextReminderAt,
        });
        
        res.json({ message: "Reminder sent successfully" });
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp reminder:", whatsappError);
        res.status(500).json({ message: "Failed to send reminder via WhatsApp" });
      }
    } catch (error) {
      console.error("Error sending document requirement reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // ==================== CANDIDATE DOCUMENTS ====================

  // Get all documents across all candidates (for Document Library)
  app.get("/api/candidate-documents", async (req, res) => {
    try {
      const { documentType, status, candidateId, search } = req.query;
      
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
      
      // Get candidate info for each document
      const documentsWithCandidates = await Promise.all(documents.map(async (doc) => {
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
      
      res.json(documentsWithCandidates);
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
      const { notes } = req.body;
      const updated = await storage.updateOnboardingAgentLog(req.tenant.id, req.params.logId, {
        requiresHumanReview: 0,
        reviewedAt: new Date(),
        reviewNotes: notes,
      });
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

  app.post("/api/onboarding/document-requests/:requestId/verified", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const updated = await agent.markDocumentVerified(req.tenant.id, req.params.requestId, "system");
      
      if (!updated) {
        return res.status(404).json({ message: "Document request not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error verifying document:", error);
      res.status(500).json({ message: "Failed to verify document" });
    }
  });

  app.post("/api/onboarding/document-requests/:requestId/remind", async (req, res) => {
    try {
      const { createOnboardingAgent } = await import("./onboarding-agent");
      const agent = createOnboardingAgent(storage);
      
      const result = await agent.sendReminder(req.tenant.id, req.params.requestId, 'whatsapp');
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
      let conversations = await storage.getAllWhatsappConversations(req.tenant.id);
      
      if (type && typeof type === "string") {
        conversations = conversations.filter(c => c.type === type);
      }
      if (status && typeof status === "string") {
        conversations = conversations.filter(c => c.status === status);
      }
      
      res.json(conversations);
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
      const details = await interviewOrchestrator.getInterviewDetails(req.tenant.id, req.params.id);
      if (!details) {
        return res.status(404).json({ message: "Interview not found" });
      }
      res.json(details);
    } catch (error) {
      console.error("Error fetching interview:", error);
      res.status(500).json({ message: "Failed to fetch interview" });
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
      
      const { transcripts, emotionAnalysis, recordingUrl, duration } = parsed.data;

      const result = await interviewOrchestrator.completeInterview(
        req.tenant.id,
        req.params.id,
        transcripts,
        emotionAnalysis,
        recordingUrl,
        duration
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
      const recordings = await storage.getInterviewRecordings(req.tenant.id, req.params.id);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  // Get interview transcripts
  app.get("/api/interviews/:id/transcripts", async (req, res) => {
    try {
      const transcripts = await storage.getInterviewTranscripts(req.tenant.id, req.params.id);
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

          await whatsappService.sendMessage(
            req.tenant.id,
            conversation.id,
            employee.phone,
            message,
            'self_assessment_link'
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
      res.json(consents);
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
  app.get("/api/social-screening/findings", async (req, res) => {
    try {
      const candidateId = req.query.candidateId as string | undefined;
      const findings = await storage.getSocialScreeningFindings(req.tenant.id, candidateId);
      res.json(findings);
    } catch (error) {
      console.error("Error fetching social findings:", error);
      res.status(500).json({ message: "Failed to fetch social findings" });
    }
  });

  app.get("/api/social-screening/findings/pending-review", async (req, res) => {
    try {
      const findings = await storage.getPendingHumanReviewFindings(req.tenant.id);
      res.json(findings);
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
      res.json(finding);
    } catch (error) {
      console.error("Error fetching social finding:", error);
      res.status(500).json({ message: "Failed to fetch social finding" });
    }
  });

  app.get("/api/social-screening/findings/candidate/:candidateId", async (req, res) => {
    try {
      const findings = await storage.getSocialScreeningFindingsByCandidate(req.tenant.id, req.params.candidateId);
      res.json(findings);
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
      
      res.json(run);
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

  // ==================== ADMIN TENANT MANAGEMENT ====================
  
  // Get all tenants (admin only)
  app.get("/api/admin/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

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

  const httpServer = createServer(app);

  return httpServer;
}
