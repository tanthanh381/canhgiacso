# Bàn giao đợt khắc phục toàn diện, tháng 10/2026

Tài liệu này là mục lục và trình tự triển khai tổng thể cho nhánh `fix/qc-remediation-20261002` (xuất phát từ commit `baad494`). Chi tiết kỹ thuật nằm ở các tài liệu được liên kết; đừng nhân đôi nội dung ở đây.

## 1. Cách nhận và đưa vào repository

Môi trường làm việc không có quyền ghi vào repository, nên kết quả được bàn giao dưới dạng bundle và bản vá:

```bash
# Cách 1 (khuyến nghị, giữ nguyên lịch sử commit và chữ ký)
git fetch /đường/dẫn/canhgiacso-remediation-20261002.bundle fix/qc-remediation-20261002:fix/qc-remediation-20261002
git push -u origin fix/qc-remediation-20261002      # rồi mở Pull Request vào main

# Cách 2 (một diff duy nhất, không giữ lịch sử)
git checkout -b fix/qc-remediation-20261002 baad494
git apply --index canhgiacso-remediation-20261002.full.patch
```

Không merge thẳng vào `main`. Mở Pull Request và để CI chạy (lint, typecheck, test, build, seo:audit, quét bí mật, DB tests).

## 2. Khuyến nghị đã xử lý trong mã

| Nhóm | Nội dung đã làm | Tài liệu |
| --- | --- | --- |
| Build, CI, mã chết | Typecheck cho cả tooling và edge functions, CI chạy lint/typecheck/test/build/seo/DB test, gỡ mã và thư mục không dùng (`db/`, `drizzle/`, `examples/`, hàm `admin-analytics`), `docs/` chỉ còn là thư mục build, tài liệu chuyển sang `documentation/`; pipeline nội dung chạy lặp lại không sinh diff | `README.md`, `CONTRIBUTING.md` |
| Quyền riêng tư và cookie | Banner đồng ý cookie, GA4 Consent Mode v2 mặc định từ chối, tôn trọng GPC/DNT, thống kê nội bộ chỉ chạy khi đồng ý, trang Quyền riêng tư và Liên hệ viết lại cho khớp hệ thống thật, liên kết "Cài đặt cookie" ở chân trang | `public/consent.js`, `content/site-config.json` |
| Header bảo mật | Mẫu Cloudflare Worker đặt CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy; `security.txt`; script kiểm tra header; trang hoạt hình không còn ngoại lệ CSP | `deploy/cloudflare-edge/README.md` |
| Đáp án trò chơi | Payload công khai không còn đáp án; chế độ khách chấm điểm qua RPC `evaluate_guest_choice` có giới hạn tốc độ; lỗi chấm điểm không bị ghi nhận là trả lời sai | `documentation/security/REMEDIATION-2026-10.md` |
| Xác thực và phân quyền | Vai trò đặc quyền yêu cầu email đã xác nhận và tên miền trong danh sách cho phép, nhật ký kiểm toán, mật khẩu 10–72 ký tự, không ghi trực tiếp vào bảng | cùng tài liệu |
| Dữ liệu IP | Băm IP có muối cho giới hạn tốc độ, tự dọn dữ liệu cũ, bỏ phát biểu sai "không lưu IP" | cùng tài liệu |
| Vòng đời tài khoản | Quên và đặt lại mật khẩu, tải dữ liệu cá nhân (JSON), xoá tài khoản (đăng nhập lại, xác thực gần đây, chặn xoá quản trị viên cuối), xác minh chứng nhận bằng mã tại `/xac-minh-chung-chi/`, mã và địa chỉ xác minh in trên PDF | cùng tài liệu, mục 7 |
| Giao diện | Gộp 6 lớp CSS chồng lấn thành `app/styles/*` có cascade layers (selector trùng 208 → 13, `!important` 23 → 5, CSS gzip −20%), một màu đỏ thương hiệu và token ngữ nghĩa, thay thành phần quét DOM bằng React, một điểm vào dùng chung cho GitHub Pages và vinext, tương phản và vùng chạm, tôn trọng reduced motion, icon SVG thay emoji | `app/styles/index.css` |
| Quản trị repository | Hướng dẫn ruleset, secret scanning, Dependabot, chuyển repository sang tổ chức HDBank, dọn nhánh remote | `documentation/maintenance/*.md` |

## 3. Trình tự triển khai tổng thể

1. **Pull Request**: mở PR, chờ CI xanh, xem lại diff phần `supabase/` và `deploy/` kỹ nhất.
2. **Supabase (trước khi deploy giao diện)**: làm theo `documentation/security/REMEDIATION-2026-10.md` mục 2, Bước 0 đến Bước 2. Tám migration phải áp dụng đúng thứ tự tên tệp; Bước 1(a) phải bằng 0 trước khi chạy migration đầu tiên.
3. **Điền thông tin liên hệ thật** trong `content/site-config.json` (`contactEmail`, `contactFormUrl`, `dataRegion`), rồi chạy `pnpm run content:compile`. Trang Liên hệ và Quyền riêng tư đang nêu rõ nội dung này là chưa điền.
4. **Deploy giao diện** (merge PR, GitHub Pages tự build): theo Bước 3 của runbook; kiểm tra tab Network có `rpc/evaluate_guest_choice` trả 200.
5. **Post-deploy Supabase**: Bước 4 (thu hồi quyền đọc đáp án của `anon`), chỉ sau khi Bước 4 kiểm tra đạt.
6. **Dashboard Supabase**: Bước 5 và `SUPABASE-DASHBOARD-CHECKLIST.md` (SMTP riêng, bật Confirm email, chính sách mật khẩu, Redirect URLs có `https://canhgiacso.com/`, mẫu email đặt lại mật khẩu).
7. **Cloudflare**: triển khai Worker header theo `deploy/cloudflare-edge/README.md`, chạy `node scripts/check-security-headers.mjs` và làm các kiểm tra tay trong tài liệu đó.
8. **Cài đặt GitHub**: `documentation/maintenance/github-settings.md` (ruleset cho `main`, secret scanning, private vulnerability reporting, Dependabot), rồi `branch-cleanup.md`.

## 4. Việc chỉ con người làm được

- Thu hồi Personal Access Token đã dán trong cuộc trò chuyện trước đó (coi như đã lộ).
- Quyết định và xác nhận pháp lý nội dung Quyền riêng tư, thời hạn lưu trữ, vùng dữ liệu (DPO hoặc bộ phận pháp chế HDBank).
- Cấu hình Dashboard Supabase, Cloudflare và GitHub (các bước 6 đến 8 ở trên). Không có quyền truy cập các hệ thống này trong phiên làm việc.
- Cố định `actions/upload-artifact` (và các action còn lại) theo SHA commit sau khi xem lại phiên bản.
- Đề nghị HDBank dẫn liên kết tới `canhgiacso.com` từ kênh chính thức để tăng độ tin cậy.
- Quyết định sản phẩm còn mở: tin tức trên trang tĩnh riêng thay vì chỉ trong SPA (cải thiện SEO), chuyển sang PKCE (cần thử trên staging), bật CAPTCHA (cần frontend gửi `captchaToken`), mã QR trên chứng nhận.

## 5. Mức xác minh đã thực hiện

Trên bản clone mới của nhánh (không phụ thuộc tệp chưa commit): `pnpm install --frozen-lockfile`, lint không cảnh báo, typecheck 3 cấu hình, `pnpm test` (build vinext rồi 322 test), `build:pages`, `seo:audit`, quét bí mật, `pnpm audit --prod` không có lỗ hổng, chạy `content:compile` hai lần không sinh diff.

Kiểm thử trình duyệt thật (Chromium, desktop và Android): 120 ca e2e đạt, gồm banner cookie, chế độ khách, quên mật khẩu, xoá và xuất tài khoản, trang xác minh, trang hoạt hình dưới CSP chặt. Kiểm tra ảnh chụp trước và sau cho 276 trạng thái giao diện và axe không còn lỗi.

PostgreSQL 16 cục bộ với lớp giả lập Supabase: pgTAP 195/195, kiểm tra post-deploy, chạy lại migration hai lần giữ nguyên dữ liệu.

## 6. Giới hạn cần biết

- Chưa thử với Supabase/GoTrue thật, SMTP thật, TOTP và luồng email đặt lại mật khẩu đầu cuối; chưa thử Cloudflare Worker thật. Danh sách việc thử tay trên staging nằm ở `REMEDIATION-2026-10.md` mục 5 và 7.4.
- Chưa chạy Firefox, WebKit/iOS Safari, Windows hay macOS. Nên thử bottom-sheet menu, banner cookie cùng thanh điều hướng đáy, thuộc tính `inert` trên trình duyệt cũ, High Contrast, và trình đọc màn hình.
- Mạng của môi trường làm việc chặn truy cập `canhgiacso.com`, nên không đối chiếu được bản đang chạy với bản mới; các kiểm tra trên đều dùng bản dựng cục bộ.
- Hàng rào đồng ý cookie, CSP qua thẻ meta và kiểm soát giới hạn tốc độ chỉ phát huy đầy đủ khi triển khai các bước 2, 6 và 7 ở mục 3.
