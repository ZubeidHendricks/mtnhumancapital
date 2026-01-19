import axios from 'axios';

const API_BASE = '/api/v1'; // Proxied through Vite

const getAuth = () => {
  const username = localStorage.getItem('wp_username') || '';
  const password = localStorage.getItem('wp_password') || '';
  return 'Basic ' + btoa(`${username}:${password}`);
};

export const api = {
  // Authentication
  async login(username: string, password: string) {
    localStorage.setItem('wp_username', username);
    localStorage.setItem('wp_password', password);
    
    // Verify credentials
    try {
      const response = await axios.get(`${API_BASE}/server-health`, {
        headers: { 'Authorization': getAuth() }
      });
      return { success: true, data: response.data };
    } catch (error) {
      localStorage.removeItem('wp_username');
      localStorage.removeItem('wp_password');
      throw error;
    }
  },

  async logout() {
    await axios.post(`${API_BASE}/logout`, {}, {
      headers: { 'Authorization': getAuth() }
    });
    localStorage.removeItem('wp_username');
    localStorage.removeItem('wp_password');
  },

  isAuthenticated() {
    return !!localStorage.getItem('wp_username');
  },

  // Analytics
  async getAnalytics() {
    const response = await axios.get(`${API_BASE}/analytics/overview`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  async getUserAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await axios.get(`${API_BASE}/user-analytics?${params}`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  async getMediaAnalytics() {
    const response = await axios.get(`${API_BASE}/media-analytics`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  // Media
  async getMedia(page = 1, perPage = 20) {
    const response = await axios.get(`${API_BASE}/media?page=${page}&per_page=${perPage}`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE}/media/upload`, formData, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  async deleteMedia(id: number) {
    const response = await axios.delete(`${API_BASE}/media/${id}`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  // Posts
  async getPosts(params: any = {}) {
    const query = new URLSearchParams({
      post_type: 'post',
      per_page: '20',
      page: '1',
      ...params
    });
    
    const response = await axios.get(`${API_BASE}/posts-tables?${query}`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  // Server Health
  async getServerHealth() {
    const response = await axios.get(`${API_BASE}/server-health`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  // Activity Log
  async getActivityLog(page = 1, perPage = 20) {
    const response = await axios.get(`${API_BASE}/activity-log?page=${page}&per_page=${perPage}`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  },

  // Plugins
  async getPlugins() {
    const response = await axios.get(`${API_BASE}/plugins`, {
      headers: { 'Authorization': getAuth() }
    });
    return response.data;
  }
};
