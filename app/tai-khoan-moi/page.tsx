import { cookies } from 'next/headers';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import RequestForm from '../components/RequestForm';
import AccountLookup from '../components/AccountLookup';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

export default async function NewAccountPage() {
  const userId = readCustomerSession((await cookies()).get(customerCookie)?.value);
  const user = userId ? getStore().getCustomer(userId) : null;
  return <main><SiteHeader signedIn={Boolean(user)} /><section className="service-page"><a className="service-back" href="/">← Về trang chủ</a><div className="service-page-heading"><span className="eyebrow">TÀI KHOẢN MỚI</span><h1>Yêu cầu tài khoản Shopee</h1><p>Cho chúng tôi biết số lượng bạn cần. Giá và cách cung cấp sẽ được trao đổi trước khi xử lý.</p></div><div className="service-page-grid"><article className="service-card alternate"><RequestForm type="account" user={user && { name: user.name, phone: user.phone }} /></article><aside className="service-aside"><h2>Nhận tài khoản</h2><p>Sau khi admin hoàn tất, email và mật khẩu sẽ hiển thị trong <a href="/khach-hang">lịch sử yêu cầu</a> của bạn.</p><p>Nếu bạn đã gửi khi chưa đăng nhập, hãy dùng mã yêu cầu và số điện thoại bên dưới.</p><AccountLookup /></aside></div></section><SiteFooter /></main>;
}
