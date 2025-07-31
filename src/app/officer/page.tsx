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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [apiCounters, setApiCounters] = useState<Counter[]>([]);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>([]);
  const [countersLoading, setCountersLoading] = useState(true);
  const [countersError, setCountersError] = useState<string | null>(null);

  // ✅ Serving Ticket
  const [servingTicket, setServingTicket] = useState<{
    number: number;
    called_at: string;
    counter_name: string;
  } | null>(null);

  const fetchServingTicket = useCallback(async (counterId: number) => {
    try {
      const response = await rootApi.get('/tickets/called', {
        params: { counter_id: counterId, tenxa: 'phuonghagiang1' },
      });
      const tickets = response.data;
      if (tickets && tickets.length > 0) {
        return {
          number: tickets[0].number,
          called_at: tickets[0].called_at || new Date().toISOString(),
          counter_name: tickets[0].counter_name || `Quầy ${counterId}`,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch serving ticket:', error);
      return null;
    }
  }, []);

  const [actionLoading, setActionLoading] = useState(false);
  const [stopServiceModal, setStopServiceModal] = useState({
    isOpen: false,
    counterId: '',
    counterName: '',
  });

  const loadCurrentUser = useCallback(async () => {
    try {
      setUserLoading(true);
      const authToken = sessionStorage.getItem('auth_token');
      if (!authToken) {
        router.push('/login');
        return;
      }

      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        try {
          const userData = JSON.parse(cachedUserData);
          setCurrentUser(userData);

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

          const serving = await fetchServingTicket(userData.counter_id);
          setServingTicket(serving);
          setUserLoading(false);
          return;
        } catch {
          sessionStorage.removeItem('user_data');
        }
      }

      const response = await rootApi.get('/auths/me', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { tenxa: 'phuonghagiang1' },
      });

      const userData = response.data;
      sessionStorage.setItem('user_data', JSON.stringify(userData));

      if (userData.role !== 'officer') {
        toast.error('❌ Chỉ officer mới có thể truy cập trang này!');
        router.push('/login');
        return;
      }

      if (!userData.counter_id) {
        toast.error('❌ Tài khoản officer chưa được gán quầy!');
        router.push('/login');
        return;
      }

      setCurrentUser(userData);

      // ✅ Fetch serving ticket here
      const serving = await fetchServingTicket(userData.counter_id);
      setServingTicket(serving);
    } catch (error) {
      console.error('❌ Failed to load user info:', error);
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('user_data');
      toast.error('❌ Không thể tải thông tin người dùng!');
      router.push('/login');
    } finally {
      setUserLoading(false);
    }
  }, [router, fetchServingTicket]);

  const loadCounters = useCallback(async () => {
    try {
      setCountersLoading(true);
      setCountersError(null);
      const countersData = await countersAPI.getCounters();
      setApiCounters(countersData);
    } catch (error) {
      setCountersError(`❌ Lỗi tải danh sách quầy`);
    } finally {
      setCountersLoading(false);
    }
  }, []);

  const loadQueueData = useCallback(async () => {
    try {
      const response = await rootApi.get('/tickets/waiting', {
        params: { tenxa: 'phuonghagiang1' },
      });
      const waitingTickets: Ticket[] = response.data.map((ticket: any) => ({
        id: ticket.id,
        number: ticket.number,
        counter_id: ticket.counter_id,
        status: ticket.status,
        created_at: ticket.created_at,
        called_at: null,
        finished_at: null,
        procedure_name: '',
        procedure_id: 0,
        counter_name: `Quầy ${ticket.counter_id}`,
        priority: 1,
        updated_at: ticket.created_at,
        estimated_wait_time: 0,
      }));
      setQueueTickets(waitingTickets);
    } catch (error) {
      console.error('❌ Failed to load queue data:', error);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectCount = 0;
    const maxReconnect = 5;

    loadCounters();
    loadQueueData();

    const connectWebSocket = () => {
      ws = new WebSocket('wss://detect-seat-we21.onrender.com/ws/updates');

      ws.onopen = () => {
        reconnectCount = 0;
        console.log('✅ WS connected');
      };

      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.event === 'new_ticket' || data.event === 'ticket_called') {
          await loadQueueData();
          // Tự động cập nhật số đang phục vụ khi có event ticket_called
          if (data.event === 'ticket_called' && currentUser?.counter_id) {
            const serving = await fetchServingTicket(currentUser.counter_id);
            setServingTicket(serving);
          }
        }
      };

      ws.onclose = () => {
        if (reconnectCount < maxReconnect) {
          setTimeout(connectWebSocket, 1000 * Math.pow(2, reconnectCount++));
        }
      };
    };

    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, [loadCounters, loadQueueData, currentUser, fetchServingTicket]);

  const processCounterData = useCallback(
    (counter: Counter): CounterDetail => {
      const waiting = queueTickets.filter((t) => t.counter_id === counter.id);
      const waiting_queue = waiting.map((t) => ({
        ticket_id: t.id,
        number: t.number,
        procedure_name: '',
        wait_time: 0,
        priority: 'normal' as const,
      }));

      let status: 'active' | 'paused' = 'active';
      let reason = undefined;
      if (counter.status === 'paused' || counter.status === 'offline') {
        status = 'paused';
        reason = (counter as any).pause_reason || 'Tạm dừng';
      } else if (counter.is_active === false) {
        status = 'paused';
        reason = 'Không hoạt động';
      }

      const current_serving = servingTicket
        ? {
            ticket_id: 0,
            number: servingTicket.number,
            called_at: servingTicket.called_at,
            procedure_name: '',
          }
        : undefined;

      return {
        counter_id: counter.id,
        counter_name: counter.name,
        is_active: status === 'active',
        status,
        pause_reason: reason,
        current_serving,
        waiting_queue,
        waiting_count: waiting_queue.length,
      };
    },
    [queueTickets, servingTicket]
  );

  const counterData =
    currentUser?.counter_id &&
    apiCounters.find((c) => c.id === currentUser.counter_id)
      ? processCounterData(
          apiCounters.find((c) => c.id === currentUser.counter_id)!
        )
      : null;

  const handleNextTicket = async () => {
    if (!currentUser?.counter_id || !counterData) return;
    try {
      setActionLoading(true);
      const response = await countersAPI.callNext(currentUser.counter_id);
      if (response && response.number) {
        toast.success(`✅ Gọi vé ${response.number}`);
        await loadQueueData();
        const serving = await fetchServingTicket(currentUser.counter_id);
        setServingTicket(serving);
      }
    } catch (error) {
      toast.error('❌ Lỗi gọi vé');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseConfirm = async (reason: string) => {
    if (!currentUser?.counter_id) return;
    try {
      setActionLoading(true);
      await countersAPI.pauseCounter(currentUser.counter_id, { reason });
      await loadCounters();
    } catch (error) {
      toast.error('❌ Lỗi tạm dừng');
    } finally {
      setActionLoading(false);
      setStopServiceModal({ isOpen: false, counterId: '', counterName: '' });
    }
  };

  const handleResumeCounter = async () => {
    if (!currentUser?.counter_id) return;
    try {
      setActionLoading(true);
      await countersAPI.resumeCounter(currentUser.counter_id);
      await loadCounters();
      const serving = await fetchServingTicket(currentUser.counter_id);
      setServingTicket(serving);
    } catch (error) {
      toast.error('❌ Lỗi mở lại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  const handlePauseCounter = () => {
    if (!currentUser?.counter_id || !counterData) return;
    setStopServiceModal({
      isOpen: true,
      counterId: currentUser.counter_id.toString(),
      counterName: counterData.counter_name,
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Đang tải thông tin người dùng...
      </div>
    );
  }

  if (!currentUser) {
    return <div className="min-h-screen">Không có người dùng</div>;
  }

  // 👉 Render phần giao diện như cũ ở đây...

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
        {!countersLoading && counterData && servingTicket !== undefined && (
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
