'use client';

import React, { useState, useEffect } from 'react';
import { CounterQueueManager } from '@/libs/counterQueue';
import StopServiceModal from '@/components/shared/StopServiceModal';
import { counterStatusManager, type CounterStatus } from '@/libs/counterStatus';
import { useCounterOperations } from '@/hooks/useApi';

export default function TestQueuePage() {
  const [queueData, setQueueData] = useState<Array<{
    counter: any;
    serving: any[];
    waiting: any[];
  }>>([]);
  const [stopServiceModal, setStopServiceModal] = useState<{
    isOpen: boolean;
    counterId: string;
    counterName: string;
  }>({
    isOpen: false,
    counterId: '',
    counterName: ''
  });
  const [counterStatuses, setCounterStatuses] = useState<Record<string, CounterStatus>>({});

  // API hooks
  const { pauseCounter, resumeCounter, loading: apiLoading, error: apiError, clearError } = useCounterOperations();

  const refreshData = () => {
    const data = CounterQueueManager.getQueuesGroupedByCounter();
    setQueueData(data);
    
    // Update counter statuses
    const statuses: Record<string, CounterStatus> = {};
    data.forEach(counterData => {
      const status = counterStatusManager.getCounterStatus(counterData.counter.id);
      statuses[counterData.counter.id] = status.status;
    });
    setCounterStatuses(statuses);
  };

  useEffect(() => {
    refreshData();
    
    // Listen for queue updates
    const handleQueueUpdate = () => {
      refreshData();
    };
    
    // Listen for counter status updates
    const handleCounterStatusUpdate = () => {
      refreshData();
    };
    
    window.addEventListener('counterQueueUpdated', handleQueueUpdate);
    window.addEventListener('counterStatusUpdated', handleCounterStatusUpdate);
    
    // Polling every 2 seconds
    const interval = setInterval(refreshData, 2000);
    
    return () => {
      window.removeEventListener('counterQueueUpdated', handleQueueUpdate);
      window.removeEventListener('counterStatusUpdated', handleCounterStatusUpdate);
      clearInterval(interval);
    };
  }, []);

  // Accept next ticket for specific counter
  const handleAcceptTicket = (counterId: string) => {
    const success = CounterQueueManager.acceptNextInQueue(counterId);
    if (!success) {
      console.log('⚠️ No waiting tickets for counter', counterId);
      return;
    }
    console.log('✅ Accepted ticket for counter', counterId);
  };

  // Mark current serving ticket as done
  const handleDoneTicket = (counterId: string) => {
    const success = CounterQueueManager.markCurrentAsCompleted(counterId);
    if (!success) {
      console.log('⚠️ No serving ticket for counter', counterId);
      return;
    }
    console.log('✅ Completed ticket for counter', counterId);
  };

  // Clear all queue for specific counter
  const handleClearCounterQueue = (counterId: string) => {
    CounterQueueManager.clearCounterQueue(counterId);
    console.log('🗑️ Cleared all queue for counter', counterId);
  };

  // Handle stop service - open modal
  const handleStopService = (counterId: string) => {
    const counterData = queueData.find(data => data.counter.id === counterId);
    if (!counterData) return;
    
    setStopServiceModal({
      isOpen: true,
      counterId: counterId,
      counterName: `${counterData.counter.shortName} - ${counterData.counter.name}`
    });
  };

  // Handle stop service confirmation
  const handleStopServiceConfirm = async (reason: string) => {
    const { counterId } = stopServiceModal;
    
    try {
      // Call API to pause counter
      const result = await pauseCounter(reason, parseInt(counterId));
      
      if (result) {
        // Update local status
        counterStatusManager.pauseCounter(counterId, reason);
        
        // Get current serving items and mark them as skipped/paused
        const counterData = queueData.find(data => data.counter.id === counterId);
        if (counterData && counterData.serving.length > 0) {
          counterData.serving.forEach((item: any) => {
            CounterQueueManager.updateQueueStatus(item.id, 'skipped');
          });
        }
        
        console.log(`⏸️ Stopped service for counter ${counterId}. Reason: ${reason}`);
      } else {
        console.error('Failed to pause counter via API');
      }
    } catch (error) {
      console.error('Error pausing counter:', error);
    }
    
    // Close modal
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // Handle resume service
  const handleResumeService = async (counterId: string) => {
    try {
      // Call API to resume counter
      const result = await resumeCounter(parseInt(counterId));
      
      if (result) {
        // Update local status
        counterStatusManager.resumeCounter(counterId);
        console.log(`▶️ Resumed service for counter ${counterId}`);
      } else {
        console.error('Failed to resume counter via API');
      }
    } catch (error) {
      console.error('Error resuming counter:', error);
    }
  };

  // Close stop service modal
  const handleStopServiceClose = () => {
    setStopServiceModal({
      isOpen: false,
      counterId: '',
      counterName: ''
    });
  };

  // Global clear all queues
  const handleClearAllQueues = () => {
    CounterQueueManager.clearAllQueues();
    console.log('🗑️ Cleared all queues');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🧪 Test Counter Queue Management System
        </h1>
        
        {/* API Error Display */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-center">
              <div className="text-red-800">
                <h3 className="font-semibold">⚠️ Lỗi API:</h3>
                <p className="text-sm mt-1">{apiError}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 font-bold text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Global Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Global Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={handleClearAllQueues}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Clear All Queues
            </button>
          </div>
        </div>
        
        {/* Counter Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {queueData.map((counterData) => (
            <div key={counterData.counter.id} className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-600">
                {counterData.counter.shortName} | {counterData.counter.name}
              </h2>
              
              {/* Counter Action Buttons */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                {counterStatuses[counterData.counter.id] === 'paused' ? (
                  <button
                    onClick={() => handleResumeService(counterData.counter.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    disabled={apiLoading}
                  >
                    {apiLoading ? '⏳ Đang xử lý...' : '▶️ Tiếp tục'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleStopService(counterData.counter.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    disabled={counterData.serving.length === 0 || apiLoading}
                  >
                    {apiLoading ? '⏳ Đang xử lý...' : '⏸️ Tạm dừng'}
                  </button>
                )}
                
                <button
                  onClick={() => handleAcceptTicket(counterData.counter.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                  disabled={counterData.waiting.length === 0}
                >
                  ✅ Chấp nhận
                </button>
                
                <button
                  onClick={() => handleDoneTicket(counterData.counter.id)}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                  disabled={counterData.serving.length === 0}
                >
                  ✅ Hoàn thành
                </button>
                
                <button
                  onClick={() => handleClearCounterQueue(counterData.counter.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                  🗑️ Xóa hàng chờ
                </button>
              </div>
              
              {/* Serving Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 text-red-600">🔊 Đang phục vụ</h3>
                {counterStatuses[counterData.counter.id] === 'paused' ? (
                  <div className="text-orange-600 font-semibold bg-orange-100 p-3 rounded border-l-4 border-orange-500">
                    ⏸️ Quầy tạm dừng phục vụ
                    {counterStatusManager.getCounterStatus(counterData.counter.id).pauseReason && (
                      <div className="text-sm text-orange-700 mt-1">
                        Lý do: {counterStatusManager.getCounterStatus(counterData.counter.id).pauseReason}
                      </div>
                    )}
                  </div>
                ) : counterData.serving.length > 0 ? (
                  <div className="space-y-2">
                    {counterData.serving.map((item: any) => (
                      <div key={item.id} className="bg-red-100 p-3 rounded border-l-4 border-red-500">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-2xl text-red-700">{item.number}</span>
                          <div className="text-right text-sm">
                            <div className="font-medium">{item.serviceName}</div>
                            <div className="text-gray-600">{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic bg-gray-100 p-3 rounded">Chưa có số được phục vụ</div>
                )}
              </div>

              {/* Waiting Section */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-yellow-600">⏳ Đang chờ ({counterData.waiting.length})</h3>
                {counterData.waiting.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {counterData.waiting.map((item: any, index: number) => (
                      <div key={item.id} className={`p-3 rounded border-l-4 ${
                        index === 0 ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-bold ${index === 0 ? 'text-yellow-700 text-xl' : 'text-gray-700'}`}>
                            {item.number}
                          </span>
                          <div className="text-right text-sm">
                            <div className="font-medium">{item.serviceName}</div>
                            <div className="text-gray-600">{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic bg-gray-100 p-3 rounded">Không có số đang chờ</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {queueData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl">
              Đang khởi tạo hệ thống quầy...
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Hướng dẫn sử dụng:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700">
            <div>
              <h4 className="font-medium mb-1">⏸️ Tạm dừng:</h4>
              <p className="text-sm">Tạm dừng phục vụ với lý do cụ thể</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">✅ Chấp nhận:</h4>
              <p className="text-sm">Chuyển vé từ hàng chờ sang đang phục vụ</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">✅ Hoàn thành:</h4>
              <p className="text-sm">Hoàn thành phục vụ, xóa vé khỏi đang phục vụ</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">🗑️ Xóa hàng chờ:</h4>
              <p className="text-sm">Xóa tất cả vé trong quầy (chờ + phục vụ)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stop Service Modal */}
      <StopServiceModal
        isOpen={stopServiceModal.isOpen}
        onClose={handleStopServiceClose}
        onConfirm={handleStopServiceConfirm}
        counterName={stopServiceModal.counterName}
      />
    </div>
  );
}