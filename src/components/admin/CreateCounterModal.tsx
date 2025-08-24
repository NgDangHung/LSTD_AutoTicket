import React from "react";
import Button from "@/components/shared/Button";


type CreateCounterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  handleUpsert: (name: string, fullName: string) => void;
}

function CreateCounterModal(props: CreateCounterModalProps) {
  const { isOpen, onClose, handleUpsert } = props;
  const [counterName, setCounterName] = React.useState('');
  const [counterFullName, setCounterFullName] = React.useState('');
  const modalRef = React.useRef<HTMLDivElement>(null);
  // Click outside to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const handleSave = () => {
    handleUpsert(counterName, counterFullName);
    setCounterName('');
    setCounterFullName('');
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-8 min-w-[500px]">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Tạo quầy mới</h2>
        <div className="mb-4">
          <label className="block font-semibold mb-2 text-gray-800">Tên quầy (có thể chứa từ viết tắt)</label>
          <input
            className="bg-gray-200 text-gray-800 w-full border rounded px-3 py-2"
            value={counterName}
            onChange={e => setCounterName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-2 text-gray-800">Tên quầy đầy đủ để tạo file âm thanh</label>
          <input
            className="bg-gray-200 text-gray-800 w-full border rounded px-3 py-2"
            value={counterFullName}
            onChange={e => setCounterFullName(e.target.value)}
          />
        </div>
        <div className="flex gap-4 justify-center">
          <Button
            variant="secondary" size="md"
            onClick={onClose}
            style={{ width: '150px' }}
          > Hủy </Button>
          <Button
            variant="success" size="md"
            onClick={handleSave}
            style={{ width: '150px' }}
          > Lưu </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateCounterModal;