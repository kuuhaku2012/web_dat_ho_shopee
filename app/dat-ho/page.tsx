import { cookies } from 'next/headers';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import { vouchers } from '@/lib/requests';
import RequestForm from '../components/RequestForm';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

export default async function OrderPage() {
  const userId = readCustomerSession((await cookies()).get(customerCookie)?.value);
  const user = userId ? getStore().getCustomer(userId) : null;
  return <main><SiteHeader signedIn={Boolean(user)} /><section className="service-page"><a className="service-back" href="/">← Về trang chủ</a><div className="service-page-heading"><span className="eyebrow">ĐẶT HỘ SẢN PHẨM</span><h1>Đặt hộ Shopee</h1><p>Gửi link và chi tiết món hàng. Chọn voucher, xem tiền công rồi gửi yêu cầu.</p></div><div className="service-page-grid"><article className="service-card"><div className="voucher-list">{vouchers.map(v => <span key={v}>Voucher {v}</span>)}</div><RequestForm type="order" user={user && { name: user.name, phone: user.phone }} /></article><aside className="service-aside"><h2>Thông tin cần biết</h2><p>Tiền công đặt hộ là 25.000đ mỗi yêu cầu. Bạn có thể chọn thêm bảo hành 5.000đ.</p><p>Tiền hàng được thanh toán khi nhận. Sau khi gửi yêu cầu, bạn sẽ thấy mã yêu cầu và VietQR chuyển tiền công.</p>{!user && <p><a href="/dang-nhap">Đăng nhập</a> để tự lưu yêu cầu trong lịch sử.</p>}</aside></div></section><SiteFooter /></main>;
}
