'use client';

export default function CustomerLogout() {
  async function logout() {
    await fetch('/api/user/logout', { method: 'POST' });
    window.location.assign('/');
  }
  return <button type="button" className="customer-logout" onClick={logout}>Đăng xuất</button>;
}
