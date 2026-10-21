import CustomerAuthForm from '../components/CustomerAuthForm';

export default function CustomerLoginPage() {
  return <main className="customer-auth-layout"><div className="customer-auth-art"><a className="brand" href="/">ĐẶT HỘ<span>SHOPEE</span></a><div><span className="eyebrow">THEO DÕI YÊU CẦU</span><h1>Đơn của bạn,<br />luôn dễ theo dõi.</h1><p>Đăng nhập để xem lịch sử yêu cầu, trạng thái xử lý và tài khoản đã nhận.</p></div></div><div className="customer-auth-content"><div className="customer-auth-card"><span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span><h2>Đăng nhập</h2><p>Nhập số điện thoại hoặc tên đăng nhập quản trị.</p><CustomerAuthForm mode="login" /><p>Chưa có tài khoản khách? <a href="/dang-ky">Đăng ký ngay</a></p><a className="customer-back" href="/">← Về trang chủ</a></div></div></main>;
}
