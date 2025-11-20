import axios from "axios";

// Access the environment variable we set (or default to localhost for dev)
// In a real Vite app, this would be import.meta.env.VITE_API_URL
const API_URL = "https://aihr-backend-hmew5.ondigitalocean.app/api/v1";

// Create a configured axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the JWT token if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("ahc_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 (Unauthorized) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If we get a 401, clear the token and redirect to login
      // (In a real app, we might try to refresh the token first)
      localStorage.removeItem("ahc_auth_token");
      window.location.href = "/"; 
    }
    return Promise.reject(error);
  }
);

// --- API Service Methods ---

// Auth Service
export const authService = {
  login: async (credentials: any) => {
    // This matches the POST /auth/login endpoint from your docs
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  }
};

// Jobs Service
export const jobsService = {
  getAll: async () => {
    const response = await api.get("/jobs/");
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  create: async (jobData: any) => {
    const response = await api.post("/jobs/", jobData);
    return response.data;
  }
};

// Candidate Service
export const candidateService = {
  getAll: async () => {
    const response = await api.get("/candidates/");
    return response.data;
  },
  uploadResume: async (formData: FormData) => {
    const response = await api.post("/candidates/upload-resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
};
