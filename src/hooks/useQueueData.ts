import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getWaitingTickets, 
  getCounterQueue, 
  callNextTicket,
  WaitingTicketsResponse,
  CounterDetail,
  CurrentServing 
} from '@/libs/queueApi';

interface UseQueueDataOptions {
  counterId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseQueueDataReturn {
  // Data
  allCounters: CounterDetail[];
  currentCounter: CounterDetail | null;
  totalWaiting: number;
  lastUpdated: string | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isCallingNext: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refresh: () => Promise<void>;
  callNext: () => Promise<CurrentServing | null>;
  
  // API status
  isApiConnected: boolean;
}

/**
 * Hook for managing queue data from API
 * Replaces localStorage-based CounterQueueManager to eliminate race conditions
 */
export const useQueueData = (options: UseQueueDataOptions = {}): UseQueueDataReturn => {
  const {
    counterId,
    autoRefresh = true,
    refreshInterval = 5000, // 5 seconds
  } = options;

  // State
  const [allCounters, setAllCounters] = useState<CounterDetail[]>([]);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState(true);

  // Refs for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Get current counter data
  const currentCounter = counterId 
    ? allCounters.find(c => c.counter_id === counterId) || null 
    : null;

  /**
   * Fetch queue data from API
   */
  const fetchQueueData = useCallback(async (isRefreshCall = false) => {
    if (!mountedRef.current) return;

    try {
      if (isRefreshCall) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data: WaitingTicketsResponse = await getWaitingTickets();
      
      if (!mountedRef.current) return;

      setAllCounters(data.counters);
      setTotalWaiting(data.total_waiting);
      setLastUpdated(data.last_updated);
      setIsApiConnected(true);

    } catch (err: any) {
      if (!mountedRef.current) return;
      
      const errorMessage = err.message || 'Failed to fetch queue data';
      setError(errorMessage);
      setIsApiConnected(false);
      
      console.error('❌ useQueueData fetch error:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchQueueData(true);
  }, [fetchQueueData]);

  /**
   * Call next ticket for the specified counter
   */
  const callNext = useCallback(async (): Promise<CurrentServing | null> => {
    if (!counterId) {
      throw new Error('Counter ID is required to call next ticket');
    }

    if (!mountedRef.current) return null;

    try {
      setIsCallingNext(true);
      setError(null);

      const result = await callNextTicket(counterId);
      
      // Refresh data after successful call
      await fetchQueueData(true);
      
      return result;
    } catch (err: any) {
      if (!mountedRef.current) return null;
      
      const errorMessage = err.message || 'Failed to call next ticket';
      setError(errorMessage);
      console.error('❌ useQueueData callNext error:', err);
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsCallingNext(false);
      }
    }
  }, [counterId, fetchQueueData]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      fetchQueueData(true);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchQueueData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Data
    allCounters,
    currentCounter,
    totalWaiting,
    lastUpdated,
    
    // Loading states
    isLoading,
    isRefreshing,
    isCallingNext,
    
    // Error states
    error,
    
    // Actions
    refresh,
    callNext,
    
    // API status
    isApiConnected,
  };
};

/**
 * Hook for specific counter queue data
 */
export const useCounterQueue = (counterId: number) => {
  return useQueueData({ counterId, autoRefresh: true });
};

/**
 * Hook for all queue data without auto-refresh
 */
export const useAllQueues = () => {
  return useQueueData({ autoRefresh: false });
};

export default useQueueData;
