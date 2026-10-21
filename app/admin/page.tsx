import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import LogoutButton from './LogoutButton';

const labels: Record<string, string> = { new: 'Mới', processing: 'Đang xử lý', completed: 'Hoàn tất', cancelled: 'Đã hủy', order: 'Đặt hộ', account: 'Tài khoản' };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  if (!readSession((await cookies()).get(sessionCookie)?.value)) redirect('/admin/login');
  const query = await searchParams;
  const type = ['order', 'account'].includes(query.type || '') ? query.type : undefined;
  const status = ['new', 'processing', 'completed', 'cancelled'].includes(query.status || '') ? query.status : undefined;
  const requests = getStore().listRequests({ type, status });
  return <main className="admin-shell"><div className="admin-top"><a className="brand" href="/">ĐẶT HỘ<span>SHOPEE</span></a><LogoutButton /></div><h1>Yêu cầu của khách</h1><form className="admin-filters"><select name="type" defaultValue={type || ''}><option value="">Mọi loại</option><option value="order">Đặt hộ</option><option value="account">Tài khoản</option></select><select name="status" defaultValue={status || ''}><option value="">Mọi trạng thái</option><option value="new">Mới</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select><button>Lọc</button></form><div className="admin-card"><table className="admin-list"><thead><tr><th>Mã</th><th>Khách</th><th>Loại</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>{requests.map(item => <tr key={item.id}><td><a href={`/admin/requests/${item.id}`}>{item.id.slice(0, 8)}</a></td><td>{item.name}</td><td>{labels[item.type]}</td><td>{labels[item.status]}</td><td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td></tr>)}</tbody></table>{requests.length === 0 && <p>Chưa có yêu cầu nào.</p>}</div></main>;
}
