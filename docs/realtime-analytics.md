# Thống kê truy cập gần thời gian thực

Hệ thống analytics first-party của Cảnh Giác Số dùng Supabase để hiển thị số liệu trong Quản trị. Hệ thống không lưu IP, raw user-agent, email, tài khoản đăng nhập, query string hay dữ liệu biểu mẫu.

## Định nghĩa

- **Đang online**: người dùng/phiên có heartbeat hoặc pageview trong 5 phút gần nhất.
- **Lượt xem (pageview)**: một lần tải/chuyển sang URL path khác; lượt trùng cùng session + path trong 2 giây được bỏ qua.
- **Phiên**: UUID ngẫu nhiên first-party được giữ trong `localStorage`, dùng chung giữa các tab của cùng trình duyệt và tự tạo mới sau **30 phút không hoạt động**. Đây là định nghĩa session của hệ thống analytics, không phải tài khoản đăng nhập.
- **Người dùng**: visitor UUID first-party ẩn danh được giữ trong `localStorage`, tự xoay vòng sau tối đa 90 ngày. Đây không phải user ID tài khoản và không thể hiện danh tính thật.
- **Người dùng mới / quay lại**: chỉ tính trên visitor UUID thực sự đã ghi nhận; session legacy không được quy đổi thành người dùng.
- **Dữ liệu legacy**: các session thu thập trước Analytics v2 không có visitor ID vẫn được giữ để bảo toàn pageview/session lịch sử, nhưng không được dùng để suy đoán số người dùng.
- **Trình duyệt / hệ điều hành / thiết bị**: chỉ lưu nhãn phân loại tổng quát do trình duyệt tự xác định cục bộ, ví dụ Chrome, Safari, Windows, iOS, Desktop, Mobile. Không gửi raw user-agent lên server.
- **Quốc gia (ước tính)**: collector v3 ước tính mã quốc gia ngay trên trình duyệt từ timezone và locale, ưu tiên timezone khi có ánh xạ rõ ràng. Chỉ mã quốc gia 2 ký tự như `VN`, `US`, `SG` được gửi lên Supabase. Không dùng IP geolocation, GPS hay dịch vụ địa lý bên thứ ba.
- **Nguồn truy cập**: chỉ hostname của referrer bên ngoài, không lưu URL đầy đủ.
- **Traffic từ Google**: phiên có hostname referrer khớp domain Google như `google.com`, `google.com.vn`, `google.co.uk` và các subdomain tương ứng. Các domain dịch vụ khác như `googleapis.com` hay `googleadservices.com` không được tính là Google referrer.
- Dashboard tự làm mới mỗi 10 giây; tracker heartbeat mỗi 60 giây khi tab đang hiển thị.
- Tracker tôn trọng `Do Not Track` và không ghi sự kiện khi DNT được bật.

## Cách đọc dashboard

- **Lượt xem** và **Phiên** bao gồm dữ liệu lịch sử hợp lệ.
- **Người dùng đã nhận diện** chỉ bao gồm các phiên có visitor ID; không fallback từ session ID.
- **Độ phủ pageview** = số pageview thuộc session có visitor ID / tổng pageview trong cửa sổ thời gian đã chọn.
- **Phiên legacy** được hiển thị riêng. Khi các phiên cũ dần ra khỏi cửa sổ 24h/7d/30d/90d, độ phủ dữ liệu nhận diện sẽ tăng dần.
- Browser/OS/device chỉ thống kê trên dữ liệu có visitor ID để tránh biến dữ liệu legacy thành số liệu nhân khẩu kỹ thuật giả.
- **Độ phủ quốc gia** = số phiên có mã quốc gia ước tính / tổng số phiên trong cửa sổ thời gian. Dữ liệu trước collector v3 được giữ là `Không xác định`, không backfill suy đoán.
- **Quốc gia** chỉ là ước tính kỹ thuật. VPN, timezone do người dùng chỉnh thủ công hoặc locale hệ điều hành có thể làm kết quả sai lệch; không nên dùng như bằng chứng vị trí chính xác.
- **Traffic từ Google** hiển thị người dùng, phiên, pageview, tỷ trọng phiên, xu hướng theo thời gian, landing page và browser/OS/device của nhóm Google. Dashboard quốc gia cũng tách riêng quốc gia của traffic Google.
- Google attribution dựa trên HTTP referrer nên một số trình duyệt hoặc ứng dụng chặn referrer có thể làm số liệu thấp hơn thực tế.
- Google thường không truyền từ khóa tìm kiếm cụ thể trong referrer. Truy vấn tìm kiếm, impression, CTR và vị trí phải lấy từ Google Search Console; dashboard first-party dùng để đo hành vi sau khi người dùng đã vào website.

## Bảo mật và riêng tư

- Bảng analytics nằm trong schema `private`, RLS bật và không cấp quyền đọc/ghi trực tiếp cho `anon` hoặc `authenticated`.
- Trình duyệt public chỉ gọi RPC ghi sự kiện với validation origin + input normalization + whitelist cho các nhãn browser/OS/device và mã quốc gia định dạng 2 ký tự.
- Các RPC đọc dashboard kiểm tra `private.user_is_app_admin()` và chỉ được cấp EXECUTE cho `authenticated`.
- Publishable key trong tracker là browser-safe; không có service-role key ở frontend.
- Không dùng IP geolocation, không gửi IP sang dịch vụ bên ngoài và không lưu timezone/locale thô; chỉ lưu mã quốc gia đã ước tính.
- Không backfill visitor ID hoặc quốc gia cho dữ liệu cũ vì không có căn cứ kỹ thuật đáng tin cậy để suy ra chính xác.
