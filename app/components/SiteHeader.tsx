export default function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return <header className="site-header"><a className="brand" href="/">ĐẶT HỘ<span>SHOPEE</span></a><nav><a href="/dat-ho">Đặt hộ</a><a href="/tai-khoan-moi">Tài khoản mới</a><a href={signedIn ? '/khach-hang' : '/dang-nhap'}>{signedIn ? 'Lịch sử của tôi' : 'Đăng nhập'}</a></nav></header>;
}
