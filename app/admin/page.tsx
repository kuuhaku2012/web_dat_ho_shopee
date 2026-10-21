import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import AdminFrame from './AdminFrame';

const orderLabels: Record<string, string> = { new: 'Mới', processing: 'Đang xử lý', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const paymentLabels: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã nhận tiền', not_required: 'Chưa áp dụng' };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; payment?: string; page?: string }> }) {
  if (!readSession((await cookies()).get(sessionCookie)?.value)) redirect('/admin/login');
  const query = await searchParams;
  const type = ['order', 'account'].includes(query.type || '') ? query.type : undefined;
  const status = ['new', 'processing', 'completed', 'cancelled'].includes(query.status || '') ? query.status : undefined;
  const payment = ['pending', 'confirmed', 'not_required'].includes(query.payment || '') ? query.payment : undefined;
  const requestedPage = Number(query.page);
  const store = getStore();
  const page = store.listRequestsPage({ type, status, paymentStatus: payment }, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, 25);
  const requests = page.items;
  const requestStats = store.getRequestStats();
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (payment) params.set('payment', payment);
    params.set('page', String(target));
    return `/admin?${params.toString()}`;
  };
  const stats = [
    { label: 'Tổng yêu cầu', value: requestStats.total, icon: '▦' },
    { label: 'Đơn mới', value: requestStats.new, icon: '01' },
    { label: 'Chờ xác nhận tiền', value: requestStats.pendingPayment, icon: '◷' },
    { label: 'Đã nhận tiền', value: requestStats.confirmedPayment, icon: '✓' },
  ];
  return <AdminFrame title="Tổng quan đơn hàng" subtitle="Theo dõi yêu cầu đặt hộ và xác nhận tiền công tại một nơi.">
    <div className="admin-stats">{stats.map(stat => <div className="admin-stat" key={stat.label}><span className="admin-stat-icon">{stat.icon}</span><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
    <section className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">DANH SÁCH YÊU CẦU</span><h2>Đơn hàng gần đây</h2></div><span className="admin-count">{page.total} yêu cầu</span></div>
      <form className="admin-filters"><select name="type" defaultValue={type || ''} aria-label="Lọc loại yêu cầu"><option value="">Mọi dịch vụ</option><option value="order">Đặt hộ</option><option value="account">Tài khoản</option></select><select name="status" defaultValue={status || ''} aria-label="Lọc trạng thái xử lý"><option value="">Mọi trạng thái</option><option value="new">Mới</option><option value="processing">Đang xử lý</option><option value="completed">Hoàn tất</option><option value="cancelled">Đã hủy</option></select><select name="payment" defaultValue={payment || ''} aria-label="Lọc thanh toán"><option value="">Mọi thanh toán</option><option value="pending">Chờ xác nhận</option><option value="confirmed">Đã nhận tiền</option><option value="not_required">Chưa áp dụng</option></select><button type="submit">Áp dụng</button></form>
      <div className="admin-table-wrap"><table className="admin-list"><thead><tr><th>YÊU CẦU</th><th>KHÁCH HÀNG</th><th>DỊCH VỤ</th><th>TIỀN CÔNG</th><th>THANH TOÁN</th><th>XỬ LÝ</th><th></th></tr></thead><tbody>{requests.map(item => <tr key={item.id}><td><a className="admin-order-id" href={`/admin/requests/${item.id}`}>#{item.id.slice(0, 8).toUpperCase()}</a><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></td><td><strong>{item.name}</strong><small>{item.phone}</small></td><td>{item.type === 'order' ? `Đặt hộ · Voucher ${item.voucher}` : 'Tài khoản mới'}</td><td className="admin-money">{item.feeAmount ? `${item.feeAmount.toLocaleString('vi-VN')}đ` : 'Báo giá sau'}</td><td><span className={`admin-badge payment-${item.paymentStatus}`}>{paymentLabels[item.paymentStatus]}</span></td><td><span className={`admin-badge order-${item.status}`}>{orderLabels[item.status]}</span></td><td><a className="admin-open" href={`/admin/requests/${item.id}`} aria-label={`Xem yêu cầu ${item.id}`}>→</a></td></tr>)}</tbody></table>{requests.length === 0 && <div className="admin-empty">Chưa có yêu cầu phù hợp bộ lọc.</div>}</div>
      <nav className="admin-pagination" aria-label="Phân trang yêu cầu"><span>Trang {page.page} / {page.pageCount}</span>{page.page > 1 && <a href={pageHref(page.page - 1)}>← Mới hơn</a>}{page.page < page.pageCount && <a href={pageHref(page.page + 1)}>Cũ hơn →</a>}</nav>
    </section>
  </AdminFrame>;
}
