# Checklist cấu hình Supabase Dashboard (việc chủ dự án phải làm tay)

Tài liệu này liệt kê các thiết lập **không thể** thực hiện bằng SQL migration hay bằng mã nguồn. Mỗi mục ghi: đặt ở đâu, giá trị khuyến nghị, vì sao, rủi ro nếu làm sai và cách kiểm tra. Tên menu có thể khác đôi chút theo phiên bản Dashboard.

Các giá trị Auth ở mục 1–3 cũng có trong [`supabase/config.toml`](../../supabase/config.toml) (dùng để đối chiếu/chạy cục bộ). **Commit `config.toml` không tự đổi cấu hình production.**

Ký hiệu: `[ ]` chưa làm, `[x]` đã làm. Hãy ghi ngày và người thực hiện cạnh từng mục khi hoàn tất.

> Thứ tự thực hiện tổng thể (migration, deploy, post-deploy, các mục dưới đây) nằm trong [REMEDIATION-2026-10.md](REMEDIATION-2026-10.md), mục "Thứ tự áp dụng". **Mục 1 (Confirm email) phải làm đúng vị trí trong thứ tự đó.**

---

## 1. Authentication → Sign In / Providers → Email

- [ ] **Confirm email: BẬT.**
  - Vì sao: migration `20261002100000` chỉ chặn được việc "đăng ký trước bằng email của người khác rồi nhận quyền" khi `auth.users.email_confirmed_at` phản ánh việc đã chứng minh sở hữu hộp thư. Khi tắt Confirm email, Supabase tự điền `email_confirmed_at` ngay lúc đăng ký nên kiểm tra này vô hiệu.
  - Tác động khi bật: người đăng ký mới phải bấm liên kết trong thư mới đăng nhập được (giao diện mới đã có màn hình "Kiểm tra hộp thư" và nút gửi lại). Tài khoản đã có `email_confirmed_at` không bị ảnh hưởng. Tài khoản có `email_confirmed_at is null` sẽ **không đăng nhập được** cho tới khi xác nhận: đếm trước bằng `supabase/verification/production-checks.sql` (phần 7 và kiểm tra tổng hợp).
  - Điều kiện cần trước khi bật: có SMTP riêng hoạt động (mục 6), nếu không thư xác nhận có thể không tới được người dùng và đăng ký mới bị chặn.
  - Kiểm tra: đăng ký thử một email mới, xác nhận chưa đăng nhập được trước khi bấm liên kết; sau khi bấm thì đăng nhập được.
- [ ] **Secure email change** (xác nhận ở cả email cũ và mới): BẬT. Tương ứng `double_confirm_changes = true`.
- [ ] **Secure password change** (yêu cầu đăng nhập gần đây khi đổi mật khẩu): BẬT.
- [ ] Khoảng cách tối thiểu giữa hai thư tới cùng một địa chỉ: giữ 60 giây (mặc định).
- [ ] Đăng nhập ẩn danh (Anonymous sign-ins): TẮT. Trò chơi dành cho khách không dùng phiên Auth.

## 2. Authentication → Policies / Password Security

- [ ] **Độ dài mật khẩu tối thiểu: 10.**
- [ ] **Yêu cầu ký tự: chữ hoa + chữ thường + chữ số** (tùy chọn "lower, upper and digits"). Giao diện đăng ký còn yêu cầu thêm ký tự đặc biệt và tối đa 72 ký tự; máy chủ chỉ cần ngưỡng tối thiểu ở trên.
  - Ghi chú: chính sách chỉ áp dụng khi đặt/đổi mật khẩu; tài khoản hiện hữu vẫn đăng nhập bình thường. Giao diện đăng nhập vẫn chấp nhận mật khẩu từ 8 ký tự để không khóa người dùng cũ.
- [ ] **Leaked password protection** (kiểm tra mật khẩu bị lộ): BẬT **khi dự án nâng lên gói Pro trở lên**. Gói Free không có tính năng này (đã ghi trong `ASVS-L2-REMEDIATION.md`). Cho tới lúc đó đây là rủi ro còn lại được chấp nhận.

## 3. Authentication → URL Configuration

- [ ] **Site URL:** `https://canhgiacso.com/`
- [ ] **Redirect URLs:**
  - `https://canhgiacso.com/**`
  - `https://www.canhgiacso.com/**`
  - `https://tanthanh381.github.io/chongluadao/**` (tạm giữ giai đoạn chuyển miền để liên kết xác nhận cũ còn dùng được; **gỡ bỏ** khi không còn thư xác nhận cũ chưa dùng)
- Vì sao: Site URL sai làm liên kết trong thư xác nhận trỏ nhầm miền; redirect rộng (`**` trên miền không thuộc quyền kiểm soát) mở đường cho chuyển hướng độc hại.
- Kiểm tra: gửi thư xác nhận thử và mở liên kết, trang đích phải là `https://canhgiacso.com/`.

## 4. Authentication → Multi-Factor

- [ ] **TOTP: BẬT cả "Enroll" và "Verify".** Quản trị/Biên tập viên phải dùng AAL2 (xem `app/security-hardening.tsx`). Nếu tắt, không ai đăng ký/xác thực được TOTP và mọi tài khoản đặc quyền bị khóa khỏi khu vực quản trị.
- [ ] Phone MFA / WebAuthn: để TẮT (chưa dùng).
- Kiểm tra: tài khoản quản trị đăng nhập và nhập mã TOTP thành công; `supabase/verification/production-checks.sql` (phần 7b và dòng 14 của phần 0) không còn tài khoản đặc quyền thiếu TOTP đã xác minh.
- Lưu ý còn lại: lần đầu đăng ký TOTP diễn ra ở AAL1 (trước khi có yếu tố thứ hai) nên không thể chặn ở tầng cơ sở dữ liệu. Giao diện mới cảnh báo và ghi nhật ký sự kiện `PRIVILEGED_MFA_ENROLLMENT_*`. Nên quản trị viên chủ động đăng ký TOTP ngay khi được cấp quyền và rà soát nhật ký này.

## 5. Authentication → Attack Protection / Rate Limits

- [ ] **CAPTCHA (Cloudflare Turnstile hoặc hCaptcha) cho đăng ký/đăng nhập/quên mật khẩu: KHUYẾN NGHỊ, nhưng CHƯA BẬT cho tới khi giao diện gửi được token.**
  - **Cảnh báo:** nếu bật CAPTCHA ở Dashboard mà frontend chưa gửi `captchaToken` trong `signUp`, `signInWithPassword`, `resetPasswordForEmail`, **toàn bộ đăng ký và đăng nhập sẽ thất bại**. Frontend hiện chưa có widget CAPTCHA (nằm ngoài phạm vi đợt này).
  - Lộ trình: tạo site key/secret ở nhà cung cấp, thêm widget và truyền `options.captchaToken`, kiểm thử trên môi trường staging, rồi mới bật ở Dashboard.
- [ ] **Rate Limits** (Authentication → Rate Limits): rà soát số thư/giờ, số lượt đăng nhập/đăng ký theo IP và lượt xác minh token. Đặt theo lưu lượng thực tế; không để mức quá thấp làm chặn người dùng thật (đặc biệt khi nhiều người dùng chung một IP mạng nội bộ).

## 6. Authentication → SMTP Settings

- [ ] **Dùng SMTP riêng (nhà cung cấp thư giao dịch) thay vì SMTP tích hợp sẵn.** SMTP tích hợp bị giới hạn rất thấp và không dành cho production; khi bật Confirm email, thư xác nhận có thể bị trễ/không gửi được.
- [ ] Cấu hình SPF, DKIM, DMARC cho miền gửi thư; đặt người gửi dễ nhận biết (ví dụ `no-reply@canhgiacso.com`).
- [ ] Kiểm tra mẫu thư (Authentication → Email Templates) có tiếng Việt, liên kết dùng `{{ .ConfirmationURL }}` và không lộ thông tin nhạy cảm.
- Không đưa mật khẩu SMTP vào repo.

## 7. Authentication → Sessions

- [ ] **Time-box phiên / Inactivity timeout / Single session per user**: các tùy chọn này thuộc gói Pro trở lên. Nếu có gói Pro, đặt thời hạn phiên và thời gian không hoạt động phù hợp với chính sách (ví dụ phiên quản trị ngắn hơn phiên người chơi). Với Free: ghi nhận là rủi ro còn lại.
- [ ] **JWT expiry:** 3600 giây (mặc định; không đặt dài hơn). Quyền quản trị còn được kiểm lại theo phiên sống trong `auth.sessions` ở mỗi lệnh gọi, nên đăng xuất/thu hồi phiên có hiệu lực ngay cả khi JWT chưa hết hạn.
- [ ] Refresh token rotation: BẬT (mặc định).

## 8. Project Settings → API / Data API

- [ ] **Exposed schemas** chỉ gồm `public` (và `graphql_public` nếu dùng). **Không** có `private`. Schema `private` chứa bảng quyền, nhật ký kiểm toán, khóa muối IP.
- [ ] **Max rows** đặt hợp lý (mặc định 1000).
- [ ] **API keys:** chỉ khóa `anon`/publishable nằm trong frontend. Xác nhận không có `service_role`/secret key trong repo, bundle hay biến môi trường công khai. Nếu từng lộ: xoay khóa ngay (Project Settings → API Keys) rồi cập nhật nơi sử dụng.
- [ ] (Khuyến nghị dài hạn) chuyển sang khóa ký JWT bất đối xứng khi nền tảng cho phép; thực hiện trên staging trước.
- Kiểm tra: `supabase/verification/production-checks.sql` phần 0 (kiểm tra 20: `anon` có USAGE trên schema `private` và EXECUTE hook, nếu thiếu thì hook giới hạn tốc độ làm mọi yêu cầu `anon` lỗi).

## 9. Database

- [ ] **Extensions → pg_cron: BẬT** (tùy chọn nhưng khuyến nghị). Migration `20261002103000` tự lên lịch dọn dữ liệu hằng giờ nếu pg_cron đã bật; nếu chưa bật, việc dọn vẫn chạy cơ hội trong hook giới hạn tốc độ (ít chắc chắn hơn). Sau khi bật pg_cron, chạy lại migration `20261002103000` (idempotent) hoặc lên lịch bằng:
  ```sql
  select cron.schedule('cgs-purge-expired-security-data', '17 * * * *', 'select private.purge_expired_security_data()');
  ```
- [ ] **Backups / PITR:** Free không có PITR. Trước khi áp dụng các migration, tạo bản sao dữ liệu (ví dụ `pg_dump` các bảng `public.*` và `private.app_admins`, `private.app_editors`, `private.security_audit_log`). Cân nhắc nâng gói/ bật PITR cho production.
- [ ] **SSL enforcement:** BẬT (Database → Settings → SSL Configuration).
- [ ] **Network restrictions:** nếu chỉ truy cập trực tiếp CSDL từ vài IP, giới hạn theo IP (không ảnh hưởng Data API).
- [ ] Tắt/gỡ extension không dùng.
- [ ] Xác minh header IP: sau khi áp dụng migration `20261002103000` và có lưu lượng, `select count(*) from private.api_rate_limits` phải tăng. Nếu luôn bằng 0 trong khi có người dùng, nền tảng không đặt header `cf-connecting-ip`: đổi `private.security_settings.trusted_ip_header` sang header đúng (xem `documentation/realtime-analytics-security.md`).

## 10. Edge Functions

- [ ] Nếu từng deploy hàm `admin-analytics`: xóa bằng `supabase functions delete admin-analytics --project-ref <ref>` (hoặc Dashboard → Edge Functions). Mã nguồn đã bị xóa khỏi repo (không còn dùng, JWT không được kiểm chữ ký, gọi RPC quản trị bằng service-role luôn bị từ chối).

## 11. Logs & cảnh báo

- [ ] Từ chối quyền đặc quyền, vi phạm giới hạn tốc độ và các lần thử cấp quyền sai chỉ được ghi vào **nhật ký Postgres** (marker `security_event` hoặc `raise log`), không vào bảng audit (vì giao dịch lỗi bị rollback). Hãy xem Dashboard → Logs → Postgres Logs định kỳ, hoặc bật **Log drain** (tính năng của gói cao hơn; kiểm tra điều kiện gói hiện hành) về hệ thống SIEM của ngân hàng.
- [ ] Đặt cảnh báo cho các sự kiện: `ROLE_CHANGED`, `CONTENT_PUBLISHED`, `PRIVILEGED_EMAIL_DOMAIN_CHANGED`, `PRIVILEGED_MFA_ENROLLMENT_*` trong `private.security_audit_log` (có thể truy vấn định kỳ bằng service_role/SQL Editor).
- [ ] Xác định thời hạn lưu `private.security_audit_log` (hiện chưa tự động xóa) cùng đơn vị sở hữu dữ liệu.

## 12. Tài khoản quản trị Supabase và quyền truy cập dự án

- [ ] Mọi thành viên tổ chức Supabase bật MFA; áp dụng quyền tối thiểu (không dùng chung tài khoản Owner).
- [ ] Rà soát danh sách thành viên dự án và token truy cập cá nhân (Account → Access Tokens); thu hồi token không dùng.

## 13. Danh sách miền được phép nhận quyền (tùy chọn)

- [ ] Sau khi áp dụng migration `20261002100000`, quản trị viên (AAL2) có thể giới hạn miền email được cấp quyền Biên tập/Quản trị, ví dụ:
  ```sql
  select public.set_privileged_email_domain('hdbank.com.vn', true);
  ```
  Danh sách rỗng = không giới hạn (mặc định, để không khóa ai). Chỉ áp dụng khi **cấp/nâng** quyền; không ảnh hưởng tài khoản đã có quyền và không chặn việc thu hồi. Hãy xác nhận miền đúng trước khi thêm: thêm sai miền sẽ khiến không cấp quyền được cho email ngoài danh sách.

## 14. Chạy lại bộ kiểm tra sau khi cấu hình

- [ ] Dashboard → Advisors → Security Advisor: chạy lại, đối chiếu cảnh báo còn lại (ví dụ Leaked Password Protection trên gói Free, hàm `anon` có thể thực thi theo thiết kế: `get_public_site_content`, `evaluate_guest_choice`, `record_web_analytics_event_v4`).
- [ ] Chạy `supabase/verification/production-checks.sql` và lưu kết quả cùng ngày.
