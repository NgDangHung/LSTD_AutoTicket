import axios from 'axios';

// API Types based on queue-api-specification.md
export interface WaitingTicket {
  ticket_id: number;
  number: number;
  priority: 'normal' | 'priority' | 'elderly';
  wait_time: number;
  procedure_name?: string;
}

export interface CurrentServing {
  ticket_id: number;
  number: number;
  called_at: string;
  procedure_name: string;
}

export interface CounterDetail {
  counter_id: number;
  counter_name: string;
  is_active: boolean;
  status?: 'active' | 'paused' | 'offline'; // Optional field from API
  pause_reason?: string; // Optional pause reason
  procedures: string[];
  current_serving?: CurrentServing;
  waiting_queue: WaitingTicket[];
  waiting_count: number;
}

export interface WaitingTicketsResponse {
  counters: CounterDetail[];
  total_waiting: number;
  last_updated: string;
}

export interface CreateTicketRequest {
  procedure_name: string;
  priority?: 'normal' | 'priority' | 'elderly';
}

export interface CreateTicketResponse {
  ticket_id: number;
  number: number;
  priority: string;
  wait_time: number;
  procedure_name: string;
  counter_id: number | null;
  message: string;
}

// Base API URL - match với api.ts configuration
const API_BASE_URL = 'https://detect-seat.onrender.com/app';

// Create axios instance with base config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  params: {
    tenxa: 'phuonglaocai' // Default parameter for all requests
  }
});

/**
 * Get all waiting tickets grouped by counter
 * Based on GET /tickets/waiting specification
 */
export const getWaitingTickets = async (): Promise<WaitingTicketsResponse> => {
  try {
    console.log('🔄 Fetching waiting tickets from API...');
    
    // ✅ Try multiple possible endpoints
    const possiblePaths = [

      '/tickets/waiting?tenxa=phuonglaocai',        // Current path
      '/tickets?tenxa=phuonglaocai',               // Base tickets endpoint
      '/waiting-tickets',       // Alternative naming
      '/queue/waiting'          // Queue-based naming
    ];
    
    let lastError;
    for (const path of possiblePaths) {
      try {
        console.log(`🔍 Trying endpoint: ${path}`);
        const response = await api.get<WaitingTicketsResponse>(path);
        console.log(`✅ Success with endpoint: ${path}`, response.data);
        return response.data;
      } catch (error: any) {
        console.log(`❌ Failed endpoint ${path}:`, error.response?.status);
        lastError = error;
        continue;
      }
    }
    
    throw lastError;
  } catch (error: any) {
    console.error('❌ All endpoints failed:', error);
    throw new Error(`Failed to fetch waiting tickets: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Get queue data for a specific counter
 */
export const getCounterQueue = async (counterId: number): Promise<CounterDetail | null> => {
  try {
    const data = await getWaitingTickets();
    const counter = data.counters.find(c => c.counter_id === counterId);
    return counter || null;
  } catch (error: any) {
    console.error(`❌ Failed to get counter ${counterId} queue:`, error);
    throw error;
  }
};

/**
 * Create a new ticket
 * Based on POST /tickets specification
 */
export const createTicket = async (request: CreateTicketRequest): Promise<CreateTicketResponse> => {
  try {
    console.log('🔄 Creating new ticket:', request);
    const response = await api.post<CreateTicketResponse>('/tickets?tenxa=phuonglaocai', request);
    console.log('✅ Successfully created ticket:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to create ticket:', error);
    throw new Error(`Failed to create ticket: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Call next ticket for a counter
 * Based on POST /counters/{counter_id}/call-next specification
 */
export const callNextTicket = async (counterId: number): Promise<CurrentServing> => {
  try {
    console.log(`🔄 Calling next ticket for counter ${counterId}...`);
    const response = await api.post<CurrentServing>(`/counters/${counterId}/call-next`);
    console.log('✅ Successfully called next ticket:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to call next ticket:', error);
    throw new Error(`Failed to call next ticket: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Update ticket status
 * Based on PATCH /tickets/{ticket_id} specification
 */
export const updateTicketStatus = async (
  ticketId: number, 
  status: 'waiting' | 'serving' | 'completed' | 'missed'
): Promise<WaitingTicket> => {
  try {
    console.log(`🔄 Updating ticket ${ticketId} status to ${status}...`);
    const response = await api.patch<WaitingTicket>(`/tickets/${ticketId}`, { status });
    console.log('✅ Successfully updated ticket status:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to update ticket status:', error);
    throw new Error(`Failed to update ticket status: ${error.response?.data?.detail || error.message}`);
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  try {
    const data = await getWaitingTickets();
    return {
      totalWaiting: data.total_waiting,
      activeCounters: data.counters.filter(c => c.is_active).length,
      totalCounters: data.counters.length,
      lastUpdated: data.last_updated,
    };
  } catch (error: any) {
    console.error('❌ Failed to get queue stats:', error);
    throw error;
  }
};

/**
 * Helper to get next ticket number for a counter
 */
export const getNextTicketForCounter = async (counterId: number): Promise<WaitingTicket | null> => {
  try {
    const counterData = await getCounterQueue(counterId);
    if (!counterData || counterData.waiting_queue.length === 0) {
      return null;
    }
    
    // Return the first ticket in the waiting queue
    return counterData.waiting_queue[0];
  } catch (error: any) {
    console.error(`❌ Failed to get next ticket for counter ${counterId}:`, error);
    throw error;
  }
};

/**
 * Utility to check if API is available
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await api.get('/health', { timeout: 5000 });
    return true;
  } catch (error: any) {
    console.warn('⚠️ API health check failed:', error.message);
    return false;
  }
};

const queueAPI = {
  getWaitingTickets,
  getCounterQueue,
  createTicket,
  callNextTicket,
  updateTicketStatus,
  getQueueStats,
  getNextTicketForCounter,
  checkApiHealth,
};

export default queueAPI;
