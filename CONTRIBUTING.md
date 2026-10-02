# Hướng dẫn đóng góp

Cảm ơn bạn đã góp phần cho **Cảnh Giác Số** (HDBank - IT Security). Tài liệu này mô tả quy trình làm việc để mọi thay đổi vào `main` đều được kiểm tra và có người xem lại, vì `main` được triển khai tự động lên [canhgiacso.com](https://canhgiacso.com/).

## Nguyên tắc

1. **Không commit trực tiếp vào `main`.** Mọi thay đổi đi qua Pull Request. (Cấu hình bắt buộc điều này trên GitHub nằm ở `documentation/maintenance/github-settings.md`.)
2. **Nhánh ngắn hạn.** Tạo nhánh từ `main` mới nhất, làm một việc, mở PR sớm, merge trong vài ngày. Nhánh không có hoạt động quá 30 ngày sẽ bị đóng (xem `documentation/maintenance/branch-cleanup.md`).
3. **PR nhỏ, một mục đích.** Tách thay đổi giao diện, nội dung, cơ sở dữ liệu và phụ thuộc thành các PR riêng khi có thể.
4. **Không có kiểm tra xanh thì không merge.** Không dùng quyền bypass trừ khi khẩn cấp và phải ghi rõ lý do trong PR.

## Chuẩn bị môi trường

Cần Node.js 22.13+ và pnpm 10 (phiên bản được khóa trong `package.json` qua `packageManager`).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev                 # http://localhost:3000
```

Xem trước đúng bản production (GitHub Pages): `pnpm run build:pages && node scripts/qc-static-server.mjs` rồi mở `http://127.0.0.1:4173`. Lưu ý repository có **hai target build** (Pages là bản chạy thật, vinext/Worker là target phụ); xem mục "Kiến trúc" trong [README.md](README.md).

## Quy trình một thay đổi

```bash
git switch main && git pull --ff-only
git switch -c fix/ten-ngan-gon         # tiền tố: feat/ fix/ docs/ test/ chore/ ci/
# ... sửa mã ...
pnpm run lint && pnpm run typecheck && pnpm test && pnpm run build:pages && pnpm run seo:audit
git add -p && git commit
git push -u origin fix/ten-ngan-gon     # rồi mở Pull Request
```

- **Thông điệp commit**: một dòng tóm tắt theo dạng `loại: nội dung` (ví dụ `fix: chặn tràn ngang trên mobile`, `feat: thêm công cụ kiểm tra biên lai`), thân bài giải thích *vì sao* khi cần.
- **Pull Request**: điền mẫu `.github/pull_request_template.md` (mô tả, cách kiểm tra, ảnh chụp nếu đổi giao diện, tác động bảo mật/quyền riêng tư). Chờ CI (`verify`, `e2e-smoke`, `CodeQL`) xanh và ít nhất một người review. Dùng *Squash and merge* hoặc *Rebase and merge*; nhánh sẽ tự xóa sau khi merge.
- Sửa theo góp ý bằng commit mới trên cùng nhánh; không force-push lên nhánh đã có người review trừ khi người review đồng ý.

## Kiểm thử

| Việc | Lệnh |
|---|---|
| Lint (không cho phép cảnh báo) | `pnpm run lint` |
| Kiểm tra kiểu TypeScript (ứng dụng, cấu hình/Worker/Playwright, Edge Functions) | `pnpm run typecheck` |
| Unit test (kèm build vinext) | `pnpm test` |
| Chỉ unit test | `pnpm run test:unit` |
| E2E smoke (Chromium) | `pnpm exec playwright install chromium` rồi `pnpm run test:e2e` |
| Quét bí mật | `node scripts/security-scan.mjs` |
| Audit phụ thuộc | `pnpm audit --prod --audit-level low` |

Khi thêm hoặc sửa logic:

- Viết test **chạy mã thật**: dùng `tests/helpers/ts-loader.mjs` để nạp module TypeScript và gọi hàm trực tiếp (xem `tests/progression-behavior.test.mjs`, `tests/browser-storage-behavior.test.mjs` làm mẫu). Tránh kiểm tra logic bằng regex trên văn bản mã nguồn.
- Test phải thất bại khi hành vi sai: thử đảo một điều kiện trong mã và xác nhận test đỏ.
- Với thay đổi giao diện, kiểm tra trên mobile (390 px) và chế độ tối; E2E smoke bắt lỗi tràn ngang và lỗi console nghiêm trọng.

## Thay đổi nội dung và SEO

Các trang tĩnh trong `public/**` và `github-pages/index.html` được sinh và chuẩn hóa tại chỗ bởi `pnpm run content:compile` (tự chạy trong `build:pages`). Quy tắc:

- Sau khi sửa nguồn nội dung (`seo/*.json`, `content/*`, các script trong `scripts/`), chạy `pnpm run content:compile` và **commit cả các file được cập nhật**.
- Mọi bước phải **idempotent**: chạy lần hai không được đổi file nào. `tests/content-pipeline-idempotent.test.mjs` kiểm tra điều này và việc không có cụm từ bị lặp liên tiếp trong tiêu đề/liên kết/heading.
- Không sửa tay thư mục `docs/` (sinh tự động, đã bị gitignore).
- Chạy `pnpm run build:pages && pnpm run seo:audit` trước khi mở PR.

## Bảo mật và quyền riêng tư

- Không commit khóa bí mật. Trình duyệt chỉ chứa khóa Supabase *publishable*; không bao giờ đưa `service_role`/secret key vào mã nguồn hay lịch sử git.
- Thay đổi trong `supabase/**` (RLS, hàm RPC, migration) cần người review hiểu mô hình quyền; mô tả tác động quyền trong PR và cập nhật `documentation/security/` nếu đổi ranh giới tin cậy.
- Thay đổi liên quan dữ liệu cá nhân, cookie, phân tích truy cập hay chứng chỉ phải nêu rõ trong PR (mục "Bảo mật & quyền riêng tư").
- Báo lỗ hổng bảo mật theo [SECURITY.md](SECURITY.md); đừng mở Issue công khai.

## Phụ thuộc và workflow

- Phiên bản gói được ghim chính xác (không dùng `^`/`~`). Nâng cấp bằng `pnpm add -E <gói>@<phiên bản>`, giữ `react`, `react-dom` và `react-server-dom-webpack` cùng phiên bản, rồi chạy đủ bộ kiểm tra ở trên.
- Ghi chú lý do cho mọi mục trong `overrides` ở `pnpm-workspace.yaml` và xóa khi gói cha đã sửa.
- Các action trong `.github/workflows/` được ghim bằng SHA commit (kèm chú thích phiên bản). Dependabot gom cập nhật theo nhóm hằng tuần; xem từng PR gộp trước khi merge.
- Mỗi job cần `timeout-minutes` và quyền `permissions` tối thiểu.

## Cấu trúc thư mục chính

| Đường dẫn | Nội dung |
|---|---|
| `app/` | Mã ứng dụng React/TypeScript (dùng chung cho cả hai target) |
| `github-pages/` | Entry và cấu hình của bản production |
| `worker/`, `vite.config.ts` | Target phụ vinext/Cloudflare Worker |
| `public/`, `seo/`, `content/` | Nội dung tĩnh, dữ liệu SEO và manifest pipeline nội dung |
| `scripts/` | Pipeline nội dung, `seo-audit`, `security-scan`, máy chủ tĩnh QC |
| `supabase/` | Schema, migration, kiểm thử cơ sở dữ liệu, Edge Functions |
| `tests/` | Unit test (`*.test.mjs`) và E2E Playwright (`tests/e2e`) |
| `documentation/` | Tài liệu bảo mật, phân tích truy cập và vận hành (`maintenance/`) |
