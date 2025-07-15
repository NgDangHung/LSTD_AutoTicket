// 📘 Ví dụ sử dụng API - Kiosk API Usage Examples

import { proceduresAPI, ticketsAPI, countersAPI } from '@/libs/api';
import type { Procedure, ProcedureExtended, Ticket } from '@/libs/apiTypes';

// 📋 VÍ DỤ SỬ DỤNG PROCEDURES API
export const procedureExamples = {
  // Lấy tất cả thủ tục
  getAllProcedures: async (): Promise<Procedure[]> => {
    try {
      const response = await proceduresAPI.getProcedures();
      console.log('📋 All procedures:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching procedures:', error);
      throw error;
    }
  },

  // Tìm kiếm thủ tục
  searchProcedures: async (searchTerm: string): Promise<Procedure[]> => {
    try {
      const response = await proceduresAPI.getProcedures(searchTerm);
      console.log(`🔍 Search results for "${searchTerm}":`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error searching procedures:', error);
      throw error;
    }
  },

  // Tìm kiếm thủ tục kèm thông tin quầy
  searchProceduresWithCounters: async (searchTerm?: string): Promise<ProcedureExtended[]> => {
    try {
      const response = await proceduresAPI.searchExtended(searchTerm);
      console.log('🔎 Extended search results:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error in extended search:', error);
      throw error;
    }
  },
};

// 🎟 VÍ DỤ SỬ DỤNG TICKETS API
export const ticketExamples = {
  // Tạo phiếu mới cho quầy
  createNewTicket: async (counterId: number): Promise<Ticket> => {
    try {
      const response = await ticketsAPI.createTicket({ counter_id: counterId });
      console.log(`🎫 New ticket created for counter ${counterId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      throw error;
    }
  },
};

// 🧾 VÍ DỤ SỬ DỤNG COUNTERS API
export const counterExamples = {
  // Gọi lượt tiếp theo
  callNextNumber: async (counterId: number) => {
    try {
      const response = await countersAPI.callNext(counterId);
      console.log(`📢 Called next for counter ${counterId}:`, response.data);
      
      // Response: { number: 105, counter_name: "Quầy 1" }
      return response.data;
    } catch (error) {
      console.error('❌ Error calling next number:', error);
      throw error;
    }
  },

  // Tạm dừng quầy
  pauseCounter: async (counterId: number, reason: string) => {
    try {
      const response = await countersAPI.pauseCounter(counterId, reason);
      console.log(`⏸️ Counter ${counterId} paused:`, response.data);
      
      // Response: { id: 1, counter_id: 2, reason: "Đi họp", created_at: "2025-07-15T14:30:00" }
      return response.data;
    } catch (error) {
      console.error('❌ Error pausing counter:', error);
      throw error;
    }
  },

  // Tiếp tục quầy
  resumeCounter: async (counterId: number) => {
    try {
      const response = await countersAPI.resumeCounter(counterId);
      console.log(`▶️ Counter ${counterId} resumed:`, response.data);
      
      // Response: { id: 2, name: "Quầy 1", status: "active" }
      return response.data;
    } catch (error) {
      console.error('❌ Error resuming counter:', error);
      throw error;
    }
  },
};

// 🚀 WORKFLOW EXAMPLES - Các luồng công việc thực tế
export const workflowExamples = {
  // Luồng tạo phiếu từ kiosk
  kioskCreateTicket: async (procedureSearchTerm: string) => {
    try {
      // 1. Tìm thủ tục và quầy phù hợp
      const procedures = await proceduresAPI.searchExtended(procedureSearchTerm);
      
      if (procedures.data.length === 0) {
        throw new Error('Không tìm thấy thủ tục phù hợp');
      }
      
      const selectedProcedure = procedures.data[0];
      const availableCounters = selectedProcedure.counters.filter(c => c.status === 'active');
      
      if (availableCounters.length === 0) {
        throw new Error('Không có quầy nào đang hoạt động cho thủ tục này');
      }
      
      // 2. Tạo phiếu cho quầy đầu tiên có sẵn
      const selectedCounter = availableCounters[0];
      const ticket = await ticketsAPI.createTicket({ counter_id: selectedCounter.id });
      
      console.log('🎯 Workflow completed:', {
        procedure: selectedProcedure.name,
        counter: selectedCounter.name,
        ticket: ticket.data
      });
      
      return {
        procedure: selectedProcedure,
        counter: selectedCounter,
        ticket: ticket.data
      };
    } catch (error) {
      console.error('❌ Kiosk workflow failed:', error);
      throw error;
    }
  },

  // Luồng quản lý quầy của cán bộ
  officerWorkflow: async (counterId: number) => {
    try {
      // 1. Gọi lượt tiếp theo
      const nextCall = await countersAPI.callNext(counterId);
      console.log(`📢 Called: ${nextCall.data.number} at ${nextCall.data.counter_name}`);
      
      // 2. Sau một thời gian, có thể tạm dừng
      // const pauseReason = "Nghỉ giải lao";
      // const pauseResult = await countersAPI.pauseCounter(counterId, pauseReason);
      
      // 3. Sau đó tiếp tục
      // const resumeResult = await countersAPI.resumeCounter(counterId);
      
      return nextCall.data;
    } catch (error) {
      console.error('❌ Officer workflow failed:', error);
      throw error;
    }
  },
};

// 🔧 ERROR HANDLING EXAMPLES
export const errorHandlingExamples = {
  // Xử lý lỗi validation
  handleValidationError: (error: any) => {
    if (error.response?.data?.detail) {
      const validationErrors = error.response.data.detail;
      console.log('🛑 Validation errors:', validationErrors);
      
      // Hiển thị lỗi cho user
      validationErrors.forEach((err: any) => {
        console.log(`Field: ${err.loc.join('.')}, Error: ${err.msg}`);
      });
    }
  },

  // Xử lý lỗi 401 (Unauthorized)
  handleAuthError: (error: any) => {
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - redirecting to login');
      // Auto redirect được handle bởi axios interceptor
    }
  },

  // Wrapper function với error handling
  safeApiCall: async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      return await apiCall();
    } catch (error: any) {
      // Log error details
      console.error('🚨 API Call Failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle specific error types
      if (error.response?.status === 401) {
        errorHandlingExamples.handleAuthError(error);
      } else if (error.response?.data?.detail) {
        errorHandlingExamples.handleValidationError(error);
      }
      
      return null;
    }
  },
};
