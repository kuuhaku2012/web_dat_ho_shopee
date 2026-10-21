'use client';
import { FormEvent, useState } from 'react';
import type { Status } from '@/lib/requests';

export default function UpdateForm({ id, status, internalNote }: { id: string; status: Status; internalNote: string }) {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: fields.get('status'), internalNote: fields.get('internalNote') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Đã lưu thay đổi.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể lưu.'); }
  }
  return <form onSubmit={submit} className="admin-form"><label>Trạng thái<select name="status" defaultValue={status}><option value="new">Mới</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></label><label>Ghi chú nội bộ<textarea name="internalNote" rows={5} maxLength={2000} defaultValue={internalNote} /></label><button className="primary-button">Lưu thay đổi</button><p role="status">{message}</p></form>;
}
