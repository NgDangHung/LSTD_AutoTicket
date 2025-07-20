'use client';

import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useProceduresExtended } from '@/hooks/useApi';

interface Counter {
  id: number;
  name: string;
  status: string;
}

interface Procedure {
  id: number;
  name: string;
  field_id: number;
  counters: Counter[];
  serviceNames?: string; // Add optional serviceNames field
}

interface ConfirmCounterProps {
  service: string;
  serviceId?: number;
  selectedProcedure?: Procedure | null; // Add selected procedure prop
  onConfirm: (counterId: string) => void;
  onClose: () => void;
}

export default function ConfirmCounter({ service, serviceId, selectedProcedure, onConfirm, onClose }: ConfirmCounterProps) {
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  const [counters, setCounters] = useState<Counter[]>([]);
  
  // API hooks - only used as fallback
  const { procedures, loading, error, searchProcedures } = useProceduresExtended();

  // Use selectedProcedure if available, otherwise fallback to API
  useEffect(() => {
    if (selectedProcedure && selectedProcedure.counters) {
      // Use procedure data passed from parent
      setCounters(selectedProcedure.counters);
      
      // ✅ UPDATED: Auto-select first counter (any status) instead of only active
      const firstCounter = selectedProcedure.counters[0];
      if (firstCounter) {
        setSelectedCounter(firstCounter.id.toString());
      }
      
      console.log('✅ Using selected procedure counters:', selectedProcedure.counters);
    } else {
      // Fallback: Trigger search for procedures when component mounts
      console.log('⚠️ No selected procedure, falling back to API search');
      searchProcedures(service);
    }
  }, [service, selectedProcedure, searchProcedures]);

  // Fallback: Extract counters from procedures API response when no selectedProcedure
  useEffect(() => {
    if (!selectedProcedure && procedures && procedures.length > 0) {
      // If serviceId is provided, find specific procedure
      if (serviceId) {
        const targetProcedure = procedures.find((proc: { id: number; counters?: Counter[] }) => proc.id === serviceId);
        if (targetProcedure && targetProcedure.counters) {
          setCounters(targetProcedure.counters);
          
          // ✅ UPDATED: Auto-select first counter (any status) instead of only active
          const firstCounter = targetProcedure.counters[0];
          if (firstCounter) {
            setSelectedCounter(firstCounter.id.toString());
          }
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
        
        // ✅ UPDATED: Auto-select first counter (any status) instead of only active
        const firstCounter = allCounters[0];
        if (firstCounter) {
          setSelectedCounter(firstCounter.id.toString());
        }
      }
    }
  }, [procedures, serviceId, selectedProcedure]);

  const handleConfirm = () => {
    // Use the auto-selected counter (first counter regardless of status)
    if (selectedCounter) {
      onConfirm(selectedCounter);
    } else {
      // ✅ UPDATED: Fallback - find first counter (any status) instead of only active
      const firstCounter = counters[0];
      if (firstCounter) {
        onConfirm(firstCounter.id.toString());
      }
    }
  };

  // Loading state - only show when falling back to API and no selectedProcedure
  if (!selectedProcedure && loading) {
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

  // Error state - only show when falling back to API and no selectedProcedure
  if (!selectedProcedure && error) {
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

        {/* Service Area Information */}
        {selectedProcedure?.serviceNames && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Phục vụ lĩnh vực:</h3>
            <p className="text-blue-700">{selectedProcedure.serviceNames}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-black">Quầy phục vụ:</h3>
          
          <div 
            className="counter-list-container space-y-2 overflow-y-auto pr-2"
            style={{ 
              maxHeight: '200px' // Reduced height since we only show text
            }}
          >
            {counters.length > 0 ? (
              <div className="space-y-2">
                {counters.map((counter, index) => {
                  return (
                    <div
                      key={counter.id}
                      className="p-3 border rounded-lg bg-blue-50 border-blue-200 text-blue-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{counter.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>⚠️ Không có quầy nào khả dụng cho thủ tục này</p>
                <p className="text-sm mt-2">Vui lòng chọn thủ tục khác hoặc liên hệ nhân viên hỗ trợ</p>
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
            disabled={counters.length === 0}
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
