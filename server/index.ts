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
import { interviewOrchestrator } from "./interview-orchestrator";
import { recordingStorage } from "./recording-storage";

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
    // Dual-token lookup: try voice token first, then video token
    let session = await storage.getInterviewSessionByToken(req.params.token);
    let stage: 'voice' | 'video' = 'voice';
    if (!session) {
      session = await storage.getInterviewSessionByVideoToken(req.params.token);
      stage = 'video';
    }
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    // Check stage-appropriate expiration
    const expiresAt = stage === 'video' ? session.videoExpiresAt : session.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(410).json({ message: "Interview link has expired" });
    }

    // Check stage-appropriate status
    const stageStatus = stage === 'video' ? session.videoStatus : session.voiceStatus;
    if (stageStatus === 'completed') {
      return res.status(410).json({ message: "Interview has already been completed" });
    }

    // Get candidate info for display
    const candidate = session.candidateId
      ? await storage.getCandidateById(session.tenantId || '', session.candidateId)
      : null;

    res.json({
      session,
      stage,
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

// In-memory cache for Hume AI OAuth token (shared with interview config)
let humePublicTokenCache: { token: string; expiresAt: number } | null = null;
// Cache for interview-specific EVI configs keyed by session token
const interviewConfigCache = new Map<string, string>();

async function getCachedHumeToken(apiKey: string, secretKey: string): Promise<string> {
  if (humePublicTokenCache && Date.now() < humePublicTokenCache.expiresAt - 60000) {
    return humePublicTokenCache.token;
  }

  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
  const tokenResponse = await fetch('https://api.hume.ai/oauth2-cc/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to authenticate with voice service");
  }

  const tokenData = await tokenResponse.json() as { access_token: string; expires_in?: number };
  const expiresIn = (tokenData.expires_in || 3600) * 1000;
  humePublicTokenCache = {
    token: tokenData.access_token,
    expiresAt: Date.now() + expiresIn
  };
  return humePublicTokenCache.token;
}

async function getOrCreateInterviewConfig(apiKey: string, sessionToken: string, prompt: string): Promise<string | null> {
  const cached = interviewConfigCache.get(sessionToken);
  if (cached) return cached;

  const configResponse = await fetch("https://api.hume.ai/v0/evi/configs", {
    method: "POST",
    headers: {
      "X-Hume-Api-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `Interview ${sessionToken.substring(0, 8)}`,
      evi_version: "3",
      voice: { name: "ITO" },
      language_model: {
        model_provider: "OPEN_AI",
        model_resource: "gpt-4o-mini"
      },
      ellm_model: {
        allow_short_responses: true
      },
      prompt: {
        text: prompt
      },
      event_messages: {
        on_new_chat: {
          enabled: true,
          text: "Hello! I'll be conducting your interview today. Let's get started — could you briefly introduce yourself?"
        }
      },
      timeouts: {
        inactivity: { enabled: true, duration_secs: 600 }
      }
    })
  });

  if (configResponse.ok) {
    const configData = await configResponse.json() as { id: string };
    interviewConfigCache.set(sessionToken, configData.id);
    return configData.id;
  }

  console.error("Interview config creation failed:", configResponse.status);
  return null;
}

// PUBLIC route for getting Hume AI config for the interview (uses session token)
app.get("/api/public/interview-session/:token/config", async (req, res) => {
  try {
    // Dual-token lookup
    let session = await storage.getInterviewSessionByToken(req.params.token);
    let stage: 'voice' | 'video' = 'voice';
    if (!session) {
      session = await storage.getInterviewSessionByVideoToken(req.params.token);
      stage = 'video';
    }
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    // Check stage-appropriate expiration
    const expiresAt = stage === 'video' ? session.videoExpiresAt : session.expiresAt;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return res.status(410).json({ message: "Interview link has expired" });
    }

    const apiKey = process.env.HUMAI_API_KEY;
    const secretKey = process.env.HUMAI_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.status(500).json({ message: "Voice interview is not configured" });
    }

    // Use cached token
    const accessToken = await getCachedHumeToken(apiKey, secretKey);

    // Use stage-appropriate prompt
    const prompt = (stage === 'video' ? session.videoPrompt : session.prompt) || `You are an HR interviewer conducting a screening interview. Ask ONE question at a time. Keep responses brief (2-3 sentences). Start by introducing yourself and ask the candidate to tell you about themselves.`;
    const configId = await getOrCreateInterviewConfig(apiKey, req.params.token, prompt);

    // Mark stage-appropriate status as started
    if (stage === 'video') {
      if (session.videoStatus === 'pending') {
        await storage.updateInterviewSession(session.tenantId || '', session.id, {
          videoStatus: 'started',
          videoStartedAt: new Date(),
        } as any);
      }
    } else {
      if (session.status === 'pending' || session.status === 'sent') {
        await storage.updateInterviewSessionByToken(req.params.token, {
          status: 'started',
          voiceStatus: 'started',
          startedAt: new Date()
        } as any);
      }
    }

    res.json({
      accessToken,
      sessionId: session.id,
      stage,
      prompt,
      configId
    });
  } catch (error) {
    console.error("Error getting interview config:", error);
    // Invalidate token cache on auth failures
    if (error instanceof Error && error.message.includes('authenticate')) {
      humePublicTokenCache = null;
    }
    res.status(500).json({ message: "Failed to get interview configuration" });
  }
});

// PUBLIC route for saving interview results
app.post("/api/public/interview-session/:token/complete", async (req, res) => {
  try {
    // Dual-token lookup
    let session = await storage.getInterviewSessionByToken(req.params.token);
    let stage: 'voice' | 'video' = 'voice';
    if (!session) {
      session = await storage.getInterviewSessionByVideoToken(req.params.token);
      stage = 'video';
    }
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    const { transcripts, emotionAnalysis, duration, humeChatId, tavusConversationId, tavusInterviewId } = req.body;

    console.log(`[Interview] Public complete called for session ${session.id}, humeChatId: ${humeChatId || 'none'}, tavusConversationId: ${tavusConversationId || 'none'}, transcripts: ${(transcripts || []).length}`);

    // Map transcripts to the format expected by the orchestrator
    const mappedTranscripts = (transcripts || []).map((t: any) => ({
      role: t.role === 'user' ? 'candidate' : (t.role || 'ai'),
      text: t.text || '',
      emotion: t.emotion,
      timestamp: t.timestamp,
    }));

    // Use the full orchestrator flow: saves transcripts, runs AI analysis, creates feedback
    const result = await interviewOrchestrator.completeInterview(
      session.tenantId || '',
      session.id,
      mappedTranscripts,
      emotionAnalysis,
      undefined, // recording fetched async below
      duration,
      stage
    );

    if (!result) {
      return res.status(500).json({ message: "Failed to complete interview" });
    }

    // Fetch Hume audio in the background with retries (Hume needs time to process)
    if (humeChatId) {
      const tenantId = session.tenantId || '';
      const sessionId = session.id;
      const candidateId = session.candidateId;
      const sessionDuration = duration;

      (async () => {
        const HUMAI_API_KEY = process.env.HUMAI_API_KEY;
        const HUMAI_SECRET_KEY = process.env.HUMAI_SECRET_KEY;
        if (!HUMAI_API_KEY || !HUMAI_SECRET_KEY) return;

        // Retry every 15s for up to 5 minutes (20 attempts)
        const delays = Array.from({ length: 20 }, () => 15000);
        for (const delay of delays) {
          await new Promise(resolve => setTimeout(resolve, delay));
          try {
            const tokenRes = await fetch("https://api.hume.ai/oauth2-cc/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: HUMAI_API_KEY,
                client_secret: HUMAI_SECRET_KEY,
              }),
            });
            if (!tokenRes.ok) continue;

            const tokenData = await tokenRes.json() as { access_token: string };
            const audioRes = await fetch(`https://api.hume.ai/v0/evi/chats/${humeChatId}/audio`, {
              headers: { Authorization: `Bearer ${tokenData.access_token}`, "X-Hume-Api-Key": HUMAI_API_KEY },
            });
            if (!audioRes.ok) continue;

            const audioData = await audioRes.json() as { signed_audio_url?: string };
            if (!audioData.signed_audio_url) {
              console.log(`[Interview] Hume audio not ready yet for chat ${humeChatId}, retrying...`);
              continue;
            }

            console.log(`[Interview] Hume audio ready for session ${sessionId}, downloading...`);
            // Download and save locally
            const downloadRes = await fetch(audioData.signed_audio_url);
            if (downloadRes.ok) {
              const buffer = Buffer.from(await downloadRes.arrayBuffer());
              const filename = `${Date.now()}_voice.mp4`;
              const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, buffer, 'audio/mp4');
              await storage.createInterviewRecording(tenantId, {
                sessionId,
                candidateId: candidateId || undefined,
                recordingType: 'audio',
                mediaUrl: `/api/recordings/${key}`,
                duration: sessionDuration,
                storageProvider: 'local',
                fileSize: size,
                interviewStage: stage,
              } as any);
              console.log(`[Interview] Recording saved locally for session ${sessionId}: ${key} (${size} bytes)`);
            }
            return; // success, stop retrying
          } catch (err) {
            console.warn(`[Interview] Hume audio fetch attempt failed:`, err);
          }
        }
        console.warn(`[Interview] Could not fetch Hume audio for chat ${humeChatId} after all retries`);
      })();
    }

    // Fetch Tavus video recording and transcript in the background with retries
    if (tavusConversationId && stage === 'video') {
      const tenantId = session.tenantId || '';
      const sessionId = session.id;
      const candidateId = session.candidateId;
      const sessionDuration = duration;

      (async () => {
        const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
        if (!TAVUS_API_KEY) return;

        console.log(`[Interview] Starting background Tavus recording fetch for conversation ${tavusConversationId}`);

        // Retry every 30s for up to 10 minutes (20 attempts) — Tavus needs time to process
        const delays = Array.from({ length: 20 }, () => 30000);
        for (const delay of delays) {
          await new Promise(resolve => setTimeout(resolve, delay));
          try {
            // Fetch conversation details from Tavus
            const tavusRes = await fetch(`https://tavusapi.com/v2/conversations/${tavusConversationId}`, {
              headers: { "x-api-key": TAVUS_API_KEY },
            });
            if (!tavusRes.ok) {
              console.log(`[Interview] Tavus conversation not ready (${tavusRes.status}), retrying...`);
              continue;
            }

            const tavusData: any = await tavusRes.json();

            // Log the full response structure for debugging
            console.log(`[Interview] Tavus API response for ${tavusConversationId}:`, JSON.stringify({
              status: tavusData.status,
              has_recording_url: !!tavusData.recording_url,
              has_conversation_transcript: !!tavusData.conversation_transcript,
              has_transcript: !!tavusData.transcript,
              keys: Object.keys(tavusData),
            }));

            // Check if recording is available
            if (!tavusData.recording_url) {
              console.log(`[Interview] Tavus recording not yet available for ${tavusConversationId}, status: ${tavusData.status}, retrying...`);
              continue;
            }

            console.log(`[Interview] Tavus recording ready for session ${sessionId}, downloading...`);

            // Download and save recording
            const videoRes = await fetch(tavusData.recording_url);
            if (videoRes.ok) {
              const buffer = Buffer.from(await videoRes.arrayBuffer());
              const filename = `${Date.now()}_video.mp4`;
              const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, buffer, 'video/mp4');

              const recording = await storage.createInterviewRecording(tenantId, {
                sessionId,
                candidateId: candidateId || undefined,
                recordingType: 'video',
                mediaUrl: `/api/recordings/${key}`,
                duration: sessionDuration,
                storageProvider: 'tavus',
                externalId: tavusConversationId,
                fileSize: size,
                mimeType: 'video/mp4',
                metadata: { objectStorageKey: key, tavusConversationId },
                interviewStage: 'video',
              } as any);

              await storage.createRecordingSource(tenantId, {
                sessionId,
                recordingId: recording.id,
                sourceType: 'tavus',
                sourceId: tavusConversationId,
                sourceUrl: tavusData.recording_url,
                status: 'completed',
                hasVideo: true,
              });

              console.log(`[Interview] Tavus recording saved for session ${sessionId}: ${key} (${size} bytes)`);
            }

            // Check both possible transcript field names from Tavus API
            const transcript = tavusData.conversation_transcript || tavusData.transcript || [];
            if (Array.isArray(transcript) && transcript.length > 0) {
              // Estimate timestamps from position if Tavus doesn't provide them
            let cumulativeSeconds = 0;
            const tavusTranscripts = transcript.map((t: any) => {
                const text = t.content || t.text || '';
                const ts = t.timestamp ?? cumulativeSeconds;
                // Estimate ~3 seconds per 15 words if no timestamp provided
                cumulativeSeconds += t.timestamp != null ? 0 : Math.max(3, Math.ceil(text.split(/\s+/).length / 15) * 3);
                return {
                  role: t.role === 'user' || t.role === 'candidate' ? 'candidate' as const : 'ai' as const,
                  text,
                  timestamp: ts,
                };
              });

              console.log(`[Interview] Tavus transcript available (${tavusTranscripts.length} segments), running AI analysis...`);

              // Re-run analysis with actual transcript data
              await interviewOrchestrator.completeInterview(
                tenantId,
                sessionId,
                tavusTranscripts,
                undefined,
                undefined,
                sessionDuration,
                'video'
              );
              console.log(`[Interview] AI analysis completed for Tavus session ${sessionId}`);
            }

            return; // success, stop retrying
          } catch (err) {
            console.warn(`[Interview] Tavus recording fetch attempt failed:`, err);
          }
        }
        console.warn(`[Interview] Could not fetch Tavus recording for conversation ${tavusConversationId} after all retries`);
      })();
    }

    res.json(result);
  } catch (error) {
    console.error("Error completing interview session:", error);
    res.status(500).json({ message: "Failed to complete interview session" });
  }
});

// PUBLIC route: Create Tavus video session for candidate (uses video token)
app.post("/api/public/interview-session/:token/video-session", async (req, res) => {
  try {
    // Look up session by video token
    let session = await storage.getInterviewSessionByVideoToken(req.params.token);
    if (!session) {
      return res.status(404).json({ message: "Interview session not found" });
    }

    // Check expiration
    if (session.videoExpiresAt && new Date(session.videoExpiresAt) < new Date()) {
      return res.status(410).json({ message: "Interview link has expired" });
    }

    // Check if already completed
    if (session.videoStatus === 'completed') {
      return res.status(410).json({ message: "Video interview has already been completed" });
    }

    const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
    if (!TAVUS_API_KEY) {
      return res.status(500).json({ message: "Video interview service not configured" });
    }

    // Get candidate info
    const candidate = session.candidateId
      ? await storage.getCandidateById(session.tenantId || '', session.candidateId)
      : null;
    const candidateName = candidate?.fullName || session.candidateName || "Candidate";
    const jobRole = session.jobTitle || "Open Position";

    // Dynamic prompt based on job role (Charles Molapisi persona)
    const conversationalContext = interviewOrchestrator.getTavusPrompt(jobRole);

    const customGreeting = `Hello! I'm Charles Molapisi, the Group Chief Technology and Information Officer here at MTN. Thank you for making the time to speak with me today. I'm looking forward to learning more about you and discussing the ${jobRole} position. Before we dive in, how are you doing today?`;

    const requestBody = {
      replica_id: process.env.TAVUS_REPLICA_ID || "default_replica",
      persona_id: process.env.TAVUS_PERSONA_ID || "default_persona",
      conversation_name: `${jobRole} Interview: ${candidateName}`,
      conversational_context: session.videoPrompt || conversationalContext,
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
      console.error("Tavus API error:", response.status, error);
      return res.status(response.status).json({
        message: "Failed to create video interview session",
        details: error
      });
    }

    const data = await response.json();

    if (!data || !data.conversation_url) {
      return res.status(500).json({ message: "Invalid response from video service" });
    }

    // Mark video stage as started
    if (session.videoStatus === 'pending') {
      await storage.updateInterviewSession(session.tenantId || '', session.id, {
        videoStatus: 'started',
        videoStartedAt: new Date(),
      } as any);
    }

    // Save interview record to database
    const interview = await storage.createInterview(session.tenantId || '', {
      candidateId: session.candidateId || null,
      jobId: null,
      type: "video",
      provider: "tavus",
      status: "in_progress",
      sessionId: data.conversation_id || null,
      conversationUrl: data.conversation_url,
      metadata: {
        jobRole,
        candidateName,
        persona: "Charles Molapisi - GCTIO MTN",
        interviewSessionId: session.id,
        tavusData: data
      },
      startedAt: new Date()
    });

    res.json({
      sessionUrl: data.conversation_url,
      conversationId: data.conversation_id || "unknown",
      interviewId: interview.id,
      candidateName,
      jobRole
    });
  } catch (error) {
    console.error("Error creating public Tavus video session:", error);
    res.status(500).json({ message: "Failed to create video interview session" });
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
      companyName: tenant?.companyName || "MTN Recruiting",
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

// PUBLIC route: Candidate interest check portal - GET details
app.get("/api/public/interest-check/:token", async (req, res) => {
  try {
    const check = await storage.getInterestCheckByToken(req.params.token);
    if (!check) {
      return res.status(404).json({ message: "Interest check not found or link is invalid" });
    }

    if (check.expiresAt && new Date(check.expiresAt) < new Date()) {
      return res.status(410).json({ message: "This link has expired. Please contact the recruiter for assistance." });
    }

    if (check.status === "interested" || check.status === "not_interested") {
      const candidate = await storage.getCandidate(check.tenantId!, check.candidateId);
      return res.json({
        candidateName: candidate?.fullName || "Candidate",
        jobTitle: "",
        companyName: "",
        status: check.status,
      });
    }

    const candidate = await storage.getCandidate(check.tenantId!, check.candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    let jobTitle = candidate.role || "Position";
    let jobDescription = "";
    let jobDepartment = "";
    let jobLocation = "";
    if (check.jobId) {
      const job = await storage.getJob(check.tenantId!, check.jobId);
      if (job) {
        jobTitle = job.title;
        jobDescription = job.description || "";
        jobDepartment = job.department || "";
        jobLocation = job.location || "";
      }
    }

    const tenant = check.tenantId ? await storage.getTenantById(check.tenantId) : null;

    res.json({
      candidateName: candidate.fullName,
      jobTitle,
      jobDescription,
      jobDepartment,
      jobLocation,
      companyName: tenant?.companyName || "MTN Recruiting",
      status: check.status,
      expiresAt: check.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching interest check portal:", error);
    res.status(500).json({ message: "Failed to load interest check portal" });
  }
});

// PUBLIC route: Candidate interest check portal - POST response
app.post("/api/public/interest-check/:token", publicUpload.single("cv"), async (req, res) => {
  try {
    const check = await storage.getInterestCheckByToken(req.params.token);
    if (!check) {
      return res.status(404).json({ message: "Interest check not found or link is invalid" });
    }

    if (check.expiresAt && new Date(check.expiresAt) < new Date()) {
      return res.status(410).json({ message: "This link has expired. Please contact the recruiter for assistance." });
    }

    if (check.status === "interested" || check.status === "not_interested") {
      return res.status(400).json({ message: "You have already responded to this interest check." });
    }

    const { response } = req.body;
    if (response !== "interested" && response !== "not_interested") {
      return res.status(400).json({ message: "Response must be 'interested' or 'not_interested'" });
    }

    const updates: any = {
      status: response,
      respondedAt: new Date(),
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || "",
      userAgent: req.headers["user-agent"] || "",
    };

    if (response === "interested") {
      updates.consentGiven = true;
      updates.consentText = "Candidate consented to collection, use, and processing of personal information for recruitment purposes in accordance with POPIA.";

      if (req.file) {
        const uploadDir = path.join(process.cwd(), "uploads", "interest-cvs");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `cv_${check.candidateId}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, req.file.buffer);
        updates.cvFilePath = `uploads/interest-cvs/${fileName}`;

        // Update candidate's CV URL
        try {
          await storage.updateCandidate(check.tenantId!, check.candidateId, {
            cvUrl: `uploads/interest-cvs/${fileName}`,
          } as any);
        } catch (cvErr) {
          console.error("Failed to update candidate CV (non-blocking):", cvErr);
        }
      }
    }

    if (response === "not_interested") {
      // Transition candidate to withdrawn
      try {
        const { pipelineOrchestrator } = await import("./pipeline-orchestrator");
        await pipelineOrchestrator.transitionCandidate(
          check.candidateId,
          "withdrawn",
          check.tenantId!,
          {
            triggeredBy: "candidate",
            reason: "Candidate declined interest in the position",
            skipPrerequisites: true,
          }
        );
      } catch (pipelineErr) {
        console.error("Pipeline transition failed (non-blocking):", pipelineErr);
      }
    }

    await storage.updateInterestCheck(check.tenantId!, check.id, updates);

    res.json({ success: true, status: response });
  } catch (error) {
    console.error("Error processing interest check response:", error);
    res.status(500).json({ message: "Failed to process interest check response" });
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
