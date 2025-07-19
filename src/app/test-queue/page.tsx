'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StopServiceModal from '@/components/shared/StopServiceModal';
import { useCounterOperations } from '@/hooks/useApi';
import AuthGuard from '@/components/shared/AuthGuard';
import { useRouter } from 'next/navigation';
import { TTSService } from '@/libs/ttsService';
import { toast } from 'react-toastify';
import { type CounterDetail, type CurrentServing, type WaitingTicket } from '@/libs/queueApi';
import { countersAPI, type Counter, type CallNextResponse, ticketsAPI, type Ticket, rootApi } from '@/libs/rootApi';

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

  // ✅ Real-time queue data states
  const [apiCounters, setApiCounters] = useState<Counter[]>([]);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [countersLoading, setCountersLoading] = useState(true);
  const [countersError, setCountersError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'offline'>('websocket');
  
  // ✅ NEW: Local state to track currently serving tickets (from callNext response)
  const [localServingTickets, setLocalServingTickets] = useState<Record<number, {
    number: number;
    counter_name: string;
    called_at: string;
  }>>({});

  // ✅ Load counters with enhanced error handling and debug logging
  const loadCounters = useCallback(async () => {
    try {
      setCountersLoading(true);
      setCountersError(null);
      
      console.log('🔄 Loading counters from API...');
      const countersData = await countersAPI.getCounters();
      
      console.log('✅ Raw counters API response:', countersData);
      console.log('📊 Counters data details:', countersData.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        is_active: c.is_active
      })));
      
      setApiCounters(countersData);
      console.log('✅ Loaded counters from API:', countersData);
    } catch (error) {
      console.error('❌ Load counters error:', error);
      setCountersError(`Failed to load counters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCountersLoading(false);
    }
  }, []);

  // ✅ Load queue tickets data - ONLY waiting tickets from API
  const loadQueueData = useCallback(async () => {
    try {
      console.log('🔄 Fetching WAITING tickets only from API...');
      
      // 🔥 API /tickets/waiting only returns tickets with status: 'waiting' 
      const response = await rootApi.get('/tickets/waiting');
      const waitingTickets: any[] = response.data; // Only status: 'waiting'
      
      console.log('📡 API Response (waiting tickets only):', waitingTickets);
      console.log('📊 Waiting tickets count:', waitingTickets.length);
      
      // ✅ Convert to internal format - remove unused fields based on actual BE response
      const tickets = waitingTickets.map((ticket: any) => ({
        id: ticket.id,
        number: ticket.number,
        counter_id: ticket.counter_id,
        status: ticket.status, // Always 'waiting' from this API
        created_at: ticket.created_at,
        called_at: ticket.called_at, // Always null for waiting tickets
        finished_at: ticket.finished_at, // Always null for waiting tickets
        // ✅ Default values for fields not provided by BE
        procedure_name: '', // BE doesn't provide this field
        procedure_id: 0,
        counter_name: `Quầy ${ticket.counter_id}`,
        priority: 1,
        updated_at: ticket.created_at,
        estimated_wait_time: 0
      }));
      
      setQueueTickets(tickets);
      console.log('✅ Loaded waiting tickets only:', tickets);
    } catch (error) {
      console.error('❌ Failed to load waiting tickets:', error);
    }
  }, []);

  // ✅ WebSocket real-time updates implementation
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectCount = 0;
    const maxReconnectAttempts = 5;

    // Initial data load
    loadCounters();
    loadQueueData();

    // ✅ Connect to production WebSocket endpoint
    const connectWebSocket = () => {
      try {
        console.log('🔌 Connecting to production WebSocket for test-queue...');
        
        ws = new WebSocket('wss://detect-seat.onrender.com/ws/updates');
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected for test-queue page');
          reconnectCount = 0;
          setWsConnected(true);
          setConnectionType('websocket');
        };
        
        ws.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);
            console.log('📡 WebSocket event received in test-queue:', eventData);
            
            switch (eventData.event) {
              case 'new_ticket':
                handleNewTicketEvent(eventData);
                break;
                
              case 'ticket_called':
                handleTicketCalledEvent(eventData);
                break;
                
              default:
                console.log('ℹ️ Unknown WebSocket event:', eventData.event);
            }
            
          } catch (error) {
            console.error('❌ WebSocket message parse error:', error);
          }
        };
        
        ws.onclose = (event) => {
          console.warn('⚠️ WebSocket disconnected in test-queue:', event.code, event.reason);
          setWsConnected(false);
          setConnectionType('offline');
          
          // Auto-reconnect logic
          if (reconnectCount < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
            reconnectCount++;
            
            console.log(`🔄 WebSocket reconnecting attempt ${reconnectCount}/${maxReconnectAttempts} in ${delay/1000}s...`);
            setTimeout(connectWebSocket, delay);
          } else {
            console.error('❌ WebSocket max reconnection attempts reached');
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setWsConnected(false);
          setConnectionType('offline');
        };
        
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setConnectionType('offline');
      }
    };

    // ✅ Handle WebSocket events
    const handleNewTicketEvent = async (eventData: { event: string, ticket_number: number, counter_id: number }) => {
      console.log('🎫 New ticket created via WebSocket:', eventData);
      // Refresh queue data when new ticket is created
      await loadQueueData();
    };

    const handleTicketCalledEvent = async (eventData: { event: string, ticket_number: number, counter_name: string }) => {
      console.log('📞 Ticket called via WebSocket:', eventData);
      console.log('🔄 Refreshing queue data after ticket_called event...');
      
      // ✅ NEW: Extract counter_id from counter_name (e.g., "Quầy 1" → 1)
      const counterIdMatch = eventData.counter_name.match(/Quầy (\d+)/);
      const counterId = counterIdMatch ? parseInt(counterIdMatch[1]) : null;
      
      if (counterId) {
        // ✅ Update local serving state from WebSocket event
        setLocalServingTickets(prev => ({
          ...prev,
          [counterId]: {
            number: eventData.ticket_number,
            counter_name: eventData.counter_name,
            called_at: new Date().toISOString()
          }
        }));
        
        console.log('💾 Updated local serving state from WebSocket for counter', counterId);
      }
      
      // ✅ Refresh waiting list (called ticket will disappear from waiting list)
      await loadQueueData();
      
      console.log('✅ Queue data refreshed after ticket_called event');
    };

    // Start WebSocket connection
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [loadCounters, loadQueueData]);

  // ✅ Process real data into UI format with new logic
  const processCounterData = useCallback((counter: Counter): CounterDetail => {
    // ✅ Only get waiting tickets from API (all have status: 'waiting')
    const waitingTickets = queueTickets.filter(ticket => 
      ticket.counter_id === counter.id
    ); // All tickets from API have status: 'waiting'
    
    // ✅ Get serving ticket from local state (from callNext response)
    const servingTicket = localServingTickets[counter.id];
    
    console.log(`� Counter ${counter.id} (${counter.name}) - NEW LOGIC:`, {
      waitingFromAPI: waitingTickets.length,
      servingFromLocal: servingTicket ? 1 : 0,
      servingTicket,
      waitingTickets: waitingTickets.map(t => ({ id: t.id, number: t.number, status: t.status }))
    });
    
    // Convert waiting tickets to UI format
    const waiting_queue: WaitingTicket[] = waitingTickets.map(ticket => ({
      ticket_id: ticket.id,
      number: ticket.number,
      procedure_name: '', // API doesn't provide this field
      wait_time: 0, // API doesn't provide this field
      priority: 'normal' as const // Default priority
    }));
    
    // ✅ Current serving from local state (from callNext response)
    const current_serving: CurrentServing | undefined = servingTicket 
      ? {
          ticket_id: 0, // We don't know the ID of serving ticket
          number: servingTicket.number,
          called_at: servingTicket.called_at,
          procedure_name: '' // We don't have procedure info
        }
      : undefined;
    
    console.log(`📊 Counter ${counter.id} enhanced final result:`, {
      waiting_count: waiting_queue.length,
      has_current_serving: !!current_serving,
      current_serving_number: current_serving?.number,
      api_status: counter.status,
      is_active: counter.is_active
    });
    
    // ✅ Enhanced status determination logic
    let finalStatus: 'active' | 'paused' = 'active';
    let pauseReason: string | undefined = undefined;
    
    // Check multiple conditions for paused status
    if (counter.status === 'paused' || counter.status === 'offline') {
      finalStatus = 'paused';
      pauseReason = (counter as any).pause_reason || 'Tạm dừng';
    } else if (counter.is_active === false) {
      finalStatus = 'paused';
      pauseReason = 'Không hoạt động';
    }
    
    console.log(`📊 Counter ${counter.id} enhanced status determination:`, {
      api_status: counter.status,
      is_active: counter.is_active,
      final_status: finalStatus,
      pause_reason: pauseReason
    });
    
    return {
      counter_id: counter.id,
      counter_name: counter.name,
      is_active: finalStatus === 'active',
      status: finalStatus,
      pause_reason: pauseReason,
      procedures: [], // Not needed for this view
      current_serving,
      waiting_queue,
      waiting_count: waiting_queue.length
    };
  }, [queueTickets, localServingTickets]);

  // ✅ Generate processed counters with real data
  const allCounters = apiCounters.map(processCounterData);
  
  const totalWaiting = allCounters.reduce((sum, counter) => sum + counter.waiting_count, 0);
  const lastUpdated = new Date().toISOString();
  const isLoading = countersLoading;
  const isRefreshing = false;
  const queueError = countersError;
  
  const refreshQueue = async () => {
    console.log('🔄 Refreshing counters and queue data...');
    await Promise.all([loadCounters(), loadQueueData()]);
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
  
  // WebSocket status display variables - using our own real-time implementation
  const isConnected = wsConnected;
  const connectionError = !wsConnected && connectionType === 'offline' ? 'Connection failed' : null;
  const lastEvent = null; // Could add event tracking if needed
  const reconnect = () => {
    console.log('🔄 Manual reconnect requested - handled by useEffect');
    // Reconnection is handled automatically by our useEffect WebSocket logic
  };

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
    // ✅ Clear sessionStorage thay vì localStorage
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    router.push('/login');
  };

  // State for processing actions
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // ✅ API Operations: Call Next Number (Updated logic)
  const handleNextTicket = async (counterId: string) => {
    const counterIdNum = parseInt(counterId);
    try {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: true }));
      
      console.log(`🔥 Calling next for counter ${counterIdNum}`);
      console.log('🔍 Available counters:', allCounters.map(c => ({ id: c.counter_id, name: c.counter_name })));
      
      // Check if counter exists
      const counter = allCounters.find(c => c.counter_id === counterIdNum);
      if (!counter) {
        throw new Error(`Counter ${counterIdNum} not found in loaded counters`);
      }
      
      // Check if there are waiting tickets for this counter
      const waitingTickets = queueTickets.filter(t => t.counter_id === counterIdNum && t.status === 'waiting');
      console.log('🎫 Waiting tickets for this counter:', waitingTickets);
      
      if (waitingTickets.length === 0) {
        toast.warning(`⚠️ Không có vé nào đang chờ cho ${counter.counter_name}!`);
        return;
      }
      
      // ✅ Detailed API call with error handling
      const authToken = sessionStorage.getItem('auth_token');
      console.log('� Auth token exists:', !!authToken);
      console.log('�📡 Making API call to:', `/counters/${counterIdNum}/call-next`);
      
      const response = await countersAPI.callNext(counterIdNum);
      
      // 🔍 SIMPLIFIED DEBUG: Log exact response structure
      console.log('🐛 API Response Analysis:', {
        rawResponse: response,
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        hasNumber: !!response?.number,
        numberValue: response?.number,
        hasCounterName: !!response?.counter_name,
        counterNameValue: response?.counter_name
      });
      
      console.log('📡 API Response:', response);
      
      // ✅ FIXED: API returns direct format {number, counter_name} instead of {success, ticket}
      if (response && response.number) {
        
        console.log('✅ Successfully called ticket:', response);
        
        // ✅ Store serving ticket locally with BE data
        const servingTicket = {
          number: response.number,
          counter_name: response.counter_name || counter.counter_name,
          called_at: new Date().toISOString()
        };
        
        console.log('💾 Storing serving ticket:', servingTicket);
        console.log('💾 Counter ID for storage:', counterIdNum);
        
        setLocalServingTickets(prev => {
          const newState = {
            ...prev,
            [counterIdNum]: servingTicket
          };
          console.log('💾 Previous local serving state:', prev);
          console.log('💾 New local serving state:', newState);
          return newState;
        });
        
        // ✅ NEW: Store serving ticket locally (since API /tickets/waiting won't return it)
        setLocalServingTickets(prev => ({
          ...prev,
          [counterIdNum]: {
            number: response.number,
            counter_name: counter.counter_name,
            called_at: new Date().toISOString()
          }
        }));
        
        console.log('� Stored serving ticket locally for counter', counterIdNum);
        
        // Show success toast with BE response data
        toast.success(
          <div>
            <div>✅ Đã gọi vé số <strong>{response.number}</strong></div>
            <div>📢 Cho {counter.counter_name}</div>
            <div className="text-xs text-gray-500 mt-1">
              Thời gian: {new Date().toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
        
        // ✅ Refresh waiting list (called ticket will disappear from waiting list)
        await loadQueueData();
        
        // ✅ IMPORTANT: Dispatch CustomEvent to notify TV display
        const ticketCalledEvent = new CustomEvent('ticketCalled', {
          detail: {
            event: 'ticket_called',
            ticket_number: response.number,
            counter_name: counter.counter_name,
            counter_id: counterIdNum,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('📡 Dispatching ticketCalled event to TV:', ticketCalledEvent.detail);
        window.dispatchEvent(ticketCalledEvent);
        
        // Also dispatch generic queue update event
        window.dispatchEvent(new CustomEvent('queueUpdated', {
          detail: { 
            source: 'test-queue-call-next',
            counterId: counterIdNum,
            ticketNumber: response.number
          }
        }));
        
      } else {
        // 🔍 DETAILED ERROR ANALYSIS
        console.error('🐛 API Response Error Analysis:', {
          hasResponse: !!response,
          hasNumber: !!response?.number,
          numberValue: response?.number,
          hasCounterName: !!response?.counter_name,
          counterNameValue: response?.counter_name,
          fullResponse: response
        });
        
        const errorMsg = 'API response không hợp lệ - thiếu số vé';
        console.error('❌ API returned no ticket or success: false, message:', errorMsg);
        toast.error(`❌ ${errorMsg}`);
      }
      
    } catch (error) {
      console.error('❌ Call next error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        counterId: counterIdNum,
        timestamp: new Date().toISOString()
      });
      
      // Specific error handling
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          errorMessage = `Counter ${counterIdNum} không tồn tại trên server`;
        } else if (error.message.includes('500')) {
          errorMessage = 'Lỗi server, vui lòng thử lại sau';
        } else if (error.message.includes('network')) {
          errorMessage = 'Lỗi kết nối mạng';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(`❌ Lỗi gọi khách: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: false }));
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

  // ✅ Handle stop service confirmation with enhanced API response handling
  const handleStopServiceConfirm = async (reason: string) => {
    const counterIdNum = parseInt(stopServiceModal.counterId);
    
    try {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: true }));
      
      console.log(`⏸️ Pausing counter ${counterIdNum} with reason: ${reason}`);
      const response = await countersAPI.pauseCounter(counterIdNum, { reason });
      
      console.log('🔍 Pause API response:', response);
      
      // ✅ Enhanced API response handling
      if (response && (response.success === true || response.success === undefined)) {
        toast.success(`⏸️ Đã tạm dừng ${stopServiceModal.counterName}!`);
        await loadCounters(); // Refresh counter status
      } else {
        const errorMsg = response?.message || 'Pause operation failed';
        console.error('❌ Pause failed:', errorMsg);
        toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Pause counter error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: false }));
    }
    
    // Close modal
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // ✅ Handle resume service with enhanced API response handling  
  const handleResumeService = async (counterId: string) => {
    const counterIdNum = parseInt(counterId);
    
    try {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: true }));
      
      console.log(`▶️ Resuming counter ${counterIdNum}`);
      const response = await countersAPI.resumeCounter(counterIdNum);
      
      console.log('🔍 Resume API response:', response);
      
      // ✅ Enhanced API response handling
      if (response && (response.success === true || response.success === undefined)) {
        const counter = allCounters.find(c => c.counter_id === counterIdNum);
        const counterName = counter?.counter_name || `Quầy ${counterIdNum}`;
        
        toast.success(`▶️ Đã mở lại ${counterName}!`);
        await loadCounters(); // Refresh counter status
      } else {
        const errorMsg = response?.message || 'Resume operation failed';
        console.error('❌ Resume failed:', errorMsg);
        toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Resume counter error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [counterIdNum]: false }));
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

  // ✅ Test API connectivity
  const testAPIConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      const response = await countersAPI.getCounters();
      console.log('✅ API connection test successful:', response);
      toast.success('✅ API kết nối thành công!');
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      toast.error('❌ API không thể kết nối!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with WebSocket status and logout button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-600">
              🧪 Bảng Điều Khiển
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
                {isConnected ? '🔌 WebSocket Đã Kết Nối' : '❌ WebSocket Đã Ngắt Kết Nối'}
              </div>
              
              {connectionError && (
                <button
                  onClick={reconnect}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  🔄 Kết nối lại
                </button>
              )}
              
              {lastEvent && (
                <div className="text-xs text-gray-600">
                  Last Event: Connected
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
                {!queueError ? '🌐 Counters API Đã Kết Nối' : '❌ Counters API Đã Ngắt Kết Nối'}
              </div>
              
              {apiCounters.length > 0 && (
                <div className="text-xs text-green-600">
                  📊 Tải {apiCounters.length} quầy từ API
                </div>
              )}
              
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  📅 Thời gian: {new Date(lastUpdated).toLocaleTimeString('vi-VN')}
                </div>
              )}
              
              <div className="text-sm text-blue-600">
                📊 Tổng số chờ: {totalWaiting}
              </div>
              
              {isRefreshing && (
                <div className="text-xs text-blue-500 animate-pulse">
                  🔄 Đang làm mới...
                </div>
              )}
            </div>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            Đăng xuất
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🎛️ Điều khiển toàn cục</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleClearAllQueues}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Xóa tất cả hàng đợi
            </button>
            
            <button
              onClick={testAPIConnection}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔌 Kiểm tra kết nối API
            </button>
            
            <button
              onClick={refreshQueue}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Làm mới dữ liệu
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
                      className={`px-4 py-2 rounded transition-colors text-sm ${
                        actionLoading[counter.counter_id] 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      disabled={actionLoading[counter.counter_id]}
                    >
                      {actionLoading[counter.counter_id] ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
              
                        </span>
                      ) : (
                        '▶️ Tiếp tục'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopService(counterId)}
                      className={`px-4 py-2 rounded transition-colors text-sm ${
                        actionLoading[counter.counter_id] 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      disabled={actionLoading[counter.counter_id]}
                    >
                      {actionLoading[counter.counter_id] ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin ">⏳</span>
                        </span>
                      ) : (
                        '⏸️ Tạm dừng'
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleNextTicket(counterId)}
                    className={`px-4 py-2 rounded transition-colors text-sm ${
                      counter.waiting_count === 0 || actionLoading[counter.counter_id]
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    disabled={counter.waiting_count === 0 || actionLoading[counter.counter_id]}
                  >
                    {actionLoading[counter.counter_id] ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Calling...
                      </span>
                    ) : (
                      '✅ Số tiếp theo'
                    )}
                  </button>
                </div>
                
                {/* Serving Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 text-red-600">🔊 Đang phục vụ</h3>
                  {counterStatus === 'paused' ? (
                    <div className="text-orange-600 font-semibold bg-orange-100 p-3 rounded border-l-4 border-orange-500">
                      ⏸️ Quầy tạm ngừng
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
                    <div className="text-gray-500 italic bg-gray-100 p-3 rounded">Chưa có số được phục vụ</div>
                  )}
                </div>

                {/* Waiting Section */}
                <div>
                  <h3 className="text-lg font-medium mb-2 text-yellow-600">⏳ Số đang chờ ({counter.waiting_count})</h3>
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
                    <div className="text-gray-500 italic bg-gray-100 p-3 rounded">Không có số đang chờ</div>
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