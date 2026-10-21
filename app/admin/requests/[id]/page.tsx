import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { readSession, sessionCookie } from '@/lib/auth';
import { getStore } from '@/lib/db';
import { createPaymentDetails } from '@/lib/payment';
import AdminFrame from '../../AdminFrame';
import UpdateForm from './UpdateForm';

export default async function RequestDetails({ params }: { params: Promise<{ id: string }> }) {
  if (!readSession((await cookies()).get(sessionCookie)?.value)) redirect('/admin/login');
  const item = getStore().getRequest((await params).id);
  if (!item) notFound();
  const payment = item.feeAmount > 0 ? createPaymentDetails(item.id, item.feeAmount) : null;
  return <AdminFrame title={`Yêu cầu #${item.id.slice(0, 8).toUpperCase()}`} subtitle={`Được gửi lúc ${new Date(item.createdAt).toLocaleString('vi-VN')}`}>
    <a className="admin-back" href="/admin">← Quay lại danh sách</a>
    <div className="admin-detail-grid">
      <div className="admin-detail-column">
        <section className="admin-panel admin-detail-card"><div className="admin-panel-head"><div><span className="eyebrow">THÔNG TIN KHÁCH HÀNG</span><h2>Người đặt</h2></div></div><dl className="admin-detail-list"><div><dt>Họ tên</dt><dd>{item.name}</dd></div><div><dt>Số điện thoại</dt><dd>{item.phone}</dd></div><div><dt>Tài khoản khách</dt><dd>{item.userId ? 'Đã liên kết' : 'Khách chưa đăng nhập'}</dd></div>{item.address && <div><dt>Địa chỉ nhận hàng</dt><dd>{item.address}</dd></div>}{item.email && <div><dt>Email (đơn cũ)</dt><dd>{item.email}</dd></div>}</dl></section>
        <section className="admin-panel admin-detail-card"><div className="admin-panel-head"><div><span className="eyebrow">CHI TIẾT YÊU CẦU</span><h2>{item.type === 'order' ? 'Đặt hộ Shopee' : 'Tài khoản mới'}</h2></div></div><dl className="admin-detail-list"><div><dt>Số lượng</dt><dd>{item.quantity}</dd></div>{item.type === 'order' && <><div><dt>Voucher</dt><dd>{item.voucher}</dd></div><div><dt>Link sản phẩm</dt><dd className="break-word"><a href={item.productUrl} target="_blank" rel="noopener noreferrer">{item.productUrl} ↗</a></dd></div><div><dt>Chi tiết sản phẩm</dt><dd>{item.productDetails || '—'}</dd></div><div><dt>Bảo hành</dt><dd>{item.warranty ? 'Có · +5.000đ' : 'Không'}</dd></div></>}<div><dt>Ghi chú khách</dt><dd>{item.note || '—'}</dd></div></dl></section>
      </div>
      <div className="admin-detail-column"><section className="admin-panel admin-detail-card"><div className="admin-panel-head"><div><span className="eyebrow">THANH TOÁN</span><h2>Tiền công dịch vụ</h2></div></div><div className="admin-payment-amount">{payment ? `${item.feeAmount.toLocaleString('vi-VN')}đ` : 'Chưa báo giá'}</div><p className="admin-payment-note">{payment ? 'Khách chuyển tiền công qua VietQR. Tiền hàng khách tự thanh toán khi nhận.' : 'Yêu cầu này chưa có số tiền thanh toán.'}</p>{item.type === 'order' && <p><span className={`admin-badge payment-${item.paymentStatus}`}>{({ pending: 'Chờ xác nhận', confirmed: 'Đã nhận tiền', not_required: 'Chưa áp dụng' })[item.paymentStatus]}</span></p>}{payment && <dl className="admin-detail-list"><div><dt>Nội dung chuyển khoản</dt><dd>{payment.transferCode}</dd></div><div><dt>Ngân hàng nhận</dt><dd>{payment.bankName} · {payment.accountName}</dd></div></dl>}</section>
        <section className="admin-panel admin-detail-card"><div className="admin-panel-head"><div><span className="eyebrow">CẬP NHẬT ĐƠN</span><h2>Xử lý yêu cầu</h2></div></div><UpdateForm key={item.updatedAt} id={item.id} type={item.type} status={item.status} paymentStatus={item.paymentStatus} internalNote={item.internalNote} accountsText={item.type === 'account' ? getStore().getDeliveredAccounts(item.id)?.map(account => `${account.email} | ${account.password}`).join('\n') : undefined} /></section>
      </div>
    </div>
  </AdminFrame>;
}
