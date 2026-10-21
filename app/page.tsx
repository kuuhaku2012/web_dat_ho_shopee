import { cookies } from 'next/headers';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

export default async function Home() {
  const signedIn = Boolean(readCustomerSession((await cookies()).get(customerCookie)?.value));
  return <main><SiteHeader signedIn={signedIn} />
    <section className="hero"><div className="hero-copy"><span className="eyebrow">DỊCH VỤ ĐẶT HỘ SHOPEE</span><h1>Bạn chọn món.<br /><em>Chúng tôi hỗ trợ đặt.</em></h1><p>Chọn dịch vụ bạn cần, gửi thông tin và theo dõi yêu cầu trong tài khoản của mình.</p><a className="hero-button" href="/dat-ho">Đặt hộ sản phẩm <span aria-hidden="true">→</span></a></div><div className="hero-art" aria-hidden="true"><div className="art-circle"><span className="bag">S</span></div><div className="art-tag tag-one">Voucher<br /><strong>40 · 50 · 60 · 80 · 100</strong></div><div className="art-tag tag-two">Tiền công<br /><strong>25.000đ / yêu cầu</strong></div></div></section>
    <section className="services"><div className="section-heading"><span className="eyebrow">DỊCH VỤ</span><h2>Bạn cần hỗ trợ gì?</h2><p>Mỗi dịch vụ có trang riêng để bạn điền thông tin dễ dàng.</p></div><div className="service-grid service-choices"><article className="service-card"><span className="eyebrow">01 / ĐẶT HỘ SẢN PHẨM</span><h3>Đặt hộ Shopee</h3><p>Gửi link sản phẩm, chọn voucher và bảo hành. Xem tiền công trước khi gửi yêu cầu.</p><a className="service-link" href="/dat-ho">Đến trang đặt hộ <span aria-hidden="true">→</span></a></article><article className="service-card alternate"><span className="eyebrow">02 / TÀI KHOẢN MỚI</span><h3>Yêu cầu tài khoản</h3><p>Gửi số lượng tài khoản cần cấp, theo dõi tiến độ và nhận email cùng mật khẩu sau khi hoàn tất.</p><a className="service-link" href="/tai-khoan-moi">Đến trang tài khoản <span aria-hidden="true">→</span></a></article></div></section>
    <section className="intro" id="quy-trinh"><span className="eyebrow">CÁCH THỨC HOẠT ĐỘNG</span><h2>Ba bước đơn giản</h2><div className="steps"><article><span>01</span><h3>Gửi yêu cầu</h3><p>Điền thông tin ở trang dịch vụ phù hợp.</p></article><article><span>02</span><h3>Xác nhận</h3><p>Chúng tôi kiểm tra và liên hệ với bạn.</p></article><article><span>03</span><h3>Theo dõi</h3><p>Xem trạng thái trong lịch sử yêu cầu.</p></article></div></section>
    <SiteFooter />
  </main>;
}
