// Text-to-speech helper functions

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class TTSService {
  private synth: SpeechSynthesis;
  private defaultOptions: TTSOptions = {
    lang: 'vi-VN',
    rate: 0.8,
    pitch: 1,
    volume: 1,
  };

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const finalOptions = { ...this.defaultOptions, ...options };

      utterance.lang = finalOptions.lang!;
      utterance.rate = finalOptions.rate!;
      utterance.pitch = finalOptions.pitch!;
      utterance.volume = finalOptions.volume!;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth ? this.synth.getVoices() : [];
  }

  // Predefined messages for queue system
  announceQueueNumber(number: string, counterName: string): Promise<void> {
    const message = `Mời số ${number} đến ${counterName}`;
    return this.speak(message);
  }

  announceWelcome(): Promise<void> {
    const message = 'Chào mừng quý khách đến với trung tâm hành chính công. Vui lòng lấy số thứ tự và chờ gọi.';
    return this.speak(message);
  }

  announceClosing(): Promise<void> {
    const message = 'Trung tâm sẽ đóng cửa trong 15 phút nữa. Quý khách vui lòng hoàn thành thủ tục.';
    return this.speak(message);
  }

  announceCounterPause(counterName: string): Promise<void> {
    const message = `${counterName} tạm ngưng phục vụ. Quý khách vui lòng chờ thông báo tiếp theo.`;
    return this.speak(message);
  }

  announceCounterResume(counterName: string): Promise<void> {
    const message = `${counterName} tiếp tục phục vụ. Mời quý khách tiếp tục thực hiện thủ tục.`;
    return this.speak(message);
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Utility functions
export const speakText = (text: string, options?: TTSOptions): Promise<void> => {
  return ttsService.speak(text, options);
};

export const stopSpeaking = (): void => {
  ttsService.stop();
};

export const pauseSpeaking = (): void => {
  ttsService.pause();
};

export const resumeSpeaking = (): void => {
  ttsService.resume();
};

export default ttsService;
