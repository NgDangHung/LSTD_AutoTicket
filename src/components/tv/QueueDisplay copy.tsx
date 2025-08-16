'use client';
import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import NumberAnimation from './NumberAnimation';
import { useWebSocketQueue } from '@/hooks/useWebSocketQueue';
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

export default function QueueDisplay() {
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

  // ✅ Counter name mapping (both directions)
  const getCounterName = (counterId: number): string => {
    const counterNames: Record<number, string> = {
      1: 'Tư pháp',
      2: 'Kinh tế - Hạ tầng - Đô Thị', 
      3: 'Văn phòng đăng ký đất đai',
      4: 'Văn hóa - Xã hội'
    };
    return counterNames[counterId] || `Quầy ${counterId}`;
  };

  // ✅ Enhanced counter ID parsing from counter name
  const getCounterIdFromName = (counterName: string): number | null => {
    // Direct mapping từ actual counter names
    const nameToIdMap: Record<string, number> = {
      'Tư pháp': 1,
      'Kinh tế - Hạ tầng - Đô Thị': 2,
      'Văn phóng đăng ký đất đai': 3,
      'Văn phòng đăng ký đất đai': 3, // Alternative spelling
      'Văn hóa - Xã hội': 4
    };
    
    // ✅ Exact match first
    if (nameToIdMap[counterName]) {
      console.log(`✅ Exact match found: "${counterName}" -> ${nameToIdMap[counterName]}`);
      return nameToIdMap[counterName];
    }
    
    // ✅ Fallback: Extract number từ "Quầy X" format
    const counterIdMatch = counterName.match(/(?:Quầy\s*)?(\d+)/i);
    if (counterIdMatch) {
      const id = parseInt(counterIdMatch[1]);
      console.log(`✅ Regex match found: "${counterName}" -> ${id}`);
      return id;
    }
    
    // ✅ Additional fuzzy matching for common variations
    const lowerName = counterName.toLowerCase().trim();
    if (lowerName.includes('tư pháp') || lowerName.includes('tu phap')) return 1;
    if (lowerName.includes('kinh tế') || lowerName.includes('kinh te') || lowerName.includes('hạ tầng')) return 2;
    if (lowerName.includes('đất đai') || lowerName.includes('dat dai') || lowerName.includes('đăng ký đất')) return 3;
    if (lowerName.includes('văn hóa') || lowerName.includes('van hoa') || lowerName.includes('xã hội')) return 4;
    
    console.warn('⚠️ Could not parse counter ID from:', counterName);
    return null;
  };

  // ✅ Fetch all tickets from real API
  const fetchAllTickets = async (): Promise<RealTicket[]> => {
    try {
      console.log('🔄 Fetching all tickets from real API...');
      
      // GET /tickets/waiting - get all tickets (waiting + called + done)
      const response = await rootApi.get('/tickets/waiting');
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
          const response = await rootApi.get(`/tickets/waiting?counter_id=${counterId}`);
          allTickets.push(...response.data);
        } catch (counterError) {
          console.warn(`⚠️ Failed to fetch tickets for counter ${counterId}:`, counterError);
        }
      }
      
      return allTickets;
    }
  };

  // ✅ Process tickets into counter groups với WebSocket serving state
  const processTicketsToCounters = (tickets: RealTicket[]): ProcessedCounterData[] => {
    console.log('🔧 Processing tickets into counter groups with WebSocket serving state...');
    
    const countersMap = new Map<number, ProcessedCounterData>();
    
    // Initialize all counters (1-4)
    for (let counterId = 1; counterId <= 4; counterId++) {
      countersMap.set(counterId, {
        counter_id: counterId,
        counter_name: getCounterName(counterId),
        serving_tickets: [],
        waiting_tickets: [],
        serving_number: null,
        waiting_numbers: [],
        waiting_count: 0
      });
    }
    
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
    
    return Array.from(countersMap.values()).sort((a, b) => a.counter_id - b.counter_id);
  };

  // ✅ Main data fetching và processing function
  const fetchAndProcessQueueData = useCallback(async (showLoading = false) => {
    try {
      // Only show loading on initial load, not on polling updates
      if (showLoading) {
        setIsLoading(true);
      }
      setApiError(null);
      
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
  }, []); // No dependencies needed

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
        console.log('🌐 WebSocket URL: wss://lstd.onrender.com/ws/updates');
        
        // ✅ REAL endpoint từ BE: wss://lstd.onrender.com/ws/updates
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
      console.log('🔍 Parsing counter name:', eventData.counter_name);
      
      // ✅ Parse counter ID using mapping function
      const counterId = getCounterIdFromName(eventData.counter_name);
      console.log('🎯 Parsed counter ID:', counterId);
      
      if (counterId && eventData.ticket_number) {
        // ✅ Store serving ticket in WebSocket state
        const servingTicket = {
          number: eventData.ticket_number,
          counter_name: eventData.counter_name,
          called_at: new Date().toISOString(),
          source: 'websocket-production'
        };
        
        console.log(`🎯 TV storing serving ticket via WebSocket for counter ${counterId}:`, servingTicket);
        
        // ✅ Update WebSocket serving tickets state
        setWsServingTickets(prev => {
          const newState = {
            ...prev,
            [counterId]: servingTicket
          };
          console.log('📺 TV WebSocket serving state updated:', {
            counterId,
            ticket: servingTicket,
            newState
          });
          return newState;
        });
        
        // ✅ Show announcement cho TV display
        setAnnouncement({
          ticketNumber: eventData.ticket_number,
          counterName: eventData.counter_name,
          timestamp: new Date().toISOString()
        });
        
        // ✅ TTS announcement if available
        if (ttsService) {
          try {
            await ttsService.queueAnnouncement(
              counterId,
              eventData.ticket_number,
              1, // First attempt
              'manual', // Source type: manual (từ WebSocket)
              new Date().toISOString()
            );
          } catch (error) {
            console.warn('⚠️ TTS announcement failed:', error);
          }
        }
        
        // Auto-hide announcement after 10 seconds
        setTimeout(() => setAnnouncement(null), 10000);
        
      } else {
        console.warn('⚠️ Invalid ticket_called data:', { counterId, ticketNumber: eventData.ticket_number, counterName: eventData.counter_name });
      }
      
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
        
        // Auto-hide announcement after 10 seconds
        setTimeout(() => setAnnouncement(null), 10000);
      }
      
      // Refresh queue data
      fetchAndProcessQueueData(false);
    };
    
    // Listen for ticket announcements from WebSocket
    const handleTicketAnnouncement = (event: CustomEvent) => {
      const { ticketNumber, counterName, timestamp } = event.detail;
      console.log('📺 TV received announcement:', { ticketNumber, counterName });
      
      setAnnouncement({ ticketNumber, counterName, timestamp });
      
      // Auto-hide announcement after 10 seconds
      setTimeout(() => {
        setAnnouncement(null);
      }, 10000);
    };

    // TTS announcement handler
    const handleTTSAnnouncement = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentTTSAnnouncement(customEvent.detail);
      
      // Hide announcement after 8 seconds
      setTimeout(() => setCurrentTTSAnnouncement(null), 8000);
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

  // Separate useEffect for TTS status updates
  useEffect(() => {
    if (!ttsService) return;

    // Update TTS queue status (safe check for ttsService)
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
      {/* Announcement Banner */}
      {announcement && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-4 animate-pulse">
          <div className="text-2xl font-bold">
            🔊 MỜI SỐ {announcement.ticketNumber} ĐẾN {announcement.counterName}
          </div>
          <div className="text-sm mt-1 opacity-75">
            Thời gian: {new Date(announcement.timestamp).toLocaleTimeString('vi-VN')}
          </div>
        </div>
      )}

      {/* TTS Announcement Banner */}
      {currentTTSAnnouncement && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-4 shadow-lg">
          <div className="text-3xl font-bold flex items-center justify-center gap-4">
            <span className="animate-bounce">📢</span>
            <span>
              MỜI KHÁCH HÀNG SỐ {currentTTSAnnouncement.ticketNumber} ĐẾN QUẦY {currentTTSAnnouncement.counterId}
            </span>
            <span className="text-sm bg-white text-blue-600 px-3 py-1 rounded-full">
              Lần {currentTTSAnnouncement.callAttempt}/3
            </span>
            <span className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
              {currentTTSAnnouncement.source === 'manual' ? '👤 Thủ công' : '🤖 Tự động'}
            </span>
            {ttsQueueStatus.isPlaying && <span className="animate-pulse text-yellow-300">🔊</span>}
          </div>
          <div className="text-lg mt-2 font-medium">
            {ttsQueueStatus.isPlaying ? 'Đang phát thông báo...' : 'Vui lòng đến quầy phục vụ'}
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

      {/* Header with logo and title */}
      <div 
        className="flex items-center justify-center mb-12"
        style={{ backgroundColor: '#ffffffff' }}
      >
        <div className="flex items-center gap-2" style={{marginLeft: '292px'}}>
          <Image
            src="/images/logo_ban_goc.png" 
            alt="logo_ban_goc" 
            width={240}
            height={240}
            className="w-60 h-60 object-contain"
            unoptimized
          />
          <div style={{ marginLeft: '30px', width: '60%' }}>
            <h1 className="text-4xl font-extrabold text-red-600 mb-4" style={{ lineHeight: '1.5' }}>
              TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG XÃ VỊ XUYÊN 
            </h1>
            <h2 className="text-3xl text-red-600 font-bold">
              Hành chính phục vụ
            </h2>
          </div>
          
        </div>
      </div>
      <>
        <div className="flex justify-between items-center" style={{flexDirection: 'row-reverse'}}>
          <h2 className="text-xl text-red-600 font-bold italic" style={{position: 'relative',top: '-95px',left: '-220px'}}>
            VỊ XUYÊN - {new Date().toLocaleDateString('vi-VN')}
          </h2>
        </div>
      </>

      {/* Main Display dạng bảng giống mẫu */}
      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="w-full max-w-7xl">
          {/* Header table */}
          <div className="grid grid-cols-3" >
            <div className="bg-red-700 text-white text-center py-4 text-xl font-bold border border-white border-b-0 rounded-tl-xl uppercase tracking-wide">QUẦY PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4 text-xl font-bold border border-white border-b-0 uppercase tracking-wide">ĐANG PHỤC VỤ</div>
            <div className="bg-red-700 text-white text-center py-4 text-xl font-bold border border-white border-b-0 rounded-tr-xl uppercase tracking-wide">ĐANG CHỜ</div>
          </div>
          {/* Table body */}
          {processedCounters.map((counter, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div key={counter.counter_id} className={`grid grid-cols-3 border-b border-white last:rounded-b-xl ${isEven ? 'bg-gray-300 bg-opacity-80' : 'bg-pink-100  bg-opacity-80'}`} style={{minHeight: 140, alignItems: 'center'}}>
                {/* Quầy phục vụ */}
                <div className="text-xl font-extrabold text-red-800 px-4 py-3 border-r border-white uppercase">
                  QUẦY {counter.counter_id} | {counter.counter_name}
                </div>
                {/* Đang phục vụ - logic cũ: nếu có số thì hiển thị, không thì hiện 'Chưa có số được phục vụ' */}
                <div className="text-4xl font-extrabold text-center text-red-800 px-4 py-3 border-r border-white">
                  {counter.serving_number || wsServingTickets[counter.counter_id] ? (
                    <NumberAnimation number={(counter.serving_number || wsServingTickets[counter.counter_id]?.number)?.toString() || '0'} />
                  ) : (
                    <span className="text-gray-400 text-xl font-bold">Chưa có số được phục vụ</span>
                  )}
                </div>
                {/* Đang chờ */}
                <div className="text-2xl font-extrabold text-center text-red-800 px-4 py-3">
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

        {/* Stats */}
        {/* <div className="mt-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">
                {totalServing}
              </div>
              <div className="text-sm opacity-80">Đang phục vụ</div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">
                {totalWaiting}
              </div>
              <div className="text-sm opacity-80">Đang chờ</div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-300">
                {new Date().toLocaleTimeString('vi-VN')}
              </div>
              <div className="text-sm opacity-80">Thời gian hiện tại</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white p-4 text-center fixed bottom-0 left-0 w-full z-40">
        <div className="flex justify-center items-center gap-8 text-lg italic text-red-600 text-2xl font-extrabold">
          <span> Giờ làm việc: Thứ 2 - Thứ 6, 7:30 - 17:30</span>
          <span> Hotline: 0219-1022 </span>
          {lastUpdated && (
            <span className="text-lg text-red-600 text-2xl font-extrabold">
              Thời gian: {new Date().toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
