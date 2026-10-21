import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import type { PrivacyRequestStatus, PrivacyRequestType } from '@/lib/privacy';
import AdminFrame from '../AdminFrame';
import PrivacyUpdateForm from './PrivacyUpdateForm';

const typeLabels: Record<PrivacyRequestType, string> = { access: 'Xem dữ liệu', correction: 'Sửa dữ liệu', deletion: 'Xóa dữ liệu', withdrawal: 'Rút lại sự đồng ý' };
const statusLabels: Record<PrivacyRequestStatus, string> = { new: 'Mới', processing: 'Đang xử lý', completed: 'Đã xử lý', rejected: 'Từ chối' };

export default async function PrivacyRequestsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!readSession((await cookies()).get(sessionCookie)?.value)) redirect('/admin/login');
  const query = await searchParams;
  const requestedPage = Number(query.page);
  const page = getStore().listPrivacyRequestsPage(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, 20);
  const requests = page.items;
  return <AdminFrame title="Quyền riêng tư" subtitle="Xem và xử lý yêu cầu khách gửi về dữ liệu cá nhân.">
    <a className="admin-back" href="/admin">← Về đơn hàng</a>
    <div className="privacy-admin-list">{requests.map(item => <article className="admin-panel privacy-admin-card" key={item.id}>
      <div className="admin-panel-head"><div><span className="eyebrow">{typeLabels[item.type]}</span><h2>Yêu cầu #{item.id.slice(0, 8).toUpperCase()}</h2></div><span className={`admin-badge ${item.status === 'new' ? 'order-new' : item.status === 'processing' ? 'order-processing' : item.status === 'completed' ? 'order-completed' : 'order-cancelled'}`}>{statusLabels[item.status]}</span></div>
      <dl className="admin-detail-list"><div><dt>Gửi lúc</dt><dd>{new Date(item.createdAt).toLocaleString('vi-VN')}</dd></div>{item.phone && <div><dt>Số điện thoại</dt><dd>{item.phone}</dd></div>}{item.requestId && <div><dt>Mã yêu cầu</dt><dd>{item.requestId}</dd></div>}{item.message && <div><dt>Nội dung khách gửi</dt><dd>{item.message}</dd></div>}</dl>
      <PrivacyUpdateForm id={item.id} type={item.type} status={item.status} internalNote={item.internalNote} updatedAt={item.updatedAt} />
    </article>)}{requests.length === 0 && <div className="admin-empty">Chưa có yêu cầu quyền dữ liệu.</div>}</div>
    <nav className="admin-pagination" aria-label="Phân trang yêu cầu quyền riêng tư"><span>Trang {page.page} / {page.pageCount} · {page.total} yêu cầu</span>{page.page > 1 && <a href={`/admin/privacy?page=${page.page - 1}`}>← Mới hơn</a>}{page.page < page.pageCount && <a href={`/admin/privacy?page=${page.page + 1}`}>Cũ hơn →</a>}</nav>
  </AdminFrame>;
}
