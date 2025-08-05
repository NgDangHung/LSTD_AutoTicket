'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StopServiceModal from '@/components/shared/StopServiceModal';
import FooterConfigModal from '@/components/shared/ChangeFooterModal';
import AuthGuard from '@/components/shared/AuthGuard';
import { useRouter } from 'next/navigation';
import { TTSService } from '@/libs/ttsService';
import { toast } from 'react-toastify';
import { type CounterDetail, type CurrentServing, type WaitingTicket } from '@/libs/queueApi';
import { footersAPI, countersAPI, type Counter, type CallNextResponse, ticketsAPI, type Ticket, rootApi } from '@/libs/rootApi';



function TestQueuePage() {
  // Footer config state
  const [footerConfig, setFooterConfig] = useState<{ workingHours: string; hotline: string }>({
    workingHours: 'Giờ làm việc (Thứ 2 - Thứ 6): 07h30 - 17h00',
    hotline: 'Hotline hỗ trợ: 0916670793',
  });
  const [showFooterModal, setShowFooterModal] = useState(false);

  // Footer config API helpers
  const TEN_XA = 'phuonghagiang1';
  async function fetchFooterConfig() {
    // API trả về { work_time, hotline }
    const data = await footersAPI.getFooter(TEN_XA);
    return {
      workingHours: data.work_time,
      hotline: data.hotline,
    };
  }
  async function saveFooterConfig(config: { workingHours: string; hotline: string }) {
    // API nhận { work_time, hotline }
    const data = await footersAPI.setFooter(TEN_XA, {
      work_time: config.workingHours,
      hotline: config.hotline,
    });
    return {
      workingHours: data.work_time,
      hotline: data.hotline,
    };
  }

  // Load footer config from API on mount
  useEffect(() => {
    fetchFooterConfig()
      .then(data => {
        if (data && (data.workingHours || data.hotline)) {
          setFooterConfig({
            workingHours: data.workingHours || footerConfig.workingHours,
            hotline: data.hotline || footerConfig.hotline,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save footer config to API and broadcast event
  const handleSaveFooterConfig = async (config: { workingHours: string; hotline: string }) => {
    try {
      await saveFooterConfig(config);
      setFooterConfig(config);
      setShowFooterModal(false);
      toast.success('Đã lưu cấu hình footer!');
      // Broadcast event for all tabs
      window.dispatchEvent(new CustomEvent('footerConfigUpdated', { detail: config }));
    } catch (err) {
      toast.error('Lỗi khi lưu cấu hình footer!');
    }
  };
  const router = useRouter();
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
  // Additional state hooks for UI actions
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [stopServiceModal, setStopServiceModal] = useState<{ isOpen: boolean; counterId: string; counterName: string }>({ isOpen: false, counterId: '', counterName: '' });
  

  // ✅ NEW: State to track currently serving tickets from API (like QueueDisplay)
  const [servingTickets, setServingTickets] = useState<Record<number, {
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
      const response = await rootApi.get('/tickets/waiting', { params: { tenxa: 'phuonghagiang1' } });
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
        
        ws = new WebSocket('ws://192.168.92.143:8000/ws/updates');
        
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
      // No local serving state update needed; serving tickets are now API-driven
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

  // ✅ Process real data into UI format with new logic (serving ticket from API)
  const processCounterData = useCallback((counter: Counter): CounterDetail => {
    const waitingTickets = queueTickets.filter(ticket => ticket.counter_id === counter.id);
    const servingTicket = servingTickets[counter.id];
    const waiting_queue: WaitingTicket[] = waitingTickets.map(ticket => ({
      ticket_id: ticket.id,
      number: ticket.number,
      procedure_name: '',
      wait_time: 0,
      priority: 'normal' as const
    }));
    const current_serving: CurrentServing | undefined = servingTicket
      ? {
          ticket_id: 0,
          number: servingTicket.number,
          called_at: servingTicket.called_at,
          procedure_name: ''
        }
      : undefined;
    return {
      counter_id: counter.id,
      counter_name: counter.name,
      status: counter.status,
      is_active: counter.is_active,
      pause_reason: (counter as any).pause_reason || '',
      waiting_queue,
      waiting_count: waiting_queue.length,
      current_serving,
      procedures: [] // Provide empty array if not available
    };
  }, [queueTickets, servingTickets]);

  // ✅ Fetch serving ticket for a counter from API (like QueueDisplay)
  const fetchServingTicket = async (counterId: number) => {
    try {
      const response = await rootApi.get('/tickets/called', { params: { counter_id: counterId, tenxa: 'phuonghagiang1' } });
      const tickets: any[] = response.data;
      return tickets.length > 0 ? tickets[0] : null;
    } catch (error) {
      console.error('❌ Failed to fetch serving ticket:', error);
      return null;
    }
  };

  // ✅ Load all serving tickets for all counters (on reload or event)
  const loadAllServingTickets = useCallback(async () => {
    if (apiCounters.length === 0) return;
    const servingState: Record<number, { number: number; counter_name: string; called_at: string }> = {};
    for (const counter of apiCounters) {
      try {
        const ticket = await fetchServingTicket(counter.id);
        if (ticket) {
          servingState[counter.id] = {
            number: ticket.number,
            counter_name: counter.name,
            called_at: ticket.called_at || new Date().toISOString()
          };
        }
      } catch (err) {
        // ignore error for each counter
      }
    }
    setServingTickets(servingState);
  }, [apiCounters]);

  // (Removed duplicate WebSocket useEffect and handlers; only one should exist)
  // Handle next ticket for a counter
  const handleNextTicket = async (counterId: string) => {
    const counterIdNum = parseInt(counterId);
    const counter = apiCounters.find(c => c.id === counterIdNum);
    if (!counter) {
      toast.error(`Counter ${counterIdNum} không tồn tại trong danh sách!`);
      return;
    }
    const waitingTickets = queueTickets.filter(t => t.counter_id === counterIdNum && t.status === 'waiting');
    if (waitingTickets.length === 0) {
      toast.warning(`⚠️ Không có vé nào đang chờ cho ${counter.name}!`);
      return;
    }
    try {
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: true }));
      const response = await countersAPI.callNext(counterIdNum);
      if (response && response.number) {
        toast.success(
          <div>
            <div>✅ Đã gọi vé số <strong>{response.number}</strong></div>
            <div>📢 Cho {counter.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              Thời gian: {new Date().toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
        await loadQueueData();
        await loadAllServingTickets();
        // Dispatch CustomEvent to notify TV display
        const ticketCalledEvent = new CustomEvent('ticketCalled', {
          detail: {
            event: 'ticket_called',
            ticket_number: response.number,
            counter_name: counter.name,
            counter_id: counterIdNum,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(ticketCalledEvent);
        window.dispatchEvent(new CustomEvent('queueUpdated', {
          detail: {
            source: 'test-queue-call-next',
            counterId: counterIdNum,
            ticketNumber: response.number
          }
        }));
      } else {
        toast.error('❌ API response không hợp lệ - thiếu số vé');
      }
    } catch (error) {
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
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: false }));
    }
  // (Removed stray closing brace)
  };

  // Handle stop service - open modal  
  const handleStopService = (counterId: string) => {
    const counterData = apiCounters.find(counter => counter.id.toString() === counterId);
    if (!counterData) return;
    setStopServiceModal({
      isOpen: true,
      counterId: counterId,
      counterName: `${counterData.name}`
    });
  };

  // ✅ Handle stop service confirmation with enhanced API response handling
  const handleStopServiceConfirm = async (reason: string) => {
    const counterIdNum = parseInt(stopServiceModal.counterId);
    try {
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: true }));
      const response = await countersAPI.pauseCounter(counterIdNum, { reason });
      if (response && (response.success === true || response.success === undefined)) {
        toast.success(`⏸️ Đã tạm dừng ${stopServiceModal.counterName}!`);
        await loadCounters(); // Refresh counter status
      } else {
        const errorMsg = response?.message || 'Pause operation failed';
        toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi tạm dừng: ${errorMsg}`);
    } finally {
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: false }));
    }
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
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: true }));
      const response = await countersAPI.resumeCounter(counterIdNum);
      if (response && (response.success === true || response.success === undefined)) {
        const counter = apiCounters.find(c => c.id === counterIdNum);
        const counterName = counter?.name || `Quầy ${counterIdNum}`;
        toast.success(`▶️ Đã mở lại ${counterName}!`);
        await loadCounters(); // Refresh counter status
      } else {
        const errorMsg = response?.message || 'Resume operation failed';
        toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Lỗi mở lại: ${errorMsg}`);
    } finally {
      setActionLoading((prev: Record<number, boolean>) => ({ ...prev, [counterIdNum]: false }));
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

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  // Modal component for editing footer (đặt ngoài cùng file)
  

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with WebSocket status and logout button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-600">
            🧪 Bảng Điều Khiển
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
          🚪 Đăng xuất
          </button>
        </div>
        
        {/* Global Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🎛️ Điều khiển toàn cục</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => router.push('/admin')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              👑 Trang quản trị
            </button>
            <button
              onClick={async () => { await loadCounters(); await loadQueueData(); await loadAllServingTickets(); }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Làm mới dữ liệu
            </button>
            <button
              onClick={() => setShowFooterModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ⚙️ Chỉnh sửa footer
            </button>
          </div>
        </div>

        {/* Counter Controls Grid - Only show when data is loaded */}
        {!countersLoading && apiCounters.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {apiCounters.map((counter) => {
              const counterId = counter.id.toString();
              const counterDetail = processCounterData(counter);
              const counterStatus = counterDetail.status || (counterDetail.is_active ? 'active' : 'paused');
              return (
                <div key={counter.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 text-blue-600">
                    {counter.name}
                  </h2>
                  {/* Counter Action Buttons */}
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    {counterStatus === 'paused' ? (
                      <button
                        onClick={() => handleResumeService(counterId)}
                        className={`px-4 py-2 rounded transition-colors text-sm ${
                          actionLoading[counter.id]
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={actionLoading[counter.id]}
                      >
                        {actionLoading[counter.id] ? (
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
                          actionLoading[counter.id]
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                        disabled={actionLoading[counter.id]}
                      >
                        {actionLoading[counter.id] ? (
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
                        counterDetail.waiting_count === 0 || actionLoading[counter.id]
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      disabled={counterDetail.waiting_count === 0 || actionLoading[counter.id]}
                    >
                      {actionLoading[counter.id] ? (
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
                        {counterDetail.pause_reason && (
                          <div className="text-sm text-orange-700 mt-1">
                            Reason: {counterDetail.pause_reason}
                          </div>
                        )}
                      </div>
                    ) : counterDetail.current_serving ? (
                      <div className="space-y-2">
                        <div className="bg-red-100 p-3 rounded border-l-4 border-red-500">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-2xl text-black">{counterDetail.current_serving.number}</span>
                            <div className="text-left text-sm">
                              <div className="font-medium text-black">{counterDetail.current_serving.procedure_name}</div>
                              <div className="text-black">{new Date(counterDetail.current_serving.called_at).toLocaleTimeString('vi-VN')}</div>
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
                    <h3 className="text-lg font-medium mb-2 text-yellow-600">⏳ Số đang chờ ({counterDetail.waiting_count})</h3>
                    {counterDetail.waiting_queue.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {counterDetail.waiting_queue.map((ticket, index) => (
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

        {apiCounters.length === 0 && !countersLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">
              {countersError ? 'API Connection Error' : 'No counter data available'}
            </div>
          </div>
        )}

        {countersLoading && (
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

      {/* Footer Config Modal */}
      {showFooterModal && (
        <FooterConfigModal
          isOpen={showFooterModal}
          onClose={() => setShowFooterModal(false)}
          onSave={handleSaveFooterConfig}
          initialConfig={footerConfig}
        />
      )}

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