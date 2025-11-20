import axios from "axios";
import type { Candidate, InsertCandidate, Job, InsertJob } from "@shared/schema";

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
