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
      if (config.url?.includes('/call-next?tenxa=xabachngoc')) {
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
      params: { tenxa: 'xabachngoc' }
    }).then(response => response.data);
  },

  /**
   * 👤 [POST] /auths/users/
   * Create new user account
   */
  createUser: (userData: CreateUserRequest): Promise<User> => {
    return rootApi.post('/auths/users', userData, { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * 📋 [GET] /auths/me
   * Get current authenticated user information
   */
  getCurrentUser: (): Promise<User> => {
    return rootApi.get('/auths/me', { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
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
      body: JSON.stringify({ ...request, tenxa: 'xabachngoc' })
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

  /**
   * 🏢 [POST] /tts/generate_counter_audio
   * Generate audio for counter name (for TV/kiosk announcement)
   * Request: { counter_id: number, name: string }, query param: tenxa
   * Returns: string (URL or message)
   */
  generateCounterAudio: async (request: { counter_id: number; name: string }): Promise<string> => {
    const response = await fetch(`${BASE_URL}/tts/generate_counter_audio?tenxa=xabachngoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      if (response.status === 422) {
        const errorData = await response.json();
        throw new Error(`Validation error: ${errorData.detail || 'Invalid data'}`);
      }
      throw new Error(`generate_counter_audio API failed: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
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
    return rootApi.get('/procedures', { params: { ...params, tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * 🔍 [GET] /procedures/search-extended
   * Search procedures with associated counter information
   */
  searchExtended: (search?: string): Promise<ProcedureExtended[]> => {
    const params = search ? { search } : {};
    return rootApi.get('/procedures/search-extended', { params: { ...params, tenxa: 'xabachngoc' } }).then(response => response.data);
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
    return rootApi.post('/tickets', request, { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * ⏳ [GET] /tickets/waiting
   * Get all waiting tickets in queue
   */
  getWaitingTickets: (): Promise<WaitingTicketsResponse> => {
    return rootApi.get('/tickets/waiting', { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * 🔄 [PATCH] /tickets/{ticket_id}/status
   * Update ticket status
   */
  updateTicketStatus: (ticketId: number, request: UpdateTicketStatusRequest): Promise<Ticket> => {
    return rootApi.patch(`/tickets/${ticketId}/status`, request).then(response => response.data);
  },

  /**
   * ✅ [GET] /tickets/done
   * Lấy danh sách vé đã gọi (hoàn thành) theo quầy và xã
   * @param params { counter_id?: number, tenxa: string }
   * @returns Promise<Ticket[]>
   */
  getTicketDone: (params: { counter_id?: number; tenxa: string }): Promise<Ticket[]> => {
    return rootApi.get('/tickets/done', { params }).then(response => response.data);
  },
  /**
   * GET /tickets/feedback
   * Verify a review token or lookup pending feedback for a ticket.
   * Usage (Workflow A): the review QR contains a signed token `t` produced by the BE.
   * Client should call: GET /tickets/feedback?t=<token>
   * BE verifies signature, expiry and ticket status, then returns ticket details used by the review page:
   * {
   *   ticket_number: number,
   *   status: 'done'|'waiting'|'called',
   *   finished_at: string,
   *   counter_id: number,
   *   counter_name: string,
   *   can_rate: boolean
   * }
   */
  getFeedback: (params: { token?: string; ticket_number?: string; tenxa?: string }): Promise<any> => {
    // prefer token-based lookup: ?t=<signed-token>
    return rootApi.get('/tickets/feedback', { params }).then(response => response.data);
  },

  /**
   * POST /tickets/feedback
   * Submit rating/feedback for a ticket referenced by a signed token `t` (Workflow A).
   * Client call: POST /tickets/feedback?t=<token>
   * Body: { rating: 'satisfied'|'neutral'|'needs_improvement', feedback?: string }
   * Server will re-verify token, check ticket status and one-time policy, persist rating and return success.
   */
  submitFeedback: (params: { token?: string; ticket_number?: string; tenxa?: string }, body: { rating: string; feedback?: string }): Promise<any> => {
    return rootApi.post('/tickets/feedback', body, { params }).then(response => response.data);
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
    return rootApi.get('/seats', { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
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

export interface UpsertCounterRequest {
  counter_id: number;
  name: string;
}

export const countersAPI = {
  /**
   * 📋 [GET] /counters/
   * Get all counters information
   */
  getCounters: (): Promise<Counter[]> => {
    return rootApi.get('/counters', { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * ⏭️ [POST] /counters/{counter_id}/call-next
   * Call next ticket in queue for specific counter
   */
  callNext: (counterId: number): Promise<CallNextResponse> => {
    return rootApi.post(`/counters/${counterId}/call-next`, null, { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * ⏸️ [POST] /counters/{counter_id}/pause
   * Pause counter operations with reason
   */
  pauseCounter: (counterId: number, request: PauseCounterRequest): Promise<PauseCounterResponse> => {
    return rootApi.post(`/counters/${counterId}/pause`, request, { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * ▶️ [PUT] /counters/{counter_id}/resume
   * Resume counter operations
   */
  resumeCounter: (counterId: number): Promise<ResumeCounterResponse> => {
    return rootApi.put(`/counters/${counterId}/resume`, null, { params: { tenxa: 'xabachngoc' } }).then(response => response.data);
  },

  /**
   * 🆕 [POST] /counters/upsert-counter
   * Tạo mới hoặc cập nhật tên quầy
   */
  upsertCounter: (data: UpsertCounterRequest): Promise<{ id: number; name: string; status: string}> => {
    return rootApi.post('/counters/upsert-counter', data, { params: { tenxa: 'xabachngoc' } }).then(res => res.data);
  },

  /**
   * 🗑️ [DELETE] /counters/delete-counter
   * Xóa quầy phục vụ
   */
  deleteCounter: (counter_id: number): Promise<string> => {
    return rootApi.delete('/counters/delete-counter', { params: { tenxa: 'xabachngoc', counter_id } }).then(res => res.data);
  },
};

// ===================================
// 📺 TV Groups APIs (/tv-groups/)
// ===================================

export interface TVGroup {
  id: number;
  name: string;
  counter_ids: number[];
  description?: string;
}

export const tvGroupsAPI = {
  /**
   * 📋 [GET] /tv-groups
   * Get all TV groups
   */
  getGroups: async (): Promise<TVGroup[]> => {
    // Try real API first, fallback to localStorage mock
    try {
      const res = await rootApi.get('/tv-groups', { params: { tenxa: 'xabachngoc' } });
      return res.data;
    } catch (err) {
      // Fallback to localStorage
      if (typeof window === 'undefined') return [];
      const key = 'tv_groups_v1';
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed: TVGroup[] = JSON.parse(raw);
        return parsed;
      } catch (e) {
        console.error('tvGroupsAPI.getGroups fallback parse error', e);
        return [];
      }
    }
  },

  /**
   * 📋 [GET] /tv-groups/{id}
   * Get group by id
   */
  getGroup: async (id: number): Promise<TVGroup> => {
    try {
      const res = await rootApi.get(`/tv-groups/${id}`, { params: { tenxa: 'xabachngoc' } });
      return res.data;
    } catch (err) {
      if (typeof window === 'undefined') throw err;
      const key = 'tv_groups_v1';
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('Group not found');
      const parsed: TVGroup[] = JSON.parse(raw);
      const found = parsed.find(g => g.id === id);
      if (!found) throw new Error('Group not found');
      return found;
    }
  },

  /**
   * ➕ [POST] /tv-groups
   * Create new group
   */
  createGroup: async (data: { name: string; counter_ids: number[]; description?: string }): Promise<TVGroup> => {
    try {
      const res = await rootApi.post('/tv-groups', data, { params: { tenxa: 'xabachngoc' } });
      // broadcast update
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'create', id: res.data.id } })); } catch {}
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return res.data;
    } catch (err) {
      // Fallback: store in localStorage
      if (typeof window === 'undefined') throw err;
      const key = 'tv_groups_v1';
      let groups: TVGroup[] = [];
      try { groups = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { groups = []; }
      const nextId = groups.length ? Math.max(...groups.map(g => g.id)) + 1 : 1;
      const newGroup: TVGroup = { id: nextId, name: data.name, counter_ids: data.counter_ids || [], description: data.description };
      groups.push(newGroup);
      localStorage.setItem(key, JSON.stringify(groups));
      // broadcast update
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'create', id: newGroup.id } })); } catch {}
      if ('BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return newGroup;
    }
  },

  /**
   * ✏️ [PUT] /tv-groups/{id}
   * Update group
   */
  updateGroup: async (id: number, data: { name: string; counter_ids: number[]; description?: string }): Promise<TVGroup> => {
    try {
      const res = await rootApi.put(`/tv-groups/${id}`, data, { params: { tenxa: 'xabachngoc' } });
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'update', id } })); } catch {}
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return res.data;
    } catch (err) {
      if (typeof window === 'undefined') throw err;
      const key = 'tv_groups_v1';
      let groups: TVGroup[] = [];
      try { groups = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { groups = []; }
      const idx = groups.findIndex(g => g.id === id);
      if (idx === -1) throw new Error('Group not found');
      groups[idx] = { ...groups[idx], name: data.name, counter_ids: data.counter_ids || [], description: data.description };
      localStorage.setItem(key, JSON.stringify(groups));
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'update', id } })); } catch {}
      if ('BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return groups[idx];
    }
  },

  /**
   * 🗑️ [DELETE] /tv-groups/{id}
   */
  deleteGroup: async (id: number): Promise<string> => {
    try {
      const res = await rootApi.delete(`/tv-groups/${id}`, { params: { tenxa: 'xabachngoc' } });
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'delete', id } })); } catch {}
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return res.data;
    } catch (err) {
      if (typeof window === 'undefined') throw err;
      const key = 'tv_groups_v1';
      let groups: TVGroup[] = [];
      try { groups = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { groups = []; }
      groups = groups.filter(g => g.id !== id);
      localStorage.setItem(key, JSON.stringify(groups));
      try { window.dispatchEvent(new CustomEvent('tvGroupsUpdated', { detail: { action: 'delete', id } })); } catch {}
      if ('BroadcastChannel' in window) { try { const bc = new BroadcastChannel('tv-groups'); bc.postMessage({ type: 'updated' }); bc.close(); } catch {} }
      return 'ok';
    }
  },
};

// ===================================
// 🦶 Footers APIs (/footers/)
// ===================================

export interface KioskConfig {
  header: string;
  work_time: string;
  hotline: string;
}

// QR rating configuration returned by BE
export interface QrRatingConfig {
  feedback_timeout: number; // seconds
  qr_rating: boolean;
}

export const configAPI = {
  /**
   * 🦶 [GET] /footers
   * Lấy thông tin work_time và hotline của một xã
   */
  getConfig: (tenxa: string): Promise<KioskConfig> => {
    return rootApi.get('/configs', { params: { tenxa } }).then(res => res.data);
  },

  /**
   * 🦶 [POST] /footers
   * Tạo hoặc cập nhật thông tin work_time và hotline cho một xã
   */
  setConfig: (tenxa: string, config: KioskConfig): Promise<KioskConfig> => {
    return rootApi.post('/configs', config, { params: { tenxa } }).then(res => res.data);
  },
  /**
   * 📦 [GET] /configs/qr_rating
   * Get QR rating configuration for a tenxa
   * Query param: tenxa (required)
   */
  getQrRating: (tenxa: string): Promise<QrRatingConfig> => {
    return rootApi.get('/configs/qr_rating', { params: { tenxa } }).then(res => res.data);
  },

  /**
   * 📦 [PUT] /configs/qr_rating
   * Update QR rating configuration for a tenxa
   * Body: { feedback_timeout: number, qr_rating: boolean }
   */
  setQrRating: (tenxa: string, body: QrRatingConfig): Promise<QrRatingConfig> => {
    return rootApi.put('/configs/qr_rating', body, { params: { tenxa } }).then(res => res.data);
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

// Rating per counter response
export interface RatingPerCounter {
  counter_id: number;
  satisfied: number;
  neutral: number;
  need_improvement: number;
}

// Feedback item returned by /stats/feedbacks
export interface FeedbackItem {
  ticket_number: number;
  counter_id: number;
  rating: string;
  feedback: string;
  created_at: string;
}

export const statsDashboardAPI = {
  /**
   * 🟢 [GET] /stats/tickets-per-counter
   * Tổng số vé đã phát theo từng quầy
   */
  getTicketsPerCounter: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/tickets-per-counter', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/attended-tickets
   * Số vé đã tiếp nhận theo từng quầy
   */
  getAttendedTickets: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/attended-tickets', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/average-handling-time
   * Thời gian xử lý trung bình từng quầy
   */
  getAverageHandlingTime: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/average-handling-time', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/average-waiting-time
   * Thời gian chờ trung bình từng quầy
   */
  getAverageWaitingTime: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/average-waiting-time', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/afk-duration
   * Tổng thời gian vắng mặt từng quầy
   */
  getAfkDuration: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/afk-duration', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),

  /**
   * 🟢 [GET] /stats/working-time-check
   * Giờ làm việc từng quầy trong ngày
   */
  getWorkingTimeCheck: (params?: { date_check?: string }) =>
    rootApi.get('/stats/working-time-check', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data),
  /**
   * 📊 [GET] /stats/rating-per-counter
   * Returns aggregated rating counts per counter.
   * Query params: start_date, end_date, tenxa(required)
   */
  getRatingPerCounter: (params?: { start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/rating-per-counter', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data as RatingPerCounter[]),

  /**
   * 💬 [GET] /stats/feedbacks
   * List feedbacks with optional filters: rating, counter_id, start_date, end_date
   */
  getFeedbacks: (params?: { rating?: string; counter_id?: number; start_date?: string; end_date?: string }) =>
    rootApi.get('/stats/feedbacks', { params: { ...params, tenxa: 'xabachngoc' } }).then(res => res.data as FeedbackItem[]),
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
  tvGroups: tvGroupsAPI,
  stats: statsDashboardAPI,
};

// Default export for convenience
export default officialAPI;
