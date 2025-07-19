'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import AuthGuard from '@/components/shared/AuthGuard';
import { countersAPI, rootApi, Counter } from '@/libs/rootApi';
import StopServiceModal from '@/components/shared/StopServiceModal';

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  counter_id: number;
  is_active: boolean;
}

interface Ticket {
  id: number;
  number: number;
  counter_id: number;
  status: string;
  created_at: string;
  called_at: string | null;
  finished_at: string | null;
  // Additional fields for UI compatibility
  procedure_name?: string;
  procedure_id?: number;
  counter_name?: string;
  priority?: number;
  updated_at?: string;
  estimated_wait_time?: number;
}

interface CounterDetail {
  counter_id: number;
  counter_name: string;
  is_active: boolean;
  status: 'active' | 'paused';
  pause_reason?: string;
  current_serving?: {
    ticket_id: number;
    number: number;
    called_at: string;
    procedure_name: string;
  };
  waiting_queue: Array<{
    ticket_id: number;
    number: number;
    procedure_name: string;
    wait_time: number;
    priority: 'normal' | 'priority';
  }>;
  waiting_count: number;
}

function OfficerPage() {
  const router = useRouter();
  
  // User states
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  
  // ✅ Real-time queue data states (WebSocket-based like test-queue)
  const [apiCounters, setApiCounters] = useState<Counter[]>([]);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [countersLoading, setCountersLoading] = useState(true);
  const [countersError, setCountersError] = useState<string | null>(null);
  
  // ✅ Local state to track currently serving tickets (from callNext response)
  const [localServingTickets, setLocalServingTickets] = useState<Record<number, {
    number: number;
    counter_name: string;
    called_at: string;
  }>>({});
  
  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [stopServiceModal, setStopServiceModal] = useState<{
    isOpen: boolean;
    counterId: string;
    counterName: string;
  }>({
    isOpen: false,
    counterId: '',
    counterName: ''
  });

  // ✅ Load current user info
  const loadCurrentUser = useCallback(async () => {
    try {
      setUserLoading(true);
      
      // ✅ Sử dụng sessionStorage thay vì localStorage
      const authToken = sessionStorage.getItem('auth_token');
      if (!authToken) {
        router.push('/login');
        return;
      }

      // ✅ Try to get cached user data first
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const userData = JSON.parse(cachedUserData);
          console.log('📋 Using cached user data:', userData);
          setCurrentUser(userData);
          
          // Validate officer role and counter assignment
          if (userData.role !== 'officer') {
            toast.error('❌ Trang này chỉ dành cho officer!');
            router.push('/login');
            return;
          }
          
          if (!userData.counter_id) {
            toast.error('❌ Tài khoản officer chưa được gán quầy!');
            router.push('/login');
            return;
          }
          
          setUserLoading(false);
          return; // Use cached data, skip API call
        } catch (parseError) {
          console.warn('⚠️ Failed to parse cached user data, fetching fresh...');
          sessionStorage.removeItem('user_data');
        }
      }
      
      // ✅ Fetch fresh user data if not cached
      console.log('🔍 Loading current user info...');
      const response = await rootApi.get('/auths/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const userData = response.data;
      console.log('👤 Current user data:', userData);
      
      // ✅ Cache user data in sessionStorage
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      
      // ✅ Check if user is officer
      if (userData.role !== 'officer') {
        toast.error('❌ Chỉ officer mới có thể truy cập trang này!');
        router.push('/login');
        return;
      }
      
      // ✅ Check if user has counter_id
      if (!userData.counter_id) {
        toast.error('❌ Tài khoản officer chưa được gán quầy!');
        router.push('/login');
        return;
      }
      
      setCurrentUser(userData);
      console.log(`✅ Officer ${userData.full_name} assigned to counter ${userData.counter_id}`);
      
    } catch (error) {
      console.error('❌ Failed to load user info:', error);
      // ✅ Clear sessionStorage on error
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      toast.error('❌ Không thể tải thông tin người dùng!');
      router.push('/login');
    } finally {
      setUserLoading(false);
    }
  }, [router]);

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
      
      console.log('� API Response (waiting tickets only):', waitingTickets);
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

  // ✅ Initial data loading
  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);
  
  // ✅ WebSocket real-time updates implementation (like test-queue)
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
        console.log('🔌 Connecting to production WebSocket for officer page...');
        
        ws = new WebSocket('wss://detect-seat.onrender.com/ws/updates');
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected for officer page');
          reconnectCount = 0;
        };
        
        ws.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);
            console.log('📡 WebSocket event received in officer page:', eventData);
            
            if (eventData.event === 'new_ticket') {
              handleNewTicketEvent(eventData);
            } else if (eventData.event === 'ticket_called') {
              handleTicketCalledEvent(eventData);
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          
          // Auto-reconnect with exponential backoff
          if (reconnectCount < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/${maxReconnectAttempts})`);
            
            setTimeout(() => {
              reconnectCount++;
              connectWebSocket();
            }, delay);
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };
        
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
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
      
      // ✅ Extract counter_id from counter_name (e.g., "Quầy 1" → 1)
      const counterIdMatch = eventData.counter_name.match(/Quầy (\d+)/);
      const counterId = counterIdMatch ? parseInt(counterIdMatch[1]) : null;
      
      if (counterId) {
        // ✅ Update local serving ticket state
        setLocalServingTickets(prev => ({
          ...prev,
          [counterId]: {
            number: eventData.ticket_number,
            counter_name: eventData.counter_name,
            called_at: new Date().toISOString()
          }
        }));
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

  // ✅ Process real data into UI format for officer's assigned counter only
  const processCounterData = useCallback((counter: Counter): CounterDetail => {
    // ✅ Only get waiting tickets from API for this officer's counter
    const waitingTickets = queueTickets.filter(ticket => 
      ticket.counter_id === counter.id
    );
    
    // ✅ Get serving ticket from local state (from callNext response)
    const servingTicket = localServingTickets[counter.id];
    
    console.log(`� Counter ${counter.id} (${counter.name}) - Officer processing:`, {
      waitingFromAPI: waitingTickets.length,
      servingFromLocal: servingTicket ? 1 : 0,
      servingTicket,
      waitingTickets: waitingTickets.map(t => ({ id: t.id, number: t.number, status: t.status }))
    });
    
    // Convert waiting tickets to UI format
    const waiting_queue = waitingTickets.map(ticket => ({
      ticket_id: ticket.id,
      number: ticket.number,
      procedure_name: '', // API doesn't provide this field
      wait_time: 0, // API doesn't provide this field
      priority: 'normal' as const // Default priority
    }));
    
    // ✅ Current serving from local state (from callNext response)
    const current_serving = servingTicket 
      ? {
          ticket_id: 0, // We don't know the ID of serving ticket
          number: servingTicket.number,
          called_at: servingTicket.called_at,
          procedure_name: '' // We don't have procedure info
        }
      : undefined;
    
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
    
    return {
      counter_id: counter.id,
      counter_name: counter.name,
      is_active: finalStatus === 'active',
      status: finalStatus,
      pause_reason: pauseReason,
      current_serving,
      waiting_queue,
      waiting_count: waiting_queue.length
    };
  }, [queueTickets, localServingTickets]);

  // ✅ Get counter data for the current officer's assigned counter
  const counterData = currentUser?.counter_id 
    ? (() => {
        const myCounter = apiCounters.find(c => c.id === currentUser.counter_id);
        return myCounter ? processCounterData(myCounter) : null;
      })()
    : null;

  // ✅ Handle logout
  const handleLogout = () => {
    // ✅ Clear sessionStorage thay vì localStorage
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    router.push('/login');
  };

  // ✅ Handle call next ticket - Enhanced with counter_id validation
  const handleNextTicket = async () => {
    if (!currentUser?.counter_id || !counterData) return;
    
    try {
      setActionLoading(true);
      
      console.log(`🔥 Calling next for counter ${currentUser.counter_id}`);
      
      // ✅ Validate officer can only call for assigned counter
      if (currentUser.role === 'officer' && currentUser.counter_id !== counterData.counter_id) {
        toast.error(`❌ Bạn chỉ có quyền gọi số cho Quầy ${currentUser.counter_id}!`);
        console.error('🚫 Authorization error: Officer trying to access different counter', {
          assignedCounter: currentUser.counter_id,
          requestedCounter: counterData.counter_id,
          userRole: currentUser.role
        });
        return;
      }
      
      // Check if there are waiting tickets
      if (counterData.waiting_count === 0) {
        toast.warning(`⚠️ Không có vé nào đang chờ cho ${counterData.counter_name}!`);
        return;
      }
      
      // ✅ Debug authentication before calling API
      const authToken = sessionStorage.getItem('auth_token');
      console.log('🔐 Auth token exists:', !!authToken);
      console.log('🔐 Auth token length:', authToken?.length || 0);
      
      if (!authToken) {
        toast.error('❌ Không có token xác thực! Vui lòng đăng nhập lại.');
        router.push('/login');
        return;
      }
      
      // ✅ Enhanced request logging with counter_id validation
      console.log('📡 Making call-next request with enhanced validation...');
      console.log('📡 Officer assigned counter:', currentUser.counter_id);
      console.log('📡 Requesting for counter:', counterData.counter_id);
      console.log('📡 Counter match validation:', currentUser.counter_id === counterData.counter_id);
      console.log('📡 Request URL:', `https://detect-seat.onrender.com/app/counters/${currentUser.counter_id}/call-next`);
      console.log('🔐 Token preview:', authToken?.substring(0, 20) + '...');
      console.log('🔐 Token full length:', authToken?.length);
      
      // ✅ Test if we can access /auths/me first to verify token is valid
      try {
        console.log('🧪 Testing token validity with /auths/me...');
        const userTestResponse = await rootApi.get('/auths/me');
        console.log('✅ Token is valid - user info:', userTestResponse.data);
        
        // ✅ Double-check counter_id from fresh user data
        if (userTestResponse.data.counter_id !== currentUser.counter_id) {
          console.warn('⚠️ Counter ID mismatch detected between local and server data');
          setCurrentUser(userTestResponse.data); // Update local user data
        }
      } catch (testError) {
        console.error('❌ Token test failed:', testError);
        toast.error('❌ Token không hợp lệ! Vui lòng đăng nhập lại.');
        router.push('/login');
        return;
      }
      
      // ✅ Make the actual call-next request using officer's assigned counter_id
      console.log('🚀 Now making call-next request for assigned counter...');
      const response = await countersAPI.callNext(currentUser.counter_id);
      console.log('📡 Call next response:', response);
      
      if (response && response.number) {
        // ✅ Store serving ticket locally (updated state management)
        setLocalServingTickets(prev => ({
          ...prev,
          [currentUser.counter_id]: {
            number: response.number,
            counter_name: response.counter_name || counterData.counter_name,
            called_at: new Date().toISOString()
          }
        }));
        
        toast.success(
          <div>
            <div>✅ Đã gọi vé số {response.number}</div>
            <div>🏢 Cho {counterData.counter_name}</div>
            <div className="text-xs text-gray-500 mt-1">
              Thời gian: {new Date().toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
        
        // ✅ No manual refresh needed - WebSocket will handle updates automatically
        
        // Dispatch event for TV displays
        window.dispatchEvent(new CustomEvent('ticketCalled', {
          detail: {
            event: 'ticket_called',
            ticket_number: response.number,
            counter_name: counterData.counter_name,
            counter_id: currentUser.counter_id,
            timestamp: new Date().toISOString()
          }
        }));
        
      } else {
        toast.error(`❌ API response không hợp lệ`);
      }
      
    } catch (error) {
      console.error('❌ Call next error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        counterId: currentUser.counter_id,
        timestamp: new Date().toISOString()
      });
      
      // ✅ Enhanced error analysis for 403 Forbidden
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('📊 Detailed Axios Error Analysis:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers,
            baseURL: axiosError.config?.baseURL
          }
        });
        
        if (axiosError.response?.status === 403) {
          console.error('🚫 403 Forbidden Analysis:');
          console.error('   - Counter ID used:', currentUser.counter_id);
          console.error('   - User role:', currentUser.role);
          console.error('   - User counter_id:', currentUser.counter_id);
          console.error('   - API endpoint:', `/counters/${currentUser.counter_id}/call-next`);
          console.error('   - Possible causes:');
          console.error('     1. Officer không có quyền với counter này');
          console.error('     2. Counter không tồn tại hoặc không active');
          console.error('     3. Backend chưa implement đúng authorization cho officer');
          console.error('   - Recommended backend fix:');
          console.error('     - Check if user.counter_id matches path parameter counter_id');
          console.error('     - Ensure officer role has permission for assigned counter only');
          
          toast.error(
            <div>
              <div>❌ Không có quyền truy cập!</div>
              <div className="text-xs mt-1">Officer chỉ có quyền với quầy được gán</div>
            </div>
          );
          return;
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi gọi khách: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Handle pause counter
  const handlePauseCounter = () => {
    if (!currentUser?.counter_id || !counterData) return;
    
    setStopServiceModal({
      isOpen: true,
      counterId: currentUser.counter_id.toString(),
      counterName: counterData.counter_name
    });
  };

  // ✅ Handle pause confirmation - Enhanced with counter_id validation
  const handlePauseConfirm = async (reason: string) => {
    if (!currentUser?.counter_id) return;
    
    try {
      setActionLoading(true);
      
      // ✅ Validate officer can only pause assigned counter
      if (currentUser.role === 'officer' && counterData && currentUser.counter_id !== counterData.counter_id) {
        toast.error(`❌ Bạn chỉ có quyền tạm dừng Quầy ${currentUser.counter_id}!`);
        console.error('🚫 Authorization error: Officer trying to pause different counter', {
          assignedCounter: currentUser.counter_id,
          requestedCounter: counterData.counter_id,
          userRole: currentUser.role
        });
        return;
      }
      
      console.log(`⏸️ Pausing counter ${currentUser.counter_id} with reason: ${reason}`);
      console.log('📡 Pause request - Officer assigned counter:', currentUser.counter_id);
      console.log('📡 Pause request - API endpoint:', `/counters/${currentUser.counter_id}/pause`);
      
      const response = await countersAPI.pauseCounter(currentUser.counter_id, { reason });
      
      if (response && (response.success === true || response.success === undefined)) {
        toast.success(`⏸️ Đã tạm dừng ${counterData?.counter_name}!`);
        // ✅ FIX: Manual refresh counter data để update UI ngay lập tức (như test-queue)
        await loadCounters();
      } else {
        const errorMsg = response?.message || 'Pause operation failed';
        toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Pause counter error:', error);
      
      // ✅ Enhanced error analysis for pause operation
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 403) {
          console.error('🚫 403 Forbidden on pause - Counter ID validation failed');
          toast.error('❌ Không có quyền tạm dừng quầy này!');
          return;
        }
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
    
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // ✅ Handle resume counter - Enhanced with counter_id validation
  const handleResumeCounter = async () => {
    if (!currentUser?.counter_id) return;
    
    try {
      setActionLoading(true);
      
      // ✅ Validate officer can only resume assigned counter
      if (currentUser.role === 'officer' && counterData && currentUser.counter_id !== counterData.counter_id) {
        toast.error(`❌ Bạn chỉ có quyền mở lại Quầy ${currentUser.counter_id}!`);
        console.error('🚫 Authorization error: Officer trying to resume different counter', {
          assignedCounter: currentUser.counter_id,
          requestedCounter: counterData.counter_id,
          userRole: currentUser.role
        });
        return;
      }
      
      console.log(`▶️ Resuming counter ${currentUser.counter_id}`);
      console.log('📡 Resume request - Officer assigned counter:', currentUser.counter_id);
      console.log('📡 Resume request - API endpoint:', `/counters/${currentUser.counter_id}/resume`);
      
      const response = await countersAPI.resumeCounter(currentUser.counter_id);
      
      if (response && (response.success === true || response.success === undefined)) {
        toast.success(`▶️ Đã mở lại ${counterData?.counter_name}!`);
        // ✅ FIX: Manual refresh counter data để update UI ngay lập tức (như test-queue)
        await loadCounters();
      } else {
        const errorMsg = response?.message || 'Resume operation failed';
        toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Resume counter error:', error);
      
      // ✅ Enhanced error analysis for resume operation
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status === 403) {
          console.error('🚫 403 Forbidden on resume - Counter ID validation failed');
          toast.error('❌ Không có quyền mở lại quầy này!');
          return;
        }
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  // No user data
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">❌ Không thể tải thông tin người dùng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              🏢 Quầy Làm Việc
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-lg text-gray-600">
                👤 {currentUser.full_name}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                🏷️ {currentUser.role.toUpperCase()}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                🏢 Quầy {currentUser.counter_id}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            🚪 Đăng xuất
          </button>
        </div>

        {/* Counter Error Display */}
        {countersError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">❌ {countersError}</p>
          </div>
        )}

        {/* Counter Loading */}
        {countersLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu quầy...</p>
          </div>
        )}

        {/* Counter Dashboard */}
        {!countersLoading && counterData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Counter Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {counterData.counter_name}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    counterData.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {counterData.status === 'active' ? '✅ Hoạt động' : '⏸️ Tạm dừng'}
                  </span>
                  
                  {counterData.pause_reason && (
                    <span className="text-sm text-gray-500">
                      📝 {counterData.pause_reason}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Counter Controls - Clean interface */}
              <div className="flex gap-3">
                <button
                  onClick={handleNextTicket}
                  disabled={actionLoading || counterData.status !== 'active' || counterData.waiting_count === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    counterData.status === 'active' && counterData.waiting_count > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {actionLoading ? '⏳ Đang gọi...' : '📢 Gọi tiếp theo'}
                </button>
                
                {counterData.status === 'active' ? (
                  <button
                    onClick={handlePauseCounter}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ⏸️ Tạm dừng
                  </button>
                ) : (
                  <button
                    onClick={handleResumeCounter}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ▶️ Tiếp tục
                  </button>
                )}
              </div>
            </div>

            {/* Current Serving */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3">
                  👤 Đang phục vụ
                </h3>
                {counterData.current_serving ? (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {counterData.current_serving.number}
                    </div>
                    <div className="text-sm text-green-600">
                      ⏰ {new Date(counterData.current_serving.called_at).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    Chưa có khách
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">
                  📋 Hàng đợi
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {counterData.waiting_count}
                  </div>
                  <div className="text-sm text-blue-600">
                    vé đang chờ
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting Queue List */}
            {counterData.waiting_queue.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  📝 Danh sách chờ
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {counterData.waiting_queue.map((ticket, index) => (
                    <div
                      key={ticket.ticket_id}
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        index === 0 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg ${
                          index === 0 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {ticket.number}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                            Tiếp theo
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        #{index + 1} trong hàng đợi
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No waiting tickets */}
            {counterData.waiting_count === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎉</div>
                <p>Không có vé nào đang chờ</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stop Service Modal */}
      <StopServiceModal
        isOpen={stopServiceModal.isOpen}
        onClose={() => setStopServiceModal({ isOpen: false, counterId: '', counterName: '' })}
        onConfirm={handlePauseConfirm}
        counterName={stopServiceModal.counterName}
      />
    </div>
  );
}

export default function OfficerPageWithAuth() {
  return (
    <AuthGuard>
      <OfficerPage />
    </AuthGuard>
  );
}
