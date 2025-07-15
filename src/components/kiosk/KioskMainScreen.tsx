'use client';

import React, { useState } from 'react';
import { Search, Mic, Printer, HelpCircle, AudioLines } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '@/components/shared/Button';
import ConfirmCounter from '@/app/kiosk/confirm-counter';
import VirtualKeyboard from './VirtualKeyboard';
import SpeechToText from './SpeechToText';
import { CounterQueueManager } from '@/libs/counterQueue';
import '@/app/index.css';

const services = [
  { id: '1', name: 'Chứng thực' },
  { id: '2', name: 'Hộ tịch' },
  { id: '3', name: 'Kiểm Lâm' },
  { id: '4', name: 'Thành lập và hoạt động của hộ kinh doanh' },
  { id: '5', name: 'Hoạt động xây dựng'},
  { id: '6', name: 'Đất đai'},
  { id: '7', name: 'Bảo trợ xã hội'}
];

export default function KioskMainScreen() {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [showConfirmCounter, setShowConfirmCounter] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStopTrigger, setVoiceStopTrigger] = useState<'outside-click' | 'enter-key' | 'manual'>('manual');
  const [usedTicketNumbers, setUsedTicketNumbers] = useState<Set<number>>(new Set());

  // Function to generate unique 4-digit ticket number
  const generateUniqueTicketNumber = (): number => {
    let ticketNumber: number;
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    
    do {
      // Generate random number between 1000-9999 (4 digits)
      ticketNumber = Math.floor(Math.random() * 9000);
      attempts++;
    } while (usedTicketNumbers.has(ticketNumber) && attempts < maxAttempts);
    
    // If we've used too many numbers, reset the set (in real app, this would be handled differently)
    if (attempts >= maxAttempts) {
      setUsedTicketNumbers(new Set());
      ticketNumber = Math.floor(Math.random() * 9000) + 1000;
    }
    
    // Add to used numbers
    setUsedTicketNumbers(prev => new Set(prev).add(ticketNumber));
    
    return ticketNumber;
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedService(serviceId);
      setSelectedServiceName(service.name);
      setShowConfirmCounter(true);
    }
  };

  const handleConfirmCounter = async (counterId: string) => {
    // Xử lý logic khi user xác nhận chọn quầy
    console.log('Confirmed - Service:', selectedServiceName, 'Counter:', counterId);
    
    // Tìm tên quầy từ counterId (đồng bộ với confirm-counter.tsx)
    const counterNames: { [key: string]: string } = {
      '1': 'Quầy 1 - Tư pháp',
      '2': 'Quầy 2 - Kinh tế - Hạ tầng - Đô Thị',
      '3': 'Quầy 3 - Văn phòng đăng ký đất đai',
      '4': 'Quầy 4 - Văn hóa - Xã hội'
    };
    
    const counterName = counterNames[counterId] || `Quầy ${counterId}`;
    
    // Generate unique ticket number
    const ticketNumber = generateUniqueTicketNumber();
    
    try {
      // Sử dụng CounterQueueManager để thêm vào queue của counter cụ thể
      const queueData = {
        serviceId: selectedService,
        serviceName: selectedServiceName,
        counterId: counterId,
        counterName: counterName,
        number: ticketNumber.toString().padStart(4, '0'),
        status: 'waiting' as const,
        priority: 0,
        createdAt: new Date().toISOString(),
        estimatedWaitTime: 15 // 15 phút ước tính
      };
      
      // Thêm vào queue của counter cụ thể
      const newQueueItem = CounterQueueManager.addToCounterQueue(counterId, queueData);
      
      console.log('✅ Queue created successfully and will display on TV:', newQueueItem);
      
      // Trigger custom event để TV update ngay lập tức
      window.dispatchEvent(new CustomEvent('counterQueueUpdated', { 
        detail: { 
          action: 'added',
          counterId: counterId,
          queueItem: newQueueItem 
        } 
      }));
      
    } catch (error) {
      console.error('Error creating queue:', error);
      // Vẫn hiển thị thông báo thành công cho user ngay cả khi có lỗi
    }
    
    // Reset state
    setShowConfirmCounter(false);
    setSelectedService('');
    setSelectedServiceName('');
    
    // Hiển thị toast thông báo thành công
    toast.success(
      <div style={{ lineHeight: '1.6' }}>
        <div>🎫 Đã in số thứ tự thành công!</div>
        <div>📋 Dịch vụ: {selectedServiceName}</div>
        <div>🏢 {counterName}</div>
        <div>🎟️ Vé số: {ticketNumber.toString().padStart(4, '0')}</div>
      </div>,
      {
        position: "top-center",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      }
    );
  };

  const handleCloseConfirm = () => {
    setShowConfirmCounter(false);
    setSelectedService('');
    setSelectedServiceName('');
  };

  const handleVoiceSearch = () => {
    setIsVoiceActive(true);
    setVoiceStopTrigger('outside-click');
  };

  const handleSearchClick = () => {
    setShowVirtualKeyboard(true);
  };

  const handleKeyboardClose = () => {
    setShowVirtualKeyboard(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSpeechTranscript = (text: string) => {
    setSearchValue(text);
  };

  const handleSpeechStop = () => {
    setIsVoiceActive(false);
    // Don't close keyboard when voice stops from keyboard mode
    // Keyboard will only close when user explicitly closes it
  };

  // Filter services dựa trên search value
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div 
          className="flex items-center justify-center mb-12"
          style={{ backgroundColor: '#c31313' }}
        >
          <div className="flex items-center gap-2">
            <img 
              src="/images/Logo_vang.png" 
              alt="Logo Ban Gốc" 
              className="w-60 h-60 object-contain"
            />
            <div style={{ marginLeft: '30px' }}>
              <h1 className="text-4xl font-bold text-white-800 mb-4" style={{ lineHeight: '1.5' }}>
                TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG PHƯỜNG HÀ GIANG 1
              </h1>
              <h2 className="text-3xl text-white-600">
                Hành chính phục vụ
              </h2>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center gap-4 mb-12">
          <div className="relative" style={{ marginTop: '-28px'}}>
            <input 
              name='voice-search'
              value={searchValue}
              onClick={handleSearchClick}
              onChange={(e) => setSearchValue(e.target.value)}
              className={`flex items-center gap-2 px-6 py-3 text-lg pr-12 Shadow cursor-pointer transition-all duration-300 ${
                showVirtualKeyboard ? 'ring-2 ring-blue-500 border-blue-500' : ''
              } ${
                isVoiceActive ? 'ring-2 ring-red-500 border-red-500 bg-red-50' : ''
              }`}
              type="text"
              placeholder={isVoiceActive ? 
                (voiceStopTrigger === 'enter-key' ? 'Đang nghe... Bấm Enter trên bàn phím để dừng' : 'Đang nghe... Bấm ra ngoài để dừng') 
                : 'Tìm kiếm bằng giọng nói - Bàn phím ảo'
              }
              style={{ 
                width: '600px', 
                borderRadius: '9999px', 
                border: '1px solid #ccc', 
                color: 'black', 
                backgroundColor: isVoiceActive ? '#fef2f2' : 'white',
              }}
            />
            <AudioLines 
              size={24} 
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer transition-colors ${
                isVoiceActive ? 'text-red-500 animate-pulse' : 'text-blue-500 hover:text-blue-700'
              }`}
              onClick={handleVoiceSearch}
            />
            
            {/* Voice Status Indicator */}
            {isVoiceActive && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                🎤 {voiceStopTrigger === 'enter-key' ? 'Đang nghe... (Enter để dừng)' : 'Đang nghe...'}
              </div>
            )}
          </div>
        </div>

        {/* Search Results Info */}
        {searchValue && (
          <div className="text-center mb-4">
            <p className="text-gray-600">
              Tìm thấy <span className="font-semibold text-blue-600">{filteredServices.length}</span> dịch vụ 
              cho từ khóa "<span className="font-semibold">{searchValue}</span>"
            </p>
          </div>
        )}
        {/* Service Grid */}
        <div className="flex flex-col items-center">
          {/* Scroll Indicator */}
          {(searchValue ? filteredServices : services).length > 6 && (
            <div className="mb-4 text-center">
              <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
                <span>📋 {(searchValue ? filteredServices : services).length} dịch vụ có sẵn</span>
              </p>
            </div>
          )}
          
          <div 
            className="service-grid-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 overflow-y-auto p-4 border rounded-lg bg-white/50 backdrop-blur-sm"
            style={{ 
              maxWidth: '1200px',
              maxHeight: '448px' // Exact height for 2 rows: (192px card height + 24px gap) * 2 + 32px padding
            }}
          >
            {(searchValue ? filteredServices : services).map((service) => (
              <div
                key={service.id}
                onClick={() => handleServiceSelect(service.id)}
                className="kiosk-card relative Shadow hover:shadow-lg transition-shadow duration-200"
              >
                
                <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">
                  {service.name}
                </h3>
                <div className="text-center ">
                  <span className="inline-flex items-center gap-2 text-blue-600 font-medium absolute bottom-5 left-1/2 transform -translate-x-1/2">
                    <Printer size={16} />
                    In số thứ tự
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* No Results */}
        {searchValue && filteredServices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search size={64} className="mx-auto mb-4" />
              <p className="text-xl">Không tìm thấy dịch vụ nào</p>
              <p className="text-lg">Thử tìm kiếm với từ khóa khác</p>
            </div>
            <button
              onClick={() => setSearchValue('')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Xóa tìm kiếm
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-gray-600">
          <p className="text-lg mb-2">
            🕐 Giờ làm việc: Thứ 2 - Thứ 6: 8:00 - 17:00
          </p>
          <p className="text-lg">
            📞 Hotline hỗ trợ: 1900-1234
          </p>
        </div>
      </div>

      {/* Confirm Counter Modal */}
      {showConfirmCounter && (
        <ConfirmCounter
          service={selectedServiceName}
          serviceId={selectedService ? parseInt(selectedService) : undefined}
          onConfirm={handleConfirmCounter}
          onClose={handleCloseConfirm}
        />
      )}

      {/* Virtual Keyboard */}
      {showVirtualKeyboard && (
        <VirtualKeyboard
          value={searchValue}
          onChange={handleSearchChange}
          onClose={handleKeyboardClose}
          isVisible={showVirtualKeyboard}
          isVoiceMode={isVoiceActive}
          onVoiceStop={handleSpeechStop}
          onVoiceClick={() => {
            // Keep keyboard open but activate voice mode
            setIsVoiceActive(true);
            setVoiceStopTrigger('enter-key');
          }}
        />
      )}

      {/* Speech to Text */}
      <SpeechToText
        onTranscript={handleSpeechTranscript}
        onStop={handleSpeechStop}
        isActive={isVoiceActive}
        stopTrigger={voiceStopTrigger}
      />
    </div>
  );
}
