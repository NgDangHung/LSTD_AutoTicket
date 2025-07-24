'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Search } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface VoiceSearchProps {
  onSearchResult: (query: string) => void;
  onClose: () => void;
}

export default function VoiceSearch({ onSearchResult, onClose }: VoiceSearchProps) {
  const { isListening, transcript, startListening, stopListening } = useVoiceInput();

  const handleSearch = () => {
    if (transcript.trim()) {
      onSearchResult(transcript);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-6">Tìm kiếm bằng giọng nói</h2>
        
        <div className="text-center mb-6">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kết quả nhận diện:
          </label>
          <div className="p-3 border border-gray-300 rounded-md min-h-[60px] bg-gray-50">
            {transcript || 'Nhấn vào microphone và nói...'}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSearch}
            disabled={!transcript.trim()}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Search size={16} />
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
