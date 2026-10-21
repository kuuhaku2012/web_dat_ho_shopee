'use client';

import { FormEvent, useState } from 'react';
import { privacyNoticeVersion } from '@/lib/privacy';

export default function CustomerAuthForm({ mode }: { mode: 'register' | 'login' }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const identifier = String(fields.identifier || '').trim();
      const adminLogin = mode === 'login' && !/^0\d+$/.test(identifier);
      const payload = mode === 'register' ? { ...fields, privacyConsentVersion: fields.privacyConsent === 'on' ? privacyNoticeVersion : '' } : adminLogin ? { username: identifier, password: fields.password } : { phone: identifier, password: fields.password };
      const response = await fetch(adminLogin ? '/api/admin/login' : `/api/user/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tiếp tục.');
      window.location.assign(adminLogin ? '/admin' : '/khach-hang');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.'); setBusy(false); }
  }
  return <form className="customer-auth-form" onSubmit={submit}>
    {mode === 'register' && <label>Họ và tên<input name="name" autoComplete="name" maxLength={100} required /></label>}
    {mode === 'login' ? <label>Số điện thoại hoặc tên đăng nhập<input name="identifier" autoComplete="username" placeholder="Số điện thoại hoặc tên đăng nhập" maxLength={100} required /></label> : <label>Số điện thoại<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxx" pattern="0[0-9]{9}" required /></label>}
    <label>Mật khẩu<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : 1} maxLength={200} required /></label>
    {mode === 'register' && <label className="privacy-consent"><input name="privacyConsent" type="checkbox" required /><span>Tôi đã đọc và đồng ý với <a href="/quyen-rieng-tu" target="_blank" rel="noopener noreferrer">Chính sách quyền riêng tư</a>.</span></label>}
    <button className="primary-button" disabled={busy}>{busy ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
    <p role="alert" className="form-message">{message}</p>
  </form>;
}
