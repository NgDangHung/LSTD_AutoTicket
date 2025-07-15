'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useProceduresExtended } from '@/hooks/useApi';

interface Counter {
  id: number;
  name: string;
  status: string;
}

interface ConfirmCounterProps {
  service: string;
  serviceId?: number;
  onConfirm: (counterId: string) => void;
  onClose: () => void;
}

export default function ConfirmCounter({ service, serviceId, onConfirm, onClose }: ConfirmCounterProps) {
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  const [counters, setCounters] = useState<Counter[]>([]);
  
  // API hooks
  const { procedures, loading, error, searchProcedures } = useProceduresExtended();

  // Extract counters from procedures API response
  useEffect(() => {
    // Trigger search for procedures when component mounts
    searchProcedures(service);
  }, [service, searchProcedures]);

  useEffect(() => {
    if (procedures && procedures.length > 0) {
      // If serviceId is provided, find specific procedure
      if (serviceId) {
        const targetProcedure = procedures.find((proc: { id: number; counters?: Counter[] }) => proc.id === serviceId);
        if (targetProcedure && targetProcedure.counters) {
          setCounters(targetProcedure.counters);
        }
      } else {
        // If no specific serviceId, aggregate all available counters
        const allCounters: Counter[] = [];
        procedures.forEach((proc: { counters?: Counter[] }) => {
          if (proc.counters) {
            proc.counters.forEach((counter: Counter) => {
              // Avoid duplicates
              if (!allCounters.find(c => c.id === counter.id)) {
                allCounters.push(counter);
              }
            });
          }
        });
        setCounters(allCounters);
      }
    }
  }, [procedures, serviceId]);

  const handleConfirm = () => {
    if (selectedCounter) {
      onConfirm(selectedCounter);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách quầy...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-red-600">Lỗi tải dữ liệu</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">⚠️ {error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Xác nhận thông tin</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-black">Dịch vụ đã chọn:</h3>
          <p className="text-blue-600 font-medium">{service}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-black">Chọn quầy phục vụ:</h3>
          
          {/* Counter Count Indicator */}
          {counters.length > 6 && (
            <div className="mb-3 text-center">
              <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
                <span>🏢 {counters.length} quầy có sẵn</span>
              </p>
            </div>
          )}
          
          <div 
            className="counter-list-container space-y-2 overflow-y-auto pr-2"
            style={{ 
              maxHeight: '300px' // Height for approximately 6 items (50px each + spacing)
            }}
          >
            {counters.length > 0 ? (
              counters.map((counter) => {
                const isActive = counter.status === 'active';
                const counterId = counter.id.toString();
                
                return (
                  <label
                    key={counter.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                      !isActive 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : selectedCounter === counterId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="counter"
                      value={counterId}
                      checked={selectedCounter === counterId}
                      onChange={(e) => setSelectedCounter(e.target.value)}
                      disabled={!isActive}
                      className="mr-3"
                    />
                    <span className="text-black">{counter.name}</span>
                    {!isActive && (
                      <span className="ml-auto text-sm text-red-500">(Không hoạt động)</span>
                    )}
                  </label>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>⚠️ Không có quầy nào khả dụng cho dịch vụ này</p>
                <p className="text-sm mt-2">Vui lòng chọn dịch vụ khác hoặc liên hệ nhân viên hỗ trợ</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-black"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCounter}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            In số thứ tự
          </button>
        </div>
      </div>
    </div>
  );
}
