'use client';

import React, { useState, useEffect } from 'react';
import { Search, Mic, Printer, HelpCircle, AudioLines } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '@/components/shared/Button';
import ConfirmCounter from '@/app/kiosk/confirm-counter';
import VirtualKeyboard from './VirtualKeyboard';
import SpeechToText from './SpeechToText';
import { useCreateTicket } from '@/hooks/useApi';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { CounterQueueManager } from '@/libs/counterQueue';
import '@/app/index.css';

const services = [
  { id: 1, name: 'Chứng thực' },
  { id: 2, name: 'Hộ tịch' },
  { id: 3, name: 'Kiểm Lâm' },
  { id: 4, name: 'Thành lập và hoạt động của hộ kinh doanh' },
  { id: 5, name: 'Hoạt động xây dựng'},
  { id: 6, name: 'Đất đai'},
  { id: 7, name: 'Bảo trợ xã hội'}
];

// Mapping lĩnh vực với quầy phục vụ
const counters = [
  { id: 1, name: 'Tư pháp', serviceIds: [1, 2] }, // Chứng thực, Hộ tịch
  { id: 2, name: 'Kinh tế - Hạ tầng - Đô Thị', serviceIds: [3, 4, 5] }, // Kiểm Lâm, Thành lập hộ KD, Hoạt động xây dựng
  { id: 3, name: 'Văn phòng đăng ký đất đai', serviceIds: [6] }, // Đất đai
  { id: 4, name: 'Văn hóa - Xã hội', serviceIds: [7] } // Bảo trợ xã hội
];

interface ProcedureResult {
  id: number;
  name: string;
  field_id: number;
  counters: Array<{
    id: number;
    name: string;
    status: string;
  }>;
}

export default function KioskMainScreen() {
  // Original states
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [showConfirmCounter, setShowConfirmCounter] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStopTrigger, setVoiceStopTrigger] = useState<'outside-click' | 'enter-key' | 'manual'>('manual');

  // New states for procedure search workflow
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureResult | null>(null);

  // Helper function to find counter by service ID
  const getCounterByServiceId = (serviceId: number) => {
    return counters.find(counter => counter.serviceIds.includes(serviceId));
  };

  // Optimized search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    loading: searchLoading,
    error: searchError,
    clearSearch,
    isSearchMode
  } = useOptimizedSearch();

  // API hooks
  const { createTicket, loading: ticketLoading, error: ticketError } = useCreateTicket();

  // Compute filtered services based on search results
  const filteredServices = isSearchMode 
    ? services.filter(service => 
        searchResults.some(result => result.field_id === service.id)
      )
    : services;

  const handleServiceSelect = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (isSearchMode) {
      // LUỒNG 1: Tìm kiếm thủ tục -> chọn lĩnh vực
      const matchingProcedure = searchResults.find(proc => proc.field_id === service.id);
      
      if (matchingProcedure) {
        setSelectedProcedure(matchingProcedure);
        setSelectedService(serviceId.toString());
        setSelectedServiceName(`${service.name} - ${matchingProcedure.name}`);
        setShowConfirmCounter(true);
        
        console.log('✅ Selected procedure from search:', {
          service: service.name,
          procedure: matchingProcedure.name,
          fieldId: service.id
        });
      } else {
        console.warn('⚠️ No matching procedure found for service:', service.name);
        toast.error('Không tìm thấy thủ tục phù hợp cho lĩnh vực này');
      }
    } else {
      // LUỒNG 2: Chọn trực tiếp lĩnh vực
      const counter = getCounterByServiceId(serviceId);
      
      if (counter) {
        // Tạo mock procedure để có thể sử dụng chung logic với luồng 1
        const mockProcedure: ProcedureResult = {
          id: serviceId,
          name: service.name,
          field_id: serviceId,
          counters: [{
            id: counter.id,
            name: counter.name,
            status: 'active'
          }]
        };
        
        setSelectedProcedure(mockProcedure);
        setSelectedService(serviceId.toString());
        setSelectedServiceName(service.name);
        setShowConfirmCounter(true);
        
        console.log('✅ Selected service directly:', {
          service: service.name,
          counter: counter.name,
          serviceId: serviceId
        });
      } else {
        console.warn('⚠️ No counter found for service:', service.name);
        toast.error('Không tìm thấy quầy phục vụ cho lĩnh vực này');
      }
    }
  };

  const handleConfirmCounter = async (counterId: string) => {
    try {
      // Call API to create ticket instead of generating random number
      const newTicket = await createTicket(parseInt(counterId));
      
      if (newTicket) {
        // Find counter name from selectedProcedure or fallback
        let counterName = `Quầy ${counterId}`;
        
        if (selectedProcedure && selectedProcedure.counters) {
          const counter = selectedProcedure.counters.find(c => c.id === parseInt(counterId));
          if (counter) {
            counterName = counter.name;
          }
        }

        console.log('✅ Ticket created successfully:', newTicket);
        
        // 🔥 ADD TO TV QUEUE
        const queueItem = CounterQueueManager.addToCounterQueue(newTicket.counter_id.toString(), {
          number: newTicket.number.toString(),
          serviceId: selectedService,
          serviceName: selectedServiceName,
          counterId: counterId,
          counterName: counterName,
          status: 'waiting',
          priority: 1,
          createdAt: newTicket.created_at,
          estimatedWaitTime: 15 // Default 15 minutes
        });
        
        console.log('✅ Added to TV queue:', queueItem);
        
        // Reset state
        setShowConfirmCounter(false);
        setSelectedService('');
        setSelectedServiceName('');
        setSelectedProcedure(null);
        
        // Show success toast with data from BE
        toast.success(
          <div style={{ lineHeight: '1.6' }}>
            <div>🎫 Đã in số thứ tự thành công!</div>
            <div>📋 Dịch vụ: {selectedServiceName}</div>
            <div>🏢 Quầy: {counterName}</div>
            <div>🎟️ Vé số: {newTicket.number}</div>
            <div>⏰ Thời gian: {new Date().toLocaleTimeString('vi-VN')}</div>
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
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Có lỗi xảy ra khi tạo vé. Vui lòng thử lại!');
    }
  };

  const handleCloseConfirm = () => {
    setShowConfirmCounter(false);
    setSelectedService('');
    setSelectedServiceName('');
    setSelectedProcedure(null);
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
    setSearchQuery(value);
  };

  const handleSpeechTranscript = (text: string) => {
    setSearchQuery(text);
  };

  const handleSpeechStop = () => {
    setIsVoiceActive(false);
    // Don't close keyboard when voice stops from keyboard mode
    // Keyboard will only close when user explicitly closes it
  };

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
              value={searchQuery}
              onClick={handleSearchClick}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex items-center gap-2 px-6 py-3 text-lg pr-12 Shadow cursor-pointer transition-all duration-300 ${
                showVirtualKeyboard ? 'ring-2 ring-blue-500 border-blue-500' : ''
              } ${
                isVoiceActive ? 'ring-2 ring-red-500 border-red-500 bg-red-50' : ''
              }`}
              type="text"
              placeholder={isVoiceActive ? 
                (voiceStopTrigger === 'enter-key' ? 'Đang nghe... Bấm Enter trên bàn phím để dừng' : 'Đang nghe... Bấm ra ngoài để dừng') 
                : 'Tìm kiếm thủ tục cụ thể (ví dụ: "đăng ký khai sinh")'
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
          
          {/* Clear Search Button - Hiển thị khi có text trong search */}
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-red-600 transition-colors text-sm font-medium shadow-lg"
              style={{ marginTop: '-28px' }}
            >
              🗑️ Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Search Loading */}
        {searchLoading && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Đang tìm kiếm...
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {isSearchMode && !searchLoading && (
          <div className="text-center mb-4">
            {filteredServices.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-600">
                  Tìm thấy <span className="font-semibold text-blue-600">{filteredServices.length}</span> lĩnh vực 
                  cho từ khóa "<span className="font-semibold">{searchQuery}</span>"
                </p>
        
              </div>
            ) : (
              <div className="text-gray-600">
                <p>Không tìm thấy thủ tục nào cho "<span className="font-semibold">{searchQuery}</span>"</p>
              </div>
            )}
          </div>
        )}

        {/* Service Grid */}
        {filteredServices.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Scroll Indicator */}
            {filteredServices.length > 6 && (
              <div className="mb-4 text-center">
                <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
                  <span>📋 {filteredServices.length} lĩnh vực có sẵn</span>
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
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="kiosk-card relative Shadow hover:shadow-lg transition-shadow duration-200"
                >
                  
                  <h3 className="text-xl font-semibold text-center text-gray-800 mb-4">
                    {service.name}
                  </h3>
                  
                  {/* Show matching procedures if in search mode */}
                  {isSearchMode && (
                    <div className="text-sm text-gray-600 mb-2 px-2">
                      {searchResults
                        .filter(proc => proc.field_id === service.id)
                        .map(proc => (
                          <div key={proc.id} className="mb-1 text-center">
                            📋 {proc.name}
                          </div>
                        ))
                      }
                    </div>
                  )}
                  
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
          service={selectedProcedure?.name || selectedServiceName}
          serviceId={selectedService ? parseInt(selectedService) : undefined}
          selectedProcedure={selectedProcedure}
          onConfirm={handleConfirmCounter}
          onClose={handleCloseConfirm}
        />
      )}

      {/* Virtual Keyboard */}
      {showVirtualKeyboard && (
        <VirtualKeyboard
          value={searchQuery}
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
