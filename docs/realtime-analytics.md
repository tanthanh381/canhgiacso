# Thống kê truy cập gần thời gian thực

Hệ thống analytics first-party của Cảnh Giác Số dùng Supabase để hiển thị số liệu trong Quản trị mà không lưu IP, user-agent, email, query string hay dữ liệu biểu mẫu.

## Định nghĩa

- **Đang online**: session có heartbeat/pageview trong 5 phút gần nhất.
- **Lượt xem (pageview)**: một lần tải/chuyển sang URL path khác; lượt trùng cùng session + path trong 2 giây được bỏ qua.
- **Phiên**: UUID ngẫu nhiên được giữ trong `sessionStorage`; số này không phải định danh một con người và sẽ thay đổi khi phiên trình duyệt kết thúc.
- **Nguồn truy cập**: chỉ hostname của referrer bên ngoài, không lưu URL đầy đủ.
- Dashboard tự làm mới mỗi 10 giây; tracker heartbeat mỗi 60 giây khi tab đang hiển thị.

## Bảo mật

- Bảng analytics nằm trong schema `private`, RLS bật và không cấp quyền đọc/ghi trực tiếp cho `anon` hoặc `authenticated`.
- Trình duyệt public chỉ gọi RPC ghi sự kiện với validation origin + input normalization.
- RPC đọc dashboard kiểm tra `private.user_is_app_admin()` và chỉ được cấp EXECUTE cho `authenticated`.
- Publishable key trong tracker là browser-safe; không có service-role key ở frontend.
