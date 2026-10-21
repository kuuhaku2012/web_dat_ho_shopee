import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import CustomerLogout from '../components/CustomerLogout';
import ClaimRequest from '../components/ClaimRequest';

export const dynamic = 'force-dynamic';

const statusLabels = { new: 'Mới', processing: 'Đang xử lý', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const paymentLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã nhận tiền', not_required: 'Chưa áp dụng' };

export default async function CustomerPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const id = readCustomerSession((await cookies()).get(customerCookie)?.value);
  if (!id) redirect('/dang-nhap');
  const store = getStore();
  const user = store.getCustomer(id);
  if (!user) redirect('/dang-nhap');
  const query = await searchParams;
  const requestedPage = Number(query.page);
  const history = store.listCustomerRequestsPage(id, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, 10);
  const requests = history.items;
  return <main className="customer-dashboard"><header className="customer-header"><a className="brand" href="/">ĐẶT HỘ<span>SHOPEE</span></a><nav><a href="/">Gửi yêu cầu mới</a><CustomerLogout /></nav></header><div className="customer-dashboard-inner"><div className="customer-welcome"><div><span className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</span><h1>Xin chào, {user.name}</h1><p>{user.phone} · Theo dõi mọi yêu cầu của bạn tại đây.</p></div><span className="customer-count">{history.total} yêu cầu</span></div><div className="customer-dashboard-grid"><section className="customer-history"><div className="customer-section-title"><span className="eyebrow">LỊCH SỬ</span><h2>Yêu cầu của bạn</h2></div>{requests.length === 0 ? <div className="customer-empty">Chưa có yêu cầu nào. <a href="/">Gửi yêu cầu đầu tiên →</a></div> : <div className="customer-request-list">{requests.map(item => <article className="customer-request" key={item.id}><div className="customer-request-head"><div><span className="eyebrow">{item.type === 'order' ? 'ĐẶT HỘ SHOPEE' : 'TÀI KHOẢN MỚI'}</span><h3>#{item.id.slice(0, 8).toUpperCase()}</h3><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div><span className={`admin-badge order-${item.status}`}>{statusLabels[item.status]}</span></div><dl><div><dt>Mã yêu cầu</dt><dd>{item.id}</dd></div>{item.type === 'order' ? <><div><dt>Voucher</dt><dd>{item.voucher}</dd></div><div><dt>Tiền công</dt><dd>{item.feeAmount.toLocaleString('vi-VN')}đ</dd></div><div><dt>Thanh toán</dt><dd>{paymentLabels[item.paymentStatus]}</dd></div></> : <div><dt>Số tài khoản</dt><dd>{item.quantity}</dd></div>}</dl>{item.type === 'account' && item.status === 'completed' && <div className="customer-delivery"><strong>Tài khoản đã cấp</strong>{store.getDeliveredAccounts(item.id)?.map((account, index) => <p key={index}>#{index + 1} · {account.email}<br />Mật khẩu: <code>{account.password}</code></p>)}</div>}</article>)}</div>}<nav className="customer-pagination" aria-label="Phân trang lịch sử"><span>Trang {history.page} / {history.pageCount}</span>{history.page > 1 && <a href={`/khach-hang?page=${history.page - 1}`}>← Mới hơn</a>}{history.page < history.pageCount && <a href={`/khach-hang?page=${history.page + 1}`}>Cũ hơn →</a>}</nav></section><aside className="customer-side"><span className="eyebrow">YÊU CẦU ĐÃ GỬI TRƯỚC ĐÂY</span><h2>Thêm vào lịch sử</h2><p>Nhập mã yêu cầu đã gửi bằng số {user.phone} khi chưa đăng nhập.</p><ClaimRequest /><div className="customer-help"><strong>Cần hỗ trợ?</strong><p>Liên hệ admin và cung cấp mã yêu cầu để được kiểm tra.</p></div></aside></div></div></main>;
}
