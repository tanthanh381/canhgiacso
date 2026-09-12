# Nâng cấp Quản trị Tin tức

Triển khai trên bản sao mới nhất của `tanthanh381/canhgiacso`, commit nền `680c4d550387364bf14ad19d4a5e099fa9c21ecb`. Bản repository cũ trong Documents có thay đổi chưa commit nên được giữ nguyên. Chưa push hoặc triển khai lên canhgiacso.com; chưa ghi dữ liệu sản xuất.

## Cách sử dụng

1. Đăng nhập tài khoản đã có quyền, mở `/#/admin`, chọn **Tin tức**.
2. Chọn bài ở danh sách bên trái hoặc **Thêm tin**. Có tìm kiếm theo tiêu đề.
3. Nhập tiêu đề và mô tả ngắn. Bài mới tự tạo slug từ tiêu đề khi gõ; có thể chỉnh slug thủ công hoặc bấm **Tạo slug từ tiêu đề**. Slug phải duy nhất. Đổi slug thay đổi đường dẫn chia sẻ; chưa có chuyển hướng slug cũ.
4. Soạn nội dung bằng thanh công cụ: Heading 2/3, đậm, nghiêng, danh sách số/chấm, trích dẫn, căn trái/giữa/phải, liên kết HTTPS, ảnh, hoàn tác/làm lại. Chọn đoạn chữ trước khi định dạng hoặc thêm link.
5. Ở **Ảnh đại diện**, chọn **Upload / chọn ảnh**. Có thể tải JPG/PNG/WebP tối đa 5 MB, dùng URL HTTPS hoặc chọn lại ảnh đang được dùng trong các bài. Điền alt text rồi bấm **Sử dụng ảnh**. Ảnh từ máy được nén WebP, tối đa 1.200 px cạnh dài và 130.000 ký tự dữ liệu sau nén; ảnh quá lớn sẽ có thông báo.
6. **Chèn ảnh** dùng cùng bộ chọn ảnh. Chọn ảnh trong nội dung rồi **Sửa ảnh** để thay ảnh/alt text; Delete để xóa ảnh đang chọn. Ảnh dán vào bài thiếu alt text sẽ bị chặn khi lưu cho đến khi sửa.
7. Chọn chủ đề hiện có hoặc nhập chủ đề mới, ngày xuất bản, SEO title/meta description. Nguồn tham khảo là tùy chọn: nếu dùng thì phải điền cả tên nguồn và URL HTTPS.
8. Bấm **Xem trước bài viết** để xem bố cục đọc thật; Escape hoặc **Đóng** để quay lại soạn thảo.
9. **Lưu bản nháp** ở đầu trang lưu toàn bộ thay đổi quản trị vào máy chủ, không đổi website công khai. Để đăng bài mới, Quản trị viên chọn **Published · Đưa vào bản xuất bản**, rồi bấm **Xuất bản** ở đầu trang. Các bài còn Draft được giữ trong bản nháp quản trị và loại khỏi bản xuất bản.
10. Bài cũ không có trạng thái được coi là đã xuất bản. Khi muốn gỡ bài khỏi website, chọn Draft và xuất bản lại toàn bộ nội dung. Biên tập viên chỉ được lưu bản nháp; quyền xuất bản trên máy chủ được giữ nguyên.

Thông báo **Có thay đổi chưa lưu** và hộp cảnh báo xuất hiện khi rời trang bằng điều hướng chính, đăng xuất hoặc tải lại/đóng trang (cảnh báo trình duyệt phụ thuộc chính sách trình duyệt). Chuyển bài và tab quản trị giữ thay đổi trong bộ nhớ. Chưa có autosave. Không nên để nhiều người đồng thời sửa cùng kho nội dung vì quy trình hiện tại lưu toàn bộ nội dung, người lưu sau có thể ghi đè người lưu trước.

## Dữ liệu và tương thích

React 19 + TypeScript, vinext/Vite, Supabase Auth/Postgres. Admin tiếp tục dùng `get_managed_site_content` và `save_managed_site_content`; không sửa bảng, RLS hoặc hàm SQL. `main-draft` giữ toàn bộ bài; payload ghi vào `main` chỉ chứa bài không ở trạng thái Draft.

Các trường mới đều tùy chọn: `slug`, `status`, `thumbnail`, `thumbnailAlt`, `body`, `seoTitle`, `metaDescription`. Bài cũ, ID cũ, tóm tắt và nguồn giữ nguyên. Rich text lưu dạng JSON có kiểm tra danh sách node/mark cho phép; renderer dùng React, không thực thi HTML được nhập. Preview và trang đọc dùng chung renderer. Không chuyển dữ liệu cũ hàng loạt.

Ảnh được lưu cùng JSON nội dung theo cách ảnh chứng nhận hiện có. Không cần thiết lập bucket hoặc quyền Storage mới. Kho nội dung có giới hạn máy chủ 1 MB; phía giao diện chặn trên 850 KB UTF-8 để chừa khoảng an toàn. Với nhiều bài nhiều ảnh, nên sử dụng URL ảnh HTTPS từ kho ảnh hiện có. Thư viện ảnh chỉ tổng hợp ảnh trong các bài đang được quản trị, chưa phải một DAM/kho media độc lập.

Chủ đề được hỗ trợ theo trường `category` sẵn có. Không thêm tags vì cấu trúc hiện tại chưa có tags. Ngày xuất bản chỉ là ngày hiển thị, chưa có hẹn giờ đăng. SEO title/meta description cập nhật khi đọc bài trong trình duyệt; đường dẫn `/#/news/<slug>` chưa cung cấp trang HTML riêng cho crawler, canonical/sitemap từng bài hoặc social metadata phía máy chủ.

## File thay đổi

- `app/news-editor.tsx`: giao diện danh sách, trình soạn Tiptap, bộ chọn ảnh và preview.
- `app/news-content.ts`: kiểu rich text, slug, kiểm tra dữ liệu/URL/ảnh và lọc bài Draft.
- `app/news-article.tsx`: renderer dùng chung cho preview và bài công khai.
- `app/admin.tsx`: tích hợp editor, lưu/xuất bản, cảnh báo chưa lưu, bắt lỗi kết nối và giới hạn dung lượng.
- `app/data.ts`: mở rộng kiểu bài và validation tương thích dữ liệu cũ.
- `app/page.tsx`: ảnh thumbnail, đọc bài theo slug, metadata và bảo vệ điều hướng khỏi admin.
- `app/globals.css`: bố cục responsive, toolbar, vùng soạn, ảnh và dialog theo màu admin hiện tại.
- `package.json`, `pnpm-lock.yaml`: Tiptap 3.31.3 và các extension liên quan, phiên bản cố định.
- `vite.github-pages.config.ts`: giữ trình soạn thảo trong phần tải khi mở admin, tránh gom nhầm `@tiptap/react` vào gói React chung.
- `tests/news-content.test.mjs`: kiểm tra dữ liệu cũ, Draft, slug, ngày, nội dung không an toàn và round trip.
- `README.md`, `NEWS_EDITOR.md`: hướng dẫn sử dụng và báo cáo.

## Kiểm tra

- `pnpm run build`: đạt.
- `pnpm run build:pages`: đạt.
- `node --test tests/*.test.mjs`: 35/35 đạt.
- `pnpm run lint`: không lỗi; còn 8 cảnh báo khuyến nghị dùng `next/image` thay `<img>` (dự án xuất bản tĩnh và đã nén ảnh tải lên).
- `pnpm audit --prod --audit-level low`: không có lỗ hổng đã biết.
- TypeScript cho toàn bộ thư mục `app`: đạt. `tsc --noEmit` toàn dự án vẫn bị chặn bởi khai báo kiểu Cloudflare có sẵn còn thiếu: `cloudflare:workers`, `Fetcher`, `D1Database` ở `db/index.ts`, `worker/index.ts`.
- Kiểm tra trình duyệt bằng fixture cục bộ, không ghi vào Supabase: thêm bài, nhập tiêu đề/tóm tắt/nội dung, đậm/căn giữa, tạo slug, preview, tải ảnh mẫu, alt text, dùng lại ảnh trong bài. Bố cục 390 px không tràn ngang.
- Trang Tin tức công khai mở đúng khi khởi tạo và tải lại đường dẫn. Dữ liệu công khai nhận được trong lúc kiểm tra không có bài tin, nên chưa xác minh mở/lưu/xuất bản một bài thật bằng tài khoản quản trị trên hệ thống sản xuất.

Các file fixture/kiểm tra tạm không nằm trong bản giao. CI hiện có sẽ tự build thư mục `docs` khi mã nguồn được đưa lên nhánh triển khai; không cần sửa thủ công các file build.
