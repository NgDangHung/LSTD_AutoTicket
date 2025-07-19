'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, Mic, Printer, HelpCircle, AudioLines } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '@/components/shared/Button';
import ConfirmCounter from '@/app/kiosk/confirm-counter';
import VirtualKeyboard from './VirtualKeyboard';
import SpeechToText from './SpeechToText';
import { useCreateTicket } from '@/hooks/useApi';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { CounterQueueManager } from '@/libs/counterQueue';
import { countersAPI, Counter } from '@/libs/rootApi';
import '@/app/index.css';
import PrintNow from '@/components/kiosk/PrintTicket'; 


const services = [
  { id: 1, name: 'Chứng thực' },
  { id: 2, name: 'Hộ tịch' },
  { id: 3, name: 'Kiểm Lâm' },
  { id: 4, name: 'Thành lập và hoạt động của hộ kinh doanh' },
  { id: 5, name: 'Hoạt động xây dựng'},
  { id: 6, name: 'Đất đai'},
  { id: 7, name: 'Bảo trợ xã hội'}
];

// Mapping lĩnh vực với quầy phục vụ - DEPRECATED: Use API data instead
const legacyCounters = [
  { 
    id: 1, 
    name: 'Tư pháp', 
    serviceIds: [1, 2],
    serviceNames: 'Chứng thực, Hộ tịch',
    icon: '⚖️'
  },
  { 
    id: 2, 
    name: 'Kinh tế - Hạ tầng - Đô Thị', 
    serviceIds: [3, 4, 5],
    serviceNames: 'Kiểm Lâm, Thành lập và hoạt động của hộ kinh doanh, Hoạt động xây dựng',
    icon: '🏗️'
  },
  { 
    id: 3, 
    name: 'Văn phóng đăng ký đất đai', 
    serviceIds: [6],
    serviceNames: 'Đất đai',
    icon: '🏘️'
  },
  { 
    id: 4, 
    name: 'Văn hóa - Xã hội', 
    serviceIds: [7],
    serviceNames: 'Bảo trợ xã hội',
    icon: '🏛️'
  }
];

// Icons mapping for API counters
const counterIcons: Record<string, string> = {
  'Tư pháp': '⚖️',
  'Kinh tế - Hạ tầng - Đô Thị': '🏗️',
  'Kinh tế - Hạ tầng - Đô thị': '🏗️', // Alternative naming
  'Văn phóng đăng ký đất đai': '🏘️',
  'Văn phòng đăng ký đất đai': '🏘️', // Alternative naming
  'Văn hóa - Xã hội': '🏛️'
};

interface ProcedureResult {
  id: number;
  name: string;
  field_id: number;
  counters: Array<{
    id: number;
    name: string;
    status: string;
  }>;
  serviceNames?: string; // Add optional serviceNames field
}

export default function KioskMainScreen() {
  // Debug: Track component renders
  console.log('🔄 KioskMainScreen rendered at:', new Date().toLocaleTimeString());
  
  // Original states
  const [printData, setPrintData] = useState<{ number: number; counterId: string; counterName: string } | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [showConfirmCounter, setShowConfirmCounter] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStopTrigger, setVoiceStopTrigger] = useState<'outside-click' | 'enter-key' | 'manual'>('manual');

  // New states for procedure search workflow
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureResult | null>(null);

  // API Counter states
  const [apiCounters, setApiCounters] = useState<Counter[]>([]);
  const [countersLoading, setCountersLoading] = useState(false); // Changed: Start with false
  const [countersError, setCountersError] = useState<string | null>(null);
  const [hasLoadedCounters, setHasLoadedCounters] = useState(false); // Add flag to prevent re-loading

  // Load counters from API on component mount
  useEffect(() => {
    const loadCounters = async () => {
      // Prevent multiple calls
      if (hasLoadedCounters || countersLoading) {
        return;
      }

      try {
        setCountersLoading(true);
        setCountersError(null);
        
        console.log('🔄 Loading counters from API...');
        const countersData = await countersAPI.getCounters();
        setApiCounters(countersData);
        setHasLoadedCounters(true); // Mark as loaded
        
        // 🔍 Debug logging
        console.log('✅ API Response:', countersData);
        console.log('📊 Counter status breakdown:', 
          countersData.map(c => ({
            name: c.name,
            id: c.id,
            is_active: c.is_active,
            status: c.status
          }))
        );
      } catch (error) {
        console.error('❌ Failed to load counters:', error);
        setCountersError('Failed to load counters from API');
        
        // Fallback to legacy data
        const fallbackCounters: Counter[] = legacyCounters.map(counter => ({
          id: counter.id,
          name: counter.name,
          is_active: true,
          status: 'active' as const
        }));
        setApiCounters(fallbackCounters);
        setHasLoadedCounters(true); // Mark as loaded even on error
        
        toast.warn('Using offline counter data');
      } finally {
        setCountersLoading(false);
      }
    };

    loadCounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Convert API counters to display format with icons and service mapping
  const counters = apiCounters.map(apiCounter => ({
    id: apiCounter.id,
    name: apiCounter.name,
    status: apiCounter.status,
    // Fix: Use status field as source of truth, fallback to true if active
    is_active: apiCounter.is_active !== undefined ? apiCounter.is_active : (apiCounter.status === 'active'),
    icon: counterIcons[apiCounter.name] || '🏢', // Default icon if not found
    // For legacy compatibility, try to map to service IDs
    serviceIds: getLegacyServiceIds(apiCounter.name),
    serviceNames: getLegacyServiceNames(apiCounter.name)
  }));

  // Debug: Log processed counters
  console.log('🎯 Processed counters for display:', counters.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    is_active: c.is_active,
    willShow: c.status === 'active' ? 'ACTIVE' : c.status === 'paused' ? 'PAUSED' : 'OFFLINE'
  })));

  // Debug: Log loading states
  console.log('📊 Loading states:', {
    countersLoading,
    hasLoadedCounters,
    apiCountersLength: apiCounters.length,
    countersError
  });

  // Helper functions for legacy compatibility
  function getLegacyServiceIds(counterName: string): number[] {
    const legacyMapping = legacyCounters.find(legacy => 
      legacy.name.toLowerCase() === counterName.toLowerCase()
    );
    return legacyMapping?.serviceIds || [];
  }

  function getLegacyServiceNames(counterName: string): string {
    const legacyMapping = legacyCounters.find(legacy => 
      legacy.name.toLowerCase() === counterName.toLowerCase()
    );
    return legacyMapping?.serviceNames || counterName;
  }

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

  // ✅ Enhanced filter logic using API response data directly
  const filteredCounters = useMemo(() => {
    if (!isSearchMode || searchResults.length === 0) {
      return counters.filter(counter => counter.status === 'active');
    }

    // ✅ Extract counter IDs from API search-extended response
    const apiCounterIds = new Set<number>();
    const apiCounterStatuses = new Map<number, string>();
    
    searchResults.forEach(procedure => {
      if (procedure.counters && Array.isArray(procedure.counters)) {
        procedure.counters.forEach(apiCounter => {
          if (typeof apiCounter.id === 'number') {
            apiCounterIds.add(apiCounter.id);
            // ✅ Store status from API response for real-time validation
            apiCounterStatuses.set(apiCounter.id, apiCounter.status);
          }
        });
      }
    });

    console.log('🔍 Search filter data:', {
      searchValue,
      apiCounterIds: Array.from(apiCounterIds),
      apiCounterStatuses: Object.fromEntries(apiCounterStatuses),
      totalCounters: counters.length
    });

    // ✅ Filter using API counter IDs and validate status
    const filtered = counters.filter(counter => {
      const isInSearchResults = apiCounterIds.has(counter.id);
      const isActive = counter.status === 'active';
      
      if (isInSearchResults) {
        console.log(`✅ Counter ${counter.id} (${counter.name}): API status=${apiCounterStatuses.get(counter.id)}, Local status=${counter.status}`);
      }
      
      return isInSearchResults && isActive;
    });

    console.log('🎯 Filtered results:', filtered.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status
    })));

    return filtered;
  }, [isSearchMode, searchResults, counters, searchValue]);

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

  // ✅ Enhanced handleCounterSelect using API search data
  const handleCounterSelect = (counter: typeof counters[0]) => {
    // Check if counter is active - Fix: Only check status field
    if (counter.status === 'paused' || counter.status === 'offline') {
      toast.warn(
        <div>
          <div>⚠️ Quầy hiện không khả dụng</div>
          <div>🏢 {counter.name}</div>
          <div>📊 Trạng thái: {
            counter.status === 'paused' ? 'Tạm dừng' : 'Ngừng hoạt động'
          }</div>
        </div>,
        { position: "top-center", autoClose: 3000 }
      );
      return;
    }
    
    // ✅ If in search mode, find matching procedure from API results
    if (isSearchMode && searchResults.length > 0) {
      const matchingProcedure = searchResults.find(procedure => 
        procedure.counters?.some(apiCounter => apiCounter.id === counter.id)
      );
      
      if (matchingProcedure) {
        setSelectedProcedure({
          ...matchingProcedure,
          serviceNames: counter.serviceNames // Add serviceNames for compatibility
        });
        setSelectedService(counter.id.toString());
        setSelectedServiceName(`${matchingProcedure.name} - ${counter.name}`);
        setShowConfirmCounter(true);
        
        console.log('✅ Selected procedure from API search:', {
          procedure: matchingProcedure.name,
          counter: counter.name,
          counterId: counter.id,
          fieldId: matchingProcedure.field_id
        });
        return;
      }
    }
    
    // ✅ Fallback: Create mock procedure for direct counter selection
    const mockProcedure: ProcedureResult = {
      id: counter.id,
      name: counter.name,
      field_id: counter.id,
      counters: [{
        id: counter.id,
        name: counter.name,
        status: counter.status || 'active'
      }],
      serviceNames: counter.serviceNames // Add serviceNames to procedure
    };
    
    setSelectedProcedure(mockProcedure);
    setSelectedService(counter.id.toString());
    setSelectedServiceName(counter.name);
    setShowConfirmCounter(true);
    
    console.log('✅ Selected active counter:', {
      counter: counter.name,
      services: counter.serviceNames,
      counterId: counter.id,
      status: counter.status
    });
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

        // 🖨️ Gửi dữ liệu cho PrintNow component
        setPrintData({ number: newTicket.number, counterId, counterName });

        
        // Reset states
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
            <Image 
              src="/images/Logo_vang.png" 
              alt="Logo Ban Gốc" 
              width={240}
              height={240}
              className="w-60 h-60 object-contain"
              priority
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

        {/* Counters Loading State */}
        {countersLoading && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Đang tải thông tin quầy...
            </div>
          </div>
        )}

        {/* Counters Error State */}
        {countersError && (
          <div className="text-center mb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block">
              <p className="text-yellow-800 text-sm">
                ⚠️ {countersError}
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Đang sử dụng dữ liệu offline
              </p>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {isSearchMode && !searchLoading && (
          <div className="text-center mb-4">
            {filteredCounters.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-gray-600">
                  Tìm thấy <span className="font-semibold text-blue-600">{filteredCounters.length}</span> quầy 
                  cho từ khóa "<span className="font-semibold">{searchQuery}</span>"
                </p>
        
              </div>
            ) : (
              <div className="text-gray-600">
                <p>Không tìm thấy quầy nào cho "<span className="font-semibold">{searchQuery}</span>"</p>
              </div>
            )}
          </div>
        )}

        {/* Counter Grid */}
        {!countersLoading && filteredCounters.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Scroll Indicator */}
            {filteredCounters.length > 4 && (
              <div className="mb-4 text-center">
                <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
                  <span>📋 {filteredCounters.length} quầy có sẵn</span>
                </p>
              </div>
            )}
            
            <div 
              className="service-grid-container grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 overflow-y-auto p-4 border rounded-lg bg-white/50 backdrop-blur-sm"
              style={{ 
                maxWidth: '800px', // Reduced width for 2 columns
                maxHeight: '500px' // Increased height for portrait layout
              }}
            >
              {filteredCounters.map((counter) => (
                <div
                  key={counter.id}
                  onClick={() => counter.status === 'active' ? handleCounterSelect(counter) : null}
                  className={`kiosk-card relative shadow transition-all duration-200 min-h-[180px] ${
                    counter.status === 'paused' || counter.status === 'offline'
                      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                      : 'cursor-pointer hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {/* Status Badge */}
                  {(counter.status === 'paused' || counter.status === 'offline') && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        counter.status === 'paused' 
                          ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {counter.status === 'paused' ? '⏸️ Tạm dừng' : '❌ Không hoạt động'}
                      </span>
                    </div>
                  )}
                  
                  {/* Active Status Badge */}
                  {counter.status === 'active' && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        ✅ Hoạt động
                      </span>
                    </div>
                  )}
                  
                  {/* Counter Icon */}
                  <div className="text-center mb-3">
                    <div className={`text-4xl ${counter.status !== 'active' ? 'grayscale' : ''}`}>
                      {counter.icon}
                    </div>
                  </div>
                  
                  {/* Counter Name */}
                  <h3 className={`text-xl font-semibold text-center mb-4 ${
                    counter.status !== 'active' ? 'text-gray-500' : 'text-gray-800'
                  }`}>
                    {counter.name}
                  </h3>
                  
                  {/* Counter Number */}
                  <div className="text-center absolute bottom-5 left-1/2 transform -translate-x-1/2">
                    <div className={`inline-flex items-center gap-2 font-bold text-lg ${
                      counter.status !== 'active' ? 'text-gray-400' : 'text-blue-600'
                    }`}>
                      <Printer size={18} />
                      Quầy {counter.id}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Counters Available */}
        {!countersLoading && filteredCounters.length === 0 && !isSearchMode && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">
              {countersError ? 'Không thể tải dữ liệu quầy' : 'Không có quầy nào khả dụng'}
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
      {printData && (
        <PrintNow
          number={printData.number}
          counterId={printData.counterId}
          counterName={printData.counterName}
          autoPrint={true}
        />
      )}
    </div>
  );
}
