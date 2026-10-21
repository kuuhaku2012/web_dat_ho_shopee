'use client';
import { FormEvent, useState } from 'react';

export default function LoginForm() {
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const password = new FormData(event.currentTarget).get('password');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = '/admin';
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.'); }
  }
  return <form className="admin-form" onSubmit={submit}><label>Mật khẩu quản trị<input name="password" type="password" autoComplete="current-password" required /></label><button className="primary-button">Đăng nhập</button><p className="error" role="alert">{error}</p></form>;
}
