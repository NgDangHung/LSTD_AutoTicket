import React, { useState } from 'react';
import Modal from './Modal';

interface StopServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  counterName?: string;
}

const predefinedReasons = [
  'Nghỉ giải lao',
  'Họp khẩn cấp',
  'Sự cố kỹ thuật',
  'Hết giờ làm việc',
  'Vắng mặt tạm thời',
  'Khác'
];

export default function StopServiceModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  counterName 
}: StopServiceModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    if (reason === 'Khác') {
      setIsCustom(true);
      setCustomReason('');
    } else {
      setIsCustom(false);
      setCustomReason('');
    }
  };

  const handleConfirm = () => {
    const finalReason = isCustom ? customReason.trim() : selectedReason;
    
    if (!finalReason) {
      alert('Vui lòng chọn hoặc nhập lý do ngừng phục vụ');
      return;
    }
    
    onConfirm(finalReason);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setIsCustom(false);
    onClose();
  };

  const canConfirm = selectedReason && (!isCustom || (isCustom && customReason.trim()));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title={`Ngừng phục vụ ${counterName ? `- ${counterName}` : ''}`}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Chọn lý do ngừng phục vụ:
          </h3>
          
          <div className="space-y-2">
            {predefinedReasons.map((reason) => (
              <label 
                key={reason}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedReason === reason 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="stopReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => handleReasonSelect(reason)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700 font-medium">{reason}</span>
              </label>
            ))}
          </div>
        </div>

        {isCustom && (
          <div className="mt-4">
            <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-2">
              Nhập lý do cụ thể:
            </label>
            <textarea
              id="customReason"
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Vui lòng nhập lý do ngừng phục vụ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              canConfirm
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Xác nhận ngừng phục vụ
          </button>
        </div>
      </div>
    </Modal>
  );
}
