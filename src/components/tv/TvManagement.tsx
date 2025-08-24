import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { countersAPI, tvGroupsAPI, TVGroup, Counter } from '@/libs/rootApi';
import Modal from '@/components/shared/Modal';

export default function TvManagement() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [groups, setGroups] = useState<TVGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [selectedCounters, setSelectedCounters] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number | null; open: boolean }>({ id: null, open: false });

  // Load counters and groups
  useEffect(() => {
    fetchCounters();
    fetchGroups();
  }, []);

  const fetchCounters = async () => {
    try {
      const data = await countersAPI.getCounters();
      setCounters(data);
    } catch (err) {
      toast.error('Không thể tải danh sách quầy');
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await tvGroupsAPI.getGroups();
      setGroups(data || []);
    } catch (err) {
      // nếu BE chưa có endpoint, mặc định groups rỗng
      setGroups([]);
    }
  };

  const openCreate = () => {
    setEditingGroupId(null);
    setNameInput('');
    setDescriptionInput('');
    setSelectedCounters(new Set());
  };

  const openEdit = (group: TVGroup) => {
    setEditingGroupId(group.id);
    setNameInput(group.name);
    setDescriptionInput(group.description || '');
    setSelectedCounters(new Set(group.counter_ids || []));
  };

  const toggleCounter = (id: number) => {
    const copy = new Set(selectedCounters);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setSelectedCounters(copy);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return toast.warn('Vui lòng nhập tên group');
    setLoading(true);
    const payload = { name: nameInput.trim(), counter_ids: Array.from(selectedCounters), description: descriptionInput.trim() };
    try {
      if (editingGroupId) {
        await tvGroupsAPI.updateGroup(editingGroupId, payload);
        toast.success('Cập nhật group thành công');
      } else {
        await tvGroupsAPI.createGroup(payload);
        toast.success('Tạo group thành công');
      }
      fetchGroups();
      setEditingGroupId(null);
      setNameInput('');
      setDescriptionInput('');
      setSelectedCounters(new Set());
    } catch (err) {
      toast.error('Lỗi khi lưu group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteConfirm({ id, open: true });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setLoading(true);
    try {
      await tvGroupsAPI.deleteGroup(deleteConfirm.id);
      toast.success('Xóa group thành công');
      fetchGroups();
    } catch (err) {
      toast.error('Lỗi khi xóa group');
    } finally {
      setLoading(false);
      setDeleteConfirm({ id: null, open: false });
    }
  };

  const copyGroupLink = async (id: number) => {
    const path = `/tv?groupId=${id}`;
    const full = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(full);
      } else {
        // fallback
        const input = document.createElement('input');
        input.value = full;
        document.body.appendChild(input);
        input.select();
        
        document.body.removeChild(input);
      }
      toast.success('Link TV đã được sao chép thành công');
    } catch (err) {
      console.error('Sao chép không thành công', err);
      toast.error('Không thể sao chép link');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl text-gray-800 font-bold mb-4">Quản lý TV</h2>

      <div className="mb-6 flex justify-between items-center">
        <div />
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors" onClick={openCreate}>Tạo nhóm</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg text-gray-700 font-semibold mb-2">Danh sách nhóm</h3>
          <div className="bg-white border rounded p-3">
            {groups.length === 0 && <div className="text-gray-500">Chưa có nhóm</div>}
            {groups.map(g => (
              <div key={g.id} className="flex items-center justify-between border-b py-2">
                <div>
                  <div className="font-semibold text-gray-700">{g.name}</div>
                  <div className="text-sm text-gray-600">
                    {`${(g.counter_ids?.length || 0)} quầy`}
                    {g.counter_ids && g.counter_ids.length > 0 ? ` (${[...g.counter_ids].sort((a,b) => a - b).join(', ')})` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" onClick={() => copyGroupLink(g.id)}>Copy link</button>
                  <button className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors" onClick={() => openEdit(g)}>Sửa</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" onClick={() => handleDelete(g.id)}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg text-gray-700 font-semibold mb-2">Chi tiết / Tạo mới</h3>
          <div className="bg-white border rounded p-4">
            <div className="mb-3">
              <label className="block text-sm text-gray-700 font-medium mb-1">Tên group</label>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} className="bg-gray-100 text-gray-800 w-full border rounded px-3 py-2"/>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 font-medium mb-1">Mô tả</label>
              <input value={descriptionInput} onChange={e => setDescriptionInput(e.target.value)} className="bg-gray-100 text-gray-800 w-full border rounded px-3 py-2"/>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 font-medium mb-2">Chọn quầy</label>
              <div className="max-h-[300px] overflow-y-auto border rounded p-2">
                {counters.map(c => (
                  <label key={c.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={selectedCounters.has(c.id)} onChange={() => toggleCounter(c.id)} />
                    <span className="ml-2 text-gray-700">{c.id} - {c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button className="px-8 py-2 bg-gray-300 rounded text-gray-700 hover:bg-gray-400 transition-colors" onClick={() => { setEditingGroupId(null); setNameInput(''); setDescriptionInput(''); setSelectedCounters(new Set()); }}>Hủy</button>
              <button className="px-8 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-60" onClick={handleSave} disabled={loading}>{editingGroupId ? 'Cập nhật' : 'Tạo'}</button>
            </div>
          </div>
        </div>
      </div>
      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ id: null, open: false })}
        title="Xác nhận xoá nhóm"
        size="sm"
        showCloseButton={true}
      >
        <div className="mb-4 text-gray-800">Bạn có chắc muốn xoá nhóm này?</div>
        <div className="flex justify-center gap-3">
          <button className="px-8 py-2 rounded bg-gray-300 text-gray-800 hover:bg-gray-400" onClick={() => setDeleteConfirm({ id: null, open: false })} disabled={loading}>Hủy</button>
          <button className="px-8 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete} disabled={loading}>Xóa</button>
        </div>
      </Modal>
    </div>
  );
}
