import { cookies } from 'next/headers';
import { customerCookie, readCustomerSession } from '@/lib/customer-auth';
import { getStore } from '@/lib/db';
import PrivacyRequestForm from '../components/PrivacyRequestForm';
import SiteFooter from '../components/SiteFooter';

export default async function PrivacyPage() {
  const userId = readCustomerSession((await cookies()).get(customerCookie)?.value);
  const user = userId ? getStore().getCustomer(userId) : null;
  const controllerName = process.env.PRIVACY_CONTROLLER_NAME?.trim();
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();
  return <main>
    <section className="service-page privacy-policy">
      <a className="service-back" href="/">← Về trang chủ</a>
      <div className="service-page-heading"><span className="eyebrow">DỮ LIỆU CỦA BẠN</span><h1>Chính sách quyền riêng tư</h1><p>Phiên bản 2026-10-21. Chính sách này giải thích dữ liệu nào được dùng khi bạn gửi yêu cầu hoặc tạo tài khoản.</p></div>
      <article>
        <h2>Thông tin được thu thập</h2>
        <ul>
          <li>Họ tên, số điện thoại, địa chỉ nhận hàng (với yêu cầu đặt hộ), link và chi tiết sản phẩm, voucher, lựa chọn bảo hành, ghi chú, mã yêu cầu, trạng thái và phí dịch vụ.</li>
          <li>Nếu tạo tài khoản khách: số điện thoại, tên và mật khẩu đã được băm để đăng nhập. Website không lưu mật khẩu đăng nhập khách ở dạng đọc được.</li>
          <li>Nếu website cấp tài khoản Shopee: email và mật khẩu tài khoản được mã hóa trong cơ sở dữ liệu để giao lại cho đúng yêu cầu.</li>
          <li>Phiên đăng nhập được giữ bằng cookie bảo mật cần thiết. IP dùng cho giới hạn tần suất được băm trong bộ nhớ tiến trình, không ghi vào hồ sơ yêu cầu.</li>
        </ul>

        <h2>Mục đích sử dụng</h2>
        <p>Dữ liệu được dùng để nhận và xử lý yêu cầu, liên hệ khi cần xác nhận, thực hiện việc đặt hàng hoặc cấp tài khoản, đối chiếu tiền công, bảo hành và hiển thị lịch sử cho khách đã đăng nhập.</p>

        <h2>Chia sẻ với dịch vụ khác</h2>
        <p>Khi thực hiện yêu cầu, thông tin cần thiết về sản phẩm và giao hàng có thể được dùng trên Shopee để đặt hàng. VietQR được tạo qua dịch vụ img.vietqr.io; đường dẫn QR chứa thông tin nhận tiền, số tiền và mã chuyển khoản, không chứa tên hay số điện thoại khách. Nhà cung cấp hosting lưu trữ cơ sở dữ liệu và truyền tải dữ liệu để website hoạt động. Website không bán dữ liệu cá nhân.</p>

        <h2>Lưu trữ và bảo vệ</h2>
        <p>Yêu cầu và lịch sử được lưu trong cơ sở dữ liệu của website khi cần xử lý dịch vụ, hỗ trợ và bảo hành. Thông tin tài khoản khách được băm; mật khẩu tài khoản được cấp được mã hóa. Các thông tin liên hệ và đơn hàng khác được lưu để admin xử lý. Chỉ admin đã đăng nhập mới xem được dữ liệu quản trị. Hiện website chưa tự xóa dữ liệu theo lịch: dữ liệu được giữ trong thời gian xử lý, hỗ trợ, bảo hành và đối soát; admin tiếp nhận yêu cầu xóa đã xác minh và xóa hoặc ẩn danh dữ liệu khi không còn nghĩa vụ cần lưu.</p>

        <h2>Quyền của bạn</h2>
        <p>Bạn có thể yêu cầu xem, sửa hoặc xóa dữ liệu liên quan đến mình, rút lại sự đồng ý cho việc xử lý tiếp theo, hoặc hỏi về cách dữ liệu được sử dụng. Hãy giữ mã yêu cầu và số điện thoại đã gửi để xác minh. Website không liên kết chính thức với Shopee.</p>

        <h2>Liên hệ</h2>
        <p>{controllerName ? `Đơn vị chịu trách nhiệm: ${controllerName}.` : 'Tên cá nhân hoặc đơn vị chịu trách nhiệm cần được cấu hình trước khi công khai website.'} {contactEmail ? `Email liên hệ: ${contactEmail}.` : 'Bạn cũng có thể liên hệ qua biểu mẫu quyền riêng tư trên trang này.'} Nếu chưa đăng nhập, hãy cung cấp mã yêu cầu và số điện thoại trùng với yêu cầu đã gửi.</p>
      </article>
      <section className="privacy-request-section" id="yeu-cau-quyen-du-lieu"><h2>Gửi yêu cầu về dữ liệu</h2><PrivacyRequestForm user={user ? { name: user.name, phone: user.phone } : null} /></section>
    </section>
    <SiteFooter />
  </main>;
}
