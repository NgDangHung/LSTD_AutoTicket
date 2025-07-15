'use client';

import React, { useEffect, useState } from 'react';
import { CounterQueueManager, type CounterInfo } from '@/libs/counterQueue';
import { counterStatusManager, type CounterStatus } from '@/libs/counterStatus';
import NumberAnimation from './NumberAnimation';

export default function QueueDisplay() {
  const [queueData, setQueueData] = useState<Array<{
    counter: CounterInfo;
    serving: any[];
    waiting: any[];
  }>>([]);
  const [counterStatuses, setCounterStatuses] = useState<Record<string, CounterStatus>>({});

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

  // Initialize and setup polling
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
    
    // Polling every 3 seconds
    const interval = setInterval(refreshData, 3000);
    
    return () => {
      window.removeEventListener('counterQueueUpdated', handleQueueUpdate);
      window.removeEventListener('counterStatusUpdated', handleCounterStatusUpdate);
      clearInterval(interval);
    };
  }, []);

  const stats = CounterQueueManager.getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      {/* Header */}
      <header className="bg-black bg-opacity-30 p-6 text-center">
        <h1 className="text-4xl font-bold mb-2">
          TRUNG TÂM HÀNH CHÍNH CÔNG
        </h1>
        <p className="text-xl opacity-90">
          Thông tin số thứ tự - {new Date().toLocaleDateString('vi-VN')}
        </p>
      </header>

      {/* Main Display */}
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto"
            style={{ minHeight: '480px', overflowY: 'auto' }}
        >
          
          {/* Currently Serving */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300">
              🔊 ĐANG PHỤC VỤ
            </h2>
            
            <div className="space-y-4">
              {queueData.map((counterData) => (
                <div key={counterData.counter.id} className="bg-gray-600 bg-opacity-50 rounded-xl p-4">
                  <div className="text-left">
                    <div className="text-lg font-semibold text-white mb-2">
                      {counterData.counter.shortName} | {counterData.counter.name}:
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {counterStatuses[counterData.counter.id] === 'paused' ? (
                        <div className="text-orange-300 text-2xl flex items-center gap-2">
                          <span>⏸️</span>
                          <span>Quầy tạm dừng phục vụ</span>
                        </div>
                      ) : counterData.serving.length > 0 ? (
                        <NumberAnimation number={counterData.serving[0].number} />
                      ) : (
                        <span className="text-1xl text-gray-300">Chưa có số được phục vụ</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting Queue */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-green-300">
              ⏳ SỐ ĐANG CHỜ
            </h2>
            
            {/* <div className="max-h-96 overflow-y-auto space-y-4"> */}
            <div className="max-h-96 space-y-4">
              {queueData.map((counterData) => (
                <div key={counterData.counter.id} className="border-b border-white border-opacity-20 pb-3 last:border-b-0">
                  <div className="text-lg font-semibold mb-8 text-blue-200">
                    {counterData.counter.shortName} | {counterData.counter.name}:
                  </div>
                  {counterData.waiting.length > 0 ? (
                    <div className="text-xl font-bold text-white">
                      {counterData.waiting.map((queue: any, index: number) => (
                        <span key={queue.id}>
                          {queue.number}
                          {index < counterData.waiting.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-lg text-gray-400">
                      Không có số nào đang chờ
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">
                {stats.totalServing}
              </div>
              <div className="text-sm opacity-80">Đang phục vụ</div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-300">
                {stats.totalWaiting}
              </div>
              <div className="text-sm opacity-80">Đang chờ</div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {new Date().toLocaleTimeString('vi-VN')}
              </div>
              <div className="text-sm opacity-80">Thời gian hiện tại</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black bg-opacity-30 p-4 text-center">
        <p className="text-lg">
          🕐 Giờ làm việc: Thứ 2 - Thứ 6: 8:00 - 17:00 | 📞 Hotline: 1900-1234
        </p>
      </footer>
    </div>
  );
}
