import LogoutButton from './LogoutButton';

export default function AdminFrame({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/admin"><span className="admin-logo-mark">S</span><span>ĐẶT HỘ<small>SHOPEE</small></span></a>
      <div className="admin-nav-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="admin-nav"><a href="/admin"><span>▦</span> Tổng quan đơn hàng</a><a href="/admin/privacy"><span>◇</span> Quyền riêng tư</a><a href="/" target="_blank" rel="noopener noreferrer"><span>↗</span> Xem trang khách</a></nav>
      <div className="admin-sidebar-bottom"><span>Quản trị viên</span><LogoutButton /></div>
    </aside>
    <main className="admin-main"><div className="admin-main-head"><div><span className="eyebrow">BẢNG ĐIỀU KHIỂN</span><h1>{title}</h1><p>{subtitle}</p></div><div className="admin-avatar" aria-hidden="true">AD</div></div>{children}</main>
  </div>;
}
