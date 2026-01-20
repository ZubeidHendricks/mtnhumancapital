import axios from "axios";
import type { Candidate, InsertCandidate, Job, InsertJob, IntegrityCheck, InsertIntegrityCheck, Interview } from "@shared/schema";

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

export const jobsService = {
  getAll: async (): Promise<Job[]> => {
    const response = await api.get("/jobs");
    return response.data;
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
    return response.data;
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
