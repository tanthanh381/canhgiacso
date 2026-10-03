-- Nội dung/đáp án: RPC chấm điểm khách chỉ trả MỘT lựa chọn, không ghi trực tiếp site_content,
-- kiểm tra cấu trúc điểm số khi lưu, nhật ký kiểm toán nội dung, chấm điểm máy chủ vẫn đúng.
begin;
set local search_path = public, extensions;
select plan(32);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@hdbank.test',  now(), '{"username":"admin_a","display_name":"Admin A"}'),
  ('00000000-0000-0000-0000-00000000e001', 'editor@hdbank.test', now(), '{"username":"editor_e","display_name":"Editor E"}'),
  ('00000000-0000-0000-0000-00000000f001', 'player@hdbank.test', now(), '{"username":"player_p","display_name":"Player P"}');
insert into private.app_admins (user_id) values ('00000000-0000-0000-0000-00000000a001');
insert into private.app_editors (user_id) values ('00000000-0000-0000-0000-00000000e001');
insert into auth.sessions (id, user_id) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000a001'),
  ('00000000-0000-0000-0000-0000000005e1', '00000000-0000-0000-0000-00000000e001'),
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
      jsonb_build_object('text', 'C', 'correct', false, 'moneyDelta', -30000000, 'awarenessDelta', -10, 'feedback', 'FB-1-2-GAMMA'))),
    jsonb_build_object('id', 2, 'title', 'Tình huống 2', 'difficulty', 'Trung bình', 'choices', jsonb_build_array(
      jsonb_build_object('text', 'A', 'correct', false, 'moneyDelta', -40000000, 'awarenessDelta', -15, 'feedback', 'FB-2-0-DELTA'),
      jsonb_build_object('text', 'B', 'correct', true,  'moneyDelta', 0,         'awarenessDelta', 5,   'feedback', 'FB-2-1-EPSILON'),
      jsonb_build_object('text', 'C', 'correct', false, 'moneyDelta', -20000000, 'awarenessDelta', -5,  'feedback', 'FB-2-2-ZETA')))
  ))
$$;

insert into public.site_content (slug, content, published, updated_by)
values ('main', pg_temp.sample_content(), true, '00000000-0000-0000-0000-00000000a001');

-- ===== RPC chấm điểm khách (anon) =====
set local role anon;
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.evaluate_guest_choice(1, 0)) k),
  array['awarenessDelta', 'choiceIndex', 'correct', 'feedback', 'moneyDelta', 'scenarioId']::text[],
  'evaluate_guest_choice chỉ trả đúng 6 trường kết quả của MỘT lựa chọn'
);
select is((public.evaluate_guest_choice(1, 0) ->> 'correct')::boolean, true, 'lựa chọn an toàn được chấm đúng');
select is((public.evaluate_guest_choice(1, 1) ->> 'moneyDelta')::integer, -50000000, 'mức thiệt hại của lựa chọn rủi ro đúng');
select is(public.evaluate_guest_choice(1, 1) ->> 'feedback', 'FB-1-1-BETA', 'phản hồi đúng lựa chọn được chọn');
select ok(
  public.evaluate_guest_choice(1, 1)::text !~ 'FB-1-0-ALPHA|FB-1-2-GAMMA|FB-2-',
  'kết quả không chứa phản hồi/đáp án của các lựa chọn hoặc tình huống khác'
);
select throws_ok($$select public.evaluate_guest_choice(1, 3)$$, '22023', null, 'chỉ số lựa chọn ngoài 0..2 bị từ chối');
select throws_ok($$select public.evaluate_guest_choice(99, 0)$$, '22023', null, 'tình huống không tồn tại bị từ chối');
select ok(
  public.get_public_site_content()::text !~ '"correct"|"moneyDelta"|"awarenessDelta"|"feedback"|FB-',
  'get_public_site_content không chứa khóa hay nội dung đáp án'
);
select is(
  jsonb_array_length(public.get_public_site_content() -> 'scenarios' -> 0 -> 'choices'), 3,
  'payload công khai vẫn đủ 3 lựa chọn (chỉ gỡ đáp án)'
);
select throws_ok($$select private.evaluate_choice(1, 0)$$, '42501', null, 'anon không gọi được hàm chấm điểm nội bộ');
reset role;

-- Nội dung thiếu mức thay đổi: fail-closed, không để "(null)::integer" làm bật số dư.
update public.site_content
set content = jsonb_set(content, '{scenarios,0,choices,1}', (content #> '{scenarios,0,choices,1}') - 'moneyDelta')
where slug = 'main';
set local role anon;
select throws_ok($$select public.evaluate_guest_choice(1, 1)$$, '22023', null, 'lựa chọn thiếu moneyDelta bị từ chối thay vì chấm sai');
reset role;
update public.site_content set content = pg_temp.sample_content() where slug = 'main';

-- ===== Không ghi trực tiếp site_content =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select throws_ok(
  $$insert into public.site_content (slug, content, published, updated_by) values ('direct', '{"scenarios":[]}', false, '00000000-0000-0000-0000-00000000a001')$$,
  '42501', null, 'admin AAL2 không INSERT trực tiếp được');
select throws_ok(
  $$update public.site_content set published = false where slug = 'main'$$,
  '42501', null, 'admin AAL2 không UPDATE trực tiếp được');
select throws_ok(
  $$delete from public.site_content where slug = 'main'$$,
  '42501', null, 'admin AAL2 không DELETE trực tiếp được');
reset role;

-- ===== Lưu/xuất bản qua RPC: kiểm tra cấu trúc + audit =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000005e1');
select lives_ok(
  $$select public.save_managed_site_content('main-draft', pg_temp.sample_content())$$,
  'editor lưu bản nháp qua RPC');
select throws_ok(
  $$select public.save_managed_site_content('main', pg_temp.sample_content())$$,
  '42501', null, 'editor không xuất bản được');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000005a1');
select lives_ok(
  $$select public.save_managed_site_content('main', pg_temp.sample_content())$$,
  'admin xuất bản qua RPC');
select throws_ok(
  $$select public.save_managed_site_content('other', pg_temp.sample_content())$$,
  '22023', null, 'slug không hợp lệ bị từ chối');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,0,choices,1}', (pg_temp.sample_content() #> '{scenarios,0,choices,1}') - 'moneyDelta'))$$,
  '22023', null, 'thiếu moneyDelta bị từ chối khi lưu');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,0,choices,1,moneyDelta}', '1.5'))$$,
  '22023', null, 'moneyDelta không phải số nguyên bị từ chối');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,0,choices,1,correct}', 'true'))$$,
  '22023', null, 'hai đáp án đúng bị từ chối');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,0,choices,2,feedback}', '""'))$$,
  '22023', null, 'phản hồi rỗng bị từ chối');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,1,id}', '1'))$$,
  '22023', null, 'id tình huống trùng bị từ chối');
select throws_ok(
  $$select public.save_managed_site_content('main-draft', jsonb_set(pg_temp.sample_content(), '{scenarios,0,difficulty}', '"Siêu khó"'))$$,
  '22023', null, 'độ khó không hợp lệ bị từ chối');
select ok(
  jsonb_array_length(public.get_managed_site_content()) = 2,
  'get_managed_site_content trả bản đang đăng và bản nháp cho admin');
reset role;

select ok(
  exists (select 1 from private.security_audit_log where action = 'CONTENT_DRAFT_SAVED' and target_id = 'main-draft'
            and actor_user_id = '00000000-0000-0000-0000-00000000e001')
  and exists (select 1 from private.security_audit_log where action = 'CONTENT_PUBLISHED' and target_id = 'main'
            and actor_user_id = '00000000-0000-0000-0000-00000000a001'),
  'lưu nháp và xuất bản đều để lại dòng audit qua RPC công khai'
);
select is(
  (select count(*)::integer from private.security_audit_log where action = 'CONTENT_PUBLISHED'), 1,
  'chỉ lần xuất bản thành công của admin được ghi (lần bị từ chối thì không)'
);

-- ===== Chấm điểm máy chủ cho người đăng nhập vẫn đúng =====
select pg_temp.act_as('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000005f1', 'aal1');
create temp table run_state as select public.get_game_state() as state;
grant all on run_state to public;
select is(((select state from run_state) ->> 'balance')::integer, 300000000, 'người chơi mới bắt đầu với 300.000.000');
create temp table after_wrong as
  select public.submit_game_choice(((select state from run_state) ->> 'run_id')::uuid, 1, 1) as state;
grant all on after_wrong to public;
select is(((select state from after_wrong) ->> 'balance')::integer, 250000000, 'chọn sai trừ đúng mức thiệt hại phía máy chủ');
select is(
  (public.submit_game_choice(((select state from run_state) ->> 'run_id')::uuid, 1, 1) ->> 'balance')::integer, 250000000,
  'gửi lại cùng đáp án không trừ lần hai (idempotent)');
select is(
  (select jsonb_array_length(public.submit_game_choice(((select state from run_state) ->> 'run_id')::uuid, 2, 1) -> 'results')),
  2, 'sau tình huống Dễ có thể làm tình huống Trung bình');
select throws_ok(
  $$select public.submit_game_choice(gen_random_uuid(), 2, 0)$$,
  '22023', null, 'run_id cũ bị từ chối');
reset role;

select * from finish();
rollback;
