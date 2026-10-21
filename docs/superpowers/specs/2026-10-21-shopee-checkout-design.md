# Thiết kế tính tiền công và VietQR động

Ngày: 2026-10-21
Trạng thái: Đã được duyệt trong cuộc trò chuyện

## Luồng khách

- Đơn đặt hộ thuộc voucher 40, 50, 60, 80 hoặc 100 đều có phí công 25.000đ cho một yêu cầu. Bảo hành tùy chọn cộng 5.000đ. Số lượng sản phẩm không nhân phí công. Khách tự trả tiền hàng khi nhận.
- Form đặt hộ yêu cầu link, số lượng, tên, số điện thoại và địa chỉ nhận hàng. Email không còn trong form. Form tài khoản mới yêu cầu tên và số điện thoại, chưa thu tiền hoặc tạo QR vì chưa có giá.
- Sau khi gửi đơn hợp lệ, máy chủ lưu tiền công tại thời điểm tạo đơn rồi trả mã đơn, số tiền và URL ảnh VietQR động. Giao diện hiện QR, số tiền, mã chuyển khoản và hướng dẫn kiểm tra người nhận trước khi chuyển.
- QR dùng BIN BIDV 970418, số tài khoản và tên người nhận do chủ web cung cấp trong ảnh. URL chỉ chứa mã đơn, tiền và thông tin nhận, không chứa dữ liệu cá nhân của khách.
- Việc hiển thị QR không đồng nghĩa đã thanh toán. Không có tự động đối soát.

## Luồng admin

- Trang admin có giao diện bảng điều khiển: số đơn, đơn mới, đơn chờ xác nhận tiền, đơn đã xác nhận; danh sách có loại, voucher, tiền công, thanh toán và trạng thái xử lý.
- Trang chi tiết hiển thị địa chỉ (và email cũ nếu đơn cũ có), chi tiết sản phẩm, bảo hành, tiền công và mã chuyển khoản.
- Admin xác nhận thanh toán thủ công, thay đổi trạng thái xử lý và ghi chú nội bộ. Khách không truy cập được trang admin.

## Dữ liệu và tương thích

- Thêm `address`, `feeAmount`, `paymentStatus` vào SQLite với giá trị mặc định cho đơn cũ. Đơn cũ không bị tự gán là đã hoặc đang thanh toán; phí cũ không tự tính lại.
- Mỗi đơn mới có `feeAmount` cố định. Đơn đặt hộ bắt đầu ở trạng thái thanh toán `pending`; đơn tài khoản là `not_required`.
- Mọi cập nhật admin kiểm tra quyền, same-origin và giá trị trạng thái hợp lệ.

## Kiểm thử

- Phí 25.000đ hoặc 30.000đ cho mọi voucher, không đổi theo số lượng.
- Địa chỉ và số điện thoại được kiểm tra cho đơn đặt hộ; email không còn cần cho đơn mới.
- QR chứa BIN, số tài khoản, số tiền và mã đơn đúng định dạng.
- SQLite lưu phí, địa chỉ và trạng thái; đọc được dữ liệu cũ; admin chỉ xác nhận tiền qua thao tác có xác thực.
