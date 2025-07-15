import { useState, useEffect, useCallback } from 'react';
import { queueAPI } from '@/libs/api';
import { POLLING_INTERVALS } from '@/libs/constants';

export interface QueueItem {
  id: string;
  number: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterName: string;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'no_show';
  priority: number;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  estimatedWaitTime: number;
}

export interface QueueStats {
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  averageWaitTime: number;
  averageServiceTime: number;
}

export const useQueuePolling = (counterId?: string) => {
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchQueueData = useCallback(async () => {
    try {
      setError(null);
      const response = await queueAPI.getQueueStatus();
      
      let filteredData = response.data.queue;
      if (counterId) {
        filteredData = filteredData.filter((item: QueueItem) => item.counterId === counterId);
      }
      
      setQueueData(filteredData);
      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch queue data');
    } finally {
      setIsLoading(false);
    }
  }, [counterId]);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const refreshData = useCallback(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Polling effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling) {
      fetchQueueData(); // Initial fetch
      intervalId = setInterval(fetchQueueData, POLLING_INTERVALS.QUEUE_STATUS);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, fetchQueueData]);

  // Listen for localStorage changes (for real-time updates)
  useEffect(() => {
    const handleQueueUpdate = (event: CustomEvent) => {
      console.log('📺 TV: Queue updated event received', event.detail);
      fetchQueueData(); // Refresh data when queue changes
    };

    // Listen for custom queue update events
    window.addEventListener('queueUpdated', handleQueueUpdate as EventListener);

    // Also listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'kiosk_queue_data') {
        console.log('📺 TV: Storage changed, refreshing queue data');
        fetchQueueData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('queueUpdated', handleQueueUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchQueueData]);

  // Auto-start polling on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Helper functions
  const getQueueByStatus = useCallback((status: QueueItem['status']) => {
    return queueData.filter(item => item.status === status);
  }, [queueData]);

  const getNextInQueue = useCallback(() => {
    const waitingQueue = getQueueByStatus('waiting');
    return waitingQueue.sort((a, b) => {
      // Sort by priority first, then by creation time
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0] || null;
  }, [getQueueByStatus]);

  const getCurrentServing = useCallback(() => {
    return getQueueByStatus('serving');
  }, [getQueueByStatus]);

  const getWaitingCount = useCallback(() => {
    return getQueueByStatus('waiting').length;
  }, [getQueueByStatus]);

  const getEstimatedWaitTime = useCallback((queueNumber: string) => {
    const item = queueData.find(q => q.number === queueNumber);
    return item?.estimatedWaitTime || 0;
  }, [queueData]);

  return {
    queueData,
    stats,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refreshData,
    getQueueByStatus,
    getNextInQueue,
    getCurrentServing,
    getWaitingCount,
    getEstimatedWaitTime,
  };
};
