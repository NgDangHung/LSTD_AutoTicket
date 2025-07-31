import axios from 'axios';
import { MockQueueManager } from './mockQueue';
import type { 
  Procedure, 
  ProcedureExtended, 
  CreateTicketRequest, 
  Ticket, 
  CallNextResponse, 
  PauseCounterRequest, 
  PauseCounterResponse, 
  ResumeCounterResponse 
} from './apiTypes';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: 'https://detect-seat-we21.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // ✅ Sử dụng sessionStorage thay vì localStorage
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for requests
    // console.log('🌐 API Request Details:');
    // console.log('📡 Method:', config.method?.toUpperCase());
    // console.log('🔗 Endpoint:', config.url);
    // console.log('🌍 Full URL:', `${config.baseURL}${config.url}`);
    // console.log('📤 Request Payload:', JSON.stringify(config.data, null, 2));
    // console.log('📋 Headers:', config.headers);
    // console.log('────────────────────────────────────────');
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // Debug logging for successful responses
    // console.log('✅ API Response Success:');
    // console.log('📊 Status:', response.status, response.statusText);
    // console.log('🔗 URL:', response.config.url);
    // console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    // console.log('────────────────────────────────────────');
    return response;
  },
  (error) => {
    // Debug logging for error responses
    // console.log('❌ API Response Error:');
    // console.log('📊 Status:', error.response?.status, error.response?.statusText);
    // console.log('🔗 URL:', error.config?.url);
    // console.log('📥 Error Data:', JSON.stringify(error.response?.data, null, 2));
    // console.log('💬 Error Message:', error.message);
    // console.log('────────────────────────────────────────');
    
    if (error.response?.status === 401) {
      // ✅ Clear sessionStorage thay vì localStorage
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Queue Management API
export const queueAPI = {
  // Get current queue status
  getQueueStatus: async () => {
    // Mock implementation using localStorage
    const queue = MockQueueManager.getQueue();
    const stats = MockQueueManager.getStats();
    
    return {
      data: {
        queue,
        stats
      }
    };
  },
  
  // Create new queue number
  createQueueNumber: async (data: { 
    serviceId: string; 
    counterId: string;
    serviceName: string;
    counterName: string;
    number: string;
    status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
    priority: number;
    createdAt: string;
    estimatedWaitTime: number;
  }) => {
    // Mock implementation
    const newQueue = MockQueueManager.addToQueue(data);
    
    return {
      data: newQueue
    };
  },
  
  // Call next number
  callNext: async (counterId: string) => {
    // Mock implementation
    const waitingQueue = MockQueueManager.getQueueByStatus('waiting')
      .filter(item => item.counterId === counterId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    if (waitingQueue.length > 0) {
      MockQueueManager.updateQueueStatus(waitingQueue[0].id, 'calling');
      return { data: waitingQueue[0] };
    }
    
    throw new Error('No waiting queue found for this counter');
  },
  
  // Complete current number
  completeNumber: async (queueId: string) => {
    MockQueueManager.updateQueueStatus(queueId, 'completed');
    return { data: { success: true } };
  },
  
  // Skip current number
  skipNumber: async (queueId: string) => {
    MockQueueManager.updateQueueStatus(queueId, 'skipped');
    return { data: { success: true } };
  },
  
  // Get queue history
  getHistory: async (filters?: any) => {
    const queue = MockQueueManager.getQueue();
    return { data: queue };
  },
};

// Counter Management API
export const counterAPI = {
  // Get all counters
  getCounters: () => axiosInstance.get('/counters', { params: { tenxa: 'phuonghagiang1' } }),
  
  // Update counter status
  updateStatus: (counterId: string, status: 'active' | 'paused' | 'offline', reason?: string) =>
    axiosInstance.patch(`/counters/${counterId}/status`, { status, reason }),
  
  // Get counter statistics
  getStats: (counterId: string, period?: string) =>
    axiosInstance.get(`/counters/${counterId}/stats`, { params: { period, tenxa: 'phuonghagiang1' } }),
};

// User Management API
export const userAPI = {
  // Get all users
  getUsers: () => axiosInstance.get('/users', { params: { tenxa: 'phuonghagiang1' } }),

  // Create new user
  createUser: (userData: any) => axiosInstance.post('/users', userData, { params: { tenxa: 'phuonghagiang1' } }),

  // Update user
  updateUser: (userId: string, userData: any) =>
    axiosInstance.patch(`/users/${userId}`, userData, { params: { tenxa: 'phuonghagiang1' } }),

  // Delete user
  deleteUser: (userId: string) => axiosInstance.delete(`/users/${userId}`, { params: { tenxa: 'phuonghagiang1' } }),

  // Login - Authentication API
  login: (credentials: { username: string; password: string }) => {
    // Try form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    return axiosInstance.post('/auths/login?tenxa=phuonghagiang1', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  
  // Register new user
  register: (userData: { username: string; password: string }) =>
    axiosInstance.post('/auths/users', userData, { params: { tenxa: 'phuonghagiang1' } }),

  // Get current user info
  getCurrentUser: () =>
    axiosInstance.get('/auths/me', { params: { tenxa: 'phuonghagiang1' } }),

  // Logout
  logout: () => axiosInstance.post('/auth/logout', null, { params: { tenxa: 'phuonghagiang1' } }),
};

// Service Management API
export const serviceAPI = {
  // Get all services
  getServices: () => axiosInstance.get('/services'),

  // Create new service
  createService: (serviceData: any) => axiosInstance.post('/services', serviceData),

  // Update service
  updateService: (serviceId: string, serviceData: any) =>
    axiosInstance.patch(`/services/${serviceId}`, serviceData),

  // Delete service
  deleteService: (serviceId: string) => axiosInstance.delete(`/services/${serviceId}`),
};

// 📋 Procedures API - Quản lý thủ tục
export const proceduresAPI = {
  // 🔍 [GET] `/procedures/` – Lấy danh sách thủ tục
  getProcedures: (search?: string): Promise<{ data: Procedure[] }> => {
    const params = search ? { search, tenxa: 'phuonghagiang1' } : { tenxa: 'phuonghagiang1' };
    return axiosInstance.get('/procedures', { params });
  },
  
  // 🔎 [GET] `/procedures/search-extended` – Tìm kiếm thủ tục kèm quầy
  searchExtended: (search?: string): Promise<{ data: ProcedureExtended[] }> => {
    const params = search ? { search, tenxa: 'phuonghagiang1' } : { tenxa: 'phuonghagiang1' };
    return axiosInstance.get('/procedures/search-extended', { params });
  },
};

// 🎟 Tickets API - Quản lý phiếu xếp hàng
export const ticketsAPI = {
  // 📝 [POST] `/tickets/` – Tạo phiếu mới
  createTicket: (data: CreateTicketRequest): Promise<{ data: Ticket }> => {
    return axiosInstance.post('/tickets/', data, { params: { tenxa: 'phuonghagiang1' } });
  },
};

// 🧾 Counters API - Quản lý quầy (theo API documentation mới)
export const countersAPI = {
  // ⏭️ [POST] `/counters/{counter_id}/call-next` – Gọi lượt tiếp theo
  callNext: (counterId: number): Promise<{ data: CallNextResponse }> => {
    return axiosInstance.post(`/counters/${counterId}/call-next`, null, { params: { tenxa: 'phuonghagiang1' } });
  },
  
  // ⏸️ [POST] `/counters/{counter_id}/pause` – Tạm dừng quầy
  pauseCounter: (counterId: number, reason: string): Promise<{ data: PauseCounterResponse }> => {
    return axiosInstance.post(`/counters/${counterId}/pause`, { reason }, { params: { tenxa: 'phuonghagiang1' } });
  },
  
  // ▶️ [PUT] `/counters/{counter_id}/resume` – Tiếp tục quầy
  resumeCounter: (counterId: number): Promise<{ data: ResumeCounterResponse }> => {
    return axiosInstance.put(`/counters/${counterId}/resume`, null, { params: { tenxa: 'phuonghagiang1' } });
  },
};

// TTS API endpoints
export const ttsAPI = {
  // Generate TTS audio file - POST /app/tts
  // Returns MP3 audio blob with Content-Type: audio/mpeg
  generateAudio: async (counterId: number, ticketNumber: number, tenxa: string): Promise<Blob> => {
    const response = await fetch(`${axiosInstance.defaults.baseURL}/tts?tenxa=${encodeURIComponent(tenxa)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg, audio/*' 
      },
      body: JSON.stringify({
        counter_id: counterId,
        ticket_number: ticketNumber,
      }),
      
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Counter not found');
      }
      if (response.status === 422) {
        const errorData = await response.json();
        throw new Error(`Validation error: ${errorData.detail || 'Invalid data'}`);
      }
      throw new Error(`TTS API failed: ${response.statusText}`);
    }

    // Verify response is audio content
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('audio')) {
      console.warn('⚠️ TTS Response Content-Type:', contentType);
    }

    // Return MP3 blob that can be used with HTML5 audio or downloaded
    const audioBlob = await response.blob();
    
    // Ensure blob has correct MIME type for MP3
    return new Blob([audioBlob], { type: 'audio/mpeg' });
  },

  // Get seat info by ID - GET /seats/{seat_id}
  getSeatInfo: async (seatId: number) => {
    const response = await fetch(`${axiosInstance.defaults.baseURL}/seats/${seatId}`);
    if (!response.ok) {
      if (response.status === 422) {
        throw new Error('Invalid seat_id format');
      }
      throw new Error(`Failed to get seat info: ${response.statusText}`);
    }
    return await response.json();
  },

  // Get all client seats for counter - GET /seats/counter/{counter_id}
  getCounterSeats: async (counterId: number) => {
    const response = await fetch(`${axiosInstance.defaults.baseURL}/seats/counter/${counterId}`);
    if (!response.ok) {
      if (response.status === 422) {
        throw new Error('Invalid counter_id format');
      }
      throw new Error(`Failed to get counter seats: ${response.statusText}`);
    }
    return await response.json();
  }
};

// Export axiosInstance as api for backward compatibility
const api = axiosInstance;

export default api;
