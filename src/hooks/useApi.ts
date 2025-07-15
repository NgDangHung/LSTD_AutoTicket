// 🎣 React Hooks for API calls - Custom hooks để sử dụng API

import { useState, useEffect, useCallback } from 'react';
import { proceduresAPI, ticketsAPI, countersAPI } from '@/libs/api';
import type { 
  Procedure, 
  ProcedureExtended, 
  Ticket, 
  CallNextResponse,
  PauseCounterResponse,
  ResumeCounterResponse 
} from '@/libs/apiTypes';

// 📋 Hook for Procedures
export const useProcedures = (search?: string) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await proceduresAPI.getProcedures(search);
      setProcedures(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch procedures');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  return { procedures, loading, error, refetch: fetchProcedures };
};

// 🔎 Hook for Extended Procedures Search
export const useProceduresExtended = (search?: string) => {
  const [procedures, setProcedures] = useState<ProcedureExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProcedures = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await proceduresAPI.searchExtended(searchTerm || search);
      setProcedures(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to search procedures');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (search !== undefined) {
      searchProcedures();
    }
  }, [searchProcedures, search]);

  return { 
    procedures, 
    loading, 
    error, 
    searchProcedures,
    refetch: () => searchProcedures(search)
  };
};

// 🎟 Hook for Creating Tickets
export const useCreateTicket = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedTicket, setLastCreatedTicket] = useState<Ticket | null>(null);

  const createTicket = useCallback(async (counterId: number): Promise<Ticket | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await ticketsAPI.createTicket({ counter_id: counterId });
      setLastCreatedTicket(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to create ticket';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTicket, loading, error, lastCreatedTicket };
};

// 🧾 Hook for Counter Operations
export const useCounterOperations = (counterId?: number) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<{
    type: 'call' | 'pause' | 'resume';
    data: any;
    timestamp: Date;
  } | null>(null);

  const callNext = useCallback(async (targetCounterId?: number): Promise<CallNextResponse | null> => {
    const id = targetCounterId || counterId;
    if (!id) {
      setError('Counter ID is required');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await countersAPI.callNext(id);
      setLastOperation({
        type: 'call',
        data: response.data,
        timestamp: new Date()
      });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to call next';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [counterId]);

  const pauseCounter = useCallback(async (
    reason: string, 
    targetCounterId?: number
  ): Promise<PauseCounterResponse | null> => {
    const id = targetCounterId || counterId;
    if (!id) {
      setError('Counter ID is required');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await countersAPI.pauseCounter(id, reason);
      setLastOperation({
        type: 'pause',
        data: response.data,
        timestamp: new Date()
      });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to pause counter';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [counterId]);

  const resumeCounter = useCallback(async (targetCounterId?: number): Promise<ResumeCounterResponse | null> => {
    const id = targetCounterId || counterId;
    if (!id) {
      setError('Counter ID is required');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await countersAPI.resumeCounter(id);
      setLastOperation({
        type: 'resume',
        data: response.data,
        timestamp: new Date()
      });
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to resume counter';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [counterId]);

  return {
    callNext,
    pauseCounter,
    resumeCounter,
    loading,
    error,
    lastOperation,
    clearError: () => setError(null)
  };
};

// 🔄 Combined Hook for Kiosk Workflow
export const useKioskWorkflow = () => {
  const { procedures, searchProcedures, loading: proceduresLoading } = useProceduresExtended();
  const { createTicket, loading: ticketLoading, lastCreatedTicket } = useCreateTicket();
  const [error, setError] = useState<string | null>(null);

  const createTicketForProcedure = useCallback(async (
    procedureSearchTerm: string
  ): Promise<{
    procedure: ProcedureExtended;
    counter: any;
    ticket: Ticket;
  } | null> => {
    setError(null);
    try {
      // 1. Search for procedures
      await searchProcedures(procedureSearchTerm);
      
      // Wait for procedures to be loaded
      const procedureList = procedures;
      
      if (procedureList.length === 0) {
        throw new Error(`Không tìm thấy thủ tục phù hợp với "${procedureSearchTerm}"`);
      }

      const selectedProcedure = procedureList[0];
      const availableCounters = selectedProcedure.counters.filter(c => c.status === 'active');

      if (availableCounters.length === 0) {
        throw new Error('Không có quầy nào đang hoạt động cho thủ tục này');
      }

      // 2. Create ticket for first available counter
      const selectedCounter = availableCounters[0];
      const ticket = await createTicket(selectedCounter.id);

      if (!ticket) {
        throw new Error('Không thể tạo phiếu xếp hàng');
      }

      return {
        procedure: selectedProcedure,
        counter: selectedCounter,
        ticket
      };
    } catch (err: any) {
      setError(err.message || 'Workflow failed');
      return null;
    }
  }, [procedures, searchProcedures, createTicket]);

  return {
    createTicketForProcedure,
    procedures,
    lastCreatedTicket,
    loading: proceduresLoading || ticketLoading,
    error,
    clearError: () => setError(null)
  };
};

// 🎯 Hook for Officer Dashboard
export const useOfficerDashboard = (counterId: number) => {
  const counterOps = useCounterOperations(counterId);
  const [stats, setStats] = useState({
    totalCalled: 0,
    totalCompleted: 0,
    averageWaitTime: 0
  });

  // Có thể mở rộng để lấy thống kê từ API
  const refreshStats = useCallback(() => {
    // TODO: Implement stats API call
    console.log(`Refreshing stats for counter ${counterId}`);
  }, [counterId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    ...counterOps,
    stats,
    refreshStats
  };
};
