'use client';

import React, { useEffect, useState } from 'react';
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

  // ✅ Counter name mapping
  const getCounterName = (counterId: number): string => {
    const counterNames: Record<number, string> = {
      1: 'Tư pháp',
      2: 'Kinh tế - Hạ tầng - Đô Thị', 
      3: 'Văn phòng đăng ký đất đai',
      4: 'Văn hóa - Xã hội'
    };
    return counterNames[counterId] || `Quầy ${counterId}`;
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

  // ✅ Process tickets into counter groups theo status logic mới
  const processTicketsToCounters = (tickets: RealTicket[]): ProcessedCounterData[] => {
    console.log('🔧 Processing tickets into counter groups...');
    
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
    
    // ✅ Filter out 'done' tickets và group by counter and status
    const activeTickets = tickets.filter(ticket => ticket.status !== 'done');
    console.log('📋 Active tickets (exclude done):', activeTickets);
    
    activeTickets.forEach(ticket => {
      const counter = countersMap.get(ticket.counter_id);
      if (!counter) return;
      
      if (ticket.status === 'waiting') {
        counter.waiting_tickets.push(ticket);
      } else if (ticket.status === 'called') {
        counter.serving_tickets.push(ticket);
      }
    });
    
    // ✅ Process each counter data
    countersMap.forEach(counter => {
      // Sort waiting tickets by ID (FIFO order)
      counter.waiting_tickets.sort((a, b) => a.id - b.id);
      counter.waiting_numbers = counter.waiting_tickets.map(t => t.number);
      counter.waiting_count = counter.waiting_tickets.length;
      
      // Get current serving number (latest called ticket)
      if (counter.serving_tickets.length > 0) {
        const latestServing = counter.serving_tickets
          .sort((a, b) => new Date(b.called_at || b.created_at).getTime() - new Date(a.called_at || a.created_at).getTime())[0];
        counter.serving_number = latestServing.number;
      }
      
      console.log(`📊 Counter ${counter.counter_id} processed:`, {
        serving: counter.serving_number,
        waiting: counter.waiting_numbers,
        servingCount: counter.serving_tickets.length,
        waitingCount: counter.waiting_count
      });
    });
    
    return Array.from(countersMap.values()).sort((a, b) => a.counter_id - b.counter_id);
  };

  // ✅ Main data fetching và processing function
  const fetchAndProcessQueueData = async (showLoading = false) => {
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
  };

  // ✅ Initial data fetch and optimized real-time polling
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    const basePollInterval = 5000; // 5 seconds base
    
    // Initial fetch with loading
    fetchAndProcessQueueData(true);
    
    // 🚀 Optimized polling with exponential backoff on errors
    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      
      const pollData = async () => {
        try {
          // Polling updates without loading state
          await fetchAndProcessQueueData(false);
          retryCount = 0; // Reset on success
          
          // Standard polling interval on success
          pollInterval = setTimeout(pollData, basePollInterval);
          
        } catch (error) {
          retryCount++;
          console.warn(`🔄 Polling retry ${retryCount}/${maxRetries}:`, error);
          
          if (retryCount < maxRetries) {
            // Exponential backoff: 10s, 20s, 40s
            const backoffDelay = basePollInterval * Math.pow(2, retryCount);
            console.log(`⏳ Retrying in ${backoffDelay/1000}s...`);
            pollInterval = setTimeout(pollData, backoffDelay);
          } else {
            console.error('❌ Max polling retries reached, stopping auto-refresh');
          }
        }
      };
      
      // Start polling
      pollInterval = setTimeout(pollData, basePollInterval);
    };
    
    startPolling();
    
    // Listen for queue updates
    const handleQueueUpdate = () => {
      console.log('🔔 Queue update event received, refreshing...');
      fetchAndProcessQueueData(false); // No loading for event-triggered updates
    };
    
    // Listen for counter status updates
    const handleCounterStatusUpdate = () => {
      console.log('🔔 Counter status update event received, refreshing...');
      fetchAndProcessQueueData(false); // No loading for event-triggered updates
    };
    
    // Listen for call-next events from officer interface
    const handleCallNextEvent = (event: CustomEvent) => {
      console.log('🔔 Call-next event received:', event.detail);
      // Immediate refresh when officer calls next
      fetchAndProcessQueueData(false); // No loading for officer actions
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
    
    return () => {
      // Cleanup polling interval
      if (pollInterval) clearTimeout(pollInterval);
      
      // Cleanup event listeners
      window.removeEventListener('queueUpdated', handleQueueUpdate);
      window.removeEventListener('counterStatusUpdated', handleCounterStatusUpdate);
      window.removeEventListener('counterQueueUpdated', handleQueueUpdate);
      window.removeEventListener('callNextTriggered', handleCallNextEvent as EventListener);
      window.removeEventListener('ticketAnnouncement', handleTicketAnnouncement as EventListener);
      window.removeEventListener('ttsAnnouncement', handleTTSAnnouncement);
    };
  }, []); // No dependencies, setup once

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
        backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
        fontFamily: 'Inter, system-ui, sans-serif'
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

      {/* Header */}
      <header className={`bg-black bg-opacity-30 p-6 text-center ${
        announcement || currentTTSAnnouncement ? 'mt-24' : 
        ttsQueueStatus.queueLength > 0 ? 'mt-10' : ''
      }`}>
        <h1 className="text-4xl font-bold mb-2">
          TRUNG TÂM HÀNH CHÍNH CÔNG
        </h1>
        <div className="flex justify-between items-center">
          <p className="text-xl opacity-90">
            Thông tin số thứ tự - {new Date().toLocaleDateString('vi-VN')}
          </p>
          
          {/* WebSocket Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-500 bg-opacity-20 text-green-300' 
              : 'bg-red-500 bg-opacity-20 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Main Display với forced 2-column grid */}
      <div className="flex-1 p-8">
        <div 
          style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr', // Force exactly 2 columns always
            gap: '2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            minHeight: '500px'
          }}
        >
          
          {/* Currently Serving Column */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300">
              🔊 ĐANG PHỤC VỤ
            </h2>
            
            <div className="space-y-4">
              {processedCounters.map((counter) => (
                <div key={`serving-counter-${counter.counter_id}`} className="bg-gray-600 bg-opacity-50 rounded-xl p-4">
                  <div className="text-lg font-semibold text-white mb-2">
                    QUẦY {counter.counter_id} | {counter.counter_name}:
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {counter.serving_number ? (
                      <NumberAnimation number={counter.serving_number.toString()} />
                    ) : (
                      <span className="text-xl text-gray-300">Chưa có số được phục vụ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting Queue Column */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-green-300">
              ⏳ SỐ ĐANG CHỜ
            </h2>
            
            <div className="max-h-96 overflow-y-auto space-y-4">
              {processedCounters.map((counter) => (
                <div key={`waiting-counter-${counter.counter_id}`} className="border-b border-white border-opacity-20 pb-3 last:border-b-0">
                  <div className="text-lg font-semibold mb-2 text-blue-200">
                    QUẦY {counter.counter_id} | {counter.counter_name}:
                  </div>
                  {counter.waiting_numbers.length > 0 ? (
                    <div className="text-xl font-bold text-white">
                      {counter.waiting_numbers.slice(0, 10).map((number, index) => (
                        <span key={`waiting-${counter.counter_id}-${number}-${index}`}>
                          <NumberAnimation number={number.toString()} />
                          {index < Math.min(counter.waiting_numbers.length - 1, 9) ? ', ' : ''}
                        </span>
                      ))}
                      {counter.waiting_numbers.length > 10 && (
                        <span className="text-base text-gray-300">
                          ... và {counter.waiting_numbers.length - 10} số khác
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-lg text-gray-400">
                      Không có số nào đang chờ
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 max-w-7xl mx-auto">
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
      <footer className="bg-black bg-opacity-30 p-4 text-center">
        <div className="flex justify-center items-center gap-8 text-lg">
          <span>🕐 Giờ làm việc: Thứ 2 - Thứ 6: 8:00 - 17:00</span>
          <span>📞 Hotline: 1900-1234</span>
          {lastUpdated && (
            <span className="text-sm text-gray-300">
              Cập nhật lúc: {new Date(lastUpdated).toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
