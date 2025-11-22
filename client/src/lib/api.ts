import axios from "axios";
import type { Candidate, InsertCandidate, Job, InsertJob, IntegrityCheck, InsertIntegrityCheck } from "@shared/schema";

const API_URL = "/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const jobsService = {
  getAll: async (): Promise<Job[]> => {
    const response = await api.get("/jobs");
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

export const interviewService = {
  getVoiceConfig: async (): Promise<{ accessToken: string; websocketUrl: string; configId?: string }> => {
    const response = await api.get("/interview/voice/config");
    return response.data;
  },
  createVideoSession: async (candidateId?: string, candidateName?: string): Promise<{ sessionUrl: string; sessionId: string; status: string; candidateId?: string; candidateName?: string }> => {
    const response = await api.post("/interview/video/session", { 
      candidateId, 
      candidateName 
    });
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
  }
};
