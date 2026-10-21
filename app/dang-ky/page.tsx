import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CustomerAuthForm from '../components/CustomerAuthForm';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';

export default async function CustomerRegisterPage() {
  if (readCustomerSession((await cookies()).get(customerCookie)?.value)) redirect('/khach-hang');
  return <main className="customer-auth-layout"><div className="customer-auth-art"><a className="brand" href="/">ĐẶT HỘ<span>SHOPEE</span></a><div><span className="eyebrow">THÀNH VIÊN MỚI</span><h1>Bắt đầu<br />thật đơn giản.</h1><p>Tạo tài khoản để lưu yêu cầu và xem lịch sử của bạn.</p></div></div><div className="customer-auth-content"><div className="customer-auth-card"><span className="eyebrow">TẠO TÀI KHOẢN</span><h2>Đăng ký</h2><p>Chỉ cần tên, số điện thoại và mật khẩu.</p><CustomerAuthForm mode="register" /><p>Đã có tài khoản? <a href="/dang-nhap">Đăng nhập</a></p><a className="customer-back" href="/">← Về trang chủ</a></div></div></main>;
}
