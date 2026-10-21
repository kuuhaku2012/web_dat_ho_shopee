# Thiết kế web nhận yêu cầu đặt hộ Shopee

Ngày: 2026-10-21
Trạng thái: Đã được duyệt trong cuộc trò chuyện

## Mục tiêu

Website tiếng Việt để khách gửi yêu cầu đặt hộ sản phẩm Shopee với lựa chọn voucher 50, 60, 70, 80, 100 hoặc yêu cầu mua tài khoản Shopee mới. Chủ web xử lý thủ công trong trang quản trị. Bản đầu tiên không thu tiền, tự đặt hàng, giao thông tin đăng nhập hoặc báo giá tự động.

## Luồng khách

- Trang chính giới thiệu hai dịch vụ, các lựa chọn voucher và quy trình xử lý thủ công.
- Form đặt hộ thu link sản phẩm Shopee, mức voucher, số lượng, tên, số điện thoại hoặc email, ghi chú tùy chọn.
- Form tài khoản mới thu số lượng, tên, số điện thoại hoặc email, ghi chú tùy chọn.
- Gửi thành công trả mã yêu cầu và thông báo chủ web sẽ liên hệ để xác nhận giá và khả năng đáp ứng.
- Không có trang công khai hiển thị yêu cầu hay thông tin cá nhân của khách.

## Luồng quản trị

- Quản trị viên đăng nhập bằng thông tin cấu hình riêng.
- Xem danh sách và chi tiết yêu cầu, lọc theo loại và trạng thái.
- Cập nhật trạng thái: mới, đang xử lý, hoàn tất, hủy; lưu ghi chú nội bộ.
- Đăng xuất. Mọi trang và API quản trị đều yêu cầu phiên hợp lệ.

## Giá và nội dung dịch vụ

Các số 50, 60, 70, 80, 100 là nhãn voucher. Website không diễn giải chúng là phần trăm hay số tiền giảm và không cam kết voucher luôn có sẵn. Giá được xác nhận sau khi xem yêu cầu. Dữ liệu giá và dịch vụ khác sẽ được bổ sung khi có thông tin thực tế.

## Kiến trúc và dữ liệu

Một ứng dụng Next.js phục vụ giao diện, API và trang quản trị; SQLite lưu yêu cầu trên máy chủ. Mỗi yêu cầu gồm mã riêng, loại, dữ liệu khách, thông tin dịch vụ, trạng thái, ghi chú nội bộ và thời gian tạo/cập nhật. Không tích hợp Shopee, thanh toán, email hay Zalo ở bản đầu tiên. Không lưu email hoặc mật khẩu của các tài khoản Shopee được bán.

## Kiểm tra và bảo mật

- Link sản phẩm phải là HTTPS thuộc shopee.vn hoặc miền phụ hợp lệ.
- Số lượng là số nguyên dương trong giới hạn hợp lý. Tên và ít nhất một cách liên hệ là bắt buộc. Giới hạn độ dài từng trường.
- Voucher chỉ nhận một trong năm nhãn. Lỗi form được hiển thị rõ; lỗi máy chủ không lộ thông tin riêng.
- Giới hạn tần suất gửi form và đăng nhập.
- Mật khẩu quản trị ở dạng hash trong biến môi trường, không ghi vào mã nguồn.
- Cookie phiên HttpOnly, SameSite, Secure khi dùng HTTPS, có thời hạn. Các thao tác thay đổi dữ liệu phải chống CSRF.
- Triển khai cần máy chủ Node.js và vùng lưu trữ bền vững cho SQLite; sao lưu tệp dữ liệu định kỳ.

## Giao diện

Trang công khai ưu tiên điện thoại, có phần giới thiệu, các lựa chọn voucher, quy trình ba bước và hai form. Trang quản trị tập trung vào đọc và cập nhật yêu cầu. Biểu mẫu có nhãn, thông báo lỗi và khả năng dùng bằng bàn phím.

## Tiêu chí nghiệm thu

1. Khách gửi thành công cả hai loại yêu cầu; mỗi yêu cầu có mã riêng và được lưu.
2. Dữ liệu sai bị từ chối; gửi dồn dập bị giới hạn.
3. Người chưa đăng nhập không xem hoặc sửa được yêu cầu.
4. Quản trị viên xem yêu cầu, ghi chú, đổi trạng thái và đăng xuất được.
5. Trang hiển thị tốt trên điện thoại và máy tính; không công khai dữ liệu khách hay thông tin đăng nhập tài khoản Shopee.
6. Dự án có hướng dẫn chạy, cấu hình quản trị, sao lưu và triển khai cơ bản.
