'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentStatus, Status } from '@/lib/requests';

export default function UpdateForm({ id, type, status, paymentStatus, internalNote, accountsText }: { id: string; type: 'order' | 'account'; status: Status; paymentStatus: PaymentStatus; internalNote: string; accountsText?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: fields.get('status'), internalNote: fields.get('internalNote'), paymentStatus: fields.get('paymentStatus') || paymentStatus, ...(type === 'account' ? { accountsText: fields.get('accountsText') } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Đã lưu thay đổi.');
      router.refresh();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể lưu.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="admin-form">
    {type === 'order' && paymentStatus !== 'not_required' && <label>Thanh toán<select name="paymentStatus" defaultValue={paymentStatus}><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã nhận tiền</option></select><small>Chỉ chọn “Đã nhận tiền” sau khi kiểm tra giao dịch ngân hàng.</small></label>}
    <label>Trạng thái xử lý<select name="status" defaultValue={status}><option value="new">Mới</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select></label>
    {type === 'account' && <label>Tài khoản giao cho khách<textarea name="accountsText" rows={5} maxLength={10000} defaultValue={accountsText} placeholder={'email@example.com | mật khẩu\nemail2@example.com | mật khẩu'} /><small>Mỗi dòng một tài khoản. Khách chỉ xem được khi trạng thái là “Hoàn tất”.</small></label>}
    <label>Ghi chú nội bộ<textarea name="internalNote" rows={5} maxLength={2000} defaultValue={internalNote} placeholder="Ghi lại thông tin cần theo dõi..." /></label>
    <button className="primary-button" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
    <p role="status" className="admin-save-message">{message}</p>
  </form>;
}
