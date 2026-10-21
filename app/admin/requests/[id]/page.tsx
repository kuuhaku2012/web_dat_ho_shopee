import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { readSession, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import UpdateForm from './UpdateForm';

export default async function RequestDetails({ params }: { params: Promise<{ id: string }> }) {
  if (!readSession((await cookies()).get(sessionCookie)?.value)) redirect('/admin/login');
  const item = getStore().getRequest((await params).id);
  if (!item) notFound();
  return <main className="admin-shell"><a href="/admin">← Danh sách yêu cầu</a><h1>Yêu cầu {item.id.slice(0, 8)}</h1><div className="admin-card"><dl className="details"><dt>Loại</dt><dd>{item.type === 'order' ? 'Đặt hộ sản phẩm' : 'Tài khoản mới'}</dd><dt>Tên</dt><dd>{item.name}</dd><dt>Số điện thoại</dt><dd>{item.phone || '—'}</dd><dt>Email</dt><dd>{item.email || '—'}</dd><dt>Số lượng</dt><dd>{item.quantity}</dd>{item.type === 'order' && <><dt>Sản phẩm</dt><dd><a href={item.productUrl} target="_blank" rel="noopener noreferrer">{item.productUrl}</a></dd><dt>Voucher</dt><dd>{item.voucher}</dd></>}<dt>Ghi chú khách</dt><dd>{item.note || '—'}</dd><dt>Ngày tạo</dt><dd>{new Date(item.createdAt).toLocaleString('vi-VN')}</dd></dl></div><div className="admin-card"><h2>Xử lý yêu cầu</h2><UpdateForm id={item.id} status={item.status} internalNote={item.internalNote} /></div></main>;
}
