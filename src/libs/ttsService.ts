  // ...properties...

import { ttsAPI } from './api';
import { rootApi } from '@/libs/rootApi';

interface TTSRequest {
  counterId: number;
  ticketNumber: number;
  callAttempt: number; // 1, 2, hoặc 3
  timestamp: string; // ISO timestamp từ called_at hoặc WebSocket
  source: 'manual' | 'ai'; // Để tracking, không dùng cho priority
  tenxa: string; // Optional, chỉ dùng khi cần xác định tenXa
}

interface TTSResponse {
  audioUrl: string;
  success: boolean;
  error?: string;
}

interface SeatInfo {
  id: number;
  status: boolean; // true = occupied, false = empty
  type: string;
  counter_id: number;
}

export class TTSService {
  // ...existing properties...

  // Gọi API /counters và cache mapping name->id theo từng xã
  private async loadCounters(tenxa: string) {
    if (this.countersLoaded[tenxa]) return;
    try {
      const response = await rootApi.get('/counters', { params: { tenxa } });
      if (Array.isArray(response.data)) {
        this.counterMapping[tenxa] = {};
        response.data.forEach((c: { id: number, name: string }) => {
          this.counterMapping[tenxa][c.name.trim()] = c.id;
        });
        this.countersLoaded[tenxa] = true;
        console.log('✅ [TTSService] Loaded counter mapping:', tenxa, this.counterMapping[tenxa]);
      }
    } catch (error) {
      console.warn('⚠️ [TTSService] Failed to load counters:', error);
    }
  }
  private static instance: TTSService | null = null;
  private audioQueue: TTSRequest[] = [];
  private isPlaying: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private maxRetries: number = 3;
  private audioGap: number = 1000; // 2 giây giữa các lần phát
  private apiBaseUrl: string;
  // Mapping cache: { [tenxa]: { [counterName]: counterId } }
  private counterMapping: { [tenxa: string]: { [counterName: string]: number } } = {};
  private countersLoaded: { [tenxa: string]: boolean } = {};

  static getInstance(): TTSService {
    if (!this.instance) {
      this.instance = new TTSService();
    }
    return this.instance;
  }

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    // ✅ Only setup WebSocket on client-side to prevent SSR error
    if (typeof window !== 'undefined') {
      // Mặc định load xã hiện tại, có thể thay đổi nếu cần
      this.loadCounters('phuonglaocai');
      this.setupWebSocketListener();
    }
  }

  private setupWebSocketListener() {
    // ✅ Double check for browser environment
    if (typeof window === 'undefined') {
      console.warn('🔇 WebSocket setup skipped on server-side');
      return;
    }
    try {
      // Listen for ticket_called events từ WebSocket với timestamp
      const handleTicketCalled = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { ticket_number, counter_name, timestamp, tenxa } = customEvent.detail;
        // Chỉ xử lý nếu tenxa === xã hiện tại
        if (tenxa !== 'phuonglaocai') return;
        // Truyền tenxa vào extractCounterIdFromName
        const counterId = this.extractCounterIdFromName(counter_name, tenxa);
        if (counterId == null) {
          console.warn('❌ Không xác định được counterId từ counter_name:', counter_name, tenxa);
          return;
        }
        this.queueAnnouncement(counterId, ticket_number, 1, 'ai', timestamp, tenxa);
      };
      window.addEventListener('ticketCalledWithTimestamp', handleTicketCalled);
    } catch (error) {
      console.warn('⚠️ WebSocket setup failed:', error);
    }
  }

  /**
   * Trả về counterId nếu tên quầy match tuyệt đối trong từng xã, ngược lại trả về null (không phát TTS nếu không xác định được)
   */
  private extractCounterIdFromName(counterName: string, tenxa: string): number | null {
    if (!counterName || !tenxa) return null;
    const normalized = counterName.trim();
    if (!this.countersLoaded[tenxa]) this.loadCounters(tenxa);
    return this.counterMapping[tenxa]?.[normalized] ?? null;
  }

  async queueAnnouncement(
    counterId: number, 
    ticketNumber: number, 
    callAttempt: number = 1,
    source: 'manual' | 'ai' = 'manual',
    timestamp?: string,
    tenxa?: string
  ): Promise<void> {
    // Check call limit
    if (callAttempt > this.maxRetries) {
      console.warn(`🔊 Ticket ${ticketNumber} exceeded max calls (${this.maxRetries})`);
      return;
    }

    // Check seat status từ lần gọi thứ 2
    // if (callAttempt >= 2) {
    //   const seatStatus = await this.checkSeatStatus(counterId);
    //   if (!seatStatus.hasEmptySeats) {
    //     console.log(`🔊 No empty seats for counter ${counterId}, skipping call ${callAttempt}`);
    //     return;
    //   }
    // }

    const request: TTSRequest = {
      counterId,
      ticketNumber,
      callAttempt,
      timestamp: timestamp || new Date().toISOString(),
      source,
      tenxa: tenxa || 'phuonglaocai'
    };

    // Insert vào queue theo timestamp (FIFO based on called_at time)
    this.insertToQueueByTimestamp(request);
    
    // Process queue nếu không đang phát
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  private insertToQueueByTimestamp(request: TTSRequest): void {
    // Sort purely by timestamp - không có priority level
    this.audioQueue.push(request);
    this.audioQueue.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    console.log(`🔊 Queued announcement: Counter ${request.counterId}, Ticket ${request.ticketNumber}, Timestamp: ${request.timestamp}`);
    console.log(`🔊 Queue order:`, this.audioQueue.map(r => `T${r.ticketNumber}@${new Date(r.timestamp).toLocaleTimeString()}`));
  }

  private async processQueue(): Promise<void> {
  if (this.audioQueue.length === 0 || this.isPlaying) {
    return;
  }

  this.isPlaying = true;
  const request = this.audioQueue.shift()!;

  try {
    console.log(`🔊 Processing TTS: Counter ${request.counterId}, Ticket ${request.ticketNumber}, Source: ${request.source}`);
    
    // Call TTS API
    const response = await this.callTTSAPI(request.counterId, request.ticketNumber, request.tenxa);
    
    if (response.success) {
      // Play audio
      await this.playAudio(response.audioUrl, request);
      
      // Update UI với announcement info
      this.updateAnnouncementUI(request);

      // Nếu là lần phát đầu (callAttempt === 1), tự động phát lại lần 2 sau 2 giây
      if (request.callAttempt === 1) {
        setTimeout(() => {
          this.queueAnnouncement(
            request.counterId,
            request.ticketNumber,
            2, // callAttempt = 2
            request.source,
            request.timestamp // Giữ nguyên timestamp gốc
          );
        }, this.audioGap);
      }
    } else {
      console.error('🔊 TTS API failed:', response.error);
    }

  } catch (error) {
    console.error('🔊 TTS processing error:', error);
  } finally {
    this.isPlaying = false;
    // 2 giây gap giữa các announcement (giữa các ticket khác nhau)
    setTimeout(() => this.processQueue(), this.audioGap);
  }
}

  private async callTTSAPI(counterId: number, ticketNumber: number, tenxa: string): Promise<TTSResponse> {
    try {
      console.log(`🎵 Calling TTS API for Counter ${counterId}, Ticket ${ticketNumber}, tenxa: ${tenxa}`);
      // Chuẩn hóa truyền tenxa vào object request
      const audioBlob = await ttsAPI.generateAudio(counterId, ticketNumber, tenxa);
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log(`✅ TTS API success - Generated MP3 blob (${audioBlob.size} bytes)`);
      console.log(`🎵 Audio URL created: ${audioUrl}`);
      return { audioUrl, success: true };
    } catch (error) {
      console.error(`❌ TTS API failed for Counter ${counterId}, Ticket ${ticketNumber}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('Counter not found')) {
          return { 
            audioUrl: '', 
            success: false, 
            error: 'Counter not found' 
          };
        }
        if (error.message.includes('Validation error')) {
          return { 
            audioUrl: '', 
            success: false, 
            error: error.message 
          };
        }
      }
      
      return { 
        audioUrl: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown TTS error'
      };
    }
  }

  private async playAudio(audioUrl: string, request: TTSRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioUrl);
      
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Cleanup blob URL
        this.currentAudio = null;
        console.log(`🔊 Audio completed: Counter ${request.counterId}, Ticket ${request.ticketNumber}`);
        resolve();
      };

      this.currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        console.error(`🔊 Audio playback failed: Counter ${request.counterId}, Ticket ${request.ticketNumber}`);
        reject(new Error('Audio playback failed'));
      };

      this.currentAudio.play().catch(error => {
        console.error('🔊 Audio play failed:', error);
        reject(error);
      });
    });
  }

  private async checkSeatStatus(counterId: number): Promise<{ hasEmptySeats: boolean }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/seats/counter/${counterId}`);
      if (response.ok) {
        const seats: SeatInfo[] = await response.json();
        // Filter seats với type="client" và status=false (empty)
        const emptyClientSeats = seats.filter(seat => 
          seat.type === 'client' && !seat.status
        );
        return { hasEmptySeats: emptyClientSeats.length > 0 };
      }
      return { hasEmptySeats: false };
    } catch (error) {
      console.error('🔊 Seat status check failed:', error);
      return { hasEmptySeats: false };
    }
  }

  private updateAnnouncementUI(request: TTSRequest): void {
    // Dispatch event để update TV display và other components
    window.dispatchEvent(new CustomEvent('ttsAnnouncement', {
      detail: {
        counterId: request.counterId,
        ticketNumber: request.ticketNumber,
        callAttempt: request.callAttempt,
        source: request.source,
        timestamp: request.timestamp
      }
    }));
  }

  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.isPlaying = false;
    }
  }

  clearQueue(): void {
    this.audioQueue = [];
    this.stopCurrentAudio();
  }

  getQueueStatus(): { 
    queueLength: number; 
    isPlaying: boolean; 
    currentRequest?: TTSRequest;
    upcomingRequests: TTSRequest[];
  } {
    // ✅ Safe default for SSR
    if (typeof window === 'undefined') {
      return {
        queueLength: 0,
        isPlaying: false,
        upcomingRequests: []
      };
    }

    return {
      queueLength: this.audioQueue.length,
      isPlaying: this.isPlaying,
      currentRequest: this.audioQueue[0],
      upcomingRequests: this.audioQueue.slice(0, 3) // Show next 3 in queue
    };
  }

  // Helper method để download MP3 file từ TTS API
  async downloadAudio(counterId: number, ticketNumber: number): Promise<void> {
    try {
      const audioBlob = await ttsAPI.generateAudio(counterId, ticketNumber, 'phuonglaocai');
      
      // Create download link
      const downloadUrl = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `tts-counter${counterId}-ticket${ticketNumber}.mp3`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(downloadUrl);
      
      console.log(`💾 Downloaded MP3: Counter ${counterId}, Ticket ${ticketNumber}`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  }

  // Helper method để tạo HTML5 audio element
  async createAudioElement(counterId: number, ticketNumber: number): Promise<HTMLAudioElement> {
    try {
      const audioBlob = await ttsAPI.generateAudio(counterId, ticketNumber, 'phuonglaocai');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      
      // Cleanup URL khi audio kết thúc
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
      
      return audio;
    } catch (error) {
      console.error('❌ Create audio element failed:', error);
      throw error;
    }
  }
}
