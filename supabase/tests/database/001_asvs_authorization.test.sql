-- Hợp đồng phân quyền ASVS L2 (pgTAP). Chạy trên CSDL đã áp dụng đủ schema + migrations
-- (xem supabase/tests/bootstrap.sh). Các khẳng định dựa trên catalog, không dùng danh tính
-- thật của production.
begin;
set local search_path = public, extensions;
select plan(22);

-- 1. Hàm public mà anon được phép gọi: đúng danh sách cho phép, không hơn.
--    Danh sách này gồm get_public_site_content (nội dung đã gỡ đáp án), evaluate_guest_choice
--    (chấm một lựa chọn của khách) và record_web_analytics_event_v4 (analytics ẩn danh).
select is(
  (
    select coalesce(array_agg(p.proname::text order by p.proname), '{}'::text[])
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  ),
  array['evaluate_guest_choice', 'get_public_site_content', 'record_web_analytics_event_v4']::text[],
  'anon chỉ gọi được đúng 3 hàm public trong danh sách cho phép'
);

select ok(
  has_function_privilege(
    'anon',
    'public.record_web_analytics_event_v4(text,text,text,text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'RPC analytics v4 gọi được bởi anon'
);
select ok(
  has_function_privilege('anon', 'public.evaluate_guest_choice(integer,integer)', 'EXECUTE'),
  'RPC chấm điểm khách gọi được bởi anon'
);
select ok(
  not has_function_privilege('anon', 'public.record_web_analytics_event(text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.record_web_analytics_event_v2(text,text,text,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.record_web_analytics_event_v3(text,text,text,text,text,text,text,text,text)', 'EXECUTE'),
  'RPC analytics cũ không còn gọi được bởi anon'
);

-- 2. RLS bật trên mọi bảng ứng dụng.
select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  0,
  'mọi bảng public/private đều bật RLS'
);

-- 3. Mọi hàm SECURITY DEFINER cố định search_path.
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
  ),
  0,
  'mọi hàm SECURITY DEFINER đều có search_path cố định'
);

-- 4. anon không gọi được RPC quản trị.
select ok(
  not has_function_privilege('anon', 'public.save_managed_site_content(text,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.set_content_manager_role(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_managed_site_content()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_content_management_access()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_privileged_email_domains()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.set_privileged_email_domain(text,boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.log_privileged_mfa_event(text)', 'EXECUTE'),
  'anon không có quyền gọi RPC quản trị nội dung/vai trò/MFA'
);

-- 5. Nhật ký kiểm toán không ghi được từ vai trò trình duyệt.
select ok(
  not has_table_privilege('authenticated', 'private.security_audit_log', 'INSERT')
  and not has_table_privilege('authenticated', 'private.security_audit_log', 'UPDATE')
  and not has_table_privilege('authenticated', 'private.security_audit_log', 'DELETE')
  and not has_table_privilege('anon', 'private.security_audit_log', 'INSERT'),
  'authenticated/anon không sửa được private.security_audit_log'
);

-- 6. Hàm kiểm quyền yêu cầu AAL2, phiên còn sống và email đã xác nhận.
select ok(
  position('''aal2''' in pg_get_functiondef('private.user_can_edit_content()'::regprocedure)) > 0
  and position('auth.sessions' in pg_get_functiondef('private.user_can_edit_content()'::regprocedure)) > 0
  and position('email_confirmed_at' in pg_get_functiondef('private.user_can_edit_content()'::regprocedure)) > 0,
  'user_can_edit_content() yêu cầu AAL2 + phiên sống + email đã xác nhận'
);
select ok(
  position('''aal2''' in pg_get_functiondef('private.user_is_app_admin()'::regprocedure)) > 0
  and position('auth.sessions' in pg_get_functiondef('private.user_is_app_admin()'::regprocedure)) > 0
  and position('email_confirmed_at' in pg_get_functiondef('private.user_is_app_admin()'::regprocedure)) > 0,
  'user_is_app_admin() yêu cầu AAL2 + phiên sống + email đã xác nhận'
);

-- 7. Chính sách sở hữu bản ghi của người dùng gắn với auth.uid().
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'test_attempts', 'user_progress')
      and roles::text like '%authenticated%'
      and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      and coalesce(qual, with_check, '') not like '%auth.uid()%'
      and coalesce(with_check, qual, '') not like '%auth.uid()%'
  ),
  0,
  'mọi policy sở hữu bản ghi đều gắn auth.uid()'
);

-- 8. Quyền tối thiểu trên bảng người dùng.
select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT')
  and not has_table_privilege('anon', 'public.user_progress', 'SELECT')
  and not has_table_privilege('anon', 'public.test_attempts', 'SELECT'),
  'anon không có quyền đọc bảng người dùng'
);
select ok(
  not has_table_privilege('authenticated', 'public.test_attempts', 'INSERT,UPDATE,DELETE,TRUNCATE')
  and not has_table_privilege('authenticated', 'public.user_progress', 'INSERT,UPDATE,DELETE,TRUNCATE'),
  'authenticated không ghi trực tiếp được tiến trình/kết quả (chỉ qua RPC chấm điểm máy chủ)'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.profiles', 'DELETE')
  and not has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
  and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE'),
  'authenticated chỉ sửa được display_name của profiles'
);

-- 9. public.site_content: không còn ghi trực tiếp.
select ok(
  not has_table_privilege('authenticated', 'public.site_content', 'INSERT')
  and not has_table_privilege('authenticated', 'public.site_content', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.site_content', 'DELETE')
  and not has_table_privilege('authenticated', 'public.site_content', 'TRUNCATE')
  and not has_table_privilege('anon', 'public.site_content', 'INSERT,UPDATE,DELETE,TRUNCATE'),
  'không ai ngoài RPC ghi được public.site_content'
);

-- 10. Hai RPC quản trị mà frontend gọi ủy quyền sang bản private (có nhật ký kiểm toán).
select ok(
  not (select prosecdef from pg_proc where oid = 'public.save_managed_site_content(text,jsonb)'::regprocedure)
  and position('private.save_managed_site_content' in pg_get_functiondef('public.save_managed_site_content(text,jsonb)'::regprocedure)) > 0
  and position('log_security_event' in pg_get_functiondef('private.save_managed_site_content(text,jsonb)'::regprocedure)) > 0,
  'public.save_managed_site_content ủy quyền sang bản private có log_security_event'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.set_content_manager_role(uuid,text)'::regprocedure)
  and position('private.set_content_manager_role' in pg_get_functiondef('public.set_content_manager_role(uuid,text)'::regprocedure)) > 0
  and position('log_security_event' in pg_get_functiondef('private.set_content_manager_role(uuid,text)'::regprocedure)) > 0,
  'public.set_content_manager_role ủy quyền sang bản private có log_security_event'
);

-- 11. Bảng cấu hình/riêng tư không truy cập trực tiếp được.
select ok(
  not has_table_privilege('authenticated', 'private.security_settings', 'SELECT')
  and not has_table_privilege('anon', 'private.security_settings', 'SELECT')
  and not has_table_privilege('authenticated', 'private.privileged_email_domains', 'SELECT')
  and not has_table_privilege('authenticated', 'private.api_rate_limits', 'SELECT'),
  'security_settings / privileged_email_domains / api_rate_limits không đọc được từ vai trò trình duyệt'
);

-- 12. Hàm nội bộ không gọi được từ anon.
select ok(
  not has_function_privilege('anon', 'private.evaluate_choice(integer,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.evaluate_choice(integer,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.log_security_event(text,text,text,text,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.purge_expired_security_data(integer,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.request_source_ip_hash()', 'EXECUTE'),
  'hàm nội bộ (chấm điểm, audit, dọn dữ liệu, băm IP) không gọi được từ vai trò trình duyệt'
);

-- 13. Hook giới hạn tốc độ vẫn được cấu hình.
select ok(
  coalesce((select array_to_string(rolconfig, ' ') from pg_roles where rolname = 'authenticator'), '')
    like '%pgrst.db_pre_request=private.data_api_pre_request%',
  'authenticator vẫn cấu hình pgrst.db_pre_request'
);

-- 14. Mặc định deny cho đối tượng tương lai trong public.
select ok(
  not exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public'
      and d.defaclobjtype = 'f'
      and exists (
        select 1 from aclexplode(d.defaclacl) a
        join pg_roles r on r.oid = a.grantee
        where r.rolname in ('anon', 'authenticated')
      )
  ),
  'hàm mới trong public không tự cấp EXECUTE cho anon/authenticated'
);

-- 15. anon không đọc được bảng nội dung (kiểm tra ở tầng quyền; xem post-deploy cho bước thu hồi SELECT).
select ok(
  not has_table_privilege('anon', 'public.site_content', 'INSERT,UPDATE,DELETE'),
  'anon không ghi được site_content'
);

select * from finish();
rollback;
