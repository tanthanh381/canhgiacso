-- Sau bước post-deploy (supabase/post-deploy/*.sql): đáp án không còn đọc được dưới dạng bảng,
-- nhưng mọi đường dùng hợp lệ (khách, người đăng nhập, quản trị) vẫn hoạt động.
-- Chạy trên CSDL dựng bằng: supabase/tests/bootstrap.sh <db> --post-deploy
begin;
set local search_path = public, extensions;
select plan(15);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@hdbank.test',  now(), '{"username":"admin_a","display_name":"Admin A"}'),
  ('00000000-0000-0000-0000-00000000f001', 'player@hdbank.test', now(), '{"username":"player_p","display_name":"Player P"}');
insert into private.app_admins (user_id) values ('00000000-0000-0000-0000-00000000a001');
insert into auth.sessions (id, user_id) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000a001'),
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-00000000f001');

create function pg_temp.act_as(uid uuid, session_id uuid, aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', aal, 'session_id', session_id)::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.sample_content() returns jsonb language sql as $$
  select jsonb_build_object('version', 1, 'scenarios', jsonb_build_array(
    jsonb_build_object('id', 1, 'title', 'Tình huống 1', 'difficulty', 'Dễ', 'choices', jsonb_build_array(
      jsonb_build_object('text', 'A', 'correct', true,  'moneyDelta', 0,         'awarenessDelta', 5,   'feedback', 'FB-1-0-ALPHA'),
      jsonb_build_object('text', 'B', 'correct', false, 'moneyDelta', -50000000, 'awarenessDelta', -20, 'feedback', 'FB-1-1-BETA'),
      jsonb_build_object('text', 'C', 'correct', false, 'moneyDelta', -30000000, 'awarenessDelta', -10, 'feedback', 'FB-1-2-GAMMA')))
  ))
$$;

insert into public.site_content (slug, content, published, updated_by)
values ('main', pg_temp.sample_content(), true, '00000000-0000-0000-0000-00000000a001');

-- 1. Không còn đường đọc bảng trực tiếp.
select ok(
  not has_table_privilege('anon', 'public.site_content', 'SELECT')
  and not has_table_privilege('authenticated', 'public.site_content', 'SELECT'),
  'anon/authenticated không còn quyền SELECT trên public.site_content');
set local role anon;
select throws_ok($$select content from public.site_content$$, '42501', null, 'anon không đọc được đáp án qua bảng');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000005f1', 'aal1');
select throws_ok($$select content from public.site_content$$, '42501', null, 'người dùng đăng nhập không đọc được đáp án qua bảng');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select throws_ok($$select content from public.site_content$$, '42501', null, 'ngay cả admin cũng không đọc bảng trực tiếp (đi qua RPC)');
reset role;

-- 2. Đường dùng hợp lệ của khách.
set local role anon;
select ok(public.get_public_site_content()::text !~ '"correct"|"moneyDelta"|"awarenessDelta"|"feedback"|FB-',
  'payload công khai không có khóa đáp án');
select is(jsonb_array_length(public.get_public_site_content() -> 'scenarios'), 1, 'khách vẫn tải được nội dung');
select is(public.evaluate_guest_choice(1, 2) ->> 'feedback', 'FB-1-2-GAMMA', 'khách vẫn chấm điểm được qua RPC');
reset role;

-- 3. Người đăng nhập vẫn chơi được (chấm điểm máy chủ).
select pg_temp.act_as('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000005f1', 'aal1');
create temp table run_state as select public.get_game_state() as state;
grant all on run_state to public;
select is(
  (public.submit_game_choice(((select state from run_state) ->> 'run_id')::uuid, 1, 1) ->> 'balance')::integer, 250000000,
  'người đăng nhập vẫn được chấm điểm phía máy chủ');
reset role;
select ok(
  not has_function_privilege('authenticated', 'public.submit_game_choice(uuid,integer,integer,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.submit_game_choice(uuid,integer,integer,jsonb)', 'EXECUTE'),
  'hàm chấm điểm cũ (snapshot từ client) không còn gọi được');
select ok(
  has_function_privilege('authenticated', 'public.submit_game_choice(uuid,integer,integer)', 'EXECUTE'),
  'hàm chấm điểm hiện hành vẫn gọi được');

-- 4. Quản trị vẫn đọc/ghi qua RPC và Dashboard vẫn đọc nội dung.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select is(jsonb_array_length(public.get_managed_site_content()), 1, 'admin đọc nội dung quản trị qua RPC');
select lives_ok($$select public.save_managed_site_content('main-draft', pg_temp.sample_content())$$, 'admin lưu nháp qua RPC');
select lives_ok($$select public.save_managed_site_content('main', pg_temp.sample_content())$$, 'admin xuất bản qua RPC');
select ok(jsonb_array_length(public.get_ciso_dashboard() -> 'scenarios') >= 1, 'Dashboard CISO vẫn đọc được nội dung');
reset role;

-- 5. Idempotent: áp dụng lại post-deploy không lỗi (kiểm tra ở bootstrap/CI bằng cách chạy hai lần).
select ok(to_regprocedure('public.evaluate_guest_choice(integer,integer)') is not null, 'RPC chấm điểm khách còn tồn tại');

select * from finish();
rollback;
