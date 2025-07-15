'use client';

import React, { useEffect, useRef } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

interface AnnouncementProps {
  queueNumber: string;
  counterName: string;
  isActive: boolean;
}

export default function Announcement({ queueNumber, counterName, isActive }: AnnouncementProps) {
  const { playSound } = useSoundEffect();
  const hasAnnouncedRef = useRef(false);

  useEffect(() => {
    if (isActive && !hasAnnouncedRef.current) {
      // Phát âm thanh thông báo
      playSound('/sounds/notification.mp3');
      
      // Text-to-speech
      const utterance = new SpeechSynthesisUtterance(
        `Mời số ${queueNumber} đến ${counterName}`
      );
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
      
      hasAnnouncedRef.current = true;
      
      // Reset sau 5 giây
      setTimeout(() => {
        hasAnnouncedRef.current = false;
      }, 5000);
    }
  }, [isActive, queueNumber, counterName, playSound]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 text-center animate-pulse">
      <div className="text-2xl font-bold">
        🔊 MỜI SỐ {queueNumber} ĐẾN {counterName.toUpperCase()}
      </div>
    </div>
  );
}
