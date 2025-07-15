import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  SpeechRecognition, 
  SpeechRecognitionEvent, 
  SpeechRecognitionErrorEvent 
} from '@/types/speech';

export interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    language = 'vi-VN',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResult,
    onError,
  } = options;

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        
        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = maxAlternatives;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            onResult?.(finalTranscript);
          }

          setInterimTranscript(interimTranscript);

          // Auto-stop after getting final result (for non-continuous mode)
          if (!continuous && finalTranscript) {
            recognition.stop();
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const errorMessage = getErrorMessage(event.error);
          setError(errorMessage);
          onError?.(errorMessage);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
        setError('Speech recognition is not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, interimResults, maxAlternatives, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported');
      return;
    }

    if (!recognitionRef.current) {
      setError('Speech recognition is not initialized');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();

      // Auto-stop after 30 seconds to prevent infinite listening
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    } catch (err: any) {
      setError(err.message);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    isListening,
    transcript: transcript + interimTranscript,
    finalTranscript: transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    abortListening,
  };
};

// Helper function to get user-friendly error messages
const getErrorMessage = (error: string): string => {
  const errorMessages: Record<string, string> = {
    'no-speech': 'Không phát hiện giọng nói. Vui lòng thử lại.',
    'audio-capture': 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.',
    'not-allowed': 'Quyền truy cập microphone bị từ chối. Vui lòng cho phép truy cập.',
    'network': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
    'service-not-allowed': 'Dịch vụ nhận diện giọng nói không được phép.',
    'bad-grammar': 'Lỗi ngữ pháp trong cấu hình nhận diện.',
    'language-not-supported': 'Ngôn ngữ không được hỗ trợ.',
  };

  return errorMessages[error] || `Lỗi nhận diện giọng nói: ${error}`;
};
