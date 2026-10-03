## Mô tả

<!-- Thay đổi gì và vì sao? Liên kết Issue nếu có. -->

## Loại thay đổi

- [ ] Sửa lỗi
- [ ] Tính năng / giao diện
- [ ] Nội dung / SEO
- [ ] Cơ sở dữ liệu / Supabase
- [ ] Phụ thuộc / CI / công cụ
- [ ] Tài liệu

## Cách kiểm tra

<!-- Các bước để người review tự kiểm chứng. -->

Đã chạy cục bộ:

- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm test`
- [ ] `pnpm run build:pages` và `pnpm run seo:audit`
- [ ] `pnpm run test:e2e` (nếu đổi giao diện hoặc luồng chính)
- [ ] Đã thêm hoặc cập nhật test chạy mã thật cho hành vi mới/đã sửa

## Giao diện (nếu có)

<!-- Ảnh trước/sau, kèm mobile 390 px và chế độ tối. -->

## Nội dung / SEO (nếu có)

- [ ] Đã chạy `pnpm run content:compile` và commit các file được cập nhật
- [ ] Chạy lần hai không làm thay đổi file nào (idempotent)

## Bảo mật & quyền riêng tư

- [ ] Không thêm khóa bí mật, token hay dữ liệu cá nhân vào mã nguồn
- [ ] Không làm yếu RLS, CSP hoặc kiểm soát truy cập; nếu có thay đổi liên quan, đã mô tả bên dưới
- [ ] Không thêm thu thập dữ liệu, cookie hoặc dịch vụ bên thứ ba mới (hoặc đã nêu rõ bên dưới)

<!-- Mô tả tác động bảo mật/quyền riêng tư nếu có. -->

## Rủi ro và cách hoàn tác

<!-- Điều gì có thể hỏng? Làm sao quay lại (revert commit, migration ngược...)? -->
