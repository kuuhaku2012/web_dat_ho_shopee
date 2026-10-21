'use client';

import { FormEvent, useState } from 'react';
import { vouchers } from '@/lib/requests';

export default function RequestForm({ type }: { type: 'order' | 'account' }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, type, quantity: Number(data.quantity) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể gửi yêu cầu.');
      setMessage(`Đã nhận yêu cầu. Mã của bạn: ${result.id}. Chúng tôi sẽ liên hệ để xác nhận giá.`);
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="request-form">
    {type === 'order' && <>
      <label>Link sản phẩm Shopee<input name="productUrl" type="url" placeholder="https://shopee.vn/..." required /></label>
      <label>Voucher mong muốn<select name="voucher" required>{vouchers.map(v => <option key={v} value={v}>Voucher {v}</option>)}</select></label>
    </>}
    <label>Số lượng<input name="quantity" type="number" min="1" max="20" defaultValue="1" required /></label>
    <label>Tên của bạn<input name="name" maxLength={100} autoComplete="name" required /></label>
    <div className="form-row"><label>Số điện thoại<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label><label>Email<input name="email" type="email" maxLength={254} autoComplete="email" /></label></div>
    <p className="hint">Nhập ít nhất số điện thoại hoặc email để chúng tôi liên hệ.</p>
    <label>Ghi chú<textarea name="note" maxLength={1000} rows={3} placeholder="Thông tin cần lưu ý (không bắt buộc)" /></label>
    <button type="submit" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
    <p role="status" aria-live="polite" className="form-message">{message}</p>
  </form>;
}
