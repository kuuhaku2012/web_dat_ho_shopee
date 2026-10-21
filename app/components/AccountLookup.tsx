'use client';

import { FormEvent, useState } from 'react';
import type { DeliveredAccount } from '@/lib/account-delivery';

export default function AccountLookup() {
  const [accounts, setAccounts] = useState<DeliveredAccount[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAccounts(null);
    setMessage('');
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/accounts/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ id: fields.get('id'), phone: fields.get('phone') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAccounts(data.accounts);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể tra cứu.'); }
    finally { setBusy(false); }
  }
  return <div className="account-lookup" id="nhan-tai-khoan"><span className="eyebrow">NHẬN TÀI KHOẢN</span><h4>Xem tài khoản đã được cấp</h4><p>Nhập mã yêu cầu và số điện thoại đã dùng khi đăng ký. Email và mật khẩu xuất hiện sau khi admin hoàn tất yêu cầu.</p>
    <form className="request-form" onSubmit={submit}><label>Mã yêu cầu<input name="id" placeholder="Mã nhận sau khi gửi yêu cầu" required /></label><label>Số điện thoại<input name="phone" type="tel" autoComplete="tel" required /></label><button disabled={busy}>{busy ? 'Đang kiểm tra...' : 'Nhận tài khoản'}</button><p role="alert" className="form-message">{message}</p></form>
    {accounts && <div className="delivered-accounts" role="status">{accounts.map((account, index) => <div key={index}><strong>Tài khoản {index + 1}</strong><p>Email: <code>{account.email}</code></p><p>Mật khẩu: <code>{account.password}</code></p></div>)}<small>Hãy lưu lại thông tin và đổi mật khẩu sau khi đăng nhập.</small></div>}
  </div>;
}
