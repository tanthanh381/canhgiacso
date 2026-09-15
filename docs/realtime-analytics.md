# Thống kê truy cập gần thời gian thực

Hệ thống analytics first-party của Cảnh Giác Số dùng Supabase để hiển thị số liệu trong Quản trị. Hệ thống không lưu IP, raw user-agent, email, tài khoản đăng nhập, query string hay dữ liệu biểu mẫu.

## Định nghĩa

- **Đang online**: người dùng/phiên có heartbeat hoặc pageview trong 5 phút gần nhất.
- **Lượt xem (pageview)**: một lần tải/chuyển sang URL path khác; lượt trùng cùng session + path trong 2 giây được bỏ qua.
- **Phiên**: UUID ngẫu nhiên được giữ trong `sessionStorage`; UUID thay đổi khi phiên trình duyệt kết thúc.
- **Người dùng**: visitor UUID first-party ẩn danh được giữ trong `localStorage`, tự xoay vòng sau tối đa 90 ngày. Đây không phải user ID tài khoản và không thể hiện danh tính thật.
- **Người dùng mới / quay lại**: dựa trên lần đầu visitor UUID được ghi nhận trong dữ liệu analytics.
- **Trình duyệt / hệ điều hành / thiết bị**: chỉ lưu nhãn phân loại tổng quát do trình duyệt tự xác định cục bộ, ví dụ Chrome, Safari, Windows, iOS, Desktop, Mobile. Không gửi raw user-agent lên server.
- **Nguồn truy cập**: chỉ hostname của referrer bên ngoài, không lưu URL đầy đủ.
- Dashboard tự làm mới mỗi 10 giây; tracker heartbeat mỗi 60 giây khi tab đang hiển thị.
- Tracker tôn trọng `Do Not Track` và không ghi sự kiện khi DNT được bật.

## Bảo mật và riêng tư

- Bảng analytics nằm trong schema `private`, RLS bật và không cấp quyền đọc/ghi trực tiếp cho `anon` hoặc `authenticated`.
- Trình duyệt public chỉ gọi RPC ghi sự kiện với validation origin + input normalization + whitelist cho các nhãn browser/OS/device.
- RPC đọc dashboard kiểm tra `private.user_is_app_admin()` và chỉ được cấp EXECUTE cho `authenticated`.
- Publishable key trong tracker là browser-safe; không có service-role key ở frontend.
- Dữ liệu cũ trước Analytics v2 không có visitor/browser/OS/device sẽ được giữ nguyên và hiển thị là dữ liệu lịch sử hoặc “Không xác định”.
