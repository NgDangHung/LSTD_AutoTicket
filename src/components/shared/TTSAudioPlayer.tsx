'use client';

import React, { useState, useRef } from 'react';
import { TTSService } from '../../libs/ttsService';

interface TTSAudioPlayerProps {
  counterId: number;
  ticketNumber: number;
}

export default function TTSAudioPlayer({ counterId, ticketNumber }: TTSAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Sử dụng TTSService để tạo audio element
      const audio = await TTSService.getInstance().createAudioElement(counterId, ticketNumber);
      audioRef.current = audio;
      
      // Play audio
      await audio.play();
      
      console.log(`🎵 Playing TTS audio: Counter ${counterId}, Ticket ${ticketNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      console.error('❌ Audio play failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Download MP3 file
      await TTSService.getInstance().downloadAudio(counterId, ticketNumber);
      
      console.log(`💾 Downloaded TTS audio: Counter ${counterId}, Ticket ${ticketNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download audio');
      console.error('❌ Audio download failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium">TTS Audio Player</span>
        <span className="text-sm text-gray-500">
          Counter {counterId} - Ticket {ticketNumber}
        </span>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handlePlayAudio}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </>
          ) : (
            <>
              🔊 Play Audio
            </>
          )}
        </button>

        <button
          onClick={handleStopAudio}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏹️ Stop
        </button>

        <button
          onClick={handleDownloadAudio}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💾 Download MP3
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p>• Content-Type: audio/mpeg</p>
        <p>• Compatible with HTML5 &lt;audio&gt; element</p>
        <p>• Can be downloaded as .mp3 file</p>
      </div>
    </div>
  );
}
