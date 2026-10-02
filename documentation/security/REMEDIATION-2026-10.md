# Khắc phục bảo mật dữ liệu và xác thực, tháng 10/2026

Phạm vi: Supabase Auth/Postgres và các phần giao diện liên quan của Cảnh Giác Số (`canhgiacso.com`). Tài liệu mô tả vấn đề, thay đổi, **thứ tự áp dụng trên production**, cách kiểm tra sau khi áp dụng, hoàn tác và rủi ro còn lại.

Mọi thay đổi nằm trong nhánh `fix/d1-supabase-hardening`. **Chưa có gì được áp dụng lên production**; mọi bước dưới đây do chủ dự án thực hiện thủ công.

## 1. Vấn đề và cách khắc phục

| # | Vấn đề | Cách khắc phục | Nơi thay đổi |
|---|---|---|---|
| 1 | Cấp quyền theo email không kiểm tra `email_confirmed_at`: nếu dự án cho đăng ký không cần xác nhận email, kẻ gian đăng ký trước bằng email nhân sự rồi thừa hưởng quyền Biên tập/Quản trị và tự đăng ký TOTP. | Quyền đặc quyền yêu cầu thêm email đã xác nhận (hàm kiểm quyền, khám phá vai trò và lúc cấp quyền, mã `CG001`); danh sách miền được phép (`CG002`); chốt an toàn chặn migration nếu tài khoản đặc quyền hiện hữu chưa xác nhận (`CG003`). **Chỉ có tác dụng chống đăng ký-trước sau khi BẬT Confirm email.** | `20261002100000`, `config.toml`, giao diện `app/admin.tsx` |
| 2 | Hai RPC quản trị mà frontend gọi (`public.save_managed_site_content`, `public.set_content_manager_role`) không đi qua bản có nhật ký kiểm toán; bảng `site_content` cho ghi trực tiếp theo quyền mặc định. | Bản `public` là wrapper `SECURITY INVOKER` ủy quyền cho bản `private` có `log_security_event`; kiểm tra cấu trúc điểm số khi lưu; thu hồi INSERT/UPDATE/DELETE/TRUNCATE trên `site_content`; quyền tối thiểu trên `profiles`, `user_progress`, `test_attempts`. | `20261002101000` |
| 3 | Đáp án đọc được qua REST (`/rest/v1/site_content` có SELECT cho `anon`), trong khi payload công khai đã gỡ đáp án nên chấm điểm khách phụ thuộc dữ liệu mâu thuẫn. | RPC `evaluate_guest_choice(scenario_id, choice_index)` chỉ trả kết quả của **một** lựa chọn; frontend gọi RPC; script post-deploy thu hồi SELECT sau khi frontend mới lên. | `20261002102000`, `app/domains/training/gateway.ts`, `app/page.tsx`, `supabase/post-deploy/` |
| 4 | Giới hạn tốc độ lưu **IP thô** vô thời hạn (không có job dọn); tài liệu/giao diện nói "không lưu IP"; tin `x-forwarded-for` do client đặt; analytics không có thời hạn lưu. | Lưu SHA-256(muối : ngày : IP) thay IP thô, muối sinh trong CSDL; chỉ tin một header cấu hình được; dọn `api_rate_limits` sau 24 giờ và analytics sau 13 tháng, theo lô; sửa tài liệu và giao diện. | `20261002103000`, `documentation/realtime-analytics*.md`, `app/admin-traffic-analytics.tsx` |
| 5 | Lần đầu đăng ký TOTP diễn ra ở AAL1, không thể chặn ở CSDL. | Giảm thiểu: giao diện cảnh báo, cho phép rời đi không đăng ký, và ghi nhật ký `PRIVILEGED_MFA_ENROLLMENT_STARTED/VERIFIED`. Không đổi AAL ở CSDL. | `20261002104000`, `app/security-hardening.tsx` |
| 6 | Hàm Edge `admin-analytics` không dùng, không kiểm chữ ký JWT, gọi RPC quản trị bằng service-role (luôn bị từ chối). | Xóa mã nguồn; cần xóa bản đã deploy nếu có. | `supabase/functions/` (đã xóa) |
| 7 | Đăng ký lộ việc email/tên đăng nhập đã tồn tại; mật khẩu tối thiểu 8; không có cấu hình Auth trong repo. | Thông báo trung lập khi trùng; màn hình "Kiểm tra hộp thư" có gửi lại; mật khẩu tối thiểu 10 ký tự ở giao diện; `supabase/config.toml` làm nguồn đối chiếu; checklist Dashboard. | `app/domains/auth/*`, `app/auth-error.ts`, `supabase/config.toml` |
| 8 | Kiểm thử SQL cũ chỉ là đọc catalog, không chạy được liên tục. | Bộ pgTAP chạy trên Postgres cục bộ + workflow CI; kiểm thử chốt an toàn của migration. | `supabase/tests/**`, `.github/workflows/supabase-db-tests.yml` |

### Mã lỗi riêng

| SQLSTATE | Ý nghĩa | Nơi phát sinh |
|---|---|---|
| `CG001` | Không cấp quyền đặc quyền cho email chưa xác nhận | `set_content_manager_role` |
| `CG002` | Miền email không thuộc danh sách được phép | `set_content_manager_role` |
| `CG003` | Migration dừng vì có admin/editor chưa xác nhận email | `20261002100000` |
| `CG004` | Script post-deploy thiếu tiền điều kiện | `supabase/post-deploy/*` |

## 2. Thứ tự áp dụng trên production

Nguyên tắc: mỗi bước có **cổng kiểm tra**; chỉ sang bước sau khi cổng đạt. Mọi migration tương thích ngược với frontend cũ; chỉ bước post-deploy phụ thuộc frontend mới.

**Bước 0. Chuẩn bị**
1. Tạo bản sao dữ liệu (xem checklist mục 9; gói Free không có PITR).
2. Chọn thời điểm ít người dùng. Có người cùng ngồi theo dõi trong lúc áp dụng.

**Bước 1. Đọc hiện trạng (chỉ đọc)**
1. Chạy từng phần của `supabase/verification/production-checks.sql` trong SQL Editor; lưu kết quả.
2. Cổng: ghi nhận (a) số tài khoản đặc quyền chưa xác nhận email (phần 7), (b) `anon` có USAGE trên schema `private` và EXECUTE hook (dòng kiểm tra 20), (c) trạng thái "Confirm email" (phần 15), (d) số dòng/độ cũ của `api_rate_limits` (phần 8).
3. Nếu (a) > 0: với từng tài khoản, xác minh danh tính chủ tài khoản rồi đặt `email_confirmed_at`, hoặc hạ quyền. **Không làm bước 2 trước khi (a) = 0.** (Nếu lỡ chạy, migration tự dừng với `CG003` và không thay đổi gì.)
4. Nếu (b) không đạt: dừng và xem xét, vì sẽ cần cấp quyền trước khi áp dụng bước 2 (xem mục 5).

**Bước 2. Áp dụng migration, theo đúng thứ tự tên tệp** (`supabase db push` hoặc SQL Editor từng tệp)
1. `20261002100000_privileged_roles_require_confirmed_email.sql`
2. `20261002101000_public_rpc_audit_and_no_direct_writes.sql`
3. `20261002102000_guest_choice_rpc.sql`
4. `20261002103000_privacy_rate_limit_and_retention.sql` (xóa dữ liệu IP thô cũ của `api_rate_limits`; tạo khóa muối; thử bật lịch pg_cron)
5. `20261002104000_privileged_mfa_event_log.sql`

Cổng sau mỗi tệp: không có lỗi; đăng nhập quản trị bằng TOTP vẫn vào được; một lượt chơi khách và một lượt chơi đã đăng nhập vẫn chạy (frontend cũ tiếp tục hoạt động như trước migration).

**Bước 3. Deploy frontend mới** (merge nhánh, chờ pipeline). Cổng: chơi một lượt ở chế độ khách; trong tab Network phải thấy `rpc/evaluate_guest_choice` trả 200 và kết quả đúng/sai khớp lựa chọn; đăng ký thử một tài khoản mới thấy màn hình "Kiểm tra hộp thư".

**Bước 4. Post-deploy** `supabase/post-deploy/20261002120000_revoke_public_answer_key_access.sql` (SQL Editor). Chỉ chạy khi bước 3 đạt; script tự dừng (`CG004`) nếu thiếu RPC. Cổng: `https://<project>.supabase.co/rest/v1/site_content` bằng khóa `anon` trả lỗi quyền (42501), trò chơi khách và trang quản trị vẫn hoạt động.

**Bước 5. Dashboard** theo [SUPABASE-DASHBOARD-CHECKLIST.md](SUPABASE-DASHBOARD-CHECKLIST.md). Thứ tự khuyến nghị:
1. SMTP riêng (mục 6) trước khi bật Confirm email.
2. **Bật Confirm email** (mục 1) sau khi bước 2 và 3 xong và bước 1(a) = 0.
3. Mật khẩu tối thiểu 10 + chữ hoa/thường/số; URL Configuration; xác nhận TOTP bật.
4. Bật pg_cron (nếu muốn lịch dọn chắc chắn), xóa Edge Function cũ nếu đã deploy.
5. CAPTCHA: **chưa bật** cho tới khi frontend gửi `captchaToken`.

**Bước 6. Xác minh sau áp dụng** (mục 3 bên dưới).

## 3. Xác minh sau áp dụng

1. Chạy lại `supabase/verification/production-checks.sql`: toàn bộ dòng phần 0 phải `TỐT` (một số dòng `THEO DÕI` hợp lệ: ví dụ chưa bật pg_cron, hoặc còn tài khoản đặc quyền chưa đăng ký TOTP). Ghi kết quả cạnh kết quả bước 1.
2. Danh sách hàm `anon` gọi được trong `public` chỉ gồm: `get_public_site_content`, `evaluate_guest_choice`, `record_web_analytics_event_v4`.
3. `select column_name from information_schema.columns where table_schema='private' and table_name='api_rate_limits'` không còn `source_ip`; `select count(*) from private.api_rate_limits` tăng khi có lưu lượng (nếu luôn bằng 0, xem checklist mục 9 về header IP).
4. Quản trị viên: đổi quyền một thành viên đã xác nhận → thành công và có dòng `ROLE_CHANGED` trong `private.security_audit_log`; thử cấp cho email chưa xác nhận → thông báo "chưa xác nhận email".
5. Quản trị viên lưu nháp một nội dung hợp lệ → thành công, có dòng `CONTENT_DRAFT_SAVED`; lưu nội dung thiếu `moneyDelta` → bị từ chối với thông báo cấu trúc.
6. Khách chơi trọn bài; người đăng nhập chơi và nhận chứng chỉ như trước.
7. Đăng ký tài khoản mới: chưa đăng nhập được trước khi xác nhận; liên kết trong thư dẫn về `https://canhgiacso.com/`.
8. Theo dõi nhật ký Postgres 24–48 giờ sau đó để phát hiện lỗi hook giới hạn tốc độ hoặc từ chối bất thường.

## 4. Hoàn tác

Ưu tiên **sửa tiến** (migration mới) thay vì xóa. Chỉ hoàn tác khẩn cấp khi gây gián đoạn. Các lệnh dưới đây chạy trong SQL Editor; mỗi lệnh độc lập.

- **Admin/editor bị khóa do kiểm tra email (bước 2.1).** Cách nhanh nhất: xác nhận email của tài khoản đó (sau khi xác minh chủ tài khoản): `update auth.users set email_confirmed_at = now() where id = '<uuid>' and email_confirmed_at is null;`. Nếu cần bỏ hẳn kiểm tra email, khôi phục ba hàm kiểm quyền về bản trước migration (định nghĩa nằm trong `supabase/migrations/20260913063000_asvs_l2_security_hardening.sql`, các hàm `private.get_content_management_role`, `private.user_can_edit_content`, `private.user_is_app_admin`) bằng cách chạy lại đúng các câu `create or replace function` đó. Việc này làm mất lớp chống đăng ký-trước; chỉ dùng tạm thời.
- **Frontend cũ không ghi được gì sau bước 2.2.** Frontend dùng RPC nên không bị ảnh hưởng. Nếu một tính năng lạ cần ghi trực tiếp: cấp lại đúng quyền cần thiết cho đúng bảng và cột, ví dụ `grant insert, update on public.site_content to authenticated;` (RLS vẫn giới hạn cho biên tập/quản trị AAL2). Không cấp lại `all`/`truncate`.
- **RPC chấm điểm khách (bước 2.3).** `drop function public.evaluate_guest_choice(integer, integer); drop function private.evaluate_choice(integer, integer);` Chỉ làm khi đã hoàn tác frontend; nếu không, khách sẽ thấy lỗi chấm điểm.
- **Hook giới hạn tốc độ gây lỗi cho mọi yêu cầu (bước 2.4).** Vô hiệu hóa tạm thời:
  ```sql
  create or replace function private.data_api_pre_request() returns void
  language plpgsql security definer set search_path = '' as $$ begin return; end $$;
  notify pgrst, 'reload config';
  ```
  Sau đó khôi phục bằng cách chạy lại `20261002103000_privacy_rate_limit_and_retention.sql`. Gỡ lịch dọn: `select cron.unschedule('cgs-purge-expired-security-data');`. Dữ liệu IP thô cũ đã bị xóa khi áp dụng và **không khôi phục được** (đây là chủ đích về quyền riêng tư).
- **Nhật ký MFA (bước 2.5).** `drop function public.log_privileged_mfa_event(text);` Frontend gọi theo kiểu cố gắng-hết-sức nên không lỗi.
- **Post-deploy (bước 4).** Lệnh hoàn tác nằm cuối tệp `20261002120000_revoke_public_answer_key_access.sql`; về bản chất là cấp lại SELECT cho `site_content`. Làm vậy sẽ mở lại việc đọc đáp án qua REST: chỉ dùng tạm thời trong lúc sửa lỗi.
- **Dashboard.** Tắt Confirm email chỉ làm nên đăng ký mới không cần xác nhận (và khiến kiểm tra email kém hiệu quả); tài khoản đã xác nhận không đổi. Chính sách mật khẩu chỉ ảnh hưởng lúc đặt/đổi mật khẩu.

## 5. Rủi ro còn lại và khuyến nghị

1. **Đáp án có thể liệt kê bằng máy.** Mỗi lần gọi `evaluate_guest_choice` chỉ lộ một lựa chọn, nhưng khách có thể gọi tự động cho mọi tổ hợp (tối đa 300 lần mỗi 5 phút/IP). Chấp nhận: chứng chỉ chính thức chỉ cấp cho người đăng nhập, chấm điểm phía máy chủ; chế độ khách không có giá trị chứng nhận.
2. **Từ chối chỉ ghi vào nhật ký Postgres**, không vào bảng audit (giao dịch lỗi bị rollback). Cần xem Postgres Logs hoặc log drain.
3. **Giới hạn tốc độ không áp dụng nếu thiếu header IP được tin** (fail-open để không chặn nhầm người dùng). Kiểm tra bằng bước xác minh 3.
4. **Hook giới hạn tốc độ cần `anon` có USAGE trên schema `private` và EXECUTE hàm hook.** Mã hiện hữu đã giả định điều này (website đang chạy); kiểm tra bằng dòng 20 của phần 0. Thiếu thì mọi yêu cầu `anon` lỗi. Bộ migration này **không** mở rộng thêm quyền nào trên schema `private`.
5. **Lần đầu đăng ký TOTP ở AAL1.** Chỉ giảm thiểu (cảnh báo + nhật ký), không chặn được. Đăng ký TOTP ngay khi được cấp quyền, và rà soát `PRIVILEGED_MFA_ENROLLMENT_*`.
6. **PKCE chưa chuyển.** Luồng xác thực hiện dùng cấu hình mặc định của `@supabase/supabase-js` (`detectSessionInUrl: true`). Chuyển sang PKCE là thay đổi hành vi liên kết xác nhận email (liên kết mở trên thiết bị khác không hoàn tất được) nên **khuyến nghị thử trên staging trước**, không đưa vào đợt này.
7. **Kiểm tra email chỉ hiệu quả khi Confirm email bật.** Nếu chưa bật, kiểm tra này không bảo vệ gì thêm (nhưng cũng không gây hại).
8. **Nhật ký kiểm toán lưu IP/user-agent** của tài khoản đặc quyền và chưa có thời hạn xóa; cần quyết định cùng đơn vị sở hữu dữ liệu.
9. **Chỉ những gì cần Dashboard** (CAPTCHA, SMTP riêng, leaked password protection trên gói Pro, giới hạn phiên, log drain, PITR) không thực hiện được bằng mã: xem checklist.

## 6. Mức xác minh đã thực hiện

| Hạng mục | Kết quả | Mức |
|---|---|---|
| Toàn bộ schema + migration hiện hữu + 5 migration mới áp dụng theo thứ tự | Chạy sạch trên PostgreSQL 16 cục bộ có stub của Supabase | Thật trên Postgres, KHÔNG phải Supabase thật |
| pgTAP `supabase/tests/database/001–004` | 116/116 đạt | như trên |
| pgTAP `supabase/tests/post-deploy/001` (sau khi áp dụng script post-deploy) | 15/15 đạt | như trên |
| `supabase/tests/migration_guards.sh` (chốt `CG003`, chạy lại 2 lần, giữ dữ liệu, xóa IP thô) | 20/20 đạt | như trên |
| Đường pg_cron | Chạy trên cụm PostgreSQL 16 có `pg_cron` 1.6.2 tải sẵn: lịch được tạo, chạy lại không nhân đôi | Thật trên pg_cron, không phải môi trường Supabase |
| `production-checks.sql` | Chạy được trên CSDL trước và sau migration | như trên |
| PostgREST thật + hook với vai trò `anon` thật, GoTrue thật, Dashboard | **Chưa kiểm** | Cần staging |
| Luồng đăng ký/xác nhận email, TOTP, PKCE end-to-end | **Chưa kiểm** | Cần staging có SMTP |

Stub của Supabase mô phỏng các vai trò, `auth.uid()/jwt()`, `auth.users/sessions/mfa_factors` và quyền mặc định; không phải bản sao của nền tảng. Hãy chạy toàn bộ quy trình ở mục 2 trên một dự án staging trước khi áp dụng cho production.
