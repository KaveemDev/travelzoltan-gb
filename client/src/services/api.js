import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.zoltanvisa.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get Basic Auth header
const getBasicAuthHeader = () => {
  const username = localStorage.getItem('adminUsername');
  const password = localStorage.getItem('adminPassword');
  if (username && password) {
    const credentials = btoa(`${username}:${password}`);
    return `Basic ${credentials}`;
  }
  return null;
};

// Request interceptor to add Basic Auth header to all requests
api.interceptors.request.use(
  (config) => {
    const authHeader = getBasicAuthHeader();
    if (authHeader) {
      config.headers.Authorization = authHeader;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('[API Error]', error.config?.url, error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      // Don't reload for auth-related request failures (login/verify)
      const url = error.config?.url || '';
      const isAuthRequest = url.includes('/admin/login') || url.includes('/admin/verify-credentials');
      
      console.log('[API Error] 401 detected, isAuthRequest:', isAuthRequest);
      
      if (!isAuthRequest) {
        // Credentials invalid - clear storage (React state will show login form)
        console.log('[API Error] Clearing stored credentials...');
        localStorage.removeItem('adminUsername');
        localStorage.removeItem('adminPassword');
        localStorage.removeItem('adminUser');
        // Note: No page reload - let React state handle UI naturally
      }
    }
    return Promise.reject(error);
  }
);

// Public API endpoints
export const visaAPI = {
  // Get live visa approvals for website trust ticker
  getLiveApprovals: async () => {
    try {
      const response = await api.get('/live-approvals');
      return response.data;
    } catch (error) {
      console.warn('[API] Could not fetch live approvals, using fallback:', error);
      return { success: false, data: [] };
    }
  },

  // Get visa requirements based on citizenship and destination
  getVisaRequirements: async (citizenship, destination) => {
    try {
      const response = await api.get('/visa-requirements', {
        params: { citizenship, destination }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getRequirements: async (citizenship, destination) => {
    try {
      const response = await api.get('/visa-requirements', {
        params: { citizenship, destination }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create a new visa application (handles both JSON lead creation and multipart/form-data upload)
  createApplication: async (data) => {
    try {
      const isFormData = data instanceof FormData;
      const response = await api.post('/applications', data, {
        headers: {
          'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Submit a query or contact inquiry (persisted directly to backend with status 'Query Received')
  submitQuery: async (queryData) => {
    try {
      const response = await api.post('/queries', queryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update an existing application's details
  updateApplication: async (id, data) => {
    try {
      const response = await api.put(`/applications/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload documents for an existing application
  uploadDocuments: async (id, formData) => {
    try {
      const response = await api.post(`/applications/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get application agreement record
  getApplicationAgreement: async (id) => {
    try {
      const response = await api.get(`/applications/${id}/agreement`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Process payment
  createPaymentIntent: async (applicationId) => {
    try {
      const response = await api.post('/payments/create-intent', { applicationId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Create Razorpay order
  createPaymentOrder: async (applicationId, currency, paymentOption) => {
    try {
      const response = await api.post('/payments/create-order', { applicationId, currency, paymentOption });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify Razorpay payment
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Admin API endpoints
export const adminAPI = {
  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Change Admin username and password
  changeCredentials: async (newUsername, newPassword) => {
    try {
      const response = await api.put('/admin/change-credentials', { newUsername, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Applications
  getAllApplications: async (params = {}) => {
    try {
      const response = await api.get('/admin/applications', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getApplicationById: async (id) => {
    try {
      const response = await api.get(`/admin/applications/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateApplicationStatus: async (id, status, notes) => {
    try {
      const response = await api.put(`/admin/applications/${id}/status`, { status, notes });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getApplicationAgreement: async (id) => {
    try {
      const response = await api.get(`/admin/applications/${id}/agreement`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Send or resend invoice email
  sendInvoiceEmail: async (id) => {
    try {
      const response = await api.post(`/admin/applications/${id}/send-invoice`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Send diagnostic test email
  sendTestEmail: async (email) => {
    try {
      const response = await api.post('/admin/send-test-email', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Payments
  getAllPayments: async () => {
    try {
      const response = await api.get('/admin/payments');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getPaymentStats: async () => {
    try {
      const response = await api.get('/admin/payments/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Analytics
  getAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Configurations
  getAllConfigurations: async () => {
    try {
      const response = await api.get('/admin/configurations');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createConfiguration: async (data) => {
    try {
      const response = await api.post('/admin/configurations', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateConfiguration: async (id, data) => {
    try {
      const response = await api.put(`/admin/configurations/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteConfiguration: async (id) => {
    try {
      const response = await api.delete(`/admin/configurations/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  reorderConfigurations: async (orderedIds) => {
    try {
      const response = await api.put('/admin/configurations/reorder', { orderedIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Live Visa Approvals Management
  getAllLiveApprovals: async () => {
    try {
      const response = await api.get('/admin/live-approvals');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createLiveApproval: async (data) => {
    try {
      const response = await api.post('/admin/live-approvals', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateLiveApproval: async (id, data) => {
    try {
      const response = await api.put(`/admin/live-approvals/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  toggleLiveApproval: async (id) => {
    try {
      const response = await api.put(`/admin/live-approvals/${id}/toggle`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteLiveApproval: async (id) => {
    try {
      const response = await api.delete(`/admin/live-approvals/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  importApprovalsFromApplications: async () => {
    try {
      const response = await api.post('/admin/live-approvals/import-from-applications');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  resetDefaultLiveApprovals: async () => {
    try {
      const response = await api.post('/admin/live-approvals/reset-defaults');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Document API endpoints
export const documentAPI = {
  // Get document info
  getDocumentInfo: async (id) => {
    try {
      const response = await api.get(`/document/${id}/info`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get document download URL
  getDocumentDownloadUrl: (id) => {
    return `${API_BASE_URL}/document/${id}`;
  },

  // Download document (opens in new tab or triggers download)
  downloadDocument: (id) => {
    const url = `${API_BASE_URL}/document/${id}`;
    window.open(url, '_blank');
  },

  // Delete document (admin only)
  deleteDocument: async (id) => {
    try {
      const response = await api.delete(`/document/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Auth API endpoints
export const authAPI = {
  // Admin login - stores credentials for Basic Auth
  login: async (username, password) => {
    try {
      const response = await api.post('/admin/login', { username, password });
      
      if (response.data.success) {
        // Store credentials and user info in localStorage
        localStorage.setItem('adminUsername', username);
        localStorage.setItem('adminPassword', password);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify credentials validity
  verifyCredentials: async () => {
    try {
      const response = await api.post('/admin/verify-credentials');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Logout
  logout: async () => {
    try {
      const response = await api.post('/admin/logout');
      
      // Clear stored credentials and user info
      localStorage.removeItem('adminUsername');
      localStorage.removeItem('adminPassword');
      localStorage.removeItem('adminUser');
      
      return response.data;
    } catch (error) {
      // Still clear local storage even if server request fails
      localStorage.removeItem('adminUsername');
      localStorage.removeItem('adminPassword');
      localStorage.removeItem('adminUser');
      throw error.response?.data || error.message;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const username = localStorage.getItem('adminUsername');
    const password = localStorage.getItem('adminPassword');
    const user = localStorage.getItem('adminUser');
    return !!(username && password && user);
  },

  // Get current user info
  getCurrentUser: () => {
    const user = localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  },

  // Get Basic Auth header for manual use
  getAuthHeader: () => {
    const username = localStorage.getItem('adminUsername');
    const password = localStorage.getItem('adminPassword');
    if (username && password) {
      return `Basic ${btoa(`${username}:${password}`)}`;
    }
    return null;
  }
};

export default api;
