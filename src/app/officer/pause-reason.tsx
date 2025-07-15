'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface PauseReasonProps {
  onConfirm: (reason: string, duration?: number) => void;
  onClose: () => void;
}

export default function PauseReason({ onConfirm, onClose }: PauseReasonProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [duration, setDuration] = useState<number | undefined>();

  const predefinedReasons = [
    'Nghỉ giải lao',
    'Họp đột xuất',
    'Xử lý công việc khẩn cấp',
    'Hỗ trợ đồng nghiệp',
    'Khác'
  ];

  const handleConfirm = () => {
    const reason = selectedReason === 'Khác' ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason, duration);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Tạm ngưng phục vụ</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lý do tạm ngưng:
          </label>
          <div className="space-y-2">
            {predefinedReasons.map((reason) => (
              <label key={reason} className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="mr-2"
                />
                {reason}
              </label>
            ))}
          </div>
        </div>

        {selectedReason === 'Khác' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do cụ thể:
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập lý do..."
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thời gian dự kiến (phút):
          </label>
          <input
            type="number"
            value={duration || ''}
            onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Không giới hạn"
            className="w-full p-2 border border-gray-300 rounded-md"
            min="1"
            max="480"
          />
          <p className="text-xs text-gray-500 mt-1">
            Để trống nếu không xác định thời gian
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === 'Khác' && !customReason.trim())}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
