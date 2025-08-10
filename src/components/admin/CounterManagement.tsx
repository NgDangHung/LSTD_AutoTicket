import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { countersAPI, ttsAPI } from '@/libs/rootApi';
import CreateCounterModal from './CreateCounterModal';

interface Counter {
  id: number;
  name: string;
  status: string;
}

export default function CounterManagement() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterFullName, setNewCounterFullName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load counters
  useEffect(() => {
    fetchCounters();
  }, []);

  const fetchCounters = async () => {
    setLoading(true);
    try {
      const data = await countersAPI.getCounters();
      setCounters(data);
    } catch (err) {
      toast.error('Không thể tải danh sách quầy');
    } finally {
      setLoading(false);
    }
  };
  
  // Đã chuyển logic đồng bộ vào handleUpsert và handleUpdate

  // Add or update counter
  const handleUpsert = async (name: string, fullName: string) => {
    if (!name.trim() || !fullName.trim()) return;
    setLoading(true);
    try {
      // Tạo quầy mới
      const res = await countersAPI.upsertCounter({ counter_id: 0, name });
      // Giả sử BE trả về { id, name } hoặc { counter_id, name }
      const counterId = res?.id;
      const counterName = fullName;
      if (counterId && counterName) {
        await ttsAPI.generateCounterAudio({ counter_id: counterId, name: counterName });
        toast.success('Đã thêm quầy mới và tạo file âm thanh');
      } else {
        toast.success('Đã thêm quầy mới');
      }
      setNewCounterName('');
      setNewCounterFullName('');
      fetchCounters();
    } catch (err) {
      toast.error('Lỗi khi thêm quầy hoặc tạo file âm thanh');
    } finally {
      setLoading(false);
    }
  }

  // Edit counter
  const handleEdit = (counter: Counter) => {
    setEditId(counter.id);
    setEditName(counter.name);
    setEditFullName('');
  };

  const handleUpdate = async () => {
    if (!editName.trim() || editId === null || !editFullName.trim()) return;
    setLoading(true);
    try {
      // Sửa tên quầy
      const res = await countersAPI.upsertCounter({ counter_id: editId, name: editName });
      const counterId = res?.id || editId;
      const counterName = editFullName;
      if (counterId && counterName) {
        await ttsAPI.generateCounterAudio({ counter_id: counterId, name: counterName });
        toast.success('Đã cập nhật tên quầy và tạo file âm thanh');
      } else {
        toast.success('Đã cập nhật tên quầy');
      }
      setEditId(null);
      setEditName('');
      setEditFullName('');
      fetchCounters();
    } catch (err) {
      toast.error('Lỗi khi cập nhật quầy hoặc tạo file âm thanh');
    } finally {
      setLoading(false);
    }
  };

  // Delete counter
  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa quầy này?')) return;
    setLoading(true);
    try {
      await countersAPI.deleteCounter(id);
      toast.success('Đã xóa quầy');
      fetchCounters();
    } catch (err) {
      toast.error('Lỗi khi xóa quầy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-black">Quản lý Quầy</h2>
      <div className="mb-6 flex gap-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          Thêm quầy
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto w-full border border-gray-300 rounded-xl">
        <table className="w-full min-w-[700px] border border-gray-300 rounded-xl shadow-lg overflow-hidden">
          <thead>
            <tr className="bg-gradient-to-r from-blue-700 to-blue-500 text-white text-lg font-bold border-b border-gray-300">
              <th className="py-3 px-5 text-white border-b border-gray-300 rounded-tl-xl">Quầy</th>
              <th 
                className="py-3 px-5 text-white border-b border-gray-300"
                style={{borderLeft: '1px solid #bab5b5'}}
              >
                Tên quầy
              </th>
              <th 
                className="py-3 px-5 text-white border-b border-gray-300 rounded-tr-xl"
                style={{borderLeft: '1px solid #bab5b5'}}
                >
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {counters.map(counter => (
              <tr key={counter.id} className="border-b border-gray-200 hover:bg-blue-50 transition-all">
                <td className="py-3 px-5 text-black font-bold text-base text-center">{counter.id}</td>
                <td className="py-3 px-5 text-black font-medium text-base">
                  {editId === counter.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={editName}
                        style={{ 
                          width: '100%',
                          borderRadius: '8px', 
                          color: 'black', 
                          backgroundColor:'#f8f8f8ff',
                          lineHeight: '24px',
                        }}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
                        value={editFullName}
                        style={{ 
                          width: '100%',
                          borderRadius: '8px', 
                          color: 'black', 
                          backgroundColor:'#f0fff0',
                          lineHeight: '24px',
                        }}
                        onChange={e => setEditFullName(e.target.value)}
                        placeholder="Tên đầy đủ để tạo file âm thanh"
                      />
                    </div>
                  ) : (
                    <span className="text-black font-medium text-base">{counter.name}</span>
                  )}
                </td>
                <td className="py-3 px-5 flex gap-2 items-center justify-center">
                  {editId === counter.id ? (
                    <>
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow font-semibold text-base transition-all" onClick={handleUpdate} disabled={loading}>Lưu</button>
                      <button className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-full shadow font-semibold text-base transition-all" onClick={() => setEditId(null)}>Hủy</button>
                    </>
                  ) : (
                    <>
                      <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-full shadow font-semibold text-base transition-all" onClick={() => handleEdit(counter)} disabled={loading}>Sửa</button>
                      <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow font-semibold text-base transition-all" onClick={() => handleDelete(counter.id)} disabled={loading}>Xóa</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateCounterModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        handleUpsert={handleUpsert}
      />
    </>
  );
}
