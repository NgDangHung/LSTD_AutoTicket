'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StopServiceModal from '@/components/shared/StopServiceModal';
import { useCounterOperations } from '@/hooks/useApi';
import AuthGuard from '@/components/shared/AuthGuard';
import { useRouter } from 'next/navigation';
import { useWebSocketQueue } from '@/hooks/useWebSocketQueue';
import { TTSService } from '@/libs/ttsService';
import { toast } from 'react-toastify';
import { useQueueData } from '@/hooks/useQueueData';
import { callNextTicket, type CounterDetail, type CurrentServing, type WaitingTicket } from '@/libs/queueApi';
import { countersAPI, type Counter } from '@/libs/rootApi';

// 🔥 MOCK COUNTER DATA - Being replaced by real API
// TODO: Remove this when getCounters API is fully integrated
const mockCounters: CounterDetail[] = [
  {
    counter_id: 1,
    counter_name: 'Tư pháp',
    is_active: true,
    status: 'active' as const,
    procedures: ['Chứng thực', 'Hộ tịch'],
    current_serving: {
      ticket_id: 1001,
      number: 1001,
      called_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      procedure_name: 'Chứng thực'
    },
    waiting_queue: [
      {
        ticket_id: 1002,
        number: 1002,
        procedure_name: 'Hộ tịch',
        wait_time: 15,
        priority: 'normal' as const
      },
      {
        ticket_id: 1003, 
        number: 1003,
        procedure_name: 'Chứng thực',
        wait_time: 25,
        priority: 'priority' as const
      }
    ],
    waiting_count: 2
  },
  {
    counter_id: 2,
    counter_name: 'Kinh tế - Hạ tầng - Đô Thị',
    is_active: true,
    status: 'active' as const,
    procedures: ['Kiểm Lâm', 'Thành lập và hoạt động của hộ kinh doanh', 'Hoạt động xây dựng'],
    current_serving: undefined,
    waiting_queue: [
      {
        ticket_id: 2001,
        number: 2001,
        procedure_name: 'Đăng ký kinh doanh',
        wait_time: 10,
        priority: 'normal' as const
      }
    ],
    waiting_count: 1
  },
  {
    counter_id: 3,
    counter_name: 'Văn phóng đăng ký đất đai',
    is_active: true,
    status: 'active' as const,
    procedures: ['Đất đai'],
    current_serving: undefined,
    waiting_queue: [],
    waiting_count: 0
  },
  {
    counter_id: 4,
    counter_name: 'Văn hóa - Xã hội',
    is_active: false,
    status: 'paused' as const,
    pause_reason: 'Tạm nghỉ trưa',
    procedures: ['Bảo trợ xã hội'],
    current_serving: undefined,
    waiting_queue: [],
    waiting_count: 0
  }
];

function TestQueuePage() {
  // TTS Service instance
  const ttsService = TTSService.getInstance();
  const [ttsQueueStatus, setTtsQueueStatus] = useState<any>({ queueLength: 0, isPlaying: false, upcomingRequests: [] });

  // API States for counters
  const [apiCounters, setApiCounters] = useState<Counter[]>([]);
  const [countersLoading, setCountersLoading] = useState(true);
  const [countersError, setCountersError] = useState<string | null>(null);

  // Load counters from API
  const loadCounters = useCallback(async () => {
    try {
      setCountersLoading(true);
      setCountersError(null);
      
      const countersData = await countersAPI.getCounters();
      setApiCounters(countersData);
      
      console.log('✅ Loaded counters from API:', countersData);
    } catch (error) {
      console.error('❌ Failed to load counters:', error);
      setCountersError('Failed to load counters from API');
      
      // Fallback to mock data for now
      console.warn('⚠️ Using mock counter data as fallback');
    } finally {
      setCountersLoading(false);
    }
  }, []);

  // Load counters on mount
  useEffect(() => {
    loadCounters();
  }, [loadCounters]);

  // Convert API counters to CounterDetail format for compatibility
  const convertToCounterDetail = (apiCounter: Counter): CounterDetail => ({
    counter_id: apiCounter.id,
    counter_name: apiCounter.name,
    is_active: apiCounter.is_active,
    status: apiCounter.status,
    procedures: [], // TODO: Get from API when available
    current_serving: undefined, // TODO: Get from API when available
    waiting_queue: [], // TODO: Get from API when available
    waiting_count: 0 // TODO: Get from API when available
  });

  // 🔥 HYBRID APPROACH: Use API counters if available, fallback to mock
  // TODO: Remove mock fallback when full queue API is available
  const allCounters = apiCounters.length > 0 
    ? apiCounters.map(convertToCounterDetail)
    : mockCounters;
  
  const totalWaiting = allCounters.reduce((sum, counter) => sum + counter.waiting_count, 0);
  const lastUpdated = new Date().toISOString();
  const isLoading = countersLoading;
  const isRefreshing = false;
  const queueError = countersError;
  
  const refreshQueue = async () => {
    console.log('🔄 Refreshing counters and queue data...');
    await loadCounters();
    // TODO: Add queue data refresh when API is available
    toast.info('Đã làm mới dữ liệu quầy');
  };

  // Keep original API hook commented for reference
  // const { 
  //   allCounters, 
  //   totalWaiting, 
  //   lastUpdated, 
  //   isLoading, 
  //   isRefreshing, 
  //   error: queueError, 
  //   refresh: refreshQueue 
  // } = useQueueData({ autoRefresh: true, refreshInterval: 2000 });

  const [stopServiceModal, setStopServiceModal] = useState<{
    isOpen: boolean;
    counterId: string;
    counterName: string;
  }>({
    isOpen: false,
    counterId: '',
    counterName: ''
  });

  // API hooks
  const { pauseCounter, resumeCounter, loading: apiLoading, error: apiError, clearError } = useCounterOperations();
  
  // WebSocket hook for real-time updates
  const { isConnected, connectionError, lastEvent, reconnect } = useWebSocketQueue();

  // Update TTS queue status periodically
  useEffect(() => {
    const updateTTSStatus = () => {
      const status = ttsService.getQueueStatus();
      setTtsQueueStatus(status);
    };
    
    // TTS status update interval
    const ttsInterval = setInterval(updateTTSStatus, 1000);
    
    return () => {
      clearInterval(ttsInterval);
    };
  }, [ttsService]);

  const router = useRouter();

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  // State for processing actions
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  // Enhanced next ticket handler - API is source of truth
  const handleNextTicket = async (counterId: string) => {
    try {
      setIsProcessing(prev => ({ ...prev, [counterId]: true }));
      
      // Call BE API directly (no local queue manipulation needed)
      let result;
      try {
        result = await callNextTicket(parseInt(counterId));
      } catch (apiError) {
        console.error('❌ Failed to call next ticket via API:', apiError);
        throw new Error('Failed to call next ticket');
      }
      
      // TTS announcement với API data
      if (result && result.called_at) {
        await ttsService.queueAnnouncement(
          parseInt(counterId), 
          result.number, 
          1, // First attempt
          'manual', // Source tracking
          result.called_at // Use API timestamp for queue ordering
        );
        
        // Success notification with API data
        toast.success(
          <div>
            <div>📞 Đã gọi số {result.number}</div>
            <div>🔊 Thêm vào hàng đợi phát thanh</div>
            <div className="text-xs text-gray-500">
              Thời gian: {new Date(result.called_at).toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
      }
      
      // Trigger API refresh
      await refreshQueue();
      
    } catch (error) {
      console.error('❌ Failed to process next ticket:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Lỗi: ${errorMessage}`);
      
    } finally {
      setIsProcessing(prev => ({ ...prev, [counterId]: false }));
    }
  };

  // Handle stop service - open modal
  const handleStopService = (counterId: string) => {
    const counterData = allCounters.find(counter => counter.counter_id.toString() === counterId);
    if (!counterData) return;
    
    setStopServiceModal({
      isOpen: true,
      counterId: counterId,
      counterName: `${counterData.counter_name}`
    });
  };

  // Handle stop service confirmation
  const handleStopServiceConfirm = async (reason: string) => {
    const { counterId } = stopServiceModal;
    
    try {
      // Call rootApi to pause counter
      await countersAPI.pauseCounter(parseInt(counterId), { reason });
      
      toast.success('✅ Counter paused successfully');
      
      // Refresh API data to get updated status
      await refreshQueue();
    } catch (error) {
      console.error('Error pausing counter:', error);
      toast.error('❌ Failed to pause counter');
    }
    
    // Close modal
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // Handle resume service
  const handleResumeService = async (counterId: string) => {
    try {
      // Call rootApi to resume counter
      await countersAPI.resumeCounter(parseInt(counterId));
      
      toast.success('✅ Counter resumed successfully');
      
      // Refresh API data to get updated status
      await refreshQueue();
    } catch (error) {
      console.error('Error resuming counter:', error);
      toast.error('❌ Failed to resume counter');
    }
  };

  // Close stop service modal
  const handleStopServiceClose = () => {
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // Global clear all queues - Note: Only for demo/testing purposes
  const handleClearAllQueues = () => {
    // API-based approach doesn't need global clear
    // This would need to be implemented on backend
    toast.info('Clear all queues needs backend implementation');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with WebSocket status and logout button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-600">
              🧪 Test Counter Queue Management System
            </h1>
            
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-3 mt-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected ? '🔌 WebSocket Connected' : '❌ WebSocket Disconnected'}
              </div>
              
              {connectionError && (
                <button
                  onClick={reconnect}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  🔄 Reconnect
                </button>
              )}
              
              {lastEvent && (
                <div className="text-xs text-gray-600">
                  Last Event: {lastEvent.event} at {new Date().toLocaleTimeString()}
                </div>
              )}
            </div>
            
            {/* TTS Controls */}
            <div className="flex items-center gap-3 mt-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                ttsQueueStatus.isPlaying 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : ttsQueueStatus.queueLength > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  ttsQueueStatus.isPlaying 
                    ? 'bg-yellow-500 animate-pulse' 
                    : ttsQueueStatus.queueLength > 0
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
                }`}></div>
                {ttsQueueStatus.isPlaying 
                  ? '🔊 TTS Playing' 
                  : ttsQueueStatus.queueLength > 0
                  ? `🎵 TTS Queue: ${ttsQueueStatus.queueLength}`
                  : '🔇 TTS Idle'
                }
              </div>
              
              {/* TTS Controls when active */}
              {(ttsQueueStatus.isPlaying || ttsQueueStatus.queueLength > 0) && (
                <div className="flex gap-2">
                  {ttsQueueStatus.isPlaying && (
                    <button
                      onClick={() => ttsService.stopCurrentAudio()}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      ⏹️ Stop
                    </button>
                  )}
                  <button
                    onClick={() => ttsService.clearQueue()}
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  >
                    🗑️ Clear
                  </button>
                </div>
              )}
            </div>
            
            {/* API Status */}
            <div className="flex items-center gap-3 mt-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                !queueError 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  !queueError ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {!queueError ? '🌐 Counters API Connected' : '❌ Counters API Error'}
              </div>
              
              {apiCounters.length > 0 && (
                <div className="text-xs text-green-600">
                  📊 Loaded {apiCounters.length} counters from API
                </div>
              )}
              
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  📅 Last Update: {new Date(lastUpdated).toLocaleTimeString('vi-VN')}
                </div>
              )}
              
              <div className="text-sm text-blue-600">
                📊 Total Waiting: {totalWaiting}
              </div>
              
              {isRefreshing && (
                <div className="text-xs text-blue-500 animate-pulse">
                  🔄 Refreshing...
                </div>
              )}
            </div>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            🚪 Logout
          </button>
        </div>
        
        {/* API Error Display */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-center">
              <div className="text-red-800">
                <h3 className="font-semibold">⚠️ Lỗi API:</h3>
                <p className="text-sm mt-1">{apiError}</p>
              </div>
              <button
                onClick={clearError}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                ✕ Đóng
              </button>
            </div>
          </div>
        )}

        {/* Queue Error Display */}
        {queueError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-center">
              <div className="text-red-800">
                <h3 className="font-semibold">⚠️ Lỗi kết nối API Queue:</h3>
                <p className="text-sm mt-1">{queueError}</p>
              </div>
              <button
                onClick={refreshQueue}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                🔄 Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Global Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🎛️ Global Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={handleClearAllQueues}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Clear All Queues
            </button>
          </div>
        </div>
        
        {/* Counter Controls Grid - Only show when data is loaded */}
        {!isLoading && allCounters.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {allCounters.map((counter) => {
              const counterId = counter.counter_id.toString();
              // Use counter status from API, fallback to is_active field
              const counterStatus = counter.status || (counter.is_active ? 'active' : 'paused');
            
            return (
              <div key={counter.counter_id} className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-600">
                  {counter.counter_name}
                </h2>
                
                {/* Counter Action Buttons */}
                <div className="mb-6 grid grid-cols-2 gap-3">
                  {counterStatus === 'paused' ? (
                    <button
                      onClick={() => handleResumeService(counterId)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      disabled={apiLoading}
                    >
                      {apiLoading ? '⏳ Processing...' : '▶️ Resume'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopService(counterId)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                      disabled={!counter.current_serving || apiLoading}
                    >
                      {apiLoading ? '⏳ Processing...' : '⏸️ Pause'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleNextTicket(counterId)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    disabled={counter.waiting_count === 0 || isProcessing[counterId]}
                  >
                    {isProcessing[counterId] ? '⏳ Processing...' : '✅ Next Number'}
                  </button>
                </div>
                
                {/* Serving Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-red-600">🔊 Currently Serving</h3>
                  {counterStatus === 'paused' ? (
                    <div className="text-orange-600 font-semibold bg-orange-100 p-3 rounded border-l-4 border-orange-500">
                      ⏸️ Counter is paused
                      {counter.pause_reason && (
                        <div className="text-sm text-orange-700 mt-1">
                          Reason: {counter.pause_reason}
                        </div>
                      )}
                    </div>
                  ) : counter.current_serving ? (
                    <div className="space-y-2">
                      <div className="bg-red-100 p-3 rounded border-l-4 border-red-500">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-2xl text-black">{counter.current_serving.number}</span>
                          <div className="text-left text-sm">
                            <div className="font-medium text-black">{counter.current_serving.procedure_name}</div>
                            <div className="text-black">{new Date(counter.current_serving.called_at).toLocaleTimeString('vi-VN')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic bg-gray-100 p-3 rounded">No number currently being served</div>
                  )}
                </div>

                {/* Waiting Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-yellow-600">⏳ Waiting ({counter.waiting_count})</h3>
                  {counter.waiting_queue.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {counter.waiting_queue.map((ticket, index) => (
                        <div key={ticket.ticket_id} className={`p-3 rounded border-l-4 ${
                          index === 0 ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-50 border-gray-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className={`font-bold ${index === 0 ? 'text-black text-xl' : 'text-black'}`}>
                              {ticket.number}
                            </span>
                            <div className="text-left text-sm">
                              <div className="font-medium text-black">{ticket.procedure_name || 'N/A'}</div>
                              <div className="text-black">Wait {ticket.wait_time} min</div>
                              {ticket.priority !== 'normal' && (
                                <div className="text-xs text-purple-600 font-medium">
                                  {ticket.priority === 'priority' ? '⚡ Priority' : '👴 Elderly'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic bg-gray-100 p-3 rounded">No numbers waiting</div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}

        {allCounters.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">
              {queueError ? 'API Connection Error' : 'No counter data available'}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">
              🔄 Loading data...
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <h3 className="font-semibold text-blue-800 mb-2">📋 API Integration Status:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700">
            <div>
              <h4 className="font-medium mb-1">✅ Counters API:</h4>
              <p className="text-sm">Using GET /counters/ for counter information</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">🔄 Queue API:</h4>
              <p className="text-sm">Call next ticket uses POST /counters/&#123;id&#125;/call-next</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">⏸️ Control API:</h4>
              <p className="text-sm">Pause/Resume uses API endpoints</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">📊 Queue Data:</h4>
              <p className="text-sm">Queue details still using mock data (TODO)</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-600">
            <strong>🌐 Hybrid Mode:</strong> Counter metadata from API, queue operations via API, queue display using mock data until full queue API is available.
          </div>
        </div>
      </div>

      {/* Stop Service Modal */}
      <StopServiceModal
        isOpen={stopServiceModal.isOpen}
        onClose={handleStopServiceClose}
        onConfirm={handleStopServiceConfirm}
        counterName={stopServiceModal.counterName}
      />
    </div>
  );
}

export default function TestQueuePageWithAuth() {
  return (
    <AuthGuard>
      <TestQueuePage />
    </AuthGuard>
  );
}