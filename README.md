# Cảnh Giác Số

**Cảnh Giác Số** là chương trình mô phỏng tương tác của **HDBank - IT Security**, giúp người chơi hình thành phản xạ trước các thủ đoạn lừa đảo trực tuyến phổ biến.

🌐 Bản public: [https://canhgiacso.com/](https://canhgiacso.com/)

## Tính năng

- 42 kịch bản phân nhánh theo 4 cấp độ khó, mở khóa tuần tự từ Dễ đến Rất khó
- Hệ thống tài sản, cảnh giác và điểm phòng vệ
- Phản hồi giải thích sau từng lựa chọn
- Tìm kiếm và lọc tình huống
- Chứng cứ, huy hiệu, chuỗi thành tích và thống kê
- Cấp chứng chỉ hoàn thành theo kết quả đã được máy chủ xác minh và cho phép tải chứng chỉ dưới dạng PDF
- Cẩm nang xử lý khẩn cấp theo quy tắc Dừng — Kiểm — Báo
- Chế độ sáng/tối và giao diện responsive
- Đăng ký/đăng nhập email bằng Supabase Auth
- Tham gia ngay với tư cách khách, không cần đăng ký và không tạo bản ghi Supabase
- Đồng bộ hồ sơ, tiến trình và kết quả kiểm tra giữa các thiết bị
- Dashboard dữ liệu tập trung, chỉ mở cho tài khoản được cấp quyền CISO
- Trang quản trị nội dung tại `/#/admin`, có bản nháp và thao tác xuất bản
- Phân quyền Quản trị/Biên tập viên và cấp quyền trực tiếp theo tài khoản
- Quản lý nội dung chung, tình huống, đáp án, mức thiệt hại và thẻ cẩm nang
- Row Level Security bảo đảm người dùng thường chỉ đọc/ghi dữ liệu của chính mình
- `localStorage` chỉ dùng cho giao diện và tiến trình khách chưa đăng nhập
- Không yêu cầu hoặc thu thập dữ liệu ngân hàng
- Nhận diện Cảnh Giác Số riêng với biểu tượng đại bàng trong chiếc khiên do dự án cung cấp

## Kiến trúc: hai target build

Mã nguồn ứng dụng nằm ở `app/` và được dùng bởi **hai target build**:

| | Production (GitHub Pages) | Target phụ (vinext / Cloudflare Worker) |
|---|---|---|
| Cấu hình | `vite.github-pages.config.ts` | `vite.config.ts`, `worker/index.ts`, `app/layout.tsx` |
| Entry | `github-pages/main.tsx` | `app/layout.tsx` + `app/page.tsx` |
| Lệnh | `pnpm run build:pages` | `pnpm run dev`, `pnpm run build`, `pnpm run start` |
| Đầu ra | `docs/` (sinh tự động, không commit) | `dist/` (không commit) |
| Triển khai | `.github/workflows/pages.yml` khi push vào `main`, phục vụ tại `canhgiacso.com` | Chưa triển khai; dùng cho dev server và kiểm thử render phía máy chủ (`tests/rendered-html.test.mjs`) |

**Bản chạy thật là GitHub Pages.** Hai entry hiện còn song song nên một thay đổi giao diện cần được kiểm tra trên `build:pages` (nguồn của production), không chỉ trên `pnpm run dev`.

Nội dung SEO tĩnh (`public/**`, `github-pages/index.html`) được tạo và chuẩn hóa bởi `pnpm run content:compile` (chạy tự động trong `build:pages`). Các bước ghi **tại chỗ** vào thư mục nguồn và phải **idempotent**: chạy lần hai không được đổi file nào (có test bảo vệ: `tests/content-pipeline-idempotent.test.mjs`). Cấu hình các bước nằm ở `content/content-architecture.json`; `docs/` luôn là đầu ra sinh tự động, không sửa tay.

## Chạy cục bộ

Yêu cầu Node.js 22.13+ và pnpm 10. Phiên bản pnpm được khóa trong `package.json` (`packageManager`); chạy `corepack enable` rồi dùng `pnpm` như bình thường.

```bash
pnpm install
pnpm run dev            # dev server vinext tại http://localhost:3000
```

Xem trước **đúng bản production** (GitHub Pages) trên máy:

```bash
pnpm run build:pages
node scripts/qc-static-server.mjs   # http://127.0.0.1:4173, phục vụ thư mục docs/
```

## Các lệnh

| Lệnh | Tác dụng |
|---|---|
| `pnpm run dev` / `build` / `start` | Dev server, build và chạy bản build của target vinext |
| `pnpm run build:pages` | `content:compile` rồi build bản production vào `docs/` |
| `pnpm run content:compile` | Chạy pipeline nội dung (ghi tại chỗ, idempotent) |
| `pnpm run seo:audit` | Kiểm tra SEO theo sitemap trên `docs/` (title, description, canonical, schema, cụm từ bị lặp...) |
| `pnpm run lint` | ESLint, `--max-warnings 0` |
| `pnpm run typecheck` | `tsc` cho ba project: `tsconfig.json` (ứng dụng), `tsconfig.tooling.json` (cấu hình build, Worker, Playwright), `tsconfig.functions.json` (Supabase Edge Functions) |
| `pnpm test` | `build` (vinext) rồi toàn bộ unit test |
| `pnpm run test:unit` | Chỉ chạy `node --test tests/*.test.mjs` (không build) |
| `pnpm run test:e2e` | `build:pages` rồi chạy E2E smoke Playwright (Chromium) |
| `node scripts/security-scan.mjs` | Quét khóa bí mật bị commit nhầm |
| `pnpm run health:production` | Chỉ đọc: kiểm tra `canhgiacso.com` đang phục vụ đúng (gọi mạng) |

Trước khi mở PR, chạy tối thiểu:

```bash
pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build:pages && pnpm run seo:audit
```

## Kiểm thử

- **Unit test** (`tests/*.test.mjs`, chạy bằng `node --test`). Các file `*-behavior.test.mjs` và `content-pipeline-idempotent.test.mjs` **thực thi mã thật**: `tests/helpers/ts-loader.mjs` biên dịch TypeScript của repo và nạp module để gọi hàm trực tiếp. Một số test cũ vẫn kiểm tra hợp đồng cấu trúc bằng cách đối chiếu văn bản mã nguồn; khi thêm test mới, ưu tiên kiểu chạy thực.
- **E2E** (`tests/e2e`, Playwright 1.55.1 ghim trong `package.json`). Cài trình duyệt một lần: `pnpm exec playwright install chromium`.
  - `playwright.platform.config.ts`: smoke test, tự khởi động máy chủ tĩnh; chọn trình duyệt bằng `QC_BROWSER=chromium|firefox|webkit`.
  - `playwright.qc.config.ts`: bộ kiểm tra đa trình duyệt/thiết bị; cần máy chủ tĩnh đang chạy sẵn (`node scripts/qc-static-server.mjs`) sau khi `build:pages`.
- Báo cáo `tests/QA_TEST_REPORT_2026-09-04.md` là tài liệu lịch sử, không phản ánh hiện trạng.

## CI/CD

| Workflow | Khi nào chạy | Nội dung |
|---|---|---|
| `verify.yml` | PR và push vào `main` | Quét bí mật, `pnpm audit --prod`, lint, typecheck, test, `build:pages`, `seo:audit`; job `e2e-smoke` chạy smoke Playwright (Chromium) |
| `pages.yml` | Push vào `main` | Kiểm tra rồi build và triển khai GitHub Pages, sau đó kiểm tra sức khỏe production |
| `seo-verify.yml` | PR/push có đổi nội dung SEO | Build và `seo:audit` |
| `security-analysis.yml` | PR, push, hằng tuần | CodeQL, OSV (tham khảo), cổng `pnpm audit` (production mọi mức, toàn bộ phụ thuộc từ mức high), SBOM |
| `cross-os-qc.yml`, `cross-browser-qc.yml` | Push vào `main`, thủ công | Smoke trên Linux/Windows/macOS và bộ QC đa trình duyệt |
| `production-health.yml` | 6 giờ một lần | Thăm dò `canhgiacso.com` |

Cài đặt bảo vệ nhánh, secret scanning... không nằm trong mã nguồn; xem `documentation/maintenance/github-settings.md`.

## Quy trình đóng góp

Không commit trực tiếp vào `main`. Tạo nhánh, mở Pull Request, đợi các kiểm tra xanh và có người review. Chi tiết trong [CONTRIBUTING.md](CONTRIBUTING.md); PR dùng mẫu `.github/pull_request_template.md`.

## Công nghệ

React 19, TypeScript, Vite (bản production tĩnh trên GitHub Pages; target phụ vinext/Cloudflare Worker), Supabase Auth/Postgres, Playwright.

## Dữ liệu và phân quyền

Cấu trúc cơ sở dữ liệu nằm tại `supabase/schema.sql`. Website chỉ chứa khóa Supabase publishable dành cho trình duyệt; không chứa secret key hoặc `service_role`.

Với dự án Supabase đã tồn tại, áp dụng `supabase/admin_content.sql`, sau đó `supabase/content_roles.sql` để bổ sung kho nội dung, hai nhóm quyền và chính sách RLS. Nội dung công khai chỉ đọc bản có trạng thái `published`; tài khoản thường không thể đọc bản nháp hoặc ghi dữ liệu.

Chứng chỉ được lưu trong schema `private` và chỉ được cấp cho lượt đào tạo đã hoàn thành toàn bộ tình huống với kết quả `server_verified`. Người dùng đã đăng nhập chỉ nhận được chứng chỉ của chính mình thông qua RPC được kiểm soát phía máy chủ; chế độ khách không được cấp chứng chỉ định danh.

Để cấp quyền Dashboard cho một tài khoản đã xác nhận email, chạy bằng SQL Editor của Supabase với email quản trị thực tế:

```sql
insert into private.app_admins (user_id)
select id from auth.users where email = 'ciso@example.com'
on conflict (user_id) do nothing;
```

Quyền Quản trị mở Dashboard, xuất bản nội dung và tab Phân quyền. Sau khi đăng nhập, Quản trị viên có thể cấp một trong ba trạng thái cho tài khoản khác ngay tại `https://canhgiacso.com/#/admin`: Thành viên, Biên tập viên hoặc Quản trị. Biên tập viên được chỉnh sửa và lưu bản nháp nhưng không thể xuất bản hay cấp quyền.

Trong Supabase Authentication → URL Configuration, đặt Site URL là `https://canhgiacso.com/`. Thêm `https://canhgiacso.com/**`, `https://www.canhgiacso.com/**` và tạm giữ `https://tanthanh381.github.io/chongluadao/**` trong Redirect URLs để các liên kết xác nhận email mới và cũ đều hoạt động trong giai đoạn chuyển đổi.

## Lưu ý

Đây là sản phẩm giáo dục mô phỏng. Khi đã phát sinh thiệt hại, hãy liên hệ ngân hàng để khoá giao dịch, lưu bằng chứng và trình báo cơ quan công an gần nhất.

## Trình soạn thảo Tin tức

Trang quản trị Tin tức hỗ trợ rich text, ảnh đại diện/ảnh trong bài có alt text, slug, SEO, preview và trạng thái từng bài. Xem [hướng dẫn sử dụng và báo cáo nâng cấp](NEWS_EDITOR.md) để biết cách lưu bản nháp, xuất bản và giới hạn ảnh/SEO hiện tại.
