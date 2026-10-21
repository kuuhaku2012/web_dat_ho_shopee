'use client';

import { FormEvent, useState } from 'react';

export default function PrivacyRequestForm({ user }: { user: { name: string; phone: string } | null }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestCode, setRequestCode] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/privacy/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: fields.get('type'), requestId: fields.get('requestId'), phone: fields.get('phone'), message: fields.get('message') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể gửi yêu cầu.');
      setRequestCode(data.id);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.'); }
    finally { setBusy(false); }
  }

  if (requestCode) return <div className="receipt" role="status"><h3>Đã ghi nhận yêu cầu quyền dữ liệu</h3><p>Mã yêu cầu: <strong>{requestCode}</strong></p><p>Admin sẽ xem và cập nhật trạng thái trong hệ thống.</p></div>;

  return <form className="request-form privacy-request-form" onSubmit={submit}>
    <label>Loại yêu cầu<select name="type" defaultValue="access"><option value="access">Xem dữ liệu của tôi</option><option value="correction">Sửa dữ liệu</option><option value="withdrawal">Rút lại sự đồng ý</option><option value="deletion">Xóa dữ liệu</option></select></label>
    {user ? <p>Đang gửi với tài khoản {user.name} · {user.phone}. Yêu cầu xóa sẽ áp dụng cho toàn bộ tài khoản và lịch sử.</p> : <><label>Mã yêu cầu<input name="requestId" placeholder="Mã yêu cầu đã nhận" required /></label><label>Số điện thoại<input name="phone" type="tel" autoComplete="tel" required /></label><small>Yêu cầu khách chưa đăng nhập chỉ áp dụng cho mã yêu cầu này.</small></>}
    <label>Thông tin bổ sung<textarea name="message" maxLength={1000} rows={3} placeholder="Mô tả điều bạn muốn xem, sửa hoặc xóa (không bắt buộc)" /></label>
    <button disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu quyền dữ liệu'}</button>
    <p className="form-message" role="alert">{message}</p>
  </form>;
}
