/**
 * 🏛️ Official Backend API Endpoints
 * Consolidated from official BE documentation
 * 
 * Base URL: https://lstd.onrender.com/app
 * 
 * This file contains ALL official API endpoints provided by the backend
 * organized by category as documented in the official API specification.
 */

import axios from 'axios';

// ===================================
// 🔧 Base Configuration
// ===================================

const BASE_URL = 'https://lstd.onrender.com/app';

// Create axios instance with base configuration
const rootApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
rootApi.interceptors.request.use(
  (config) => {
    // ✅ Sử dụng sessionStorage thay vì localStorage
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // ✅ Debug log for call-next requests
      if (config.url?.includes('/call-next?tenxa=phuonghagiang1')) {
        console.log('🔍 Call-next request interceptor debug:', {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
          hasToken: !!token,
          tokenPreview: token.substring(0, 20) + '...',
          authHeader: config.headers.Authorization,
          allHeaders: config.headers
        });
      }
    } else {
      console.warn('⚠️ No auth token found in sessionStorage for request:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('❌ Root API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
rootApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // ✅ Clear sessionStorage thay vì localStorage
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===================================
// 🔐 Authentication APIs (/auths/)
// ===================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
}

export const authsAPI = {
  /**
   * 🔑 [POST] /auths/login
   * Authenticate user and get access token
   */
  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    // Sử dụng đúng endpoint và truyền params qua query string
    return rootApi.post('/auths/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      params: { tenxa: 'phuonghagiang1' }
    }).then(response => response.data);
  },

  /**
   * 👤 [POST] /auths/users/
   * Create new user account
   */
  createUser: (userData: CreateUserRequest): Promise<User> => {
    return rootApi.post('/auths/users', userData, { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * 📋 [GET] /auths/me
   * Get current authenticated user information
   */
  getCurrentUser: (): Promise<User> => {
    return rootApi.get('/auths/me', { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },
};

// ===================================
// 🔊 TTS APIs (/tts/)
// ===================================

export interface TTSRequest {
  counter_id: number;
  ticket_number: number;
}

export const ttsAPI = {
  /**
   * 🎵 [POST] /tts/
   * Generate TTS audio file for ticket announcement
   * Returns: MP3 audio blob (Content-Type: audio/mpeg)
   */
  generateAudio: async (request: TTSRequest): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/tts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg, audio/*'
      },
      body: JSON.stringify({ ...request, tenxa: 'phuonghagiang1' })
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

    const audioBlob = await response.blob();
    return new Blob([audioBlob], { type: 'audio/mpeg' });
  },
};

// ===================================
// 📋 Procedures APIs (/procedures/)
// ===================================

export interface Procedure {
  id: number;
  name: string;
  description?: string;
  estimated_time?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcedureExtended extends Procedure {
  counters: Counter[];
}

export interface Counter {
  id: number;
  name: string;
  is_active: boolean;
  current_ticket?: number;
  status: 'active' | 'paused' | 'offline';
}

export const proceduresAPI = {
  /**
   * 📝 [GET] /procedures/
   * Get list of all procedures
   */
  getProcedures: (search?: string): Promise<Procedure[]> => {
    const params = search ? { search } : {};
    return rootApi.get('/procedures', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * 🔍 [GET] /procedures/search-extended
   * Search procedures with associated counter information
   */
  searchExtended: (search?: string): Promise<ProcedureExtended[]> => {
    const params = search ? { search } : {};
    return rootApi.get('/procedures/search-extended', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },
};

// ===================================
// 🎟️ Tickets APIs (/tickets/)
// ===================================

export interface CreateTicketRequest {
  procedure_id: number;
  counter_id?: number;
  priority?: number;
}

export interface Ticket {
  id: number;
  number: number;
  procedure_id: number;
  procedure_name: string;
  counter_id?: number;
  counter_name?: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
  priority: number;
  created_at: string;
  updated_at: string;
  called_at?: string;
  completed_at?: string;
  estimated_wait_time?: number;
}

export interface WaitingTicket {
  id: number;
  number: number;
  procedure_name: string;
  counter_name?: string;
  priority: number;
  created_at: string;
  estimated_wait_time?: number;
}

export interface WaitingTicketsResponse {
  waiting_tickets: WaitingTicket[];
  total_waiting: number;
  estimated_total_wait_time?: number;
}

export interface UpdateTicketStatusRequest {
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
}

export const ticketsAPI = {
  /**
   * 🎫 [POST] /tickets/
   * Create new ticket for queue
   */
  createTicket: (request: CreateTicketRequest): Promise<Ticket> => {
    return rootApi.post('/tickets', request, { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * ⏳ [GET] /tickets/waiting
   * Get all waiting tickets in queue
   */
  getWaitingTickets: (): Promise<WaitingTicketsResponse> => {
    return rootApi.get('/tickets/waiting', { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * 🔄 [PATCH] /tickets/{ticket_id}/status
   * Update ticket status
   */
  updateTicketStatus: (ticketId: number, request: UpdateTicketStatusRequest): Promise<Ticket> => {
    return rootApi.patch(`/tickets/${ticketId}/status`, request).then(response => response.data);
  },
};

// ===================================
// 💺 Seats APIs (/seats/)
// ===================================

export interface Seat {
  id: number;
  name: string;
  counter_id: number;
  is_active: boolean;
  ip_address?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateSeatRequest {
  name?: string;
  counter_id?: number;
  is_active?: boolean;
  ip_address?: string;
  location?: string;
}

export const seatsAPI = {
  /**
   * 🪑 [GET] /seats/
   * Get all seats
   */
  getSeats: (): Promise<Seat[]> => {
    return rootApi.get('/seats', { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * 🎯 [GET] /seats/{seat_id}
   * Get specific seat information by ID
   */
  getSeatById: (seatId: number): Promise<Seat> => {
    return rootApi.get(`/seats/${seatId}`).then(response => response.data);
  },

  /**
   * ✏️ [PUT] /seats/{seat_id}
   * Update seat information
   */
  updateSeat: (seatId: number, request: UpdateSeatRequest): Promise<Seat> => {
    return rootApi.put(`/seats/${seatId}`, request).then(response => response.data);
  },

  /**
   * 🏢 [GET] /seats/counter/{counter_id}
   * Get all client seats for specific counter
   */
  getSeatsByCounter: (counterId: number): Promise<Seat[]> => {
    return rootApi.get(`/seats/counter/${counterId}`).then(response => response.data);
  },
};

// ===================================
// 🏪 Counters APIs (/counters/)
// ===================================

export interface CallNextResponse {
  number: number;
  counter_name: string;
}

export interface PauseCounterRequest {
  reason: string;
}

export interface PauseCounterResponse {
  success: boolean;
  message: string;
  paused_at: string;
  reason: string;
}

export interface ResumeCounterResponse {
  success: boolean;
  message: string;
  resumed_at: string;
}

export const countersAPI = {
  /**
   * 📋 [GET] /counters/
   * Get all counters information
   */
  getCounters: (): Promise<Counter[]> => {
    return rootApi.get('/counters', { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * ⏭️ [POST] /counters/{counter_id}/call-next
   * Call next ticket in queue for specific counter
   */
  callNext: (counterId: number): Promise<CallNextResponse> => {
    return rootApi.post(`/counters/${counterId}/call-next`, null, { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * ⏸️ [POST] /counters/{counter_id}/pause
   * Pause counter operations with reason
   */
  pauseCounter: (counterId: number, request: PauseCounterRequest): Promise<PauseCounterResponse> => {
    return rootApi.post(`/counters/${counterId}/pause`, request, { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },

  /**
   * ▶️ [PUT] /counters/{counter_id}/resume
   * Resume counter operations
   */
  resumeCounter: (counterId: number): Promise<ResumeCounterResponse> => {
    return rootApi.put(`/counters/${counterId}/resume`, null, { params: { tenxa: 'phuonghagiang1' } }).then(response => response.data);
  },
};

// ===================================
// 🦶 Footers APIs (/footers/)
// ===================================

export interface FooterConfig {
  work_time: string;
  hotline: string;
}

export const footersAPI = {
  /**
   * 🦶 [GET] /footers
   * Lấy thông tin work_time và hotline của một xã
   */
  getFooter: (tenxa: string): Promise<FooterConfig> => {
    return rootApi.get('/footers', { params: { tenxa } }).then(res => res.data);
  },

  /**
   * 🦶 [POST] /footers
   * Tạo hoặc cập nhật thông tin work_time và hotline cho một xã
   */
  setFooter: (tenxa: string, config: FooterConfig): Promise<FooterConfig> => {
    return rootApi.post('/footers', config, { params: { tenxa } }).then(res => res.data);
  },
};

// ===================================
// 📊 Stats Dashboard APIs (/stats/)
// ===================================

export interface CounterStats {
  counter_id: number;
  total_tickets?: number;
  attended_tickets?: number;
  avg_handling_time_seconds?: number;
  avg_waiting_time_seconds?: number;
  total_afk_seconds?: number;
  started_at?: string;
  ended_at?: string;
}

export const statsDashboardAPI = {
  /**
   * 🟢 [GET] /stats/tickets-per-counter
   * Tổng số vé đã phát theo từng quầy
   */
  getTicketsPerCounter: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/tickets-per-counter', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/attended-tickets
   * Số vé đã tiếp nhận theo từng quầy
   */
  getAttendedTickets: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/attended-tickets', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/average-handling-time
   * Thời gian xử lý trung bình từng quầy
   */
  getAverageHandlingTime: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/average-handling-time', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/average-waiting-time
   * Thời gian chờ trung bình từng quầy
   */
  getAverageWaitingTime: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/average-waiting-time', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/afk-duration
   * Tổng thời gian vắng mặt từng quầy
   */
  getAfkDuration: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/afk-duration', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/working-time-check
   * Giờ làm việc từng quầy trong ngày
   */
  getWorkingTimeCheck: (params?: { date_check?: string }) =>
    rootApi.get('/stats/working-time-check', { params: { ...params, tenxa: 'phuonghagiang1' } }).then(res => res.data),
};

// ===================================
// 🔧 Utility Functions
// ===================================

/**
 * 🩺 Check API health status
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await rootApi.get('/health', { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('API Health Check Failed:', error);
    return false;
  }
};

/**
 * 🌐 Get API base URL
 */
export const getApiBaseUrl = (): string => BASE_URL;

// ===================================
// 📤 Exports
// ===================================

// Export the configured axios instance
export { rootApi };

// Export all API categories
export const officialAPI = {
  auths: authsAPI,
  tts: ttsAPI,
  procedures: proceduresAPI,
  tickets: ticketsAPI,
  seats: seatsAPI,
  counters: countersAPI,
  stats: statsDashboardAPI,
};

// Default export for convenience
export default officialAPI;
