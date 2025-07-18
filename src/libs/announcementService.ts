interface AnnouncementData {
  ticketNumber: number;
  counterName: string;
  counterId: number;
}

interface TtsHook {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export class AnnouncementService {
  private static ttsHook: TtsHook | null = null;

  static init(ttsHook: TtsHook) {
    this.ttsHook = ttsHook;
    console.log('📢 AnnouncementService initialized');
  }

  static generateAnnouncementText({ ticketNumber, counterName }: AnnouncementData): string {
    // Vietnamese announcement template
    return `Mời công dân vé số ${ticketNumber} đến quầy ${counterName}`;
  }

  static async announceTicket(data: AnnouncementData): Promise<void> {
    if (!this.ttsHook) {
      console.warn('🔊 TTS hook not initialized');
      return;
    }

    // Check browser support more thoroughly
    if (!('speechSynthesis' in window)) {
      console.warn('🔊 Speech Synthesis API not available in this browser');
      return;
    }

    if (!this.ttsHook.isSupported) {
      console.warn('🔊 TTS hook reports not supported, but trying anyway...');
      // Don't return early - sometimes the detection is incorrect
    }

    const text = this.generateAnnouncementText(data);
    
    try {
      console.log('🔊 Attempting to announce:', text);
      
      // Test if speechSynthesis is actually working
      if (speechSynthesis.speaking) {
        console.log('🔊 Already speaking, stopping current speech');
        speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
      
      await this.ttsHook.speak(text);
      
      // Log announcement for debugging
      console.log(`📢 Successfully announced ticket ${data.ticketNumber} for counter ${data.counterName}`);
      
      // Dispatch custom event for visual announcements
      window.dispatchEvent(new CustomEvent('ticketAnnouncement', {
        detail: {
          ticketNumber: data.ticketNumber,
          counterName: data.counterName,
          timestamp: Date.now()
        }
      }));
      
    } catch (error) {
      console.error('❌ Failed to announce ticket:', error);
      
      // Fallback: Still dispatch visual event even if audio fails
      window.dispatchEvent(new CustomEvent('ticketAnnouncement', {
        detail: {
          ticketNumber: data.ticketNumber,
          counterName: data.counterName,
          timestamp: Date.now()
        }
      }));
      
      console.log('📺 Fallback: Dispatched visual announcement only');
    }
  }

  static stop(): void {
    if (this.ttsHook) {
      this.ttsHook.stop();
    }
  }

  static isSpeaking(): boolean {
    return this.ttsHook?.isSpeaking || false;
  }
}

export type { AnnouncementData };
