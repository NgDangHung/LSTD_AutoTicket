'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '@/types/speech';

interface SpeechToTextProps {
  onTranscript: (text: string) => void;
  onStop: () => void;
  isActive: boolean;
  stopTrigger?: 'outside-click' | 'enter-key' | 'manual';
}

export default function SpeechToText({ onTranscript, onStop, isActive, stopTrigger = 'manual' }: SpeechToTextProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsListening(false);
  };

  // Check browser support
  const isSpeechSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  };

  const startListening = () => {
    if (!isSpeechSupported()) {
      setError('Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome hoặc Edge.');
      return;
    }

    setError('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Vietnamese configuration
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      
      // Auto stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interim += transcriptPart;
        }
      }

      // Send real-time transcript (both final and interim)
      const currentTranscript = finalTranscript || interim;
      if (currentTranscript.trim()) {
        onTranscript(currentTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'Có lỗi xảy ra khi nhận diện giọng nói.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói. Vui lòng thử lại.';
          break;
        case 'audio-capture':
          errorMessage = 'Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.';
          break;
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối. Vui lòng cho phép truy cập microphone.';
          break;
        case 'network':
          errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet.';
          break;
        case 'aborted':
          errorMessage = 'Nhận diện giọng nói đã bị hủy.';
          break;
      }
      
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Call onStop when recognition ends
      onStop();
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    cleanup();
    onStop();
  };

  // Start listening when component becomes active
  useEffect(() => {
    if (isActive && !isListening) {
      startListening();
    } else if (!isActive && isListening) {
      stopListening();
    }
  }, [isActive]);

  // Handle different stop triggers
  useEffect(() => {
    if (!isActive || !isListening) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (stopTrigger === 'enter-key' && event.key === 'Enter') {
        // Only stop if keyboard is visible (prevent conflict with regular Enter usage)
        const keyboardVisible = document.querySelector('.keyboard-container');
        if (keyboardVisible) {
          stopListening();
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (stopTrigger === 'outside-click') {
        // Check if click is outside search area
        const searchContainer = document.querySelector('input[name="voice-search"]')?.parentElement;
        if (searchContainer && !searchContainer.contains(event.target as Node)) {
          stopListening();
        }
      }
    };

    if (stopTrigger === 'enter-key') {
      document.addEventListener('keydown', handleKeyDown);
    } else if (stopTrigger === 'outside-click') {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isListening, stopTrigger]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // This component doesn't render anything visible
  // The error state could be communicated through a callback if needed
  if (error) {
    console.error('Speech recognition error:', error);
    // You could call an error callback here if needed
    // onError?.(error);
  }

  return null;
}
