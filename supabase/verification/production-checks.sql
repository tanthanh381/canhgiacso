-- ============================================================================
-- KIỂM TRA CHỈ-ĐỌC cho dự án Supabase của Cảnh Giác Số.
--
-- Cách dùng: mở Supabase Dashboard -> SQL Editor, dán từng phần (hoặc cả tệp) và chạy.
-- Tệp này KHÔNG ghi, KHÔNG sửa, KHÔNG xóa gì. SQL Editor chỉ hiển thị kết quả của câu lệnh
-- CUỐI CÙNG trong một lần chạy, vì vậy hãy chạy TỪNG PHẦN (mỗi phần là một câu lệnh độc
-- lập, đánh số 0, 1, 2 ...). Phần 0 là bảng tóm tắt đạt/không đạt của các điểm quan trọng.
--
-- Chạy: (a) TRƯỚC khi áp dụng các migration 20261002*, để biết hiện trạng thật của
-- production; (b) SAU khi áp dụng, để xác nhận kết quả. Cột "mong đợi" ghi giá trị tốt SAU
-- khi hoàn tất toàn bộ REMEDIATION-2026-10 (kể cả bước post-deploy).
--
-- Những gì KHÔNG đọc được bằng SQL (cấu hình Auth, CAPTCHA, SMTP, PITR, edge function...)
-- nằm trong documentation/security/SUPABASE-DASHBOARD-CHECKLIST.md.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. TÓM TẮT: mỗi dòng là một điểm kiểm tra; cột trang_thai cho biết TỐT / XẤU / THEO DÕI.
-- ----------------------------------------------------------------------------
with
  site_content_exists as (select to_regclass('public.site_content') is not null as ok),
  payload as (
    select public.get_public_site_content() as content
  ),
  payload_answer_keys as (
    -- Số lựa chọn trong payload CÔNG KHAI còn mang khóa đáp án.
    select count(*) as n
    from payload p
    cross join lateral jsonb_array_elements(coalesce(p.content->'scenarios', '[]'::jsonb)) s
    cross join lateral jsonb_array_elements(coalesce(s->'choices', '[]'::jsonb)) c
    where c ?| array['correct', 'moneyDelta', 'awarenessDelta', 'feedback']
  ),
  privileged as (
    select user_id from private.app_admins
    union
    select user_id from private.app_editors
  ),
  rate_limit_columns as (
    select array_agg(column_name::text order by column_name) as cols
    from information_schema.columns
    where table_schema = 'private' and table_name = 'api_rate_limits'
  ),
  checks(thu_tu, kiem_tra, gia_tri, mong_doi, trang_thai) as (
    select 1, 'anon còn SELECT trên public.site_content (lộ đáp án qua REST)',
      has_table_privilege('anon', 'public.site_content', 'SELECT')::text,
      'false (sau bước post-deploy)',
      case when has_table_privilege('anon', 'public.site_content', 'SELECT') then 'XẤU' else 'TỐT' end
    union all
    select 2, 'authenticated còn SELECT trên public.site_content (lộ đáp án cho mọi người dùng đăng nhập)',
      has_table_privilege('authenticated', 'public.site_content', 'SELECT')::text,
      'false (sau bước post-deploy)',
      case when has_table_privilege('authenticated', 'public.site_content', 'SELECT') then 'XẤU' else 'TỐT' end
    union all
    select 3, 'authenticated còn quyền ghi trực tiếp public.site_content (bỏ qua kiểm tra cấu trúc + audit của RPC)',
      has_table_privilege('authenticated', 'public.site_content', 'INSERT,UPDATE,DELETE')::text,
      'false (sau migration 20261002101000)',
      case when has_table_privilege('authenticated', 'public.site_content', 'INSERT,UPDATE,DELETE') then 'XẤU' else 'TỐT' end
    union all
    select 4, 'get_public_site_content() còn trả khóa đáp án (correct/moneyDelta/awarenessDelta/feedback)',
      (select n::text from payload_answer_keys),
      '0 lựa chọn mang khóa đáp án',
      case when (select n from payload_answer_keys) > 0 then 'XẤU' else 'TỐT' end
    union all
    select 5, 'anon gọi được evaluate_guest_choice (khách chấm điểm qua RPC)',
      has_function_privilege('anon', 'public.evaluate_guest_choice(integer,integer)', 'EXECUTE')::text,
      'true (sau migration 20261002102000)',
      case when has_function_privilege('anon', 'public.evaluate_guest_choice(integer,integer)', 'EXECUTE') then 'TỐT' else 'THEO DÕI' end
    union all
    select 6, 'public.save_managed_site_content có ghi nhật ký kiểm toán (trực tiếp hoặc ủy quyền sang bản private)',
      (position('log_security_event' in pg_get_functiondef('public.save_managed_site_content(text,jsonb)'::regprocedure)) > 0
        or position('private.save_managed_site_content' in pg_get_functiondef('public.save_managed_site_content(text,jsonb)'::regprocedure)) > 0)::text,
      'true (sau migration 20261002101000)',
      case when (position('log_security_event' in pg_get_functiondef('public.save_managed_site_content(text,jsonb)'::regprocedure)) > 0
        or position('private.save_managed_site_content' in pg_get_functiondef('public.save_managed_site_content(text,jsonb)'::regprocedure)) > 0) then 'TỐT' else 'XẤU' end
    union all
    select 7, 'public.set_content_manager_role có ghi nhật ký kiểm toán (trực tiếp hoặc ủy quyền sang bản private)',
      (position('log_security_event' in pg_get_functiondef('public.set_content_manager_role(uuid,text)'::regprocedure)) > 0
        or position('private.set_content_manager_role' in pg_get_functiondef('public.set_content_manager_role(uuid,text)'::regprocedure)) > 0)::text,
      'true (sau migration 20261002100000)',
      case when (position('log_security_event' in pg_get_functiondef('public.set_content_manager_role(uuid,text)'::regprocedure)) > 0
        or position('private.set_content_manager_role' in pg_get_functiondef('public.set_content_manager_role(uuid,text)'::regprocedure)) > 0) then 'TỐT' else 'XẤU' end
    union all
    select 8, 'Bảng trong schema public/private chưa bật RLS',
      (select count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and not c.relrowsecurity),
      '0',
      case when (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and not c.relrowsecurity) = 0 then 'TỐT' else 'XẤU' end
    union all
    select 9, 'Hàm SECURITY DEFINER (public/private) thiếu search_path cố định',
      (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
      '0',
      case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')) = 0 then 'TỐT' else 'XẤU' end
    union all
    select 10, 'private.api_rate_limits: số dòng',
      (select count(*)::text from private.api_rate_limits),
      'nhỏ (vài nghìn dòng, chỉ trong 24 giờ gần nhất)',
      case when (select count(*) from private.api_rate_limits) > 200000 then 'XẤU' else 'THEO DÕI' end
    union all
    select 11, 'private.api_rate_limits: dòng cũ nhất (giờ trước)',
      coalesce((select round(extract(epoch from now() - min(request_at)) / 3600)::text from private.api_rate_limits), 'bảng rỗng'),
      '<= 24 giờ',
      case when coalesce((select extract(epoch from now() - min(request_at)) / 3600 from private.api_rate_limits), 0) > 24 then 'XẤU' else 'TỐT' end
    union all
    select 12, 'private.api_rate_limits còn cột source_ip (IP thô)',
      ((select cols from rate_limit_columns) @> array['source_ip'])::text,
      'false (sau migration 20261002103000)',
      case when (select cols from rate_limit_columns) @> array['source_ip'] then 'XẤU' else 'TỐT' end
    union all
    select 13, 'Tài khoản đặc quyền (admin/editor) có email CHƯA xác nhận',
      (select count(*)::text from auth.users u join privileged p on p.user_id = u.id where u.email_confirmed_at is null),
      '0 (bắt buộc trước khi áp dụng migration 20261002100000)',
      case when (select count(*) from auth.users u join privileged p on p.user_id = u.id where u.email_confirmed_at is null) = 0 then 'TỐT' else 'XẤU' end
    union all
    select 14, 'Tài khoản đặc quyền chưa có yếu tố TOTP đã xác minh (có thể bị chiếm bằng đăng ký TOTP lần đầu ở AAL1)',
      (select count(*)::text from privileged p
        where not exists (select 1 from auth.mfa_factors f where f.user_id = p.user_id and f.status = 'verified')),
      '0',
      case when (select count(*) from privileged p
        where not exists (select 1 from auth.mfa_factors f where f.user_id = p.user_id and f.status = 'verified')) = 0 then 'TỐT' else 'THEO DÕI' end
    union all
    select 15, 'Đăng ký 30 ngày qua được tự xác nhận trong <= 5 giây (dấu hiệu "Confirm email" đang TẮT)',
      (select count(*)::text from auth.users
        where created_at > now() - interval '30 days'
          and email_confirmed_at is not null
          and email_confirmed_at - created_at <= interval '5 seconds'),
      '0 sau khi bật Confirm email',
      case when (select count(*) from auth.users
        where created_at > now() - interval '30 days'
          and email_confirmed_at is not null
          and email_confirmed_at - created_at <= interval '5 seconds') > 0 then 'THEO DÕI' else 'TỐT' end
    union all
    select 16, 'authenticated còn gọi được submit_game_choice(uuid,int,int,jsonb) (hàm cũ nhận snapshot từ client)',
      coalesce(has_function_privilege('authenticated', to_regprocedure('public.submit_game_choice(uuid,integer,integer,jsonb)'), 'EXECUTE')::text, 'hàm không tồn tại'),
      'false hoặc không tồn tại (sau post-deploy)',
      case when coalesce(has_function_privilege('authenticated', to_regprocedure('public.submit_game_choice(uuid,integer,integer,jsonb)'), 'EXECUTE'), false) then 'XẤU' else 'TỐT' end
    union all
    select 17, 'Hook giới hạn tốc độ db_pre_request được cấu hình cho authenticator',
      coalesce((select array_to_string(rolconfig, ' ') from pg_roles where rolname = 'authenticator'), '(không có)'),
      'chứa pgrst.db_pre_request=private.data_api_pre_request',
      case when coalesce((select array_to_string(rolconfig, ' ') from pg_roles where rolname = 'authenticator'), '') like '%pgrst.db_pre_request=private.data_api_pre_request%' then 'TỐT' else 'XẤU' end
    union all
    select 18, 'user_is_app_admin() yêu cầu email_confirmed_at',
      (position('email_confirmed_at' in pg_get_functiondef('private.user_is_app_admin()'::regprocedure)) > 0)::text,
      'true (sau migration 20261002100000)',
      case when position('email_confirmed_at' in pg_get_functiondef('private.user_is_app_admin()'::regprocedure)) > 0 then 'TỐT' else 'XẤU' end
    union all
    select 20, 'anon có USAGE trên schema private và EXECUTE hook (PostgREST chạy db_pre_request SAU khi chuyển sang vai trò yêu cầu)',
      (has_schema_privilege('anon', 'private', 'USAGE')
        and has_function_privilege('anon', 'private.data_api_pre_request()', 'EXECUTE'))::text,
      'true khi hook đang được cấu hình (production hiện chạy được cho khách nên phải là true)',
      case when has_schema_privilege('anon', 'private', 'USAGE')
        and has_function_privilege('anon', 'private.data_api_pre_request()', 'EXECUTE') then 'TỐT' else 'XẤU' end
    union all
    select 19, 'pg_cron đang bật (lịch dọn dữ liệu hết hạn)',
      exists (select 1 from pg_extension where extname = 'pg_cron')::text,
      'true, hoặc chấp nhận dọn cơ hội trong hook',
      case when exists (select 1 from pg_extension where extname = 'pg_cron') then 'TỐT' else 'THEO DÕI' end
    union all
    select 21, 'RPC xóa/xuất dữ liệu tài khoản (20261002130000): có mặt và chỉ authenticated gọi được',
      case when to_regprocedure('public.delete_my_account(text)') is null or to_regprocedure('public.export_my_data()') is null
        then 'chưa có' else (has_function_privilege('authenticated', 'public.delete_my_account(text)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.delete_my_account(text)', 'EXECUTE')
          and has_function_privilege('authenticated', 'public.export_my_data()', 'EXECUTE')
          and not has_function_privilege('anon', 'public.export_my_data()', 'EXECUTE'))::text end,
      'true (sau migration 20261002130000)',
      case when to_regprocedure('public.delete_my_account(text)') is null or to_regprocedure('public.export_my_data()') is null then 'THEO DÕI'
        when has_function_privilege('anon', 'public.delete_my_account(text)', 'EXECUTE')
          or has_function_privilege('anon', 'public.export_my_data()', 'EXECUTE') then 'XẤU'
        else 'TỐT' end
    union all
    select 22, 'verify_training_certificate (20261002131000): anon gọi được và là VOLATILE (để hook giới hạn tốc độ áp dụng)',
      case when to_regprocedure('public.verify_training_certificate(text)') is null then 'chưa có'
        else (has_function_privilege('anon', 'public.verify_training_certificate(text)', 'EXECUTE')
              and (select provolatile = 'v' from pg_proc where oid = to_regprocedure('public.verify_training_certificate(text)')))::text end,
      'true (sau migration 20261002131000)',
      case when to_regprocedure('public.verify_training_certificate(text)') is null then 'THEO DÕI'
        when has_function_privilege('anon', 'public.verify_training_certificate(text)', 'EXECUTE')
             and (select provolatile = 'v' from pg_proc where oid = to_regprocedure('public.verify_training_certificate(text)')) then 'TỐT'
        else 'XẤU' end
    union all
    select 23, 'Hook giới hạn tốc độ có route cho xóa/xuất dữ liệu và xác minh chứng nhận (20261002132000)',
      (position('rpc/verify_training_certificate' in pg_get_functiondef('private.data_api_pre_request()'::regprocedure)) > 0
        and position('rpc/delete_my_account' in pg_get_functiondef('private.data_api_pre_request()'::regprocedure)) > 0)::text,
      'true (sau migration 20261002132000)',
      case when position('rpc/verify_training_certificate' in pg_get_functiondef('private.data_api_pre_request()'::regprocedure)) > 0
        and position('rpc/delete_my_account' in pg_get_functiondef('private.data_api_pre_request()'::regprocedure)) > 0 then 'TỐT' else 'THEO DÕI' end
    union all
    select 24, 'public.site_content.updated_by là ON DELETE SET NULL (cựu biên tập viên vẫn xóa được tài khoản)',
      coalesce((select (pg_get_constraintdef(c.oid) ilike '%on delete set null%')::text
        from pg_constraint c where c.conrelid = 'public.site_content'::regclass and c.conname = 'site_content_updated_by_fkey'), 'không tìm thấy ràng buộc'),
      'true (sau migration 20261002130000)',
      case when coalesce((select pg_get_constraintdef(c.oid) ilike '%on delete set null%'
        from pg_constraint c where c.conrelid = 'public.site_content'::regclass and c.conname = 'site_content_updated_by_fkey'), false) then 'TỐT' else 'THEO DÕI' end
    union all
    select 25, 'Chứng nhận đã phát hành còn mã dạng cũ 10 ký tự hex (40 bit; giữ nguyên vì đã in; chứng nhận mới có 64 bit)',
      coalesce((select count(*)::text from private.training_certificates where certificate_code ~ '^CGS-[0-9]{4}-[0-9A-F]{10}$'), '0'),
      'số này chỉ giảm nếu cấp lại chứng nhận; không cần xử lý',
      'THEO DÕI'
  )
select kiem_tra, gia_tri, mong_doi, trang_thai
from checks
cross join site_content_exists
where site_content_exists.ok
order by thu_tu;


-- ----------------------------------------------------------------------------
-- 1. Quyền của anon / authenticated trên TỪNG bảng public & private.
--    Tốt: anon không có gì; authenticated chỉ SELECT (và UPDATE cột display_name của
--    profiles). XẤU: thấy INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER ngoài dự kiến.
-- ----------------------------------------------------------------------------
select c.relname as bang, r.rolname as vai_tro,
       string_agg(p.priv, ', ' order by p.priv) as quyen
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated')) r(rolname)
cross join lateral (
  select unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as priv
) p
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p')
  and has_table_privilege(r.rolname, c.oid, p.priv)
group by n.nspname, c.relname, r.rolname
order by n.nspname, c.relname, r.rolname;


-- ----------------------------------------------------------------------------
-- 2. Policy RLS của public.site_content.
--    Tốt (sau post-deploy): vẫn có thể còn policy nhưng vô hiệu vì đã thu hồi quyền bảng.
-- ----------------------------------------------------------------------------
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'site_content'
order by policyname;


-- ----------------------------------------------------------------------------
-- 3. Số lựa chọn trong BẢNG (không qua RPC) mang khóa đáp án, và payload công khai.
--    Bảng PHẢI còn khóa đáp án (máy chủ cần chấm điểm); payload công khai thì KHÔNG.
-- ----------------------------------------------------------------------------
select
  (select count(*)
     from public.site_content t
     cross join lateral jsonb_array_elements(coalesce(t.content->'scenarios', '[]'::jsonb)) s
     cross join lateral jsonb_array_elements(coalesce(s->'choices', '[]'::jsonb)) c
    where t.slug = 'main' and t.published and c ? 'correct') as lua_chon_co_khoa_trong_bang,
  (select count(*)
     from jsonb_array_elements(coalesce(public.get_public_site_content()->'scenarios', '[]'::jsonb)) s
     cross join lateral jsonb_array_elements(coalesce(s->'choices', '[]'::jsonb)) c
    where c ?| array['correct', 'moneyDelta', 'awarenessDelta', 'feedback']) as lua_chon_co_khoa_trong_payload_cong_khai;
-- Mong đợi: cột 1 > 0 ; cột 2 = 0.


-- ----------------------------------------------------------------------------
-- 4. Định nghĩa hai hàm quản trị mà frontend gọi: có log_security_event hoặc ủy quyền
--    sang private.* hay không.
-- ----------------------------------------------------------------------------
select
  p.oid::regprocedure as ham,
  p.prosecdef as security_definer,
  position('log_security_event' in pg_get_functiondef(p.oid)) > 0 as tu_ghi_audit,
  position('private.save_managed_site_content' in pg_get_functiondef(p.oid)) > 0
    or position('private.set_content_manager_role' in pg_get_functiondef(p.oid)) > 0 as uy_quyen_sang_private
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('save_managed_site_content', 'set_content_manager_role');
-- Tốt: ít nhất một trong hai cột cuối là true cho cả hai hàm.


-- ----------------------------------------------------------------------------
-- 5. Bảng chưa bật RLS (mọi schema ứng dụng).
--    Mong đợi: không có dòng nào.
-- ----------------------------------------------------------------------------
select n.nspname as schema, c.relname as bang
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by 1, 2;


-- ----------------------------------------------------------------------------
-- 6. Hàm SECURITY DEFINER thiếu "set search_path". Mong đợi: không có dòng nào.
--    (SECURITY DEFINER không cố định search_path có thể bị chiếm quyền qua schema giả.)
-- ----------------------------------------------------------------------------
select n.nspname as schema, p.oid::regprocedure as ham, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
order by 1, 2;


-- ----------------------------------------------------------------------------
-- 7. Tài khoản đặc quyền có email CHƯA xác nhận. Mong đợi: không có dòng nào.
--    Nếu có: migration 20261002100000 sẽ DỪNG (cố ý) để không khóa nhầm. Với mỗi tài khoản:
--    xác minh danh tính chủ tài khoản rồi đặt auth.users.email_confirmed_at, hoặc hạ quyền.
-- ----------------------------------------------------------------------------
select u.id, u.email, u.created_at,
       case when a.user_id is not null then 'admin' else 'editor' end as vai_tro
from auth.users u
left join private.app_admins a on a.user_id = u.id
left join private.app_editors e on e.user_id = u.id
where u.email_confirmed_at is null
  and (a.user_id is not null or e.user_id is not null);


-- ----------------------------------------------------------------------------
-- 7b. Tài khoản đặc quyền CHƯA có yếu tố TOTP đã xác minh.
--     Họ sẽ được giao diện ép đăng ký TOTP ở lần đăng nhập kế tiếp (ở AAL1). Hãy bảo đảm
--     chính chủ là người đăng ký, ngay sau khi được cấp quyền.
-- ----------------------------------------------------------------------------
select u.id, u.email,
       case when a.user_id is not null then 'admin' else 'editor' end as vai_tro
from auth.users u
left join private.app_admins a on a.user_id = u.id
left join private.app_editors e on e.user_id = u.id
where (a.user_id is not null or e.user_id is not null)
  and not exists (
    select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'
  );


-- ----------------------------------------------------------------------------
-- 8. private.api_rate_limits: số dòng, dòng cũ nhất, kích thước.
--    Trước migration 20261002103000 bảng này chứa IP thô và không được dọn; sau migration
--    chỉ chứa mã băm và không quá ~24 giờ dữ liệu.
-- ----------------------------------------------------------------------------
select count(*) as so_dong,
       min(request_at) as dong_cu_nhat,
       max(request_at) as dong_moi_nhat,
       pg_size_pretty(pg_total_relation_size('private.api_rate_limits')) as kich_thuoc
from private.api_rate_limits;

-- 8b. Cột hiện có của bảng (source_ip = IP thô -> XẤU; source_ip_hash = TỐT).
select column_name, data_type
from information_schema.columns
where table_schema = 'private' and table_name = 'api_rate_limits'
order by ordinal_position;

-- 8c. (CHỈ chạy TRƯỚC migration 20261002103000; sau đó cột source_ip không còn nên lỗi là bình thường)
--     Số IP khác nhau đang bị lưu vô thời hạn:
-- select count(distinct source_ip) as so_ip_khac_nhau, min(request_at) as som_nhat from private.api_rate_limits;


-- ----------------------------------------------------------------------------
-- 9. Kích thước và độ cũ của bảng analytics (chính sách giữ 13 tháng).
-- ----------------------------------------------------------------------------
select 'web_analytics_sessions' as bang,
       count(*) as so_dong,
       min(first_seen) as som_nhat,
       pg_size_pretty(pg_total_relation_size('private.web_analytics_sessions')) as kich_thuoc
from private.web_analytics_sessions
union all
select 'web_analytics_pageviews',
       count(*),
       min(viewed_at),
       pg_size_pretty(pg_total_relation_size('private.web_analytics_pageviews'))
from private.web_analytics_pageviews;


-- ----------------------------------------------------------------------------
-- 10. Hàm anon / authenticated có quyền EXECUTE trong schema public.
--     Mong đợi cho anon: chỉ get_public_site_content, evaluate_guest_choice,
--     record_web_analytics_event_v4 và verify_training_certificate. Mọi hàm khác của anon là bất thường.
-- ----------------------------------------------------------------------------
select p.oid::regprocedure as ham,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
order by anon desc, p.proname;


-- ----------------------------------------------------------------------------
-- 11. Extension đang bật (và schema chứa chúng).
--     Chú ý: pgcrypto/pg_cron/pgtap nên nằm trong schema "extensions", không phải "public".
-- ----------------------------------------------------------------------------
select e.extname, e.extversion, n.nspname as schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
order by e.extname;


-- ----------------------------------------------------------------------------
-- 12. Cấu hình vai trò authenticator (hook giới hạn tốc độ, các GUC PostgREST).
-- ----------------------------------------------------------------------------
select rolname, rolconfig from pg_roles where rolname in ('authenticator', 'anon', 'authenticated', 'service_role');


-- ----------------------------------------------------------------------------
-- 13. View trong public chạy với quyền chủ sở hữu (bỏ qua RLS). Mong đợi: không có dòng
--     nào, hoặc đã được xem xét có chủ đích. (Supabase Security Advisor cũng cảnh báo.)
-- ----------------------------------------------------------------------------
select c.relname as view, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and not coalesce(c.reloptions @> array['security_invoker=true'], false);


-- ----------------------------------------------------------------------------
-- 14. Bảng nào nằm trong publication Realtime. Mong đợi: không có bảng chứa dữ liệu
--     người dùng nếu không cần thiết.
-- ----------------------------------------------------------------------------
select pubname, schemaname, tablename from pg_publication_tables order by 1, 2, 3;


-- ----------------------------------------------------------------------------
-- 15. Dấu hiệu "Confirm email" đang tắt: phân bố thời gian từ lúc đăng ký đến lúc xác nhận.
--     Nếu mọi tài khoản mới đều được xác nhận trong vài giây -> Confirm email đang TẮT.
--     Phải bật trên Dashboard (checklist D1.7): Authentication -> Providers -> Email.
-- ----------------------------------------------------------------------------
select date_trunc('week', created_at) as tuan_dang_ky,
       count(*) as so_tai_khoan,
       count(*) filter (where email_confirmed_at is null) as chua_xac_nhan,
       count(*) filter (where email_confirmed_at is not null
                          and email_confirmed_at - created_at <= interval '5 seconds') as tu_xac_nhan_trong_5_giay
from auth.users
group by 1
order by 1 desc
limit 12;


-- ----------------------------------------------------------------------------
-- 16. Lịch pg_cron (chỉ chạy nếu pg_cron đã bật; nếu chưa bật câu lệnh này báo lỗi
--     "schema cron does not exist", là bình thường).
-- ----------------------------------------------------------------------------
-- select jobid, jobname, schedule, command, active from cron.job order by jobid;
-- select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;


-- ----------------------------------------------------------------------------
-- 17. Nhật ký kiểm toán gần nhất (xác nhận các thao tác quản trị đã được ghi).
--     Sau migration 20261002100000/101000, mọi lần lưu/xuất bản nội dung và đổi quyền
--     đều để lại dòng CONTENT_DRAFT_SAVED / CONTENT_PUBLISHED / ROLE_CHANGED.
-- ----------------------------------------------------------------------------
select occurred_at, action, outcome, actor_user_id, target_type, target_id, actor_aal
from private.security_audit_log
order by occurred_at desc
limit 50;
