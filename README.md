# Web nhận yêu cầu đặt hộ Shopee

Website tiếng Việt cho khách gửi yêu cầu đặt hộ Shopee hoặc yêu cầu tài khoản mới. Chủ web xem và xử lý thủ công ở `/admin`. Voucher 100 có phí đặt hộ 25.000đ; bảo hành tùy chọn 5.000đ áp dụng cho mọi voucher. Các voucher khác chưa có giá đặt hộ công bố. Chưa có thanh toán, tự đặt đơn hoặc giao thông tin tài khoản trên web.

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

Chạy bằng **một tiến trình Node.js** sau reverse proxy HTTPS. Cấp `DATA_DIR` là đường dẫn đến vùng lưu trữ bền vững, có quyền ghi; không dùng hệ thống tệp tạm của hosting. Sao lưu tệp `requests.sqlite` định kỳ khi đã dừng ứng dụng hoặc dùng cơ chế backup SQLite nhất quán. Thiết lập `ADMIN_PASSWORD_SCRYPT` và `SESSION_SECRET` qua biến môi trường bí mật; không đưa `.env.local` lên Git. Cookie quản trị dùng `Secure` khi chạy production, vì vậy cần HTTPS ở tên miền triển khai.

Giới hạn gửi form (30 lần/phút) và đăng nhập (5 lần/phút) hiện áp dụng chung cho một tiến trình. Nếu chạy nhiều tiến trình hoặc lượng truy cập lớn, cần chuyển phần giới hạn này sang kho dùng chung và cấu hình nhận diện IP khách qua reverse proxy đáng tin cậy.

## Cập nhật nội dung

Văn bản và nhãn dịch vụ nằm trong `app/page.tsx`. Các lựa chọn voucher và quy tắc tính phí voucher 100 nằm trong `lib/requests.ts`. Cập nhật các voucher khác khi có bảng giá xác thực.
