'use client';
import Image from 'next/image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import NumberAnimation from './NumberAnimation';
import { useWebSocketQueue } from '@/hooks/useWebSocketQueue';
import { footersAPI } from '@/libs/rootApi';
import { TTSService, type TTSService as TTSServiceType } from '@/libs/ttsService';
import { rootApi } from '@/libs/rootApi';

// ✅ Real API ticket interface based on actual BE response
interface RealTicket {
  id: number;
  number: number;
  counter_id: number;
  created_at: string;
  status: 'waiting' | 'called' | 'done';  // ✅ Updated status types
  called_at: string | null;
  finished_at: string | null;
}

// ✅ Processed counter data for TV display
interface ProcessedCounterData {
  counter_id: number;
  counter_name: string;
  serving_tickets: RealTicket[];      // Tickets with status 'called' 
  waiting_tickets: RealTicket[];      // Tickets with status 'waiting'
  serving_number: number | null;      // Current serving number (latest 'called')
  waiting_numbers: number[];          // Waiting numbers sorted by ID
  waiting_count: number;              // Total waiting count
}

// ✅ Counter API type
interface CounterAPI {
  id: number;
  name: string;
  is_active: boolean;
  status: string;
}

type FooterConfig = {
  workingHours: string;
  hotline: string;
};


export default function QueueDisplay() {
  // API lấy số đang phục vụ cho từng quầy
  const fetchServingTicket = async (counterId: number): Promise<RealTicket | null> => {
    try {
      const response = await rootApi.get(`/tickets/called`, { params: { counter_id: counterId, tenxa: 'phuonghagiang1' } });
      const tickets: RealTicket[] = response.data;
      return tickets.length > 0 ? tickets[0] : null;
    } catch (error) {
      console.error('❌ Failed to fetch serving ticket:', error);
      return null;
    }
  };
    // Lưu các ticket đã phát TTS (counterId-ticketNumber)
  const announcedTicketsRef = useRef<Set<string>>(new Set());
  // ✅ Safe TTS Service initialization
  const [ttsService, setTtsService] = useState<TTSServiceType | null>(null);
  
  // ✅ New state using ProcessedCounterData
  const [processedCounters, setProcessedCounters] = useState<ProcessedCounterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // ✅ WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling' | 'offline'>('offline');
  
  // ✅ NEW: WebSocket serving tickets state (independent from test-queue)
  const [wsServingTickets, setWsServingTickets] = useState<Record<number, {
    number: number;
    counter_name: string;
    called_at: string;
    source: string;
  }>>({});
  
  // Announcement states
  const [announcement, setAnnouncement] = useState<{
    ticketNumber: number;
    counterName: string;
    timestamp: string;
  } | null>(null);
  const [currentTTSAnnouncement, setCurrentTTSAnnouncement] = useState<any>(null);
  const [ttsQueueStatus, setTtsQueueStatus] = useState<any>({ queueLength: 0, isPlaying: false, upcomingRequests: [] });

  // WebSocket hook for real-time updates
  const { isConnected, lastEvent } = useWebSocketQueue();

  // Footer config state
  const DEFAULT_FOOTER = {
    workingHours: 'Giờ làm việc (Thứ 2 - Thứ 6): 07h30 - 17h00',
    hotline: 'Hotline hỗ trợ: 0916670793',
  };
  const [footerConfig, setFooterConfig] = React.useState<FooterConfig>(DEFAULT_FOOTER);

  // Fetch footer config on mount and listen for updates
  useEffect(() => {
    let ignore = false;
    async function fetchFooter() {
      try {
        const data = await footersAPI.getFooter('phuonghagiang1');
        if (!ignore && data && (data.work_time || data.hotline)) {
          setFooterConfig({
            workingHours: data.work_time || DEFAULT_FOOTER.workingHours,
            hotline: data.hotline || DEFAULT_FOOTER.hotline,
          });
        }
      } catch {
        setFooterConfig(DEFAULT_FOOTER);
      }
    }
    fetchFooter();
    // BroadcastChannel for cross-tab footer config sync
    let bc: BroadcastChannel | null = null;
    const handler = async () => {
      try {
        const data = await footersAPI.getFooter('phuonghagiang1');
        if (!ignore && data && (data.work_time || data.hotline)) {
          setFooterConfig({
            workingHours: data.work_time || footerConfig.workingHours,
            hotline: data.hotline || footerConfig.hotline,
          });
        }
      } catch {}
    };
    window.addEventListener('footerConfigUpdated', handler);
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('footerConfig');
      bc.onmessage = (event) => {
        if (event?.data === 'updated') handler();
      };
    }
    return () => {
      ignore = true;
      window.removeEventListener('footerConfigUpdated', handler);
      if (bc) bc.close();
    };
  }, []);

  // ✅ Initialize TTS Service on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const initTTS = async () => {
          const { TTSService } = await import('@/libs/ttsService');
          const tts = TTSService.getInstance();
          setTtsService(tts);
          console.log('✅ TTS Service initialized for TV display');
        };
        initTTS();
      } catch (error) {
        console.warn('⚠️ Failed to load TTS service:', error);
      }
    }
  }, []);

  // ✅ State: counters from API
  const [apiCounters, setApiCounters] = useState<CounterAPI[]>([]);

  // ✅ Fetch counters from API on mount
  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const response = await rootApi.get('/counters/', { params: { tenxa: 'phuonghagiang1' } });
        setApiCounters(response.data);
        console.log('✅ Counters from API:', response.data);
      } catch (error) {
        console.error('❌ Failed to fetch counters:', error);
        setApiCounters([]);
      }
    };
    fetchCounters();
  }, []);

  // ✅ Khởi tạo wsServingTickets khi đã có apiCounters (reload trang)
  useEffect(() => {
    const initServingTicketsOnLoad = async () => {
      if (apiCounters.length === 0) return;
      const servingState: Record<number, { number: number; counter_name: string; called_at: string; source: string }> = {};
      for (const counter of apiCounters) {
        try {
          const ticket = await fetchServingTicket(counter.id);
          if (ticket) {
            servingState[counter.id] = {
              number: ticket.number,
              counter_name: getCounterName(counter.id),
              called_at: ticket.called_at || new Date().toISOString(),
              source: 'init-api'
            };
          }
        } catch (err) {
          // ignore error for each counter
        }
      }
      setWsServingTickets(servingState);
    };
    initServingTicketsOnLoad();
  }, [apiCounters]);

  // ✅ Counter name mapping (API-driven)
  const getCounterName = (counterId: number): string => {
    const found = apiCounters.find(c => c.id === counterId);
    return found ? found.name : `Quầy ${counterId}`;
  };

  // ✅ Counter ID parsing from name (API-driven, strict match)
  const getCounterIdFromName = (counterName: string): number | null => {
    // So sánh tuyệt đối, loại bỏ fallback số quầy để tránh bug mapping
    const found = apiCounters.find(c => c.name.trim().toLowerCase() === counterName.trim().toLowerCase());
    return found ? found.id : null;
  };

  // ✅ Fetch all tickets from real API
  const fetchAllTickets = async (): Promise<RealTicket[]> => {
    try {
      console.log('🔄 Fetching all tickets from real API...');
      
      // GET /tickets/waiting - get all tickets (waiting + called + done)
      const response = await rootApi.get('/tickets/waiting', { params: { tenxa: 'phuonghagiang1' } });
      const tickets: RealTicket[] = response.data;
      
      console.log('📡 Real API Response:', tickets);
      console.log('📊 Tickets breakdown:', {
        total: tickets.length,
        waiting: tickets.filter(t => t.status === 'waiting').length,
        called: tickets.filter(t => t.status === 'called').length,
        done: tickets.filter(t => t.status === 'done').length
      });
      
      return tickets;
      
    } catch (error: any) {
      console.error('❌ Failed to fetch tickets:', error);
      
      // Fallback - try per counter if global endpoint fails
      console.log('🔄 Trying per-counter API calls...');
      const allTickets: RealTicket[] = [];
      
      for (let counterId = 1; counterId <= 4; counterId++) {
        try {
          const response = await rootApi.get('/tickets/waiting', { params: { counter_id: counterId, tenxa: 'phuonghagiang1' } });
          allTickets.push(...response.data);
        } catch (counterError) {
          console.warn(`⚠️ Failed to fetch tickets for counter ${counterId}:`, counterError);
        }
      }
      
      return allTickets;
    }
  };

  // ✅ Process tickets into counter groups với WebSocket serving state (API-driven counters)
  const processTicketsToCounters = (tickets: RealTicket[]): ProcessedCounterData[] => {
    console.log('🔧 Processing tickets into counter groups with WebSocket serving state...');
    const countersMap = new Map<number, ProcessedCounterData>();
    // Khởi tạo tất cả quầy từ API
    apiCounters.forEach(counterApi => {
      countersMap.set(counterApi.id, {
        counter_id: counterApi.id,
        counter_name: counterApi.name,
        serving_tickets: [],
        waiting_tickets: [],
        serving_number: null,
        waiting_numbers: [],
        waiting_count: 0
      });
    });
    // ✅ Filter out 'done' tickets và only process waiting tickets from API
    const waitingTickets = tickets.filter(ticket => ticket.status === 'waiting');
    console.log('📋 Waiting tickets from API:', waitingTickets);
    console.log('🎯 WebSocket serving tickets:', wsServingTickets);
    // Process waiting tickets
    waitingTickets.forEach(ticket => {
      const counter = countersMap.get(ticket.counter_id);
      if (!counter) return;
      counter.waiting_tickets.push(ticket);
    });
    // ✅ Process each counter data with WebSocket serving state
    countersMap.forEach(counter => {
      // Sort waiting tickets by ID (FIFO order)
      counter.waiting_tickets.sort((a, b) => a.id - b.id);
      counter.waiting_numbers = counter.waiting_tickets.map(t => t.number);
      counter.waiting_count = counter.waiting_tickets.length;
      // ✅ Get serving number from WebSocket state instead of API tickets
      const wsServing = wsServingTickets[counter.counter_id];
      if (wsServing) {
        counter.serving_number = wsServing.number;
        console.log(`🎯 Counter ${counter.counter_id} serving from WebSocket state: #${wsServing.number} (${wsServing.source})`);
      } else {
        console.log(`📭 Counter ${counter.counter_id} has no serving ticket in WebSocket state`);
      }
      console.log(`📊 Counter ${counter.counter_id} processed:`, {
        serving: counter.serving_number,
        waiting: counter.waiting_numbers,
        waitingCount: counter.waiting_count,
        wsServing: wsServing ? `#${wsServing.number}` : 'none'
      });
    });
    // Trả về danh sách quầy theo thứ tự id tăng dần
    return Array.from(countersMap.values()).sort((a, b) => a.counter_id - b.counter_id);
  };

  // ✅ Main data fetching và processing function
  const fetchAndProcessQueueData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setApiError(null);
      // Đảm bảo đã có apiCounters trước khi process
      if (apiCounters.length === 0) {
        setProcessedCounters([]);
        setIsLoading(false);
        return;
      }
      const tickets = await fetchAllTickets();
      const processedData = processTicketsToCounters(tickets);
      setProcessedCounters(processedData);
      setLastUpdated(new Date().toISOString());
      console.log('✅ Queue data updated:', processedData);
    } catch (error: any) {
      console.error('❌ Queue data fetch failed:', error);
      setApiError(error.message || 'Failed to fetch queue data');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCounters]);

  // ✅ Simplified: No need to re-process since we render directly from wsServingTickets
  // useEffect removed - direct rendering is more reliable

  // ✅ WebSocket real-time connection - No polling fallback
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectCount = 0;
    const maxReconnectAttempts = 5;
    
    // Initial fetch with loading
    fetchAndProcessQueueData(true);
    
    // ✅ Connect to REAL WebSocket endpoint from BE documentation
    const connectWebSocket = () => {
      try {
        console.log('🔌 Connecting to production WebSocket endpoint...');
        console.log('🌐 WebSocket URL: wss://detect-seat-we21.onrender.com/ws/updates');
        
        // ✅ REAL endpoint từ BE: wss://detect-seat-we21.onrender.com/ws/updates
        ws = new WebSocket('wss://detect-seat-we21.onrender.com/ws/updates');
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected to production endpoint');
          console.log('🔗 WebSocket readyState:', ws?.readyState);
          reconnectCount = 0;
          setWsConnected(true);
          setConnectionType('websocket');
        };
        
        ws.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);
            console.log('📡 WebSocket event received:', eventData);
            
            // ✅ Handle real events từ BE documentation
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
          console.warn('⚠️ WebSocket disconnected:', event.code, event.reason);
          setWsConnected(false);
          setConnectionType('offline');
          
          // Auto-reconnect with exponential backoff (no polling fallback)
          if (reconnectCount < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
            reconnectCount++;
            
            console.log(`🔄 WebSocket reconnecting attempt ${reconnectCount}/${maxReconnectAttempts} in ${delay/1000}s...`);
            setTimeout(connectWebSocket, delay);
          } else {
            console.error('❌ WebSocket max reconnection attempts reached');
            setConnectionType('offline');
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
    
    // ✅ Handle new_ticket event từ BE documentation
    const handleNewTicketEvent = async (eventData: { event: string, ticket_number: number, counter_id: number }) => {
      console.log('🎫 New ticket created via WebSocket:', eventData);
      
      // Refresh queue data sau khi có vé mới
      await fetchAndProcessQueueData(false);
      
      // Optional: Show brief notification
      console.log(`📢 New ticket #${eventData.ticket_number} created for counter ${eventData.counter_id}`);
    };
    
    // ✅ Handle ticket_called event từ BE documentation - UPDATED for WebSocket state
    const handleTicketCalledEvent = async (eventData: { event: string, ticket_number: number, counter_name: string }) => {
      console.log('📞 Ticket called via WebSocket:', eventData);
      const { ticket_number, counter_name } = eventData;
      const counterId = getCounterIdFromName(counter_name);
      console.log('🎯 Parsed counter ID from counter_name:', counterId, 'for name:', counter_name);

      if (!counterId || !ticket_number) return;

      // Key duy nhất cho mỗi quầy - vé
      const key = `${counterId}-${ticket_number}`;
      // Nếu đã phát rồi thì bỏ qua
      if (announcedTicketsRef.current.has(key)) {
        console.log(`⏩ Skip duplicate TTS: ${key}`);
        return;
      }

      // Nếu có currentCounter, chỉ phát cho đúng quầy hiện tại (nếu không có thì bỏ qua check này)
      // Giả sử currentCounter lấy từ processedCounters hoặc props/context tuỳ bạn, ở đây sẽ bỏ qua check này nếu không có

      // Đánh dấu đã phát
      announcedTicketsRef.current.add(key);

      // Gọi API lấy vé đang phục vụ cho quầy này
      const servingTicket = await fetchServingTicket(counterId);
      if (servingTicket) {
        setWsServingTickets(prev => ({
          ...prev,
          [counterId]: {
            number: servingTicket.number,
            counter_name: getCounterName(counterId),
            called_at: servingTicket.called_at || new Date().toISOString(),
            source: 'api-called'
          }
        }));
      }

      // Show announcement cho TV display
      setAnnouncement({
        ticketNumber: ticket_number,
        counterName: counter_name,
        timestamp: new Date().toISOString()
      });

      // TTS announcement nếu chưa phát
      if (ttsService) {
        try {
          await ttsService.queueAnnouncement(
            counterId,
            ticket_number,
            1, // First attempt
            'manual', // Source type: manual (từ WebSocket)
            new Date().toISOString()
          );
          console.log(`📢 TTS queued for Counter ${counterId} - Ticket ${ticket_number}`);
        } catch (error) {
          console.warn('⚠️ Failed to queue TTS:', error);
          // Xoá khỏi set nếu queue thất bại để retry sau
          announcedTicketsRef.current.delete(key);
        }
      }

      // Auto-hide announcement after 4 seconds
      setTimeout(() => setAnnouncement(null), 4000);

      // Refresh queue data sau khi gọi vé (waiting tickets will be updated)
      await fetchAndProcessQueueData(false);
    };
    
    // Start WebSocket connection
    connectWebSocket();
    
    // Listen for queue updates (WebSocket-first approach)
    const handleQueueUpdate = () => {
      console.log('🔔 Queue update event received, refreshing...');
      if (!wsConnected) {
        fetchAndProcessQueueData(false); // Only refresh if not using WebSocket
      }
    };
    
    // Listen for counter status updates (WebSocket-first approach)
    const handleCounterStatusUpdate = () => {
      console.log('🔔 Counter status update event received, refreshing...');
      if (!wsConnected) {
        fetchAndProcessQueueData(false); // Only refresh if not using WebSocket
      }
    };
    
    // Listen for call-next events from officer interface (always refresh)
    const handleCallNextEvent = (event: CustomEvent) => {
      console.log('🔔 Call-next event received:', event.detail);
      // Always refresh for officer actions (immediate feedback)
      fetchAndProcessQueueData(false);
    };
    
    // ✅ BACKUP: Listen for ticket called events from test-queue (fallback)
    const handleTicketCalledFromTestQueue = (event: CustomEvent) => {
      console.log('🔔 Backup: Ticket called event from test-queue:', event.detail);
      
      const { ticket_number, counter_name, counter_id } = event.detail;
      
      // Parse counter ID
      const counterId = counter_id || getCounterIdFromName(counter_name);
      
      if (counterId && ticket_number) {
        // ✅ Store serving ticket in WebSocket state (backup source)
        const servingTicket = {
          number: ticket_number,
          counter_name: counter_name,
          called_at: new Date().toISOString(),
          source: 'custom-event-backup'
        };
        
        console.log(`🎯 TV storing serving ticket from test-queue backup for counter ${counterId}:`, servingTicket);
        
        // ✅ Update WebSocket serving tickets state (backup)
        setWsServingTickets(prev => {
          const newState = {
            ...prev,
            [counterId]: servingTicket
          };
          console.log('📺 TV WebSocket serving state updated from backup:', {
            counterId,
            ticket: servingTicket,
            newState
          });
          return newState;
        });
        
        // Show announcement
        setAnnouncement({
          ticketNumber: ticket_number,
          counterName: counter_name,
          timestamp: new Date().toISOString()
        });

        // Auto-hide announcement after 4 seconds
        setTimeout(() => setAnnouncement(null), 4000);
      }
      
      // Refresh queue data
      fetchAndProcessQueueData(false);
    };
    
    // Listen for ticket announcements from WebSocket
    const handleTicketAnnouncement = (event: CustomEvent) => {
      const { ticketNumber, counterName, timestamp } = event.detail;
      console.log('📺 TV received announcement:', { ticketNumber, counterName });
      
      setAnnouncement({ ticketNumber, counterName, timestamp });
      setCurrentTTSAnnouncement(null); // Clear TTS to ensure only 1 banner
      // Auto-hide announcement after 4 seconds
      setTimeout(() => {
        setAnnouncement(null);
      }, 4000);
    };

    // TTS announcement handler
    const handleTTSAnnouncement = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentTTSAnnouncement(customEvent.detail);
      setAnnouncement(null); // Clear announcement to ensure only 1 banner
      // Hide announcement after 4 seconds
      setTimeout(() => setCurrentTTSAnnouncement(null), 4000);
    };
    
    // Event listeners
    window.addEventListener('queueUpdated', handleQueueUpdate);
    window.addEventListener('counterStatusUpdated', handleCounterStatusUpdate);
    window.addEventListener('counterQueueUpdated', handleQueueUpdate);
    window.addEventListener('callNextTriggered', handleCallNextEvent as EventListener);
    window.addEventListener('ticketAnnouncement', handleTicketAnnouncement as EventListener);
    window.addEventListener('ttsAnnouncement', handleTTSAnnouncement);
    window.addEventListener('ticketCalled', handleTicketCalledFromTestQueue as EventListener);
    
    return () => {
      // Cleanup WebSocket connection
      if (ws) {
        console.log('🔌 Closing WebSocket connection...');
        ws.close();
        ws = null;
      }
      
      // Cleanup event listeners
      window.removeEventListener('queueUpdated', handleQueueUpdate);
      window.removeEventListener('counterStatusUpdated', handleCounterStatusUpdate);
      window.removeEventListener('counterQueueUpdated', handleQueueUpdate);
      window.removeEventListener('callNextTriggered', handleCallNextEvent as EventListener);
      window.removeEventListener('ticketAnnouncement', handleTicketAnnouncement as EventListener);
      window.removeEventListener('ttsAnnouncement', handleTTSAnnouncement);
      window.removeEventListener('ticketCalled', handleTicketCalledFromTestQueue as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAndProcessQueueData]); // Intentionally limited dependencies

  // TTS status + tự động phát lại lượt 2 sau khi hết lượt đầu
  useEffect(() => {
  if (!ttsService) return;

  // Lưu trạng thái đã phát lại lượt 2 để không lặp vô hạn
  const replayedSecondRoundRef = { current: false };

  // Update TTS queue status (safe check for ttsService)
  const updateTTSStatus = () => {
    if (ttsService && typeof ttsService.getQueueStatus === 'function') {
      try {
        const status = ttsService.getQueueStatus();
        setTtsQueueStatus(status);

        // Nếu queue rỗng, không còn phát, chưa phát lại lượt 2 thì phát lại lượt 2
        if (
          status.queueLength === 0 &&
          !status.isPlaying &&
          !replayedSecondRoundRef.current &&
          announcedTicketsRef.current.size > 0
        ) {
          // Phát lại lượt 2 cho tất cả vé đã phát lượt 1, đúng thứ tự, có delay giữa các vé
          const tickets = Array.from(announcedTicketsRef.current).map(key => {
            const [counterId, ticketNumber] = key.split('-');
            return { counterId: Number(counterId), ticketNumber: Number(ticketNumber) };
          });

          // Hàm phát lại lượt 2 tuần tự, mỗi vé cách nhau 1 giây, và timestamp tăng dần
          const replaySecondRound = async () => {
            replayedSecondRoundRef.current = true;
            let now = Date.now();
            for (const { counterId, ticketNumber } of tickets) {
              // Tạo timestamp tăng dần cho từng vé lượt 2
              now += 1000; // mỗi vé cách nhau 1 giây
              await ttsService.queueAnnouncement(
                counterId,
                ticketNumber,
                2,
                'manual',
                new Date(now).toISOString()
              );
              await new Promise(res => setTimeout(res, 1000)); // delay 1s giữa các vé
            }
            console.log('🔁 Đã tự động phát lại lượt 2 cho tất cả vé (có delay và timestamp tăng dần)');
          };
          replaySecondRound();
        }
      } catch (error) {
        console.warn('⚠️ Failed to get TTS queue status:', error);
      }
    }
  };

  // TTS status update interval - only when ttsService is available
  const ttsInterval = setInterval(updateTTSStatus, 1000);

  return () => {
    clearInterval(ttsInterval);
  };
}, [ttsService]);

  // ✅ Calculate stats from processed data
  const totalServing = processedCounters.filter(c => c.serving_number !== null).length;
  const totalWaiting = processedCounters.reduce((sum, c) => sum + c.waiting_count, 0);

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-2xl">Đang tải dữ liệu hàng đợi...</div>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (apiError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-2xl mb-4">Lỗi kết nối API</div>
          <div className="text-lg text-red-300 mb-6">{apiError}</div>
          <button 
            onClick={() => fetchAndProcessQueueData(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white"
      style={{
        backgroundImage: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 0%)',
        
      }}
    >
      {/* Only one banner at a time: ưu tiên currentTTSAnnouncement, nếu không thì announcement */}
      {(currentTTSAnnouncement || announcement) && (
        <div className="fixed top-0 left-0 right-0 z-50 text-white text-center py-4 shadow-lg bg-red-600 animate-pulse">
          <div className="font-bold flex items-center justify-center gap-4 text-3xl">
            <span className="animate-bounce">🔊</span>
            <span>
              {currentTTSAnnouncement
                ? `MỜI KHÁCH HÀNG SỐ ${currentTTSAnnouncement.ticketNumber} ĐẾN QUẦY ${currentTTSAnnouncement.counterId}`
                : `MỜI KHÁCH HÀNG SỐ  ${announcement?.ticketNumber} ĐẾN QUẦY ${announcement?.counterName}`}
            </span>
          </div>
          <div className="text-sm mt-1 opacity-75">
            {currentTTSAnnouncement
              ? ''
              : `Thời gian: ${announcement ? new Date(announcement.timestamp).toLocaleTimeString('vi-VN') : ''}`}
          </div>
        </div>
      )}

      {/* TTS Queue Status Bar */}
      {ttsQueueStatus.queueLength > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-400 text-black text-center py-2 text-sm">
          <div className="flex items-center justify-center gap-4">
            <span>🎵 Hàng đợi phát thanh: {ttsQueueStatus.queueLength} thông báo</span>
            
            {/* Show upcoming announcements */}
            {ttsQueueStatus.upcomingRequests.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span>📋 Tiếp theo:</span>
                {ttsQueueStatus.upcomingRequests.slice(0, 3).map((req: any, index: number) => (
                  <span key={`tts-upcoming-${req.ticketNumber}-${req.counterId}-${index}`} className={`px-2 py-1 rounded ${
                    req.source === 'manual' ? 'bg-green-200' : 'bg-blue-200'
                  }`}>
                    #{req.ticketNumber} → Q{req.counterId}
                  </span>
                ))}
              </div>
            )}
            
            {ttsQueueStatus.isPlaying && (
              <span className="animate-pulse bg-yellow-300 px-2 py-1 rounded">
                🔊 Đang phát...
              </span>
            )}
          </div>
        </div>
      )}

      <div 
        className="flex items-center justify-center"
        style={{ backgroundColor: '' }}
      >
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo_vang.png" 
            alt="logo_vang" 
            width={240}
            height={240}
            className="w-60 h-60 object-contain"
            unoptimized
          />
          <div style={{ marginLeft: '15px'  }}>
            <h1 className="text-5xl font-bold text-red-700 " style={{ lineHeight: '1.5' }}>
              TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG  
            </h1>
            <h1 className="text-5xl font-bold text-red-700 " style={{ lineHeight: '1.3' }}>
              PHƯỜNG HÀ GIANG 1
            </h1>
            <p className='text-2xl font-extrabold text-red-700 mt-3' style={{fontSize: '2rem'}}>
              Hành chính phục vụ 
            </p>
          </div>
        </div>
      </div>
      <>
        <div className="flex justify-between items-center" style={{flexDirection: 'row-reverse'}}>
          <h2 className="text-2xl text-red-700 font-bold italic" style={{position: 'relative',top: '-50px',left: '-180px', fontSize: '2rem'}}>
            Phường Hà Giang 1,  Ngày {new Date().toLocaleDateString('vi-VN')}
          </h2>
        </div>
      </>

      {/* Main Display dạng bảng giống mẫu */}
      <div className="flex-1 p-4 flex flex-col items-center" style={{position: 'relative',top: '-37px'}}>
        <div className="w-full" style={{maxWidth: 1500}}>
          {/* Header table */}
          <div className="grid" style={{gridTemplateColumns: '1.5fr 1fr 1fr', fontSize: '2rem'}}>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 rounded-tl-xl uppercase tracking-wide">QUẦY PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 uppercase tracking-wide">ĐANG PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 rounded-tr-xl uppercase tracking-wide">ĐANG CHỜ</div>
          </div>
          {/* Table body */}
          {processedCounters.map((counter, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div key={counter.counter_id} className={`grid border-b border-white last:rounded-b-xl ${isEven ? 'bg-gray-300 bg-opacity-80' : 'bg-pink-100  bg-opacity-80'}`} style={{minHeight: 110, alignItems: 'center', gridTemplateColumns: '1.5fr 1fr 1fr'}}>
                {/* Quầy phục vụ */}
                <div className="text-xl font-extrabold text-red-800 px-4 py-3 border-r border-white uppercase" style={{fontSize: '1.7rem'}}>
                  QUẦY {counter.counter_id} | {counter.counter_name}
                </div>
                {/* Đang phục vụ - logic cũ: nếu có số thì hiển thị, không thì hiện 'Chưa có số được phục vụ' */}
                <div className="text-6xl font-extrabold text-center text-red-800 px-4 py-3 border-r border-white"  >
                  {counter.serving_number || wsServingTickets[counter.counter_id] ? (
                    <NumberAnimation number={(counter.serving_number || wsServingTickets[counter.counter_id]?.number)?.toString() || '0'} />
                  ) : (
                    <span className="text-gray-400 text-xl font-bold">Chưa có số được phục vụ</span>
                  )}
                </div>
                {/* Đang chờ */}
                <div className="text-4xl font-extrabold text-center text-red-800 px-4 py-3">
                  {counter.waiting_numbers.length > 0 ? (
                    <>
                      {counter.waiting_numbers.slice(0, 6).map((number, index) => (
                        <span key={`waiting-${counter.counter_id}-${number}-${index}`}>{number}{index < Math.min(counter.waiting_numbers.length - 1, 5) ? ', ' : ''}</span>
                      ))}
                      {counter.waiting_numbers.length > 6 && (
                        <span className="text-base text-gray-500 font-normal"> ... </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-xl font-bold">Không có số đang chờ</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white p-4 text-center fixed bottom-0 left-0 w-full z-40">
        <div className="flex justify-center items-center gap-8 text-lg italic text-red-700 font-extrabold"
          style={{fontSize: '2rem'}}
        >
          <span> {footerConfig.workingHours}</span>
          <span> Hotline: {footerConfig.hotline} </span>
          {lastUpdated && (
            <span className="text-lg text-red-700 font-extrabold" style={{fontSize: '2rem'}}>
              Thời gian: {new Date().toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
      </footer>

    </div>
  );
}
