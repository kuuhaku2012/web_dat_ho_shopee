'use client';

import { FormEvent, useState } from 'react';

export default function ClaimRequest() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const id = new FormData(event.currentTarget).get('id');
    try {
      const response = await fetch('/api/user/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể liên kết yêu cầu.'); setBusy(false); }
  }
  return <form className="claim-form" onSubmit={submit}><label>Mã yêu cầu cũ<input name="id" placeholder="Nhập mã nhận khi gửi yêu cầu" required /></label><button disabled={busy}>{busy ? 'Đang kiểm tra...' : 'Thêm vào lịch sử'}</button><p role="alert" className="form-message">{message}</p></form>;
}
