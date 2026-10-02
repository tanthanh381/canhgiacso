# Header bảo mật cho canhgiacso.com (Cloudflare edge)

GitHub Pages không cho đặt header HTTP. Hiện tại phản hồi của site **không có** `Content-Security-Policy`,
`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
CSP chỉ có dưới dạng thẻ `<meta>`, mà `<meta>` bỏ qua `frame-ancestors`, nên trang như `/#/admin` vẫn có thể bị nhúng
trong iframe của site khác. Thư mục này đặt các header đó ở lớp edge của Cloudflare, đứng trước GitHub Pages.

Có hai phương án, chọn **một**:

| Phương án | Khi nào dùng | Chi phí vận hành |
| --- | --- | --- |
| A. Worker (`worker.js`) | Muốn mã nguồn được kiểm thử, có chuyển hướng `/.well-known/security.txt`, chặn phương thức ghi | Cần `wrangler`; gói Workers Free có hạn mức yêu cầu mỗi ngày, hãy kiểm tra giới hạn hiện hành so với lưu lượng thực |
| B. Transform Rules (bảng bên dưới) | Không muốn chạy mã, lưu lượng lớn | Cấu hình trên giao diện Cloudflare, không có hạn mức yêu cầu kiểu Worker |

Cả hai cho kết quả header giống nhau. Kiểm tra bằng `scripts/check-security-headers.mjs` (xem phần Kiểm tra).

## Phương án A: Worker

### Điều kiện

1. Tên miền `canhgiacso.com` được quản lý trên Cloudflare (đổi nameserver theo hướng dẫn của Cloudflare).
2. Bản ghi DNS của `canhgiacso.com` và `www` trỏ tới GitHub Pages và **bật proxy** (đám mây cam):
   `CNAME @ -> <tài-khoản>.github.io` (Cloudflare tự làm phẳng CNAME ở apex) và `CNAME www -> <tài-khoản>.github.io`.
3. SSL/TLS của zone: chế độ **Full** (không dùng Flexible, vì GitHub Pages đã ép HTTPS). Bật **Always Use HTTPS**.
4. GitHub Pages: Settings > Pages có custom domain `canhgiacso.com` và bật **Enforce HTTPS**.

### Triển khai

```bash
cd deploy/cloudflare-edge
# 1. Mở wrangler.toml, bỏ chú thích khối `routes` (đúng zone_name của tài khoản Cloudflare).
# 2. Đăng nhập và triển khai (cần quyền Workers Scripts:Edit và Zone > Workers Routes:Edit).
pnpm exec wrangler login
pnpm exec wrangler deploy
```

Kiểm tra bản dựng mà không triển khai: `pnpm exec wrangler deploy --dry-run --outdir /tmp/edge-out`.

Biến `ORIGIN` trong `wrangler.toml`:

- **Để rỗng (khuyến nghị, chế độ Route).** Worker gọi `fetch(request)`; Cloudflare chuyển yêu cầu tới origin trong DNS
  (GitHub Pages) với nguyên Host `canhgiacso.com`, nên không có vòng chuyển hướng.
- **Đặt `ORIGIN = "https://<tài-khoản>.github.io"`** chỉ khi Worker chạy ở hostname khác (ví dụ bản thử trên `workers.dev`,
  khi đó cần `workers_dev = true`). Lưu ý: nếu repo đã gắn custom domain, GitHub Pages chuyển hướng host `*.github.io` về
  `canhgiacso.com`, nên chế độ này chỉ dùng để thử, không dùng cho production. Worker bỏ qua `ORIGIN` nếu nó trùng host đang phục vụ.

### Worker làm gì

- Đặt các header: `Content-Security-Policy` (CSP chuẩn của site cộng `frame-ancestors 'none'`, `form-action 'self'`),
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`.
- Chuyển hướng 301 `/.well-known/security.txt` sang `/security.txt` (xem ghi chú security.txt).
- Chuyển hướng `http://` sang `https://`; chỉ cho phép `GET`/`HEAD` (phương thức khác trả 405).
- Giữ nguyên status, body, `ETag`, `Cache-Control`, `Last-Modified`, `Content-Type` của GitHub Pages, nên cache và
  yêu cầu điều kiện (`If-None-Match` -> 304) hoạt động như trước.
- Ngoại lệ duy nhất: `/gioi-thieu/hoat-hinh.html` (trang hoạt hình nhúng iframe, chứa script/style inline và ảnh `data:`) nhận
  CSP riêng cho phép inline và `X-Frame-Options: SAMEORIGIN` để iframe trong `/gioi-thieu/` vẫn chạy. Nếu chuyển script/style
  của trang đó ra tệp riêng, hãy xóa ngoại lệ trong `worker.js` (`ANIMATION_PATH`).

## Phương án B: Transform Rules

Cloudflare dashboard > Rules > Transform Rules > **Modify Response Header** > Create rule.

Rule 1, tên "Security headers", biểu thức `(http.host eq "canhgiacso.com") or (http.host eq "www.canhgiacso.com")`, thao tác **Set static**:

| Header | Giá trị |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self' data:; connect-src 'self' https://goietwyapiywrtibpkwo.supabase.co wss://goietwyapiywrtibpkwo.supabase.co https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.google.com; frame-src 'self' https://phishingquiz.withgoogle.com; media-src 'none'; worker-src 'none'; object-src 'none'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Rule 2, tên "Animation iframe", đặt **sau** Rule 1, biểu thức `http.request.uri.path eq "/gioi-thieu/hoat-hinh.html"`, **Set static**:

| Header | Giá trị |
| --- | --- |
| `Content-Security-Policy` | `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'` |
| `X-Frame-Options` | `SAMEORIGIN` |

Chuyển hướng security.txt: Rules > Redirect Rules > Create rule, biểu thức `http.request.uri.path eq "/.well-known/security.txt"`,
thao tác Static redirect tới `https://canhgiacso.com/security.txt`, mã 301.

Giá trị trong bảng phải trùng với `worker.js` (`CSP_DIRECTIVES`); test `tests/edge-headers.test.mjs` giữ `worker.js` đồng bộ với CSP
trong thẻ `<meta>` của các trang.

## Kiểm tra sau khi triển khai

```bash
node scripts/check-security-headers.mjs https://canhgiacso.com/
```

Lệnh in từng header là OK, SAI hoặc THIẾU và thoát mã 1 nếu có header bắt buộc không đạt. Sau đó kiểm tay trên trình duyệt
(DevTools > Console và Network):

1. Mở trang lần đầu: **không** có request tới `googletagmanager.com`, `google-analytics.com` hay `goietwyapiywrtibpkwo.supabase.co/rest/v1/rpc/record_web_analytics_event_v4`.
2. Bấm "Chấp nhận phân tích": `gtag/js` trả 200, có request thu thập tới `google-analytics.com`, yêu cầu RPC thống kê tới Supabase trả 2xx, Console không có
   dòng `Refused to ...` hay `violates the following Content Security Policy`.
3. Đăng nhập (Supabase Auth và `wss://` realtime), mở `/#/game`, `/#/quiz` (iframe `phishingquiz.withgoogle.com`), `/gioi-thieu/` (hoạt hình chạy trong iframe).
4. Thử nhúng `https://canhgiacso.com/` trong một trang HTML khác: trình duyệt phải từ chối.
5. `curl -sI https://canhgiacso.com/.well-known/security.txt` trả `301` tới `/security.txt`.

Có thể dùng thêm `scripts/production-health.mjs`: nó in `WARN` (không làm hỏng CI) khi `/` thiếu header bảo mật.

## Khi thêm dịch vụ bên thứ ba

Mọi origin mới (script, kết nối, khung nhúng) phải được thêm đồng thời ở `scripts/instrument-content.mjs` (CSP trong thẻ `<meta>`),
`worker.js` và bảng Transform Rules ở trên, nếu không CSP sẽ chặn nó.

## Rollback

- **Worker:** `pnpm exec wrangler rollback` (về phiên bản trước), hoặc gỡ route khỏi `wrangler.toml` rồi `wrangler deploy`,
  hoặc Cloudflare dashboard > Workers > canhgiacso-security-headers > Settings > Triggers > xóa route. Cách nhanh nhất khi sự cố:
  đặt bản ghi DNS về **DNS only** (đám mây xám) để bỏ qua toàn bộ edge.
- **Transform Rules:** tắt (Disable) hoặc xóa rule, hiệu lực trong vài giây.
- **HSTS:** trình duyệt nhớ HSTS tới 1 năm sau lần truy cập cuối. Trước khi bật `includeSubDomains`, hãy bảo đảm mọi subdomain đang phục vụ HTTPS.
  Nếu phải gỡ, gửi `Strict-Transport-Security: max-age=0` trong một thời gian rồi mới tắt hẳn. Không đăng ký HSTS preload nếu chưa chắc chắn.

## Ghi chú security.txt

`actions/upload-pages-artifact` loại các tệp và thư mục ẩn, nên thư mục `/.well-known/` không bao giờ được triển khai lên GitHub Pages.
Tệp thật được phục vụ ở `/security.txt` (đã dùng làm `Canonical` trong `public/security.txt`). RFC 9116 khuyến nghị đường dẫn
`/.well-known/security.txt`, vì vậy Worker (hoặc Redirect Rule ở phương án B) chuyển hướng 301 đường dẫn đó tới `/security.txt`.
Nếu không dùng Cloudflare, `/.well-known/security.txt` sẽ tiếp tục trả 404.
