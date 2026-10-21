# Kế hoạch xử lý các rủi ro trước triển khai

Mục tiêu: hoàn thiện từng hạng mục theo thứ tự, mỗi hạng mục có kiểm thử tập trung và chạy lại bộ test/build trước khi bắt đầu hạng mục kế tiếp. Phạm vi giữ hai dịch vụ đặt hộ và yêu cầu tài khoản hoạt động, theo xác nhận của chủ dự án rằng đã có văn bản chấp thuận; xác nhận này chưa được kiểm chứng độc lập.

## Thứ tự thực hiện

1. **Thông tin admin** — giữ tên đăng nhập `kuuhaku`, thay mật khẩu mặc định yếu trong `.env.local` bằng mật khẩu ngẫu nhiên mạnh. Xác minh mật khẩu mới được chấp nhận, mật khẩu cũ bị từ chối, `.env.local` vẫn bị Git bỏ qua, sau đó chạy `npm test` và `npm run build`.
2. **Trạng thái thanh toán và đơn hàng** — chặn hoàn tất đơn nếu phí công chưa thanh toán; cập nhật UI admin để trạng thái mới hiện ngay. Viết test hồi quy trước, kiểm thử route và biểu mẫu, rồi chạy cả bộ test/build.
3. **Bảo vệ API** — áp giới hạn kích thước body trước khi đọc JSON, cải thiện giới hạn tần suất theo client và bảo mật header. Viết test cho payload lớn, nguồn request và hành vi giới hạn; kiểm tra các luồng gửi yêu cầu, đăng nhập, tra cứu, nhận tài khoản và cập nhật admin cùng lúc để phát hiện va chạm.
4. **Quyền riêng tư và dữ liệu khách hàng** — thêm thông báo/đồng ý, nêu rõ thời hạn lưu hiện hành, đường xử lý yêu cầu quyền dữ liệu; rà soát dữ liệu nhạy cảm hiện lưu và quyền truy cập. Tên người/đơn vị chịu trách nhiệm cần cấu hình trước khi công khai. Đây là triển khai kỹ thuật, không phải chứng nhận tuân thủ pháp lý.
5. **Độ bền dữ liệu và tải** — thêm giao dịch/khóa ngoại/chỉ mục cần thiết, phân trang cho danh sách admin và lịch sử; xử lý gửi lặp. Kiểm thử migration trên DB tạm, CRUD liên quan và các luồng đồng thời ở mức ứng dụng.
6. **Vận hành và triển khai** — bổ sung hướng dẫn triển khai, backup/restore và health check phù hợp nền tảng Node + SQLite; kiểm thử backup/restore trên bản sao dữ liệu. Kiểm tra khả năng chạy nhiều instance và ghi rõ giới hạn hạ tầng nếu không có dịch vụ DB/rate-limit dùng chung.
7. **Kiểm thử tích hợp cuối** — chạy toàn bộ test, build production và smoke test các luồng khách/admin; kiểm tra cấu hình/secret bị loại khỏi Git, lỗi phụ thuộc mạng, khả năng khôi phục DB, cũng như mọi giới hạn cần giải quyết ở hosting thật.

## Quy tắc kiểm chứng

- Với thay đổi hành vi: thêm test thất bại trước, xác nhận RED, triển khai tối thiểu, xác nhận GREEN.
- Sau từng hạng mục: chạy test tập trung, `npm test`, `npm run build`, và kiểm tra tương tác với các luồng liên quan trước khi sang bước tiếp.
- Không công bố là sẵn sàng production nếu chưa có hosting, lưu trữ bền vững/backup thực tế, xác minh thanh toán thật, quét advisory trực tuyến, và kiểm tra tải trên môi trường gần production.

## Tiến độ

- [x] 1. Thay mật khẩu admin yếu bằng mật khẩu ngẫu nhiên; xác minh mật khẩu mới được nhận và mật khẩu cũ bị từ chối; `.env.local` bị Git bỏ qua; toàn bộ test và build đạt.
- [x] 2. Chặn hoàn tất đơn còn phí công chưa xác nhận ở tầng lưu trữ và API; làm mới trang chi tiết sau khi lưu. Test hồi quy xác nhận phí pending bị từ chối, phí confirmed được phép; `npm test` đạt 22/22 và build production đạt. HTTP loopback smoke test không chạy được vì môi trường trả `EACCES` khi kết nối `localhost`; ghi nhận để test lại ở staging.
- [x] 3. Bảo vệ API: mọi route JSON giới hạn body dạng stream; throttling được tách theo IP với key băm và bộ nhớ giới hạn; đã thêm security headers, HSTS production-only. 29/29 test và isolated production build đạt. Reverse proxy phải ghi đè `X-Forwarded-For`; throttling vẫn theo từng tiến trình.
- [x] 4. Quyền riêng tư và dữ liệu khách hàng: thông báo/đồng ý có phiên bản và thời điểm lưu; khách gửi quyền truy cập/sửa/rút đồng ý/xóa, admin xử lý; xóa dữ liệu được kiểm tra trong giao dịch, không cho xóa đơn đang chạy, xóa thông tin tài khoản đã cấp và ẩn danh toàn bộ yêu cầu liên quan. Bổ sung cấu hình tên/email liên hệ và công bố rõ hiện chưa có tự xóa theo lịch. 37/37 test và isolated production build đạt. Trước khi công khai, chủ website vẫn cần điền tên người/đơn vị chịu trách nhiệm, quyết định retention pháp lý cuối cùng và rà soát chính sách với chuyên gia phù hợp.
- [x] 5a. Gộp ghi đơn và gắn tài khoản khách trong một `INSERT`; thêm khóa gửi lặp có giao dịch SQLite, ràng buộc cùng actor + fingerprint HMAC, lưu khóa đang chờ trong sessionStorage để khôi phục sau reload và dọn khóa hết hạn sau 30 ngày. Xóa hồ sơ cũng xóa khóa liên quan. 41/41 test và isolated production build đạt.
- [x] 5b. Phân trang admin, lịch sử khách và hàng đợi quyền riêng tư; bộ đếm admin dùng aggregate SQL; thêm chỉ mục cho các truy vấn lọc/sắp xếp và xác nhận query planner dùng chỉ mục admin/customer. 44/44 test và isolated production build đạt.
- [x] 5c. Bật WAL, khóa ngoại và chờ writer 5 giây; kiểm thử 4 kết nối đồng thời với cùng khóa gửi và 40 yêu cầu riêng, xác nhận không nhân đôi khóa chung và không mất yêu cầu. 46/46 test và isolated production build đạt. SQLite vẫn chỉ phù hợp một máy chủ với ổ đĩa bền vững cục bộ.
- [x] 5. Độ bền dữ liệu và tải.
- [x] 6a. Thêm `/api/health` không rò chi tiết vận hành, query schema SQLite trực tiếp, trả 503 khi DB không khả dụng. Test health-store và build production cô lập đạt; HTTP loopback smoke vẫn bị sandbox Windows giới hạn như đã ghi ở bước 2.
- [x] 6b. Thêm CLI backup/restore dùng SQLite Online Backup API; kiểm integrity và khóa ngoại, không ghi đè DB đích, test backup khi source đang mở và khôi phục dữ liệu/tài khoản đã cấp trong DB tạm. Thêm README về health, persistent local storage, secrets, privacy contact, backup/restore. 48/48 test và isolated production build đạt. Backup nên đặt trên ổ khác; restore thật trên hosting chưa chạy vì chưa chọn hosting.
- [x] 6. Vận hành và triển khai (các bước kỹ thuật hoàn tất; cấu hình hosting thực tế còn chờ chọn nền tảng).
- [x] 7a. Kiểm tra tích hợp cục bộ: 48/48 test, production build cô lập thành công, `/api/health` trả 200 trong browser, giao diện admin/đăng nhập/đăng ký/đặt hộ/yêu cầu tài khoản/chính sách hiện đủ; `.env.local` bị Git bỏ qua; không còn route đọc JSON không giới hạn; `git diff --check` sạch.
- [ ] 7. Cổng deploy cuối còn phụ thuộc môi trường ngoài: `npm audit` không kết nối được `registry.npmjs.org` (`ENOTFOUND`); chưa có staging/hosting để kiểm tra backup/restore thật và tải HTTP; thanh toán VietQR vẫn cần admin đối soát thủ công; tên người/đơn vị chịu trách nhiệm và retention pháp lý cần chủ web cấu hình/xác nhận. Chưa thể kết luận production-ready.
