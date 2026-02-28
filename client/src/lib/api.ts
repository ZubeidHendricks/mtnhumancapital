import axios from "axios";
import type { Candidate, InsertCandidate, Job, InsertJob, IntegrityCheck, InsertIntegrityCheck, Interview, OnboardingWorkflow } from "@shared/schema";

// Determine the API URL based on environment
// In development (Replit), use relative URLs
// In production (Vercel/custom domain), use the backend API URL
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // Development environments - use relative URL
  if (hostname === 'localhost' || 
      hostname.includes('replit') || 
      hostname.includes('127.0.0.1') ||
      hostname.includes('.repl.co')) {
    return '/api';
  }
  
  // Production - check for environment variable or use Replit deployment
  // For custom domains like avatarhuman.capital, we need to proxy through the same origin
  // or use a dedicated backend URL
  const backendUrl = import.meta.env.VITE_API_URL;
  if (backendUrl) {
    return backendUrl;
  }
  
  // Default to relative URL (works when frontend and backend are on same domain)
  return '/api';
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cross-origin requests with cookies
});

// Add request interceptor to attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("ahc_auth_token");
    if (token && token !== "demo_token") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper: unwrap paginated { data, total, page, limit } responses into plain arrays
function unwrapArray<T>(body: any): T[] {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  return [];
}

export const jobsService = {
  getAll: async (): Promise<Job[]> => {
    const response = await api.get("/jobs");
    return unwrapArray<Job>(response.data);
  },
  getArchived: async (): Promise<Job[]> => {
    const response = await api.get("/jobs/archived");
    return response.data;
  },
  getById: async (id: string): Promise<Job> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  create: async (jobData: InsertJob): Promise<Job> => {
    const response = await api.post("/jobs", jobData);
    return response.data;
  },
  update: async (id: string, jobData: Partial<InsertJob>): Promise<Job> => {
    const response = await api.patch(`/jobs/${id}`, jobData);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },
  archive: async (id: string, reason?: string): Promise<Job> => {
    const response = await api.post(`/jobs/${id}/archive`, { reason });
    return response.data;
  },
  restore: async (id: string): Promise<Job> => {
    const response = await api.post(`/jobs/${id}/restore`);
    return response.data;
  }
};

export const candidateService = {
  getAll: async (): Promise<Candidate[]> => {
    const response = await api.get("/candidates");
    return unwrapArray<Candidate>(response.data);
  },
  getById: async (id: string): Promise<Candidate> => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },
  create: async (candidateData: InsertCandidate): Promise<Candidate> => {
    const response = await api.post("/candidates", candidateData);
    return response.data;
  },
  update: async (id: string, candidateData: Partial<InsertCandidate>): Promise<Candidate> => {
    const response = await api.patch(`/candidates/${id}`, candidateData);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/candidates/${id}`);
  }
};

export const tavusService = {
  listPersonas: async (): Promise<{ personas: any[] }> => {
    const response = await api.get("/tavus/personas");
    return response.data;
  },
  createPersona: async (personaData: { 
    personaName?: string; 
    systemPrompt: string; 
    context?: string; 
    replicaId?: string;
  }): Promise<{ personaId: string; personaName: string; createdAt: string }> => {
    const response = await api.post("/tavus/persona", personaData);
    return response.data;
  },
};

export const interviewService = {
  getVoiceConfig: async (): Promise<{ accessToken: string; websocketUrl: string; configId?: string }> => {
    const response = await api.get("/interview/voice/config");
    return response.data;
  },
  createVideoSession: async (candidateId?: string, candidateName?: string, jobRole?: string): Promise<{ sessionUrl: string; sessionId: string; status: string; candidateId?: string; candidateName?: string; interviewId?: string }> => {
    const response = await api.post("/interview/video/session", {
      candidateId,
      candidateName,
      jobRole
    });
    return response.data;
  },
  createPracticeVideoSession: async (candidateName?: string, jobRole?: string): Promise<{ sessionUrl: string; sessionId: string; status: string; interviewId?: string }> => {
    const response = await api.post("/interview/video/session", {
      candidateName: `[Practice] ${candidateName || "Practice"}`,
      jobRole
    });
    return response.data;
  },
  getAll: async (): Promise<Interview[]> => {
    const response = await api.get("/interviews");
    return response.data;
  },
  getById: async (id: string): Promise<Interview> => {
    const response = await api.get(`/interviews/${id}`);
    return response.data;
  },
  getByCandidateId: async (candidateId: string): Promise<Interview[]> => {
    const response = await api.get(`/candidates/${candidateId}/interviews`);
    return response.data;
  },
  getByJobId: async (jobId: string): Promise<Interview[]> => {
    const response = await api.get(`/jobs/${jobId}/interviews`);
    return response.data;
  },
  update: async (id: string, updates: Partial<Interview>): Promise<Interview> => {
    const response = await api.patch(`/interviews/${id}`, updates);
    return response.data;
  }
};

// ViTT Timeline Tags & Transcript Analysis Service
export const timelineService = {
  getTags: async (sessionId: string) => {
    const res = await api.get(`/interviews/${sessionId}/timeline-tags`);
    return res.data;
  },
  createTag: async (sessionId: string, tag: any) => {
    const res = await api.post(`/interviews/${sessionId}/timeline-tags`, tag);
    return res.data;
  },
  updateTag: async (sessionId: string, tagId: string, updates: any) => {
    const res = await api.patch(`/interviews/${sessionId}/timeline-tags/${tagId}`, updates);
    return res.data;
  },
  deleteTag: async (sessionId: string, tagId: string) => {
    await api.delete(`/interviews/${sessionId}/timeline-tags/${tagId}`);
  },
  getTranscriptJobs: async (sessionId: string) => {
    const res = await api.get(`/interviews/${sessionId}/transcript-jobs`);
    return res.data;
  },
  submitTranscriptJob: async (sessionId: string, provider: string, audioUrl: string, config?: any) => {
    const res = await api.post(`/interviews/${sessionId}/transcript-jobs`, { provider, audioUrl, config });
    return res.data;
  },
  submitAllTranscriptJobs: async (sessionId: string, audioUrl: string, config?: any) => {
    const res = await api.post(`/interviews/${sessionId}/transcript-jobs/all`, { audioUrl, config });
    return res.data;
  },
  askQuestion: async (sessionId: string, question: string) => {
    const res = await api.post(`/interviews/${sessionId}/ask`, { question });
    return res.data;
  },
  generateSummary: async (sessionId: string) => {
    const res = await api.post(`/interviews/${sessionId}/summary`);
    return res.data;
  },
  extractActionItems: async (sessionId: string) => {
    const res = await api.post(`/interviews/${sessionId}/action-items`);
    return res.data;
  },
  autoTag: async (sessionId: string) => {
    const res = await api.post(`/interviews/${sessionId}/auto-tag`);
    return res.data;
  },
  reanalyze: async (sessionId: string) => {
    const res = await api.post(`/interviews/${sessionId}/reanalyze`);
    return res.data;
  },
  getAnalysisHistory: async (sessionId: string) => {
    const res = await api.get(`/interviews/${sessionId}/analysis-history`);
    return res.data;
  },
  getProviderStatus: async () => {
    const res = await api.get("/transcript-providers/status");
    return res.data;
  },
};

// Recording Capture & Storage Service
export const recordingService = {
  uploadRecording: async (sessionId: string, blob: Blob, metadata?: { candidateId?: string; sourceType?: string; duration?: number }) => {
    const formData = new FormData();
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("webm") ? "webm" : "webm";
    formData.append("recording", blob, `recording.${ext}`);
    if (metadata?.candidateId) formData.append("candidateId", metadata.candidateId);
    if (metadata?.sourceType) formData.append("sourceType", metadata.sourceType);
    if (metadata?.duration) formData.append("duration", String(metadata.duration));
    const res = await api.post(`/interviews/${sessionId}/upload-recording`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    });
    return res.data;
  },
  fetchTavusRecording: async (sessionId: string, conversationId: string, candidateId?: string) => {
    const res = await api.post(`/interviews/${sessionId}/fetch-tavus-recording`, { conversationId, candidateId });
    return res.data;
  },
  getRecordings: async (sessionId: string) => {
    const res = await api.get(`/interviews/${sessionId}/recordings`);
    return res.data;
  },
};

export const integrityChecksService = {
  getAll: async (): Promise<IntegrityCheck[]> => {
    const response = await api.get("/integrity-checks");
    return response.data;
  },
  getById: async (id: string): Promise<IntegrityCheck> => {
    const response = await api.get(`/integrity-checks/${id}`);
    return response.data;
  },
  getByCandidateId: async (candidateId: string): Promise<IntegrityCheck[]> => {
    const response = await api.get(`/integrity-checks/candidate/${candidateId}`);
    return response.data;
  },
  create: async (checkData: InsertIntegrityCheck): Promise<IntegrityCheck> => {
    const response = await api.post("/integrity-checks", checkData);
    return response.data;
  },
  update: async (id: string, checkData: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck> => {
    const response = await api.patch(`/integrity-checks/${id}`, checkData);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/integrity-checks/${id}`);
  },
  execute: async (id: string): Promise<{ message: string; checkId: string; status: string }> => {
    const response = await api.post(`/integrity-checks/${id}/execute`);
    return response.data;
  },
  sendReminder: async (id: string): Promise<{ message: string }> => {
    const response = await api.post(`/integrity-checks/${id}/send-reminder`);
    return response.data;
  },
  configureReminder: async (id: string, config: { intervalHours?: number; enabled?: boolean }): Promise<IntegrityCheck> => {
    const response = await api.patch(`/integrity-checks/${id}/reminder-config`, config);
    return response.data;
  }
};

export const onboardingService = {
  getWorkflows: async (): Promise<OnboardingWorkflow[]> => {
    const response = await api.get("/onboarding/workflows");
    return response.data;
  },
  getWorkflow: async (id: string): Promise<OnboardingWorkflow> => {
    const response = await api.get(`/onboarding/workflows/${id}`);
    return response.data;
  },
  triggerOnboarding: async (
    candidateId: string,
    options?: { requirements?: { itSetup?: boolean; buildingAccess?: boolean; equipment?: boolean }; equipmentList?: string[]; startDate?: string; files?: File[]; selectedDocuments?: string[]; generatedBatchId?: string; channel?: "email" | "whatsapp" }
  ): Promise<{ message: string; workflow: OnboardingWorkflow; conversationId?: string }> => {
    const formData = new FormData();
    if (options?.requirements) formData.append("requirements", JSON.stringify(options.requirements));
    if (options?.equipmentList) formData.append("equipmentList", JSON.stringify(options.equipmentList));
    if (options?.startDate) formData.append("startDate", options.startDate);
    if (options?.selectedDocuments) formData.append("selectedDocuments", JSON.stringify(options.selectedDocuments));
    if (options?.generatedBatchId) formData.append("generatedBatchId", options.generatedBatchId);
    if (options?.channel) formData.append("channel", options.channel);
    if (options?.files) {
      for (const file of options.files) {
        formData.append("files", file);
      }
    }
    const response = await api.post(`/onboarding/trigger/${candidateId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  confirmProvisioning: async (workflowId: string, type: "it" | "buildingAccess" | "equipment", confirmedBy?: string): Promise<any> => {
    const response = await api.post(`/onboarding/workflows/${workflowId}/confirm-provisioning`, { type, confirmedBy });
    return response.data;
  },
  getStatus: async (candidateId: string): Promise<OnboardingWorkflow | null> => {
    const response = await api.get(`/onboarding/status/${candidateId}`);
    return response.data;
  },
  getDocumentRequests: async (workflowId: string) => {
    const response = await api.get(`/onboarding/document-requests/${workflowId}`);
    return response.data;
  },
  getAgentLogs: async (workflowId: string) => {
    const response = await api.get(`/onboarding/agent-logs/${workflowId}`);
    return response.data;
  },
  initializeDocumentRequests: async (workflowId: string) => {
    const response = await api.post(`/onboarding/document-requests/${workflowId}/initialize`);
    return response.data;
  },
  markDocumentReceived: async (requestId: string, documentId?: string) => {
    const response = await api.post(`/onboarding/document-requests/${requestId}/received`, { documentId });
    return response.data;
  },
  uploadDocument: async (requestId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/onboarding/document-requests/${requestId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  markDocumentVerified: async (requestId: string, verifiedBy: string) => {
    const response = await api.post(`/onboarding/document-requests/${requestId}/verified`, { verifiedBy });
    return response.data;
  },
  sendReminder: async (requestId: string, channel?: "email" | "whatsapp") => {
    const response = await api.post(`/onboarding/document-requests/${requestId}/remind`, { channel: channel || "email" });
    return response.data;
  },
  sendBulkReminder: async (workflowId: string, channel?: "email" | "whatsapp") => {
    const response = await api.post(`/onboarding/workflows/${workflowId}/remind-all`, { channel: channel || "email" });
    return response.data;
  },
};

export const integrityDocService = {
  getByCandidate: async (candidateId: string) => {
    const response = await api.get(`/candidates/${candidateId}/document-requirements`);
    return response.data;
  },
  verify: async (id: string) => {
    const response = await api.post(`/document-requirements/${id}/verify`);
    return response.data;
  },
  sendReminder: async (id: string, channel: "email" | "whatsapp" = "whatsapp") => {
    const response = await api.post(`/document-requirements/${id}/send-reminder`, { channel });
    return response.data;
  },
  requestDocs: async (checkId: string, documentTypes: string[], sendWhatsappRequest = true) => {
    const response = await api.post(`/integrity-checks/${checkId}/request-documents`, {
      documentTypes,
      sendWhatsappRequest,
    });
    return response.data;
  },
  upload: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/document-requirements/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  reject: async (id: string, reason: string) => {
    const response = await api.post(`/document-requirements/${id}/reject`, { reason });
    return response.data;
  },
  remindAll: async (candidateId: string, channel: "email" | "whatsapp" = "whatsapp") => {
    const response = await api.post(`/candidates/${candidateId}/integrity-docs/remind-all`, { channel });
    return response.data;
  },
};

export const offersService = {
  getAll: async (): Promise<any[]> => {
    const response = await api.get("/offers");
    return response.data;
  },
  getById: async (id: string): Promise<any> => {
    const response = await api.get(`/offers/${id}`);
    return response.data;
  },
  getByCandidateId: async (candidateId: string): Promise<any> => {
    const response = await api.get(`/offers/candidate/${candidateId}`);
    return response.data;
  },
  create: async (data: {
    candidateId: string;
    jobId?: string;
    salary: string;
    currency?: string;
    startDate?: string;
    benefits?: string[];
    notes?: string;
    contractType?: string;
  }): Promise<any> => {
    const response = await api.post("/offers", data);
    return response.data;
  },
  generateDocumentPreview: async (data: {
    candidateId: string;
    jobId?: string;
    contractType: string;
    salary?: string;
    startDate?: string;
    benefits?: string[];
  }): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.post("/offers/generate-document-preview", data, {
      responseType: "blob",
    });
    // Extract filename from Content-Disposition header
    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = match?.[1] || "document-preview.docx";
    return { blob: response.data, filename };
  },
  update: async (id: string, data: any): Promise<any> => {
    const response = await api.patch(`/offers/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/offers/${id}`);
  },
  send: async (id: string): Promise<any> => {
    const response = await api.post(`/offers/${id}/send`);
    return response.data;
  },
  respond: async (id: string, response: "accepted" | "declined"): Promise<any> => {
    const resp = await api.post(`/offers/${id}/respond`, { response });
    return resp.data;
  },
};
