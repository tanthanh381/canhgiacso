# Khắc phục bảo mật dữ liệu và xác thực, tháng 10/2026

Phạm vi: Supabase Auth/Postgres và các phần giao diện liên quan của Cảnh Giác Số (`canhgiacso.com`). Tài liệu mô tả vấn đề, thay đổi, **thứ tự áp dụng trên production**, cách kiểm tra sau khi áp dụng, hoàn tác và rủi ro còn lại.

Mọi thay đổi nằm trong nhánh `fix/d1-supabase-hardening` (đợt D1: gia cố Supabase; đợt D2: vòng đời tài khoản và xác minh chứng nhận, mục 7). **Chưa có gì được áp dụng lên production**; mọi bước dưới đây do chủ dự án thực hiện thủ công.

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
| 9 | (D2) Người dùng không tự xóa hay tải được dữ liệu của mình; không có "Quên mật khẩu". | `delete_my_account(text)` và `export_my_data()` (xem mục 7.1), giao diện trong Hồ sơ; "Quên mật khẩu" + hộp thoại đặt mật khẩu mới. | `20261002130000`, `20261002132000`, `app/domains/auth/*` |
| 10 | (D2) Chứng nhận không xác minh được bởi bên thứ ba; mã chứng nhận 40 bit. | `verify_training_certificate(code)` công khai, dữ liệu tối thiểu, tên đã che, giới hạn tốc độ; mã chứng nhận mới 64 bit; trang tĩnh `/xac-minh-chung-chi/`; địa chỉ + mã in trên PDF. | `20261002131000`, `20261002132000`, `public/verify-certificate.*`, `app/certificate.ts` |
| 11 | (D2) URL chứa token khôi phục (hash) hoặc mã chứng nhận (query) có thể bị gửi cho Google Analytics. | `google-analytics-init.js` chỉ gửi origin + path + UTM; `app/supabase.ts` dọn hash/query xác thực sau khi thư viện xử lý. | `public/google-analytics-init.js`, `app/supabase.ts` |
| 12 | (D2) Trang hoạt hình `/gioi-thieu/hoat-hinh.html` cần ngoại lệ CSP `unsafe-inline` cho script/style. | Tách ra `hoat-hinh.js`, `hoat-hinh.css`; bỏ ngoại lệ, chỉ còn cho phép nhúng cùng nguồn gốc (`frame-ancestors 'self'`). | `deploy/cloudflare-edge/worker.js`, `scripts/instrument-content.mjs` |

### Mã lỗi riêng

| SQLSTATE | Ý nghĩa | Nơi phát sinh |
|---|---|---|
| `CG001` | Không cấp quyền đặc quyền cho email chưa xác nhận | `set_content_manager_role` |
| `CG002` | Miền email không thuộc danh sách được phép | `set_content_manager_role` |
| `CG003` | Migration dừng vì có admin/editor chưa xác nhận email | `20261002100000` |
| `CG004` | Script post-deploy thiếu tiền điều kiện | `supabase/post-deploy/*` |
| `CG005` | Tài khoản còn quyền Quản trị/Biên tập nên không tự xóa được (`detail`: `last_admin`, `administrator`, `editor`) | `delete_my_account` |
| `CG006` | Cần xác thực gần đây (mặc định 10 phút) | `delete_my_account` |

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
6. `20261002130000_account_lifecycle_export_delete.sql` (D2: `export_my_data`, `delete_my_account`, kiểm tra xác thực gần đây; đổi khóa ngoại `site_content.updated_by` sang `ON DELETE SET NULL`)
7. `20261002131000_certificate_verification.sql` (D2: `verify_training_certificate`, mã chứng nhận mới 64 bit; **không** đổi mã cũ)
8. `20261002132000_rate_limit_account_and_verification_routes.sql` (D2: bản sao đầy đủ của hook giới hạn tốc độ có thêm 3 route; phải chạy **sau** `20261002103000` và `20261002104000`)

Cổng sau mỗi tệp: không có lỗi; đăng nhập quản trị bằng TOTP vẫn vào được; một lượt chơi khách và một lượt chơi đã đăng nhập vẫn chạy (frontend cũ tiếp tục hoạt động như trước migration).

**Bước 3. Deploy frontend mới** (merge nhánh, chờ pipeline; **sau** khi cả 8 migration đã áp dụng, vì giao diện D2 gọi `export_my_data`, `delete_my_account`, `verify_training_certificate`: thiếu RPC thì các nút này báo lỗi chung và trang xác minh báo "chưa kiểm tra được"). Cổng: chơi một lượt ở chế độ khách; trong tab Network phải thấy `rpc/evaluate_guest_choice` trả 200 và kết quả đúng/sai khớp lựa chọn; đăng ký thử một tài khoản mới thấy màn hình "Kiểm tra hộp thư".

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
2. Danh sách hàm `anon` gọi được trong `public` chỉ gồm: `get_public_site_content`, `evaluate_guest_choice`, `record_web_analytics_event_v4`, `verify_training_certificate`. `export_my_data` và `delete_my_account` chỉ dành cho `authenticated`.
3. `select column_name from information_schema.columns where table_schema='private' and table_name='api_rate_limits'` không còn `source_ip`; `select count(*) from private.api_rate_limits` tăng khi có lưu lượng (nếu luôn bằng 0, xem checklist mục 9 về header IP).
4. Quản trị viên: đổi quyền một thành viên đã xác nhận → thành công và có dòng `ROLE_CHANGED` trong `private.security_audit_log`; thử cấp cho email chưa xác nhận → thông báo "chưa xác nhận email".
5. Quản trị viên lưu nháp một nội dung hợp lệ → thành công, có dòng `CONTENT_DRAFT_SAVED`; lưu nội dung thiếu `moneyDelta` → bị từ chối với thông báo cấu trúc.
6. Khách chơi trọn bài; người đăng nhập chơi và nhận chứng chỉ như trước.
7. Đăng ký tài khoản mới: chưa đăng nhập được trước khi xác nhận; liên kết trong thư dẫn về `https://canhgiacso.com/`.
8. (D2) Thử các luồng ở mục 7.4 trên **staging** (xóa tài khoản, tải dữ liệu, quên mật khẩu, xác minh chứng nhận, hoạt hình trong Giới thiệu).
9. Theo dõi nhật ký Postgres 24–48 giờ sau đó để phát hiện lỗi hook giới hạn tốc độ hoặc từ chối bất thường.

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
- **RPC vòng đời tài khoản (bước 2.6).** `drop function public.delete_my_account(text); drop function public.export_my_data(); drop function private.delete_my_account(text); drop function private.export_my_data();` Giao diện báo lỗi chung khi gọi (không hỏng phần còn lại). Khóa ngoại `site_content_updated_by_fkey` và việc cho phép `updated_by` rỗng giữ nguyên (không gây hại). **Không hoàn tác được các tài khoản đã bị xóa**: đó là thao tác người dùng chủ động và chỉ phục hồi từ bản sao lưu CSDL.
- **Xác minh chứng nhận (bước 2.7).** `drop function public.verify_training_certificate(text);` rồi `drop trigger if exists training_certificates_upgrade_code on private.training_certificates;`. Mã đã phát hành giữ nguyên; các mã 64 bit mới vẫn hợp lệ (chỉ là chuỗi dài hơn).
- **Hook giới hạn tốc độ (bước 2.8).** Chạy lại `20261002104000_privileged_mfa_event_log.sql` không khôi phục được hook cũ; hook hiện hành nằm ở `20261002132000` (bản đầy đủ). Cần tắt tạm thì dùng lệnh ở mục "Hook giới hạn tốc độ gây lỗi" phía trên, rồi chạy lại `20261002132000`.
- **Trang hoạt hình (D2).** Nếu iframe trong Giới thiệu bị chặn sau khi bật Transform Rules: kiểm tra Rule 2 (`frame-ancestors 'self'` và `X-Frame-Options: SAMEORIGIN` cho `/gioi-thieu/hoat-hinh.html`), xem `deploy/cloudflare-edge/README.md`.
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
9. **(D2) Mã chứng nhận cũ chỉ có 40 bit** (10 ký tự hex, đã in trên chứng nhận phát hành trước đây nên **không đổi được**). Mỗi mã đoán trúng chỉ cho biết tên đã che, ngày cấp, xếp loại: rủi ro thấp. Giới hạn 30 lượt/5 phút/IP làm việc dò hàng loạt không khả thi từ một địa chỉ (2^40 mã), nhưng kẻ tấn công có nhiều địa chỉ vẫn có thể thử; theo dõi `rpc/verify_training_certificate` trong log. Chứng nhận mới có 64 bit.
10. **(D2) Giới hạn tốc độ chỉ đếm lệnh thành công.** `verify_training_certificate` trả `{valid:false}` thay vì raise để lệnh sai vẫn được đếm. Giới hạn vẫn fail-open nếu thiếu header IP (rủi ro 3).
11. **(D2) Xóa tài khoản đặc quyền.** Quản trị viên/Biên tập viên **không tự xóa được** (CG005): phải được quản trị viên khác hạ về thành viên trước; quản trị viên cuối cùng phải cấp quyền cho người khác trước rồi nhờ họ hạ quyền. Đây là chủ đích để website không mất người quản trị. Lệnh hạ quyền và việc xóa chạy tuần tự trong cùng một khóa bảng nên không tạo ra "admin cuối cùng bị xóa" khi hai lệnh chạy song song.
12. **(D2) Dữ liệu sau khi xóa còn trong bản sao lưu** của Supabase cho tới khi bản sao lưu hết hạn; trang Quyền riêng tư đã nói điều này có điều kiện. Chủ dự án cần kiểm tra thời hạn sao lưu thực tế của dự án và cập nhật câu chữ nếu khác.
13. **(D2) Bản ghi `ACCOUNT_DELETED` trong `private.security_audit_log` không có thời hạn xóa** (cùng vấn đề với rủi ro 8); nó chỉ chứa mã giả danh một chiều và số lượng bản ghi.
14. **(D2) Quên mật khẩu và dò tài khoản.** Giao diện luôn hiển thị cùng một thông báo, nhưng bản thân Supabase giới hạn thư theo từng người dùng (thường 60 giây); kẻ có kịch bản vẫn có thể suy ra tài khoản tồn tại qua thời gian/giới hạn của chính GoTrue. Giao diện không phân biệt các lỗi này, nên phần còn lại phụ thuộc cấu hình Supabase; CAPTCHA (rủi ro cũ) giảm thêm.
15. **(D2) Tài khoản bật TOTP khi đặt lại mật khẩu** cần mã 6 số (Auth yêu cầu AAL2 để đổi mật khẩu). Quản trị viên/Biên tập viên còn bị cổng MFA bao phủ: sau khi xác thực ở cổng đó trang tải lại và hộp thoại đặt mật khẩu mới không còn hiện; hãy yêu cầu liên kết mới nếu chưa đặt được.
16. **(D2) Trang xác minh dùng khóa publishable công khai** (đúng thiết kế: quyền do CSDL kiểm soát). Mã chứng nhận xuất hiện trong URL (`?code=`), nên có thể nằm trong nhật ký máy chủ/nhật ký trình duyệt; GA4 và thống kê nội bộ đã được làm sạch, nhưng GitHub Pages/Cloudflare vẫn thấy URL (mã chỉ cho phép đọc thông tin tối thiểu).
17. **Chỉ những gì cần Dashboard** (CAPTCHA, SMTP riêng, leaked password protection trên gói Pro, giới hạn phiên, log drain, PITR) không thực hiện được bằng mã: xem checklist.

## 6. Mức xác minh đã thực hiện

| Hạng mục | Kết quả | Mức |
|---|---|---|
| Toàn bộ schema + migration hiện hữu + 8 migration mới (5 của D1, 3 của D2) áp dụng theo thứ tự | Chạy sạch trên PostgreSQL 16 cục bộ có stub của Supabase | Thật trên Postgres, KHÔNG phải Supabase thật |
| pgTAP `supabase/tests/database/001–006` (D2 thêm `005_account_lifecycle` và `006_certificate_verification`) | 195/195 đạt | như trên |
| pgTAP `supabase/tests/post-deploy/001` (sau khi áp dụng script post-deploy) | 15/15 đạt | như trên |
| `supabase/tests/migration_guards.sh` (chốt `CG003`, chạy lại 2 lần, giữ dữ liệu, xóa IP thô, mã chứng nhận cũ còn xác minh được) | 25/25 đạt | như trên |
| Đường pg_cron | Chạy trên cụm PostgreSQL 16 có `pg_cron` 1.6.2 tải sẵn: lịch được tạo, chạy lại không nhân đôi (đã kiểm ở D1, D2 không đổi phần này) | Thật trên pg_cron, không phải môi trường Supabase |
| `production-checks.sql` (D2 thêm mục 21–25) | Chạy không lỗi trên CSDL sau toàn bộ migration | như trên |
| `pnpm run lint`, `typecheck`, `build`, `build:pages`, `seo:audit`, `node scripts/security-scan.mjs` | Đạt | Cục bộ |
| `node --test tests/*.test.mjs` | 310/310 đạt (gồm mô hình xác thực, hợp đồng giao diện/CSDL, trang xác minh, PDF, CSP trang hoạt hình) | Cục bộ, Node |
| `pnpm run content:compile` chạy hai lần liên tiếp | Cây tệp giống hệt nhau | Cục bộ |
| Playwright `account-lifecycle.spec.ts` (quên mật khẩu, liên kết khôi phục, xuất/xóa tài khoản, trang xác minh, trang hoạt hình dưới CSP chặt) + `platform-smoke.spec.ts` | 21/21 đạt trên Chromium desktop | Giả lập Supabase bằng route của Playwright, không gọi dịch vụ thật |
| Playwright `account-lifecycle.spec.ts` + `cross-platform.spec.ts` | 88 đạt, 14 bỏ qua theo thiết kế của spec, 0 lỗi (Chromium desktop 1440x900 và Android Pixel 7) | như trên |
| Firefox, WebKit/Safari (iPhone, iPad), Windows/macOS | **Chưa chạy** (môi trường chỉ có Chromium); các spec mới được thêm vào cấu hình `playwright.platform.config.ts` nên CI đa hệ điều hành sẽ chạy chúng | Cần CI |
| PostgREST thật + hook với vai trò `anon` thật, GoTrue thật, Dashboard | **Chưa kiểm** | Cần staging |
| Luồng đăng ký/xác nhận email, TOTP, PKCE, thư đặt lại mật khẩu end-to-end | **Chưa kiểm** (e2e chỉ giả lập phản hồi của Supabase) | Cần staging có SMTP |

Stub của Supabase mô phỏng các vai trò, `auth.uid()/jwt()`, `auth.users/sessions/mfa_factors` và quyền mặc định; không phải bản sao của nền tảng. Hãy chạy toàn bộ quy trình ở mục 2 trên một dự án staging trước khi áp dụng cho production.

## 7. Đợt D2: vòng đời tài khoản và xác minh chứng nhận

### 7.1 Hành vi của các RPC

| RPC | Ai gọi | Hành vi |
|---|---|---|
| `export_my_data()` | `authenticated`, cần phiên sống | Trả jsonb gồm tài khoản (id, email, ngày tạo), hồ sơ, vai trò, tiến trình, từng lựa chọn, lịch sử lượt chơi, chứng nhận. Chỉ dữ liệu của chính người gọi; không trả hash mật khẩu, IP băm hay nhật ký nội bộ. Giao diện ghép thêm lựa chọn cookie từ `localStorage` rồi tạo tệp ngay trên trình duyệt. Tối đa 10 lượt/5 phút/IP. |
| `delete_my_account(confirmation)` | `authenticated` | Cần (1) phiên sống, (2) xác thực gần đây ≤ 10 phút (CG006), (3) gõ đúng tên đăng nhập (22023), (4) không còn quyền đặc quyền (CG005). Xóa `auth.users`, các bảng liên quan xóa theo khóa ngoại. Ghi `ACCOUNT_DELETED` tối giản (không IP/UA/email/tên). Tối đa 5 lượt/5 phút/IP. |
| `verify_training_certificate(code)` | `anon`, `authenticated` | Chuẩn hóa mã (bỏ khoảng trắng, viết hoa), trả `{valid:true,name,issuedOn,rating,accuracy,scenarioTotal,completed}` hoặc `{valid:false}` hoặc `{valid:false,kind:"guest"}`. Tên chỉ còn chữ cái đầu mỗi từ. Tối đa 30 lượt/5 phút/IP. |

**Đăng nhập lại trước khi xóa.** Giao diện yêu cầu nhập lại mật khẩu, đăng nhập bằng một ứng dụng khách tách biệt (bộ nhớ riêng, không đụng phiên đang dùng) rồi gọi RPC bằng phiên mới đó; máy chủ kiểm tra lại thời điểm xác thực nên token cũ bị đánh cắp không xóa được tài khoản. Việc này tạo thêm một phiên đăng nhập ngắn trong `auth.sessions` (bị xóa cùng tài khoản).

**Quên mật khẩu.** `resetPasswordForEmail` với `redirectTo = https://canhgiacso.com/` (phải nằm trong Redirect URLs, xem checklist mục 3). Trang ghi nhận trạng thái liên kết trước khi thư viện xóa token khỏi URL, mở hộp thoại "Đặt mật khẩu mới" (chính sách 10–72 ký tự), yêu cầu TOTP nếu tài khoản bật MFA, rồi đăng xuất các phiên khác.

### 7.2 Quyết định thiết kế

- **Trang xác minh là trang tĩnh `/xac-minh-chung-chi/`** (sinh bởi `scripts/patch-seo-authority-wave6.mjs`, script/CSS ngoài, không inline) thay vì tuyến đường trong ứng dụng một trang. Lý do: GitHub Pages không có rewrite phía máy chủ, tuyến đường SPA mới cần cơ chế 404 giả hoặc hash route; ứng dụng đang dùng router theo hash/trạng thái, thêm đường dẫn thật làm rủi ro gãy các trang tĩnh khác. Trang tĩnh đi qua đúng pipeline SEO/CSP hiện có, không cần nạp ứng dụng React và không cần đăng nhập, đồng thời chỉ nói chuyện với Supabase đã có trong `connect-src`.
- **Không dùng QR.** Không có thư viện QR trong dự án; thêm phụ thuộc chỉ để vẽ mã là không đáng. Địa chỉ + mã được in dạng chữ và vùng chân trang của PDF là liên kết bấm được.
- **Mã chứng nhận cũ giữ nguyên** (đã in), mã mới 64 bit nhờ trigger `BEFORE INSERT` nên không phụ thuộc phiên bản hàm cấp chứng nhận đang chạy trên production.
- **Xóa tài khoản đặc quyền bị chặn** (CG005) thay vì tự động hạ quyền: không tự ý gỡ quyền quản trị/biên tập và không để mất người quản trị duy nhất.
- **Chứng nhận bị xóa cùng tài khoản.** Mã không còn xác minh được; trang xác minh nói rõ điều đó và giao diện xóa tài khoản cảnh báo trước.

### 7.3 Những việc cố ý KHÔNG làm

- Không tự đổi cấu hình Dashboard (Redirect URLs, mẫu thư, SMTP, CAPTCHA): chỉ ghi vào checklist.
- Không thêm CAPTCHA (cùng lý do như checklist mục 5: chưa có widget gửi `captchaToken`).
- Không đổi mã chứng nhận đã phát hành, không vá dữ liệu cũ.
- Không xóa nhật ký kiểm toán cũ của tài khoản đặc quyền.
- Không chuyển PKCE (rủi ro 6): liên kết khôi phục dùng luồng implicit hiện hành.
- Không đo lường sự kiện mới (xóa tài khoản, xuất dữ liệu, xác minh) trong analytics.

### 7.4 Việc cần thử thủ công trên Supabase thật (staging)

1. Quên mật khẩu: email có tài khoản và email không tồn tại phải hiện **cùng** thông báo; thư đến, liên kết mở về `https://canhgiacso.com/`, hộp thoại "Đặt mật khẩu mới" hiện, đổi xong đăng nhập được bằng mật khẩu mới; thiết bị khác bị đăng xuất; mở lại liên kết đã dùng/hết hạn hiện "Không mở được liên kết". Thử cả tài khoản bật TOTP và tài khoản Quản trị.
2. Xóa tài khoản thường: nhập đúng mật khẩu + tên đăng nhập -> thông báo "Đã xóa tài khoản", đăng nhập lại báo sai thông tin, chứng nhận cũ báo "Không tìm thấy". Thử sai mật khẩu, sai tên đăng nhập, bấm Hủy; thử để phiên đã mở lâu (không nhập lại mật khẩu bằng cách gọi RPC trực tiếp bằng token cũ -> CG006).
3. Xóa tài khoản Quản trị/Biên tập: phải báo CG005 và **không xóa gì**; hạ quyền rồi thử lại. Với quản trị viên cuối cùng: thông báo riêng.
4. Tải dữ liệu: tệp JSON đúng dữ liệu của chính mình (so với bảng), không chứa dữ liệu người khác.
5. Xác minh chứng nhận: mã mới, mã cũ, mã sai, mã khách `CGS-GUEST-…`, gõ chữ thường/khoảng trắng; kiểm tra tên đã che; thử 31 lượt liên tiếp -> lượt thứ 31 bị chặn (429) và giao diện báo "Tra cứu quá nhiều lần".
6. GA4 (sau khi chấp nhận cookie): trong DebugView/Network, `dl` của trang `?code=` hoặc `#access_token=` không chứa mã/token.
7. Trang Giới thiệu: hoạt hình chạy trong iframe, không có lỗi CSP trong Console, cả khi có và không có Cloudflare Worker.
8. Kiểm khóa ngoại: `select conrelid::regclass, conname, confdeltype from pg_constraint where confrelid = 'auth.users'::regclass and confdeltype not in ('c','n');` phải rỗng ngoài các bảng không chứa dữ liệu người dùng; nếu có bảng khác chặn việc xóa tài khoản, thêm xử lý trước khi cho người dùng thật dùng nút xóa.
