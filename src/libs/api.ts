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
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/app',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
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
  getCounters: () => api.get('/counters'),
  
  // Update counter status
  updateStatus: (counterId: string, status: 'active' | 'paused' | 'offline', reason?: string) =>
    api.patch(`/counters/${counterId}/status`, { status, reason }),
  
  // Get counter statistics
  getStats: (counterId: string, period?: string) =>
    api.get(`/counters/${counterId}/stats`, { params: { period } }),
};

// User Management API
export const userAPI = {
  // Get all users
  getUsers: () => api.get('/users'),
  
  // Create new user
  createUser: (userData: any) => api.post('/users', userData),
  
  // Update user
  updateUser: (userId: string, userData: any) => 
    api.patch(`/users/${userId}`, userData),
  
  // Delete user
  deleteUser: (userId: string) => api.delete(`/users/${userId}`),
  
  // Login
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  // Logout
  logout: () => api.post('/auth/logout'),
};

// Service Management API
export const serviceAPI = {
  // Get all services
  getServices: () => api.get('/services'),
  
  // Create new service
  createService: (serviceData: any) => api.post('/services', serviceData),
  
  // Update service
  updateService: (serviceId: string, serviceData: any) =>
    api.patch(`/services/${serviceId}`, serviceData),
  
  // Delete service
  deleteService: (serviceId: string) => api.delete(`/services/${serviceId}`),
};

// 📋 Procedures API - Quản lý thủ tục
export const proceduresAPI = {
  // 🔍 [GET] `/procedures/` – Lấy danh sách thủ tục
  getProcedures: (search?: string): Promise<{ data: Procedure[] }> => {
    const params = search ? { search } : {};
    return api.get('/procedures/', { params });
  },
  
  // 🔎 [GET] `/procedures/search-extended` – Tìm kiếm thủ tục kèm quầy
  searchExtended: (search?: string): Promise<{ data: ProcedureExtended[] }> => {
    const params = search ? { search } : {};
    return api.get('/procedures/search-extended', { params });
  },
};

// 🎟 Tickets API - Quản lý phiếu xếp hàng
export const ticketsAPI = {
  // 📝 [POST] `/tickets/` – Tạo phiếu mới
  createTicket: (data: CreateTicketRequest): Promise<{ data: Ticket }> => {
    return api.post('/tickets/', data);
  },
};

// 🧾 Counters API - Quản lý quầy (theo API documentation mới)
export const countersAPI = {
  // ⏭️ [POST] `/counters/{counter_id}/call-next` – Gọi lượt tiếp theo
  callNext: (counterId: number): Promise<{ data: CallNextResponse }> => {
    return api.post(`/counters/${counterId}/call-next`);
  },
  
  // ⏸️ [POST] `/counters/{counter_id}/pause` – Tạm dừng quầy
  pauseCounter: (counterId: number, reason: string): Promise<{ data: PauseCounterResponse }> => {
    return api.post(`/counters/${counterId}/pause`, { reason });
  },
  
  // ▶️ [PUT] `/counters/{counter_id}/resume` – Tiếp tục quầy
  resumeCounter: (counterId: number): Promise<{ data: ResumeCounterResponse }> => {
    return api.put(`/counters/${counterId}/resume`);
  },
};

export default api;
