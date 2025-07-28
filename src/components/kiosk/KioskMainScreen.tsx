'use client';
import Head from 'next/head';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { AudioLines } from 'lucide-react';
import { toast } from 'react-toastify';
import ConfirmCounter from '@/components/kiosk/confirm-counter';
import VirtualKeyboard from './VirtualKeyboard';
import SpeechToText from './SpeechToText';
import { useCreateTicket } from '@/hooks/useApi';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { countersAPI, Counter } from '@/libs/rootApi';
import '@/app/index.css';
import PopUp from './PopUp';
import DateTimeVN from '../shared/DateTimeVN';
import PrintTicket from '@/components/kiosk/PrintTicket';


const services = [
  { id: 1, name: 'Tư pháp' },
  { id: 2, name: 'Thanh tra' },
  { id: 3, name: 'Văn hóa TT - DL' },
  { id: 4, name: 'Giáo dục Đào tạo' },
  { id: 5, name: 'Y tế' },
  { id: 6, name: 'Nông nghiệp và Môi trường' },
  { id: 7, name: 'Xây dựng' },
  { id: 8, name: 'Tài chính' },
  { id: 9, name: 'Công thương' },
  { id: 10, name: 'Nội vụ' },
  { id: 11, name: 'Dân tộc - Tôn giáo' },
];

// Mapping lĩnh vực với quầy phục vụ - DEPRECATED: Use API data instead
const legacyCounters = [
  { id: 1, name: 'Thuế', serviceNames: 'Thuế', serviceIds: [] },
  { id: 2, name: 'Văn phòng đăng kí đất đai khu vực 9', serviceNames: 'Văn phòng đăng kí đất đai khu vực 9', serviceIds: [] },
  { id: 3, name: 'Lĩnh vực Kinh tế', serviceNames: 'Lĩnh vực Kinh tế', serviceIds: [] },
  { id: 4, name: 'Tư pháp - Hộ tịch (Chứng thực điện tử)', serviceNames: 'Tư pháp - Hộ tịch (Chứng thực điện tử)', serviceIds: [] },
  { id: 5, name: 'Tư pháp - Hộ tịch', serviceNames: 'Tư pháp - Hộ tịch', serviceIds: [] },
  { id: 6, name: 'Điện lực', serviceNames: 'Điện lực', serviceIds: [] },
  { id: 7, name: 'Bảo hiểm xã hội', serviceNames: 'Bảo hiểm xã hội', serviceIds: [] },
  { id: 8, name: 'Lĩnh vực Văn hoá - Xã hội', serviceNames: 'Lĩnh vực Văn hoá - Xã hội', serviceIds: [] },
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
  serviceNames?: string; // Add optional serviceNames field
}

export default function KioskMainScreen() {

   // Popup state
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const handleOpenPopup = (url: string) => {
    setPopupUrl(url);
    setPopupOpen(true);
  };
  const handleClosePopup = () => {
    setPopupOpen(false);
    setPopupUrl(null);
  };

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
        
        const countersData = await countersAPI.getCounters();
        setApiCounters(countersData);
        setHasLoadedCounters(true); // Mark as loaded
      } catch (error) {
        // ...existing code...
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
    // For legacy compatibility, try to map to service IDs
    serviceIds: getLegacyServiceIds(apiCounter.name),
    serviceNames: getLegacyServiceNames(apiCounter.name)
  }));

  // ...existing code...

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

  // ✅ Enhanced filter logic using API response data directly - shows all counters including paused
  const filteredCounters = useMemo(() => {
    if (!isSearchMode || searchResults.length === 0) {
      // Show all counters (active, paused, offline) - visual effects handle the display
      return counters;
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

    // ...existing code...

    // ✅ Filter using API counter IDs - include all statuses (active, paused, offline)
    const filtered = counters.filter(counter => {
      const isInSearchResults = apiCounterIds.has(counter.id);
      return isInSearchResults; // No status filtering - show all matching counters
    });

    return filtered;
  }, [isSearchMode, searchResults, counters, searchValue]);

  // ✅ Enhanced handleCounterSelect using API search data
  
  const handleCounterSelect = (counter: typeof counters[0]) => {
    // ✅ REMOVED: Pause/offline check - Allow selection of all counters per new logic
    // People can still select paused counters and get tickets into queue
    
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
        
        // ...existing code...
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
    
    // ...existing code...
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

        // 🖨️ Gửi dữ liệu cho PrintTicket component
        setPrintData({
          number: newTicket.number,
          counterId: newTicket.counter_id.toString(),
          counterName: counterName
        });

        // Reset states
        setShowConfirmCounter(false);
        setSelectedService('');
        setSelectedServiceName('');
        setSelectedProcedure(null);

        // Show success toast with data from BE
        toast.success(
          <div style={{ lineHeight: '1.6' }}>
            <div>🎫 Đã in số thứ tự thành công!</div>
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
      // ...existing code...
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

  // const handleSearchClick = () => {
  //   setShowVirtualKeyboard(true);
  // };

  // const handleKeyboardClose = () => {
  //   setShowVirtualKeyboard(false);
  // };

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
      
       <Head>
        <script src="/jsrsasign-all-min.js" id="jsrsasign-script" defer></script>
        <script src="/qz-tray.js" id="qztray-script" defer></script>
        <script src="/sign-message.js" id="signmessage-script" defer></script>
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header màn dọc */}
        {/* <div 
          className="flex items-center justify-center mb-12"
          style={{ backgroundColor: '' }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo_vang.png" 
              alt="logo_vang" 
              width={240}
              height={240}
              className="w-60 h-60 object-contain"
              unoptimized
            />
            <div style={{ marginLeft: '15px'  }}>
              <h1 className="text-3xl font-bold text-red-700 " style={{ lineHeight: '1.5' }}>
                TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG 
              </h1>
               <h1 className="text-3xl font-bold text-red-700 " style={{ lineHeight: '1.3' }}>
                PHƯỜNG HÀ GIANG 1 
              </h1>
              <p className='text-xl font-extrabold text-red-700 mt-3' style={{fontSize: '1.5rem'}}>
                Hành chính phục vụ 
              </p>
            </div>
          </div>
        </div> */}

        {/* Header màn ngang */}

        <div className="flex items-center justify-center mb-6" style={{ minHeight: 200 }}>
          <Image
            src="/images/logo_vang.png"
            alt="logo_vang"
            width={200}
            height={200}
            className="object-contain"
            unoptimized
          />
          <div style={{ marginLeft: '12px' }}>
            <h1 className="text-3xl font-bold text-red-700" style={{ lineHeight: '1.2' }}>
              TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG
            </h1>
            <h1 className="text-3xl font-bold text-red-700" style={{ lineHeight: '1.2' }}>
              PHƯỜNG HÀ GIANG 1
            </h1>
            <p className='text-xl font-extrabold text-red-700 mt-3'>
              Hành chính phục vụ
            </p>
          </div>
        </div>

        {/* DateTimeVN Component */}
        <div className="text-center text-xl font-extrabold text-red-700" style = {{position: 'relative', right: '-260px', top: '-50px'}}>
          <DateTimeVN />
        </div>

        {/* Navigation Bar */}
        <div className="flex space-x-4 mb-16" style={{marginLeft: '44px', minHeight: '50px'}}>
          <button
            aria-current="page"
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700 text-white"
            style={{ lineHeight: '50px', fontSize: '20px' }}
            onClick={() => handleOpenPopup('https://dichvucong.gov.vn/p/home/dvc-trang-chu.html')}
          >
            Dịch Vụ Công Quốc Gia
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            style={{ lineHeight: '50px', fontSize: '20px'}}
            onClick={() => handleOpenPopup('https://dichvucong.gov.vn/p/home/dvc-thanh-toan-phi-le-phi-ho-so.html')}
          >
            Thanh Toán Trực Tuyến
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            style={{ lineHeight: '50px', fontSize: '20px' }}
            onClick={() => handleOpenPopup('https://dichvucong.gov.vn/p/home/dvc-dich-vu-cong-truc-tuyen-ds.html?pCoQuanId=384979')}
          >
            Tra Cứu Thủ Tục Hành Chính
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center gap-4 mb-12 mt-12" style={{ marginTop: '2rem'}}>
          <div className="relative flex items-center w-full max-w-5xl" style={{ marginTop: '-28px', maxWidth: '70rem' }}>
            <div style={{ width: '20px' }}></div>
            <div className="relative flex-1"> 
              <input 
                name='voice-search'
                value={searchQuery}
                // onClick={handleSearchClick}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex items-center gap-2 px-6 py-3 text-lg pr-12 Shadow cursor-pointer transition-all duration-300 w-full ${
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
                  borderRadius: '8px', 
                  border: '1px solid rgb(220 38 38)', 
                  color: 'black', 
                  backgroundColor: isVoiceActive ? '#fef2f2' : 'white',
                  lineHeight: '44px',
                }}
              />
              <AudioLines 
                  size={24} 
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer transition-colors ${
                    isVoiceActive ? 'text-red-500 animate-pulse' : 'text-blue-500 hover:text-blue-700'
                  }`}
                  onClick={handleVoiceSearch}
                />
            </div>
            <div style={{ width: '20px' }}></div>
            <button
              onClick={searchQuery.trim() ? () => setSearchQuery('') : handleVoiceSearch}
              className="px-5 py-3 bg-red-600 text-white font-extrabold text-base shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              style={{ whiteSpace: 'nowrap', minHeight: '70px', minWidth: '140px', borderRadius: '8px', textAlign: 'center' }}
            >
              {searchQuery.trim() ? (
                <span style={{fontSize: '1.2rem', fontWeight: 'bold'}}>🗑️ Xóa tìm kiếm</span>
              ) : (
                <span style={{fontSize: '1.2rem', fontWeight: 'bold', width: '100%', display: 'inline-block', textAlign: 'center'}}>Tìm kiếm bằng giọng nói</span>
              )}
            </button>
            {/* Voice Status Indicator */}
            {isVoiceActive && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                🎤 {voiceStopTrigger === 'enter-key' ? 'Đang nghe... (Enter để dừng)' : 'Bấm ra ngoài để dừng ... '}
              </div>
            )}
          </div>
          {/* Đã gộp nút xóa tìm kiếm vào nút voice */}
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
          <div className="flex flex-col items-center" >
            {/* Scroll Indicator */}
            {filteredCounters.length > 4 && (
              <div className="mb-4 text-center">
                <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
                  <span>📋 {filteredCounters.length} quầy có sẵn</span>
                </p>
              </div>
            )}
            
            {/* Grid màn dọc */}
            <div 
              className="service-grid-container grid grid-cols-2 gap-6 overflow-y-auto p-4 border rounded-lg backdrop-blur-sm"
            >
              {filteredCounters.map((counter, idx) => {
                // So le: idx 0,3,4,... (quầy 1,4,5,...) nền đỏ; idx 1,2,5,... nền trắng
                const isRed = idx === 0 || idx === 3 || idx === 4 || idx === 7;
                return (
                  <div
                    key={counter.id}
                    onClick={() => handleCounterSelect(counter)}
                    className={`flex flex-col items-center justify-center text-center kiosk-card relative transition-all duration-200 min-h-[220px] min-w-[380px] cursor-pointer rounded-2xl border-2 border-red-600 shadow-lg hover:scale-105 ${
                      isRed ? 'bg-red-600 text-white hover:bg-red-700 hover:border-red-700' : 'bg-white text-red-700 hover:bg-red-50'
                    }`}
                    style={{minHeight: 215}}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <span className="text-xl font-bold mb-2">{`QUẦY ${String(counter.id).padStart(2, '0')}`}</span>
                      <span className="text-2xl font-extrabold mb-2">{counter.name?.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid màn ngang */}
            {/* <div
              className="service-grid-container grid grid-cols-4  p-6 border rounded-lg backdrop-blur-sm"
              style={{
                width: '1600px',
                margin: '0 auto',
                minHeight: 400,
                background: 'rgba(255,255,255,0.2)',
                boxSizing: 'border-box'
              }}
            >
              {filteredCounters.map((counter, idx) => (
                <div
                  key={counter.id}
                  onClick={() => handleCounterSelect(counter)}
                  className={`flex flex-col items-center justify-center text-center kiosk-card relative transition-all duration-200 cursor-pointer rounded-2xl border-2 border-red-600 shadow-lg hover:scale-105 ${
                    idx % 2 === 0
                      ? 'bg-red-600 text-white hover:bg-red-700 hover:border-red-700'
                      : 'bg-white text-red-700 hover:bg-red-50'
                  }`}
                  style={{
                    minHeight: 180,
                    minWidth: 320,
                    margin: '10px',
                    padding: '24px 0',
                    boxSizing: 'border-box',
                    lineHeight: '35px',
                  }}
                >
                  <span className="text-lg font-bold mb-1">{`QUẦY ${String(idx + 1).padStart(2, '0')}`}</span>
                  <span
                    className="text-xl font-extrabold mb-1  text-center w-full"
                    style={{
                      maxWidth: counter.id === 8 ? '100%' : '80%',
                      lineHeight: '40px',
                    }}
                  >
                    {counter.name?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div> */}
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

        {/* Footer màn dọc */}
        <div className="flex items-center w-full text-gray-600 italic" style={{ position: 'relative', top: '16rem', justifyContent: 'space-around' }}>
          <p className="text-xl font-extrabold text-red-700 ">
              Giờ làm việc (Thứ 2 - Thứ 6): 07h30 - 17h00
          </p>
          <p className="text-xl font-extrabold text-red-700 ">
             Hotline hỗ trợ: 0916670793
          </p>
        </div>

         {/* Footer màn ngang */} 
        {/* <div className="flex items-center w-full text-gray-600 italic" style={{ position: 'relative', top: '2rem', justifyContent: 'space-around' }}>
          <p className="text-xl font-extrabold text-red-700 ">
              Giờ làm việc (Thứ 2 - Thứ 6): 07h30 - 17h30
          </p>
          <p className="text-xl font-extrabold text-red-700 ">
             Hotline hỗ trợ: 0219-1022
          </p>
        </div> */}
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
      {/* {showVirtualKeyboard && (
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
      )} */}

      {/* Speech to Text */}
      <SpeechToText
        onTranscript={handleSpeechTranscript}
        onStop={handleSpeechStop}
        isActive={isVoiceActive}
        stopTrigger={voiceStopTrigger}
      />
      

      {/* Print Component */}
      {printData && (
        <PrintTicket
          number={printData.number}
          counterId={printData.counterId}
          counterName={printData.counterName}
          autoPrint={true}
        />
      )}

      {/* PopUp component (headless, render cuối cùng ngoài nav) */}
      <PopUp url={popupUrl || ''} open={popupOpen} onClose={handleClosePopup} />

    </div>
  );
} 
