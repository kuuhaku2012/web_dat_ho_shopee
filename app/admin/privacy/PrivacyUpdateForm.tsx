'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PrivacyRequestStatus, PrivacyRequestType } from '@/lib/privacy';

export default function PrivacyUpdateForm({ id, type, status, internalNote, updatedAt }: { id: string; type: PrivacyRequestType; status: PrivacyRequestStatus; internalNote: string; updatedAt: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/privacy/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: fields.get('status'), internalNote: fields.get('internalNote'), erase: fields.get('erase') === 'on' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu.');
      setMessage('Đã lưu thay đổi.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể lưu.'); }
    finally { setBusy(false); }
  }

  return <form key={updatedAt} className="admin-form privacy-update-form" onSubmit={submit}>
    <label>Trạng thái<select name="status" value={nextStatus} onChange={event => setNextStatus(event.target.value as PrivacyRequestStatus)}><option value="new">Mới</option><option value="processing">Đang xử lý</option><option value="completed">Đã xử lý</option><option value="rejected">Từ chối</option></select></label>
    {type === 'deletion' && <label className="privacy-erase"><input name="erase" type="checkbox" required={nextStatus === 'completed'} /> Xác nhận đã xóa hoặc ẩn danh dữ liệu liên quan. Yêu cầu đang xử lý sẽ bị chặn.</label>}
    <label>Ghi chú nội bộ<textarea name="internalNote" rows={2} maxLength={2000} defaultValue={internalNote} placeholder="Kết quả xử lý..." /></label>
    <button className="primary-button" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu trạng thái'}</button>
    <p role="status" className="admin-save-message">{message}</p>
  </form>;
}
