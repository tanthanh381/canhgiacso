-- Đặc quyền chỉ dành cho email ĐÃ XÁC NHẬN; danh sách miền; nhật ký kiểm toán đổi quyền.
begin;
set local search_path = public, extensions;
select plan(29);

-- Dữ liệu thử (rollback ở cuối). Admin A, Editor E, thành viên đã xác nhận M/H, chưa xác nhận U.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@hdbank.test',   now(),  '{"username":"admin_a","display_name":"Admin A"}'),
  ('00000000-0000-0000-0000-00000000e001', 'editor@hdbank.test',  now(),  '{"username":"editor_e","display_name":"Editor E"}'),
  ('00000000-0000-0000-0000-00000000b001', 'member@other.test',   now(),  '{"username":"member_m","display_name":"Member M"}'),
  ('00000000-0000-0000-0000-00000000b002', 'member2@hdbank.test', now(),  '{"username":"member_h","display_name":"Member H"}'),
  ('00000000-0000-0000-0000-00000000c001', 'victim@hdbank.test',  null,   '{"username":"squatter","display_name":"Squatter"}');
insert into private.app_admins (user_id) values ('00000000-0000-0000-0000-00000000a001');
insert into private.app_editors (user_id) values ('00000000-0000-0000-0000-00000000e001');
insert into auth.sessions (id, user_id) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000a001'),
  ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-00000000e001'),
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-00000000c001');

create function pg_temp.act_as(uid uuid, session_id uuid, aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', aal, 'session_id', session_id)::text, true);
  execute 'set local role authenticated';
end $$;

-- 1. Hàm kiểm quyền: admin/editor hợp lệ vẫn qua.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select ok((select private.user_is_app_admin()), 'admin đã xác nhận email + AAL2 vẫn là admin (không bị khóa)');
select ok((select private.user_can_edit_content()), 'admin vẫn có quyền soạn nội dung');
select is((select public.get_content_management_role()), 'admin', 'khám phá vai trò trả admin');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1');
select ok((select private.user_can_edit_content()) and not (select private.user_is_app_admin()), 'editor đã xác nhận vẫn soạn được, không phải admin');
reset role;

-- 2. Cấp quyền cho email CHƯA xác nhận bị từ chối bằng mã riêng CG001; không ghi thay đổi.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000c001', 'editor')$$,
  'CG001', null, 'cấp editor cho email chưa xác nhận bị từ chối (CG001)');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000c001', 'admin')$$,
  'CG001', null, 'cấp admin cho email chưa xác nhận bị từ chối (CG001)');
reset role;
select is((select count(*)::integer from private.app_editors where user_id = '00000000-0000-0000-0000-00000000c001'), 0,
  'tài khoản chưa xác nhận không có dòng editor');

-- 3. Cấp quyền cho email đã xác nhận thành công và ghi audit.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select is((select public.set_content_manager_role('00000000-0000-0000-0000-00000000b001', 'editor') ->> 'role'), 'editor',
  'cấp editor cho email đã xác nhận thành công, giữ nguyên dạng kết quả {userId,email,role}');
reset role;
select is(
  (select metadata ->> 'change' from private.security_audit_log
    where action = 'ROLE_CHANGED' and target_id = '00000000-0000-0000-0000-00000000b001' order by id desc limit 1),
  'grant', 'ROLE_CHANGED được ghi cho lần cấp quyền');
select is(
  (select actor_user_id::text from private.security_audit_log
    where action = 'ROLE_CHANGED' and target_id = '00000000-0000-0000-0000-00000000b001' order by id desc limit 1),
  '00000000-0000-0000-0000-00000000a001', 'audit ghi đúng người thực hiện');

-- 4. Thu hồi quyền luôn được phép, kể cả khi email sau đó mất xác nhận; ghi audit.
update auth.users set email_confirmed_at = null where id = '00000000-0000-0000-0000-00000000b001';
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select is((select public.set_content_manager_role('00000000-0000-0000-0000-00000000b001', 'member') ->> 'role'), 'member',
  'thu hồi quyền của tài khoản email chưa xác nhận vẫn thành công');
reset role;
select is(
  (select metadata ->> 'change' from private.security_audit_log
    where action = 'ROLE_CHANGED' and target_id = '00000000-0000-0000-0000-00000000b001' order by id desc limit 1),
  'revoke', 'ROLE_CHANGED được ghi cho lần thu hồi quyền');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000b001';

-- 5. Tài khoản đặc quyền mất xác nhận email không còn quyền (chống chiếm email).
update auth.users set email_confirmed_at = null where id = '00000000-0000-0000-0000-00000000e001';
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1');
select ok(not (select private.user_can_edit_content()), 'editor có email chưa xác nhận không còn quyền soạn nội dung');
select is((select public.get_content_management_role()), null, 'khám phá vai trò trả NULL cho tài khoản đặc quyền chưa xác nhận email');
reset role;
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000e001';

-- 6. Quy tắc cũ được giữ nguyên.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000a001', 'member')$$,
  '42501', null, 'admin không tự hạ quyền của mình');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000b002', 'superuser')$$,
  '22023', null, 'vai trò không hợp lệ bị từ chối');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-0000000fffff', 'editor')$$,
  'P0002', null, 'người dùng không tồn tại bị từ chối');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1', 'aal1');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000b002', 'editor')$$,
  '42501', null, 'admin ở AAL1 (chưa MFA) không đổi được quyền');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000b002', 'editor')$$,
  '42501', null, 'editor không đổi được quyền');
reset role;

-- 7. Danh sách quản trị trả email_confirmed cho từng tài khoản.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select is(
  (select (u ->> 'email_confirmed')::boolean
     from jsonb_array_elements(public.get_content_management_access() -> 'users') u
    where u ->> 'id' = '00000000-0000-0000-0000-00000000c001'),
  false, 'get_content_management_access trả email_confirmed=false cho tài khoản chưa xác nhận');
select is((public.get_content_management_access() ->> 'email_confirmed')::boolean, true,
  'get_content_management_access trả email_confirmed của người gọi');
reset role;

-- 8. Danh sách miền được phép: rỗng = không giới hạn; có dòng = chỉ các miền đó.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select is((select public.get_privileged_email_domains()), '[]'::jsonb, 'danh sách miền mặc định rỗng (không giới hạn)');
select is((select public.set_privileged_email_domain('@HDBank.test ', true)), '["hdbank.test"]'::jsonb,
  'thêm miền được chuẩn hóa chữ thường, bỏ @');
select throws_ok(
  $$select public.set_content_manager_role('00000000-0000-0000-0000-00000000b001', 'editor')$$,
  'CG002', null, 'email ngoài danh sách miền bị từ chối (CG002)');
select is((select public.set_content_manager_role('00000000-0000-0000-0000-00000000b002', 'editor') ->> 'role'), 'editor',
  'email thuộc miền được phép nhận quyền');
select throws_ok(
  $$select public.set_privileged_email_domain('not a domain', true)$$,
  '22023', null, 'miền không hợp lệ bị từ chối');
select is((select public.set_privileged_email_domain('hdbank.test', false)), '[]'::jsonb, 'xóa miền đưa danh sách về rỗng');
reset role;
select ok(
  exists (select 1 from private.security_audit_log where action = 'PRIVILEGED_EMAIL_DOMAIN_CHANGED' and target_id = 'hdbank.test'),
  'thay đổi danh sách miền được ghi audit');
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1');
select throws_ok(
  $$select public.set_privileged_email_domain('evil.test', true)$$,
  '42501', null, 'editor không đổi được danh sách miền');
reset role;

select * from finish();
rollback;
