// Types for API responses based on backend documentation

// 📋 Procedures Types
export interface Procedure {
  id: number;
  name: string;
  field_id: number;
}

export interface Counter {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'offline';
}

export interface ProcedureExtended extends Procedure {
  counters: Counter[];
}

// 🎟 Tickets Types
export interface CreateTicketRequest {
  counter_id: number;
}

export interface Ticket {
  id: number;
  number: number;
  counter_id: number;
  created_at: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
}

// 🧾 Counters Types
export interface CallNextResponse {
  number: number;
  counter_name: string;
}

export interface PauseCounterRequest {
  reason: string;
}

export interface PauseCounterResponse {
  id: number;
  counter_id: number;
  reason: string;
  created_at: string;
}

export interface ResumeCounterResponse {
  id: number;
  name: string;
  status: 'active';
}

// 🛑 Error Types
export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

// 🔐 Auth Types (for reference, not implementing)
export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'leader' | 'officer';
  counter_id: number;
  is_active: boolean;
}

// 🪑 Seats Types (for reference, not implementing)
export interface Seat {
  id: number;
  name: string;
  type: 'client';
  counter_id: number;
  occupied: boolean;
  last_empty_time: string;
}
