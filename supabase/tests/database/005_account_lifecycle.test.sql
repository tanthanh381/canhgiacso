-- Vòng đời tài khoản: xuất dữ liệu của chính mình và xóa tài khoản (xác thực gần đây, cụm xác nhận,
-- chặn tài khoản đặc quyền, xóa lan truyền, audit tối giản không PII).
begin;
set local search_path = public, extensions;
select plan(41);

-- Người dùng: M (thành viên có dữ liệu), N (thành viên khác), A1/A2 (hai quản trị viên), E (biên tập viên),
-- X (cựu biên tập viên đã hạ quyền nhưng từng soạn nội dung), S (thành viên phiên cũ).
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000b001', 'member.m@hdbank.test',  now(), '{"username":"member_m","display_name":"Nguyễn Văn Minh"}'),
  ('00000000-0000-0000-0000-00000000b002', 'member.n@hdbank.test',  now(), '{"username":"member_n","display_name":"Trần Thị Nga"}'),
  ('00000000-0000-0000-0000-00000000a001', 'admin1@hdbank.test',    now(), '{"username":"admin_one","display_name":"Admin One"}'),
  ('00000000-0000-0000-0000-00000000a002', 'admin2@hdbank.test',    now(), '{"username":"admin_two","display_name":"Admin Two"}'),
  ('00000000-0000-0000-0000-00000000e001', 'editor@hdbank.test',    now(), '{"username":"editor_e","display_name":"Editor E"}'),
  ('00000000-0000-0000-0000-00000000c001', 'ex.editor@hdbank.test', now(), '{"username":"ex_editor","display_name":"Ex Editor"}'),
  ('00000000-0000-0000-0000-00000000d001', 'stale@hdbank.test',     now(), '{"username":"stale_s","display_name":"Stale S"}');
insert into private.app_admins (user_id) values ('00000000-0000-0000-0000-00000000a001');
insert into private.app_editors (user_id) values ('00000000-0000-0000-0000-00000000e001');

-- Phiên: phiên mới tạo (created_at = now()) và một phiên cũ 2 giờ trước.
insert into auth.sessions (id, user_id, created_at) values
  ('00000000-0000-0000-0000-0000000005b1', '00000000-0000-0000-0000-00000000b001', now()),
  ('00000000-0000-0000-0000-0000000005b2', '00000000-0000-0000-0000-00000000b002', now()),
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000a001', now()),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-00000000a002', now()),
  ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-00000000e001', now()),
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-00000000c001', now()),
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-00000000d001', now() - interval '2 hours');

-- Dữ liệu của M và N.
update public.user_progress set balance = 250000000, awareness = 80 where user_id = '00000000-0000-0000-0000-00000000b001';
insert into public.test_attempts (user_id, scenario_id, choice_index, correct, balance_after, awareness_after, server_verified) values
  ('00000000-0000-0000-0000-00000000b001', 1, 0, true,  300000000, 100, true),
  ('00000000-0000-0000-0000-00000000b001', 2, 1, false, 250000000, 80,  true),
  ('00000000-0000-0000-0000-00000000b002', 1, 0, true,  300000000, 100, true);
insert into private.game_history (run_id, user_id, balance, awareness, attempts) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000b001', 240000000, 70, '[{"scenarioId":1,"correct":true}]'::jsonb);
insert into private.training_certificates (id, certificate_code, user_id, run_id, display_name, username, scenario_total, completed, correct, accuracy, score, rating) values
  ('00000000-0000-0000-0000-0000000000c1', 'CGS-2026-AAAAAAAAAAAAAAAA', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000f1', 'Nguyễn Văn Minh', 'member_m', 10, 10, 9, 90, 1100, 'XUẤT SẮC'),
  ('00000000-0000-0000-0000-0000000000c2', 'CGS-2026-BBBBBBBBBBBBBBBB', '00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000f2', 'Trần Thị Nga', 'member_n', 10, 10, 7, 70, 900, 'ĐẠT');
-- Nội dung do X soạn khi còn là biên tập viên.
insert into public.site_content (slug, content, published, updated_by)
values ('main-draft', '{"version":1,"scenarios":[]}'::jsonb, false, '00000000-0000-0000-0000-00000000c001');
-- Dòng giới hạn tốc độ gắn với M.
insert into private.api_rate_limits (source_ip_hash, route, actor_user_id)
values (repeat('a', 64), 'rpc/export_my_data', '00000000-0000-0000-0000-00000000b001');

create function pg_temp.act_as(uid uuid, session_id uuid, aal text default 'aal1', amr_ts bigint default null) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', aal, 'session_id', session_id)
      || case when amr_ts is null then '{}'::jsonb
              else jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', amr_ts))) end
    )::text, true);
  execute 'set local role authenticated';
end $$;

-- Đọc SQLSTATE và DETAIL của lỗi (throws_ok chỉ kiểm SQLSTATE).
create function pg_temp.err(sql text) returns text
language plpgsql as $$
declare st text; dt text;
begin
  execute sql;
  return 'no error';
exception when others then
  get stacked diagnostics dt = pg_exception_detail;
  return sqlstate || '|' || coalesce(dt, '');
end $$;

-- ===== Cấu trúc & quyền =====
select is(
  (select count(*)::integer from pg_trigger where tgname = 'training_certificates_upgrade_code' and not tgisinternal),
  1, 'trigger nâng entropy mã chứng nhận đã được cài');
select is(
  (select is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'site_content' and column_name = 'updated_by'),
  'YES', 'site_content.updated_by cho phép NULL (nội dung tồn tại lâu hơn người soạn)');
select ok(
  (select pg_get_constraintdef(c.oid) ilike '%on delete set null%'
     from pg_constraint c where c.conrelid = 'public.site_content'::regclass and c.conname = 'site_content_updated_by_fkey'),
  'site_content_updated_by_fkey là ON DELETE SET NULL');

-- ===== anon không gọi được =====
set local role anon;
select throws_ok($$select public.export_my_data()$$, '42501', null, 'anon không xuất được dữ liệu');
select throws_ok($$select public.delete_my_account('x')$$, '42501', null, 'anon không xóa được tài khoản');
reset role;

-- ===== Xuất dữ liệu =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000005b1');
create temp table export_m as select public.export_my_data() as payload;
grant all on export_m to public;
select is(
  (select array_agg(k order by k) from jsonb_object_keys((select payload from export_m)) k),
  array['account', 'attempts', 'certificates', 'exportedAt', 'history', 'notRecorded', 'profile', 'progress', 'role', 'schemaVersion', 'source']::text[],
  'bản xuất có đúng các nhóm dữ liệu dự kiến');
select is((select payload #>> '{profile,username}' from export_m), 'member_m', 'hồ sơ là của người gọi');
select is((select payload #>> '{account,email}' from export_m), 'member.m@hdbank.test', 'email của chính người gọi');
select is((select jsonb_array_length(payload -> 'attempts') from export_m), 2, 'xuất đủ 2 lựa chọn của người gọi');
select is((select (payload #>> '{progress,balance}')::integer from export_m), 250000000, 'tiến trình đúng');
select is((select jsonb_array_length(payload -> 'history') from export_m), 1, 'xuất lịch sử lượt chơi');
select is((select payload #>> '{certificates,0,certificateCode}' from export_m), 'CGS-2026-AAAAAAAAAAAAAAAA', 'xuất chứng nhận của người gọi');
select is((select payload ->> 'role' from export_m), 'member', 'vai trò được ghi là member');
select ok(
  (select payload::text !~ 'member_n|member.n@|Trần Thị Nga|CGS-2026-BBBBBBBBBBBBBBBB|encrypted_password|password' from export_m),
  'bản xuất không chứa dữ liệu người khác hay trường mật khẩu');
reset role;
select is(
  (select count(*)::integer from private.security_audit_log where action = 'ACCOUNT_DATA_EXPORTED'
     and source_ip is null and user_agent is null and actor_user_id is null and actor_session_id is null),
  1, 'xuất dữ liệu để lại 1 dòng audit không IP, user-agent, danh tính');
select ok(
  (select metadata::text !~ 'member' and target_id !~ 'b001' and target_id like 'sha256:%'
     from private.security_audit_log where action = 'ACCOUNT_DATA_EXPORTED' limit 1),
  'audit xuất dữ liệu chỉ chứa số lượng và mã băm, không PII');

-- Phiên không còn sống thì không xuất được.
delete from auth.sessions where id = '00000000-0000-0000-0000-0000000005b2';
select pg_temp.act_as('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000005b2');
select throws_ok($$select public.export_my_data()$$, '42501', null, 'phiên đã bị thu hồi thì không xuất được');
reset role;
insert into auth.sessions (id, user_id, created_at)
values ('00000000-0000-0000-0000-0000000005b2', '00000000-0000-0000-0000-00000000b002', now());

-- ===== Xóa tài khoản: các điều kiện chặn =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000005b1');
select is(pg_temp.err($$select public.delete_my_account('')$$), '22023|', 'thiếu cụm xác nhận bị từ chối');
select is(pg_temp.err($$select public.delete_my_account('member_n')$$), '22023|', 'cụm xác nhận của người khác bị từ chối');
select is(pg_temp.err($$select public.delete_my_account(null)$$), '22023|', 'cụm xác nhận NULL bị từ chối');
reset role;
select is((select count(*)::integer from auth.users where id = '00000000-0000-0000-0000-00000000b001'), 1,
  'các lần bị từ chối không xóa gì');

-- Xác thực không còn "gần đây".
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000005d1');
select is(pg_temp.err($$select public.delete_my_account('stale_s')$$), 'CG006|', 'phiên cũ 2 giờ, không có mốc amr mới: CG006');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000005d1', 'aal1',
                      (extract(epoch from now() - interval '30 minutes'))::bigint);
select is(pg_temp.err($$select public.delete_my_account('stale_s')$$), 'CG006|', 'mốc amr cũ 30 phút: CG006');
reset role;
select is((select count(*)::integer from auth.users where id = '00000000-0000-0000-0000-00000000d001'), 1, 'CG006 không xóa gì');

-- Tài khoản đặc quyền.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1', 'aal2');
select is(pg_temp.err($$select public.delete_my_account('admin_one')$$), 'CG005|last_admin', 'quản trị viên cuối cùng không xóa được (last_admin)');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1', 'aal2');
select is(pg_temp.err($$select public.delete_my_account('editor_e')$$), 'CG005|editor', 'biên tập viên chưa hạ quyền không xóa được');
reset role;
insert into private.app_admins (user_id) values ('00000000-0000-0000-0000-00000000a002');
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1', 'aal2');
select is(pg_temp.err($$select public.delete_my_account('admin_one')$$), 'CG005|administrator', 'có quản trị viên khác nhưng vẫn phải hạ quyền trước (administrator)');
reset role;
select is(
  (select count(*)::integer from auth.users where id in ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000e001')),
  2, 'tài khoản đặc quyền còn nguyên sau khi bị chặn');

-- ===== Xóa thành công =====
-- Cụm xác nhận không phân biệt hoa thường và bỏ khoảng trắng đầu cuối.
select pg_temp.act_as('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000005b1');
select is((select public.delete_my_account('  MEMBER_M ') ->> 'deleted'), 'true', 'xóa thành công khi gõ đúng tên đăng nhập');
reset role;
select is((select count(*)::integer from auth.users where id = '00000000-0000-0000-0000-00000000b001'), 0, 'auth.users đã xóa');
select is(
  (select (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000b001')
        + (select count(*) from public.user_progress where user_id = '00000000-0000-0000-0000-00000000b001')
        + (select count(*) from public.test_attempts where user_id = '00000000-0000-0000-0000-00000000b001')
        + (select count(*) from private.game_history where user_id = '00000000-0000-0000-0000-00000000b001')
        + (select count(*) from private.training_certificates where user_id = '00000000-0000-0000-0000-00000000b001')
        + (select count(*) from private.api_rate_limits where actor_user_id = '00000000-0000-0000-0000-00000000b001'))::integer,
  0, 'hồ sơ, tiến trình, lượt chọn, lịch sử, chứng nhận và dòng giới hạn tốc độ đều đã xóa');
select is(
  (select count(*)::integer from public.test_attempts where user_id = '00000000-0000-0000-0000-00000000b002'), 1,
  'dữ liệu của người dùng khác không bị ảnh hưởng');
select is(
  (select count(*)::integer from private.training_certificates where user_id = '00000000-0000-0000-0000-00000000b002'), 1,
  'chứng nhận của người dùng khác còn nguyên');
select is(
  (select metadata::text from private.security_audit_log where action = 'ACCOUNT_DELETED'),
  '{"runs": 1, "attempts": 2, "certificates": 1}', 'audit xóa tài khoản chỉ lưu số lượng bản ghi');
select ok(
  (select source_ip is null and user_agent is null and actor_user_id is null and actor_session_id is null
          and target_id like 'sha256:%' and target_id !~ 'b001' and target_type = 'account'
     from private.security_audit_log where action = 'ACCOUNT_DELETED'),
  'audit xóa tài khoản không có IP, user-agent, danh tính; mã tài khoản dạng băm');
select is(
  (select count(*)::integer from private.security_audit_log
    where to_jsonb(security_audit_log)::text ~* 'member_m|member\.m@|Nguyễn Văn Minh'),
  0, 'không dòng audit nào chứa email, tên đăng nhập hoặc tên hiển thị của người đã xóa');
set local role anon;
select is((public.verify_training_certificate('CGS-2026-AAAAAAAAAAAAAAAA') ->> 'valid')::boolean, false,
  'chứng nhận đã cấp không còn xác minh được sau khi xóa tài khoản');
select is((public.verify_training_certificate('CGS-2026-BBBBBBBBBBBBBBBB') ->> 'valid')::boolean, true,
  'chứng nhận của người khác vẫn xác minh được');
reset role;

-- ===== Cựu biên tập viên: nội dung đã soạn còn lại, không chặn việc xóa =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000005c1');
select is((select public.delete_my_account('ex_editor') ->> 'deleted'), 'true', 'cựu biên tập viên xóa được tài khoản');
reset role;
select is(
  (select updated_by is null from public.site_content where slug = 'main-draft'), true,
  'nội dung do tài khoản đã xóa soạn được giữ lại, updated_by = NULL');

-- ===== Sau khi hạ quyền thì xóa được =====
-- A2 là quản trị viên còn lại; A1 bị hạ quyền (xóa khỏi app_admins) rồi mới xóa tài khoản.
delete from private.app_admins where user_id = '00000000-0000-0000-0000-00000000a001';
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1', 'aal2');
select is((select public.delete_my_account('admin_one') ->> 'deleted'), 'true', 'quản trị viên đã bị hạ quyền xóa được tài khoản');
reset role;

select * from finish();
rollback;
