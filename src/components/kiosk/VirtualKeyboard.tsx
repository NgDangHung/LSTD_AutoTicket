'use client';

import React, { useRef, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { X } from 'lucide-react';

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  isVisible: boolean;
  onVoiceClick?: () => void;
  isVoiceMode?: boolean;
  onVoiceStop?: () => void;
}

export default function VirtualKeyboard({ 
  value, 
  onChange, 
  onClose, 
  isVisible, 
  onVoiceClick,
  isVoiceMode = false,
  onVoiceStop 
}: VirtualKeyboardProps) {
  const keyboardRef = useRef<any>(null);
  const keyboardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync keyboard input với value từ props
    if (keyboardRef.current && value !== undefined) {
      keyboardRef.current.setInput(value);
    }
  }, [value]);

  // Handle click outside để đóng keyboard
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keyboardContainerRef.current && !keyboardContainerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  const onKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") return;
    
    if (button === "voice") {
      // Trigger voice input
      if (onVoiceClick) {
        onVoiceClick();
      }
      return;
    }
    
    if (button === "{space}") {
      onChange(value + " ");
    } else if (button === "{bksp}") {
      onChange(value.slice(0, -1));
    } else if (button === "{enter}") {
      // Handle Enter key based on current mode
      if (isVoiceMode && onVoiceStop) {
        // Stop voice input when in voice mode but keep keyboard open
        onVoiceStop();
      } else {
        // Trigger search or close keyboard only when not in voice mode
        onClose();
      }
    } else if (button === "{tab}") {
      onChange(value + "\t");
    } else {
      onChange(value + button);
    }
  };

  const handleQuickPhrase = (phrase: string) => {
    onChange(phrase);
  };

  const handleVietnameseChar = (char: string) => {
    onChange(value + char);
  };

  const layout = {
    'default': [
      '1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      '{lock} a s d f g h j k l ; \' {enter}',
      '{shift} z x c v b n m , . / voice',
      '{space}'
    ],
    'shift': [
      '! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? voice',
      '{space}'
    ]
  };

  const display = {
    '{bksp}': '⌫',
    '{enter}': isVoiceMode ? '🛑 Dừng' : '↵ Enter',
    '{shift}': '⇧',
    '{space}': 'Space',
    '{tab}': '→ Tab',
    '{lock}': '⇪ Caps',
    'voice': isVoiceMode ? '🔴' : ' Voice'
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 keyboard-overlay flex items-center justify-center z-50">
      <div 
        ref={keyboardContainerRef}
        className={`bg-white rounded-t-2xl p-6 w-full max-w-5xl keyboard-slide-up shadow-2xl ${
          isVoiceMode ? 'ring-2 ring-red-500' : ''
        }`}
        style={{position: 'relative', bottom: '-234px'}}
      >

        {/* Voice Mode Indicator */}
        {isVoiceMode && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-red-700">
              <span className="animate-pulse">🎤</span>
              <span className="font-medium">Chế độ nhận diện giọng nói đang hoạt động</span>
            </div>
            <p className="text-center text-sm text-red-600 mt-1">
              Nhấn Enter để dừng nhận diện hoặc tiếp tục gõ bình thường
            </p>
          </div>
        )}

        {/* Quick Phrases */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600">Cụm từ thường dùng:</div>
            <button
              onClick={() => onChange('')}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              🗑️ Xóa tìm kiếm
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Thuế',
              'Cấp giấy tờ',
              'Đăng ký kinh doanh', 
              'Bảo hiểm xã hội',
              'Hộ khẩu',
              'Căn cước công dân',
              'Công an',
              'Điện lực'
            ].map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleQuickPhrase(phrase)}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
 
        {/* Virtual Keyboard */}
        <div className="keyboard-container">
          <Keyboard
            keyboardRef={(r) => (keyboardRef.current = r)}
            layoutName="default"
            layout={layout}
            display={display}
            onKeyPress={onKeyPress}
            theme="hg-theme-default hg-layout-default myTheme"
            physicalKeyboardHighlight={true}
            syncInstanceInputs={true}
            mergeDisplay={true}
            disableCaretPositioning={true}
          />
        </div>

      </div>
    </div>
  );
}
