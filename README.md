# Khiên Số

**Khiên Số** là chương trình mô phỏng tương tác của **HDBank - IT Security**, giúp người chơi hình thành phản xạ trước các thủ đoạn lừa đảo trực tuyến phổ biến.

🌐 Bản public: [https://canhgiacso.com/](https://canhgiacso.com/)

## Tính năng

- 10 kịch bản phân nhánh theo 4 cấp độ khó
- Hệ thống tài sản, cảnh giác và điểm phòng vệ
- Phản hồi giải thích sau từng lựa chọn
- Tìm kiếm và lọc tình huống
- Chứng cứ, huy hiệu, chuỗi thành tích và thống kê
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
- Nhận diện Khiên Số riêng với biểu tượng đại bàng trong chiếc khiên do dự án cung cấp

## Chạy cục bộ

Yêu cầu Node.js 22.13+ và pnpm.

```bash
pnpm install
pnpm run dev
```

Mở `http://localhost:3000`.

## Kiểm thử và build

```bash
pnpm run build
node --test tests/rendered-html.test.mjs
```

## Công nghệ

React 19, TypeScript, vinext/Vite, Supabase Auth/Postgres và Cloudflare Workers-compatible output.

## Dữ liệu và phân quyền

Cấu trúc cơ sở dữ liệu nằm tại `supabase/schema.sql`. Website chỉ chứa khóa Supabase publishable dành cho trình duyệt; không chứa secret key hoặc `service_role`.

Với dự án Supabase đã tồn tại, áp dụng `supabase/admin_content.sql`, sau đó `supabase/content_roles.sql` để bổ sung kho nội dung, hai nhóm quyền và chính sách RLS. Nội dung công khai chỉ đọc bản có trạng thái `published`; tài khoản thường không thể đọc bản nháp hoặc ghi dữ liệu.

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
