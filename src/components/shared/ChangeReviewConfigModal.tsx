import React from 'react';
import Button from './Button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cfg: { feedback_timeout: number; qr_rating: boolean }) => void;
  initialConfig: { feedback_timeout: number; qr_rating: boolean };
};

const ChangeReviewConfigModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [timeout, setTimeoutSec] = React.useState<number>(initialConfig.feedback_timeout || 0);
  const [qrRating, setQrRating] = React.useState<boolean>(!!initialConfig.qr_rating);
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setTimeoutSec(initialConfig.feedback_timeout || 0);
    setQrRating(!!initialConfig.qr_rating);
  }, [initialConfig]);

  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div ref={modalRef} className="bg-white text-gray-800 rounded-lg shadow-lg p-6 min-w-[420px]">
        <h2 className="text-lg font-bold mb-4">Cấu hình đánh giá QR</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Cho phép đánh giá qua QR</label>
          <div className="flex items-center gap-3">
            <input id="qr-rating" type="checkbox" checked={qrRating} onChange={e => setQrRating(e.target.checked)} />
            <label htmlFor="qr-rating" className="text-sm">Bật/ Tắt QR</label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Thời gian cho phép đánh giá (giây)</label>
          <input
            type="number"
            className="bg-gray-100 w-full border rounded px-3 py-2"
            value={timeout}
            min={1}
            onChange={e => setTimeoutSec(Number(e.target.value))}
          />
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="secondary" size="md" onClick={onClose} style={{ width: 170 }}>Huỷ</Button>
          <Button
            variant="success"
            size="md"
            onClick={() => onSave({ feedback_timeout: Number(timeout || 0), qr_rating: !!qrRating })}
            style={{ width: 170 }}
          >Lưu</Button>
        </div>
      </div>
    </div>
  );
};

export default ChangeReviewConfigModal;
