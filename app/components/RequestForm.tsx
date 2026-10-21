'use client';

import { FormEvent, useRef, useState } from 'react';
import { orderFee, vouchers } from '@/lib/requests';
import { privacyNoticeVersion } from '@/lib/privacy';

type Payment = { amount: number; transferCode: string; qrUrl: string; bankName: string; accountNumber: string; accountName: string };
type Receipt = { id: string; payment: Payment | null };

export default function RequestForm({ type, user }: { type: 'order' | 'account'; user?: { name: string; phone: string } | null }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState<string>('40');
  const [warranty, setWarranty] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const submissionKey = useRef<string | null>(null);
  const storageKey = `request-idempotency:${type}`;

  function forgetPendingKey() {
    submissionKey.current = null;
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage can be disabled by the browser. */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { ...data, type, quantity: Number(data.quantity), warranty: type === 'order' && warranty, privacyConsentVersion: data.privacyConsent ? privacyNoticeVersion : '' };
    let savedKey: string | null = null;
    try { savedKey = sessionStorage.getItem(storageKey); } catch { /* Storage can be disabled by the browser. */ }
    const key = submissionKey.current || savedKey || crypto.randomUUID();
    submissionKey.current = key;
    try { sessionStorage.setItem(storageKey, key); } catch { /* The in-memory key still protects retries in this page. */ }
    try {
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (response.status === 409) forgetPendingKey();
      if (!response.ok) throw new Error(result.error || 'Không thể gửi yêu cầu.');
      forgetPendingKey();
      setReceipt({ id: result.id, payment: result.payment });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.'); }
    finally { setBusy(false); }
  }

  if (receipt) return <div className="receipt" role="status">
    <span className="receipt-icon" aria-hidden="true">✓</span>
    <h4>Đã nhận yêu cầu của bạn</h4>
    <p>Mã yêu cầu: <strong>{receipt.id}</strong></p>
    {receipt.payment ? <>
      <p>Quét VietQR để chuyển <strong>tiền công đặt hộ</strong>. Tiền hàng bạn thanh toán khi nhận hàng.</p>
      <div className="payment-card">
        {/* The QR image contains only recipient details, amount and the order reference. */}
        <img src={receipt.payment.qrUrl} alt={`VietQR chuyển ${receipt.payment.amount.toLocaleString('vi-VN')} đồng cho yêu cầu ${receipt.id}`} width="280" height="330" />
        <div className="payment-details">
          <span>SỐ TIỀN CẦN CHUYỂN</span><strong className="payment-amount">{receipt.payment.amount.toLocaleString('vi-VN')}đ</strong>
          <span>NỘI DUNG CHUYỂN KHOẢN</span><strong>{receipt.payment.transferCode}</strong>
          <span>NGƯỜI NHẬN</span><strong>{receipt.payment.accountName} · {receipt.payment.bankName}</strong>
          <span>SỐ TÀI KHOẢN</span><strong>{receipt.payment.accountNumber}</strong>
          <small>Kiểm tra đúng người nhận và số tiền trong ứng dụng ngân hàng trước khi xác nhận. Đơn được xử lý sau khi admin xác nhận đã nhận tiền.</small>
        </div>
      </div>
    </> : <p>Chúng tôi sẽ liên hệ để báo giá tài khoản và xác nhận thông tin. Hãy lưu mã yêu cầu này để <a href={user ? '/khach-hang' : '#nhan-tai-khoan'}>nhận tài khoản</a> sau khi hoàn tất.</p>}
    {user && <p><a href="/khach-hang">Xem lịch sử yêu cầu của tôi →</a></p>}
    <button className="secondary-button" type="button" onClick={() => { forgetPendingKey(); setReceipt(null); setVoucher('40'); setWarranty(false); }}>Gửi yêu cầu khác</button>
  </div>;

  return <form onSubmit={submit} className="request-form">
    {type === 'order' && <>
      <label>Link sản phẩm Shopee<input name="productUrl" type="url" placeholder="https://shopee.vn/... hoặc https://vn.shp.ee/..." required /></label>
      <label>Chi tiết sản phẩm<textarea name="productDetails" maxLength={500} rows={2} placeholder="Ví dụ: màu đen, size M, phân loại..." /></label>
      <label>Voucher mong muốn<select name="voucher" value={voucher} onChange={event => setVoucher(event.target.value)} required>{vouchers.map(v => <option key={v} value={v}>Voucher {v}</option>)}</select></label>
      <div className="fee-box">
        <span>Tiền công đặt hộ <strong>25.000đ / yêu cầu</strong></span>
        <label className="warranty-choice"><input type="checkbox" name="warranty" checked={warranty} onChange={event => setWarranty(event.target.checked)} /> Thêm bảo hành (+5.000đ)</label>
        <span>Tổng tiền công: <strong>{orderFee(voucher, warranty)?.toLocaleString('vi-VN')}đ</strong></span>
        <small>Tiền hàng thanh toán khi nhận.</small>
      </div>
    </>}
    <label>Số lượng<input name="quantity" type="number" min="1" max="20" defaultValue="1" required /></label>
    <label>Tên của bạn<input name="name" maxLength={100} autoComplete="name" defaultValue={user?.name} required /></label>
    <label>Số điện thoại<input name="phone" type="tel" maxLength={30} autoComplete="tel" defaultValue={user?.phone} readOnly={Boolean(user)} required /></label>
    {type === 'order' && <label>Địa chỉ nhận hàng<textarea name="address" maxLength={300} rows={2} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" required /></label>}
    <label>Ghi chú<textarea name="note" maxLength={1000} rows={3} placeholder="Thông tin cần lưu ý (không bắt buộc)" /></label>
    <label className="privacy-consent"><input name="privacyConsent" type="checkbox" required /><span>Tôi đã đọc và đồng ý với <a href="/quyen-rieng-tu" target="_blank" rel="noopener noreferrer">Chính sách quyền riêng tư</a> để chúng tôi xử lý yêu cầu.</span></label>
    <button type="submit" disabled={busy}>{busy ? 'Đang gửi...' : type === 'order' ? 'Gửi yêu cầu & nhận VietQR' : 'Gửi yêu cầu'}</button>
    <p role="alert" aria-live="polite" className="form-message">{message}</p>
  </form>;
}
