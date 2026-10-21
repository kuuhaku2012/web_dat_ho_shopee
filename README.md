# Web nhận yêu cầu đặt hộ Shopee

Website tiếng Việt cho khách gửi yêu cầu đặt hộ Shopee hoặc yêu cầu tài khoản mới. Chủ web xem và xử lý thủ công ở `/admin`. Mọi voucher 40, 50, 60, 80, 100 có tiền công đặt hộ 25.000đ mỗi yêu cầu; bảo hành tùy chọn thêm 5.000đ. Tiền hàng do khách thanh toán khi nhận hàng. Sau khi gửi yêu cầu đặt hộ, web hiện VietQR với đúng tiền công và mã chuyển khoản riêng cho yêu cầu. Yêu cầu tài khoản mới được báo giá sau, không hiện QR.

Khách có thể **đăng ký và đăng nhập** bằng số điện thoại tại `/dang-ky` và `/dang-nhap`. Màn hình đăng nhập dùng chung một ô: số điện thoại đăng nhập khách hàng; tên đăng nhập quản trị (`ADMIN_USERNAME`, mặc định `admin`) và mật khẩu cấu hình sẽ vào trang admin. Trang `/khach-hang` hiển thị lịch sử, trạng thái và tài khoản Shopee đã được cấp. Yêu cầu mới gửi khi đăng nhập tự vào lịch sử; yêu cầu cũ gửi bằng cùng số điện thoại có thể thêm vào lịch sử bằng mã yêu cầu. Form gửi yêu cầu của khách chưa đăng nhập vẫn hoạt động. Hai dịch vụ có trang riêng tại `/dat-ho` và `/tai-khoan-moi`.

VietQR dùng thông tin BIDV do chủ web cung cấp: **ĐINH TẤN PHƯƠNG, 6460530993**. Hình QR được tạo qua `img.vietqr.io`; khách cần kiểm tra người nhận và số tiền trong ứng dụng ngân hàng. Web không tự xác nhận giao dịch: admin đối chiếu khoản chuyển rồi đánh dấu đã nhận tiền.

Với yêu cầu tài khoản, admin nhập mỗi tài khoản trên một dòng theo mẫu `email | mật khẩu` trong trang chi tiết và đánh dấu **Hoàn tất**. Khách dùng mã yêu cầu và số điện thoại đã đăng ký tại mục **Nhận tài khoản** để xem thông tin. Mật khẩu được mã hóa trong SQLite bằng khóa dẫn xuất từ `SESSION_SECRET`; phải giữ nguyên khóa này và sao lưu an toàn để còn đọc được tài khoản đã lưu. Khách nên đổi mật khẩu sau khi nhận.

## Yêu cầu

- Node.js 24.15 trở lên
- Máy chủ Node.js có ổ lưu trữ bền vững cho SQLite khi triển khai

## Chạy trên máy

1. Chạy `npm install`.
2. Sao chép `.env.example` thành `.env.local`.
3. Tạo mật khẩu hash bằng lệnh dưới đây trong PowerShell. Lệnh hỏi mật khẩu qua bàn phím rồi in `salt:hash` để dán vào `ADMIN_PASSWORD_SCRYPT`:

   ```powershell
   node -e "const c=require('node:crypto'),r=require('node:readline').createInterface({input:process.stdin,output:process.stdout});r.question('Mat khau quan tri: ',p=>{const s=c.randomBytes(16).toString('hex');console.log(s+':'+c.scryptSync(p,s,64).toString('hex'));r.close()})"
   ```

4. Tạo khóa phiên bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` và dán vào `SESSION_SECRET`.
5. Chạy `npm run dev`, mở `http://localhost:3000`. Trang quản trị: `http://localhost:3000/admin/login`.

`DATA_DIR` có thể bỏ trống khi chạy trên máy; dữ liệu mặc định ở `./data/requests.sqlite`.

## Kiểm thử và build

Chạy `npm test` để kiểm tra xác thực, dữ liệu và lưu trữ. Chạy `npm run build` để kiểm tra bản sản xuất. Sau build, `npm run start` chạy ứng dụng.

## Triển khai

Chạy bằng **một tiến trình Node.js** sau reverse proxy HTTPS. Cấp `DATA_DIR` là đường dẫn đến ổ lưu trữ bền vững, có quyền ghi; SQLite WAL không phù hợp với ổ mạng dùng chung. Không dùng hệ thống tệp tạm của hosting. Health check: `GET /api/health` trả `200` khi SQLite đọc được và `503` khi DB không khả dụng.

Thiết lập `ADMIN_PASSWORD_SCRYPT`, `SESSION_SECRET`, `PRIVACY_CONTROLLER_NAME` và `PRIVACY_CONTACT_EMAIL` qua biến môi trường bí mật/cấu hình của hosting; không đưa `.env.local` lên Git. Cần điền tên cá nhân/đơn vị chịu trách nhiệm dữ liệu trước khi công khai. Cookie quản trị dùng `Secure` trong production, vì vậy cần HTTPS ở tên miền triển khai.

Sao lưu khi app đang chạy bằng SQLite backup API; script xác minh integrity và khóa ngoại rồi mới báo thành công. Ví dụ PowerShell:

```powershell
npm run backup:db -- "E:\backups\requests-2026-10-21.sqlite"
```

Lệnh dùng `DATA_DIR` từ biến môi trường hoặc `.env.local`, mặc định là `./data`. Cất bản sao trên ổ lưu trữ khác máy chủ và bảo vệ như dữ liệu khách hàng.

Khôi phục luôn tạo `requests.sqlite` trong thư mục đích mới và từ chối ghi đè DB đã có:

```powershell
npm run restore:db -- "E:\backups\requests-2026-10-21.sqlite" "E:\restore\shopee-data"
$env:DATA_DIR = "E:\restore\shopee-data"
npm run start
```

Thử khôi phục định kỳ vào thư mục riêng, kiểm tra `/api/health`, lịch sử khách và thông tin tài khoản đã cấp trước khi chuyển app sang DB phục hồi. Giữ nguyên `SESSION_SECRET`; đổi khóa hiện tại có thể làm mất khả năng giải mã mật khẩu tài khoản đã lưu.

API đọc JSON có giới hạn dung lượng theo luồng. Giới hạn gửi form (30 lần/phút), đăng nhập quản trị (5 lần/phút), đăng nhập/đăng ký khách (10 lần/phút), tra cứu (20 lần/phút) và nhận yêu cầu cũ (20 lần/phút) được tính riêng theo IP khách trong từng tiến trình. Reverse proxy phải ghi đè `X-Forwarded-For` bằng IP kết nối thực tế; không chuyển nguyên giá trị do trình duyệt gửi. Bộ đếm trong RAM không đồng bộ giữa nhiều tiến trình, nên hiện triển khai một tiến trình Node. Nếu cần nhiều instance, cần thêm kho rate-limit dùng chung và thay SQLite cục bộ bằng dịch vụ cơ sở dữ liệu phù hợp trước khi mở rộng.

Quyền xóa dữ liệu được admin xử lý thủ công; hiện chưa có job tự xóa theo lịch. Đánh giá thời hạn lưu cuối cùng theo nghĩa vụ giao dịch/bảo hành trước khi vận hành thật.

## Cập nhật nội dung

Văn bản và nhãn dịch vụ nằm trong `app/page.tsx`. Các lựa chọn voucher và quy tắc tính tiền công nằm trong `lib/requests.ts`; thông tin nhận tiền nằm trong `lib/payment.ts`. Hãy cập nhật thông tin nhận tiền và kiểm thử QR trước khi dùng tài khoản ngân hàng khác.
