import React from "react";

type FooterConfigModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: { workingHours: string; hotline: string }) => void;
    initialConfig: { workingHours: string; hotline: string };
  }

function FooterConfigModal(props: FooterConfigModalProps) {
const { isOpen, onClose, onSave, initialConfig } = props;
const [workingHours, setWorkingHours] = React.useState(initialConfig.workingHours);
const [hotline, setHotline] = React.useState(initialConfig.hotline);

React.useEffect(() => {
    setWorkingHours(initialConfig.workingHours);
    setHotline(initialConfig.hotline);
}, [initialConfig]);

if (!isOpen) return null;
return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-lg shadow-lg p-8 min-w-[500px]">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Chỉnh sửa thông tin footer</h2>
        <div className="mb-4">
        <label className="block font-semibold mb-2 text-gray-800">Giờ làm việc</label>
        <input
            className="w-full border rounded px-3 py-2"
            value={workingHours}
            onChange={e => setWorkingHours(e.target.value)}
        />
        </div>
        <div className="mb-4">
        <label className="block font-semibold mb-2 text-gray-800">Hotline hỗ trợ</label>
        <input
            className="w-full border rounded px-3 py-2"
            value={hotline}
            onChange={e => setHotline(e.target.value)}
        />
        </div>
        <div className="flex gap-4 justify-center">
            <button 
                className="px-4 py-2 bg-gray-500 rounded"  
                onClick={onClose}
                style={{ width: '150px' }}
            > Hủy </button>
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => onSave({ workingHours, hotline })}
                style={{ width: '150px' }}
            > Lưu </button>
        </div>
    </div>
    </div>
);
}

export default FooterConfigModal;

