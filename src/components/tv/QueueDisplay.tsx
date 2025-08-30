'use client';

import Image from 'next/image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketQueue } from '@/hooks/useWebSocketQueue';
import CounterRow from './CounterRow';
import { TTSService, type TTSService as TTSServiceType } from '@/libs/ttsService';
import { rootApi, countersAPI, configAPI, tvGroupsAPI } from '@/libs/rootApi';

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

type config = {
  workingHours: string;
  hotline: string;
  header:string
};


const DEFAULT_CONFIG = {
  header: 'XÃ BẠCH NGỌC',
  workingHours: 'Giờ làm việc (Thứ 2 - Thứ 6): 07h30 - 17h00',
  hotline: 'Hotline hỗ trợ: 02191022',
};

export default function QueueDisplay() {
  // API lấy số đang phục vụ cho từng quầy
  const fetchServingTicket = async (counterId: number): Promise<RealTicket | null> => {
    try {
      const response = await rootApi.get(`/tickets/called`, { params: { counter_id: counterId, tenxa: 'xabachngoc' } });
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
  // Ref mirror to avoid stale-closure issues when events fire fast
  const processedCountersRef = useRef<ProcessedCounterData[]>([]);
  useEffect(() => {
    processedCountersRef.current = processedCounters;
  }, [processedCounters]);
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

  // ✅ Optional filter: when TV opened with ?groupId= the display will only show those counters
  const [allowedCounterIds, setAllowedCounterIds] = useState<number[] | null>(null);
  
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

  const [config, setconfig] = React.useState<config>(DEFAULT_CONFIG);


  // Fetch footer config on mount and listen for updates
  const fetchConfig = useCallback(async () => {
    try {
      const data = await configAPI.getConfig('xabachngoc');
      if (data && (data.work_time || data.hotline)) {
        setconfig({
          workingHours: data.work_time || DEFAULT_CONFIG.workingHours,
          hotline: data.hotline || DEFAULT_CONFIG.hotline,
          header: data.header || DEFAULT_CONFIG.header,
        });
      }
    } catch {
      setconfig(DEFAULT_CONFIG);
    }
  }, []);

  // ====== Hàm handleSaveConfig sử dụng API setConfig ======
  async function handleSaveConfig(newConfig: { header: string; work_time: string; hotline: string }, onSuccess?: () => void, onError?: (err: any) => void) {
    try {
      // Đảm bảo truyền đủ header cho BE
      await configAPI.setConfig('xabachngoc', {
        work_time: newConfig.work_time,
        hotline: newConfig.hotline,
        header: newConfig.header
      });
      if (onSuccess) onSuccess();
      // Có thể phát sự kiện cập nhật nếu cần: window.dispatchEvent(new Event('configUpdated'));
    } catch (err) {
      if (onError) onError(err);
    }
  }

  // ✅ Initialize TTS Service on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const initTTS = async () => {
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
  const fetchCounters = useCallback(async () => {
      try {
        const response = await rootApi.get('/counters/', { params: { tenxa: 'xabachngoc' } });
        setApiCounters(response.data);
        console.log('✅ Counters from API:', response.data);
      } catch (error) {
        console.error('❌ Failed to fetch counters:', error);
        setApiCounters([]);
      }
    }, []);
  // ✅ Fetch counters and configs from API on mount
  useEffect(() => {
    fetchCounters();
    fetchConfig();
  }, [fetchCounters, fetchConfig]);

  // ✅ Counter name mapping (API-driven)
  const getCounterName = useCallback((counterId: number): string => {
    const found = apiCounters.find(c => c.id === counterId);
    return found ? found.name : `Quầy ${counterId}`;
  }, [apiCounters]);

  // Load TV group if groupId query param present and set allowedCounterIds
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const gid = params.get('groupId');
    if (!gid) {
      setAllowedCounterIds(null);
      return;
    }
    const id = parseInt(gid as string, 10);
    if (isNaN(id)) {
      setAllowedCounterIds(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const group = await tvGroupsAPI.getGroup(id);
        if (!mounted) return;
        console.log('[TV Groups] loaded group for TV display:', group);
        setAllowedCounterIds(group.counter_ids || []);
      } catch (err) {
        console.warn('[TV Groups] failed to load group', err);
        if (mounted) setAllowedCounterIds(null);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // ✅ Khởi tạo wsServingTickets khi đã có apiCounters (reload trang)
  useEffect(() => {
    const initServingTicketsOnLoad = async () => {
      if (apiCounters.length === 0) return;
      const servingState: Record<number, { number: number; counter_name: string; called_at: string; source: string }> = {};
      const countersToInit = allowedCounterIds ? apiCounters.filter(c => allowedCounterIds.includes(c.id)) : apiCounters;
      for (const counter of countersToInit) {
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
  }, [apiCounters, allowedCounterIds, getCounterName]);



  // ✅ Fetch all tickets from real API
  const fetchAllTickets = async (): Promise<RealTicket[]> => {
    try {
      console.log('🔄 Fetching all tickets from real API...');
      
      // GET /tickets/waiting - get all tickets (waiting + called + done)
      const response = await rootApi.get('/tickets/waiting', { params: { tenxa: 'xabachngoc' } });
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
          const response = await rootApi.get('/tickets/waiting', { params: { counter_id: counterId, tenxa: 'xabachngoc' } });
          allTickets.push(...response.data);
        } catch (counterError) {
          console.warn(`⚠️ Failed to fetch tickets for counter ${counterId}:`, counterError);
        }
      }
      
      return allTickets;
    }
  };

  // ✅ Process tickets into counter groups với WebSocket serving state (API-driven counters)
    const processTicketsToCounters = useCallback((tickets: RealTicket[]): ProcessedCounterData[] => {
    console.log('🔧 Processing tickets into counter groups with WebSocket serving state...');
    const countersMap = new Map<number, ProcessedCounterData>();
    // Khởi tạo quầy từ API (apply group filter if present)
    const sourceCounters = allowedCounterIds ? apiCounters.filter(c => allowedCounterIds.includes(c.id)) : apiCounters;
    sourceCounters.forEach(counterApi => {
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
  }, [apiCounters, wsServingTickets, allowedCounterIds]);

  // ✅ Main data fetching và processing function
  const fetchAndProcessQueueData = useCallback(async (showLoading = false) => {
    try {
      
      setApiError(null);
      // Đảm bảo đã có apiCounters trước khi process
      if (apiCounters.length === 0) {
        setProcessedCounters([]);
        
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
  }, [apiCounters, processTicketsToCounters]);

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
        console.log('🌐 WebSocket URL: wss://detect-seat.onrender.com/ws/updates');
        
        // ✅ REAL endpoint từ BE: wss://detect-seat.onrender.com/ws/updates
        ws = new WebSocket('wss://lstd.onrender.com/ws/updates');
        
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
            if (eventData.tenxa !== 'xabachngoc') return
            // ✅ Handle real events từ BE documentation
            switch (eventData.event) {
              case 'new_ticket':
                handleNewTicketEvent(eventData);
                break;
                
              case 'ticket_called':
                handleTicketCalledEvent(eventData);
                break;
            
              case 'upsert_counter':
                fetchCounters()
                break;

              case 'delete_counter':
                fetchCounters()
                break;
              
              case 'update_config':
                fetchConfig()
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
    
    // ✅ Handle new_ticket event từ BE documentation - optimized to avoid full re-render
    const handleNewTicketEvent = async (eventData: { event: string, ticket_number: number, counter_id: number }) => {
      console.log('🎫 New ticket created via WebSocket:', eventData);

      const { ticket_number, counter_id } = eventData;
      const cid = typeof counter_id === 'number' ? counter_id : null;

      // If counters not initialized or counter id missing -> fallback to full refresh
      if (!cid || processedCountersRef.current.length === 0) {
        await fetchAndProcessQueueData(false);
        console.log(`📢 Fallback full refresh for new ticket #${ticket_number} (counter ${counter_id})`);
        return;
      }

      // Early exit if ticket already present (use ref to avoid stale closure)
      const existingCounterRef = processedCountersRef.current.find(c => c.counter_id === cid);
      if (existingCounterRef && existingCounterRef.waiting_numbers.includes(ticket_number)) {
        console.log(`ℹ️ Ticket #${ticket_number} already present in counter ${cid}, skipping`);
        return;
      }

      // Local functional update: only change the affected counter
      setProcessedCounters(prev => {
        if (!prev || prev.length === 0) return prev;
        const idx = prev.findIndex(c => c.counter_id === cid);
        if (idx === -1) {
          // unknown counter -> fallback asynchronously
          setTimeout(() => fetchAndProcessQueueData(false), 0);
          return prev;
        }

        const target = prev[idx];
        // double-check duplicate protection
        if (target.waiting_numbers.includes(ticket_number)) return prev;

        const newWaiting = [...target.waiting_numbers, ticket_number];
        const newCounter = { ...target, waiting_numbers: newWaiting, waiting_count: newWaiting.length };

        const next = prev.slice();
        next[idx] = newCounter;
        console.log(`📢 Locally appended new ticket #${ticket_number} to counter ${cid}`);
        return next;
      });
    };
    
    // ✅ Handle ticket_called event từ BE documentation - UPDATED for WebSocket state
    const handleTicketCalledEvent = async (eventData: { event: string, ticket_number: number | null, counter_name: string, counter_id?: number }) => {
      console.log('📞 [TTS DEBUG] Ticket called via WebSocket:', eventData, 'ttsService:', !!ttsService);
      const { ticket_number, counter_name, counter_id } = eventData;
      const counterId = typeof counter_id === 'number' ? counter_id : null;
      console.log('🎯 [TTS DEBUG] Using counter_id from event:', counterId, 'for name:', counter_name, 'and counter_id:', counter_id);

      if (!counterId) {
        console.warn('[TTS DEBUG] counterId is null, skip TTS');
        return;
      }

      // Nếu ticket_number là null => clear số đang phục vụ
      if (ticket_number == null) {
        setWsServingTickets(prev => {
          const newState = { ...prev };
          delete newState[counterId];
          return newState;
        });
        setAnnouncement(null);
        await fetchAndProcessQueueData(false);
        return;
      }

      // Key duy nhất cho mỗi quầy - vé
      const key = `${counterId}-${ticket_number}`;
      // Nếu đã phát rồi thì bỏ qua
      if (announcedTicketsRef.current.has(key)) {
        console.log(`[TTS DEBUG] ⏩ Skip duplicate TTS: ${key}`);
        return;
      }

      // Đánh dấu đã phát
      announcedTicketsRef.current.add(key);
      console.log(`[TTS DEBUG] Marked as announced: ${key}`);

      // Immediately store the serving ticket from the event so UI updates fast
      setWsServingTickets(prev => ({
        ...prev,
        [counterId]: {
          number: ticket_number as number,
          counter_name: counter_name || getCounterName(counterId),
          called_at: new Date().toISOString(),
          source: 'ws-event'
        }
      }));

      // Also call API to reconcile/confirm and update state when API returns
      try {
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
      } catch (err) {
        // ignore API error - we already showed event value
      }

      // Show announcement cho TV display
      setAnnouncement({
        ticketNumber: ticket_number,
        counterName: counter_name,
        timestamp: new Date().toISOString()
      });

      // TTS announcement: get instance at call-time to avoid stale closure/null state
      try {
        const tts = TTSService.getInstance();
        if (tts) {
          console.log('[TTS DEBUG] Calling tts.queueAnnouncement', { counterId, ticket_number });
          await tts.queueAnnouncement(
            counterId,
            ticket_number,
            1, // First attempt
            'manual', // Source type: manual (từ WebSocket)
            new Date().toISOString()
          );
          console.log(`[TTS DEBUG] 📢 TTS queued for Counter ${counterId} - Ticket ${ticket_number}`);
        } else {
          console.warn('[TTS DEBUG] TTSService.getInstance() returned null, cannot queue TTS');
          // Remove mark so we can retry later when TTS becomes available
          announcedTicketsRef.current.delete(key);
        }
      } catch (error) {
        console.warn('[TTS DEBUG] ⚠️ Failed to queue TTS:', error);
        // Remove mark so we can retry later when TTS fails
        announcedTicketsRef.current.delete(key);
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
      const counterId = typeof counter_id === 'number' ? counter_id : null;
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

  // TTS status: chỉ cập nhật trạng thái queue để hiển thị, không tự động phát lại lượt 2 ở đây nữa
  useEffect(() => {
    if (!ttsService) return;

    const updateTTSStatus = () => {
      if (ttsService && typeof ttsService.getQueueStatus === 'function') {
        try {
          const status = ttsService.getQueueStatus();
          setTtsQueueStatus(status);
        } catch (error) {
          console.warn('⚠️ Failed to get TTS queue status:', error);
        }
      }
    };

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
      {/* {ttsQueueStatus.queueLength > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-400 text-black text-center py-2 text-sm">
          <div className="flex items-center justify-center gap-4">
            <span>🎵 Hàng đợi phát thanh: {ttsQueueStatus.queueLength} thông báo</span>
            
            Show upcoming announcements
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
      )} */}

      <div 
        className="flex items-center justify-center"
        style={{ backgroundColor: '' }}
      >
        <div className="flex items-center gap-2" style={{marginTop: '-22px', position: 'relative'}}>
          <Image
            src="/images/logo_vang.png" 
            alt="logo_vang" 
            width={240}
            height={240}
            className="w-48 h-56 object-contain"
            unoptimized
          />
          <div style={{ marginLeft: '15px'  }}>
            <h1 className="text-5xl font-bold text-red-700" style={{ lineHeight: '1.5' }}>
              TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG
            </h1>
            <h1 className="text-5xl font-bold text-red-700" style={{ lineHeight: '1.3' }}>
              {config.header}
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
             {/* <span>{new Date().toLocaleTimeString('vi-VN')}</span> - Xã Hùng An,  Ngày {new Date().toLocaleDateString('vi-VN')} */}
             Xã Bạch Ngọc,  Ngày {new Date().toLocaleDateString('vi-VN')}
          </h2>
        </div>
      </>

      {/* Main Display dạng bảng giống mẫu */}
      <div className="flex-1 p-4 flex flex-col items-center" style={{position: 'relative',top: '0px'}}>
        <div className="w-full" style={{maxWidth: 1700}}>
          {/* Header table */}
          <div className="grid" style={{gridTemplateColumns: '1.8fr 0.8fr 0.8fr', fontSize: '1.5rem'}}>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 rounded-tl-xl uppercase tracking-wide">QUẦY PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 uppercase tracking-wide">ĐANG PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4  font-bold border border-white border-b-0 rounded-tr-xl uppercase tracking-wide">ĐANG CHỜ</div>
          </div>
          {/* Table body */}
          {(() => {
            const n = processedCounters.length;
            const minHeight = n >= 4 && n <= 8 ? Math.floor(640 / n) : 80;
            return processedCounters.map((counter, idx) => {
              const isEven = idx % 2 === 0;

              // derive stable primitives for child props
              // Prefer real-time WebSocket state so UI reflects incoming events immediately
              const servingNumber = (wsServingTickets[counter.counter_id]?.number ?? counter.serving_number) ?? null;
              const waitingPreview = counter.waiting_numbers.slice(0, 4);

              return (
                <CounterRow
                  key={counter.counter_id}
                  counterId={counter.counter_id}
                  counterName={counter.counter_name}
                  servingNumber={servingNumber}
                  waitingNumbers={waitingPreview}
                  isEven={isEven}
                  minHeight={minHeight}
                />
              );
            });
          })()}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white p-4 text-center fixed bottom-0 left-0 w-full z-40">
        <div className="flex justify-center items-center gap-8 text-lg italic text-red-700 font-extrabold"
          style={{fontSize: '2rem'}}
        >
          <span> {config.workingHours}</span>
          <span> {config.hotline} </span>
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