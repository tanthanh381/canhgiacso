-- Xác minh chứng nhận bằng mã: dữ liệu tối thiểu, che tên, chuẩn hóa đầu vào, mã khách,
-- không dò được, mã mới có entropy cao hơn và vẫn xác minh được mã cũ.
begin;
set local search_path = public, extensions;
select plan(34);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000b001', 'secret.email@hdbank.test', now(), '{"username":"member_m","display_name":"Nguyễn Văn Minh"}'),
  ('00000000-0000-0000-0000-00000000f001', 'player@hdbank.test',       now(), '{"username":"player_p","display_name":"Lê Thu"}');
insert into auth.sessions (id, user_id) values
  ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-00000000f001');

-- Chứng nhận CŨ (mã 10 ký tự hex): trigger sẽ nâng mã khi chèn, nên tạm tắt để mô phỏng dữ liệu
-- đã phát hành trước migration.
alter table private.training_certificates disable trigger training_certificates_upgrade_code;
insert into private.training_certificates (id, certificate_code, user_id, run_id, display_name, username, scenario_total, completed, correct, accuracy, score, rating, issued_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'CGS-2026-0123456789', '00000000-0000-0000-0000-00000000b001',
   '00000000-0000-0000-0000-0000000000f1', 'Nguyễn Văn Minh', 'member_m', 40, 40, 38, 95, 4560, 'XUẤT SẮC', '2026-10-02 17:30:00+00');
alter table private.training_certificates enable trigger training_certificates_upgrade_code;

-- ===== Hàm công khai =====
select ok(
  (select prosecdef and provolatile = 'v' and proconfig::text like '%search_path=%'
     from pg_proc where oid = 'public.verify_training_certificate(text)'::regprocedure),
  'verify_training_certificate: SECURITY DEFINER, VOLATILE (chỉ POST nên bị giới hạn tốc độ), cố định search_path');
select ok(
  has_function_privilege('anon', 'public.verify_training_certificate(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.mask_display_name(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.new_certificate_code()', 'EXECUTE'),
  'anon gọi được RPC công khai nhưng không gọi được hàm nội bộ');
select ok(
  not has_table_privilege('anon', 'private.training_certificates', 'SELECT')
  and not has_table_privilege('authenticated', 'private.training_certificates', 'SELECT'),
  'bảng chứng nhận vẫn không đọc trực tiếp được');

set local role anon;

-- ===== Mã hợp lệ =====
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.verify_training_certificate('CGS-2026-0123456789')) k),
  array['accuracy', 'completed', 'issuedOn', 'name', 'rating', 'scenarioTotal', 'valid']::text[],
  'mã hợp lệ chỉ trả 7 trường tối thiểu');
select is((public.verify_training_certificate('CGS-2026-0123456789') ->> 'valid')::boolean, true, 'mã cũ (10 hex) vẫn xác minh được');
select is(public.verify_training_certificate('CGS-2026-0123456789') ->> 'name', 'N*** V*** M***', 'tên hiển thị bị che, chỉ giữ chữ cái đầu');
select is(public.verify_training_certificate('CGS-2026-0123456789') ->> 'issuedOn', '2026-10-03', 'ngày cấp theo múi giờ Việt Nam');
select is(public.verify_training_certificate('CGS-2026-0123456789') ->> 'rating', 'XUẤT SẮC', 'xếp loại');
select is((public.verify_training_certificate('CGS-2026-0123456789') ->> 'accuracy')::integer, 95, 'tỷ lệ đúng');
select is(
  public.verify_training_certificate('CGS-2026-0123456789')::text !~* 'secret\.email|hdbank|member_m|b001|0000000000c1|0000000000f1|run|user|Nguyễn Văn Minh|certificate',
  true, 'kết quả không chứa email, tên đăng nhập, mã tài khoản, run id, certificate id hay tên đầy đủ');
select is((public.verify_training_certificate('  cgs-2026-0123456789 ') ->> 'valid')::boolean, true, 'chấp nhận chữ thường và khoảng trắng đầu cuối');
select is((public.verify_training_certificate('CGS-2026-01234 56789') ->> 'valid')::boolean, true, 'chấp nhận khoảng trắng chen giữa mã (copy từ PDF)');

-- ===== Mã không hợp lệ: luôn trả bình thường (không raise) và cùng một hình dạng =====
select is(public.verify_training_certificate('CGS-2026-FFFFFFFFFF'), '{"valid": false}'::jsonb, 'mã không tồn tại -> {"valid": false}');
select is(public.verify_training_certificate(''), '{"valid": false}'::jsonb, 'chuỗi rỗng');
select is(public.verify_training_certificate(null), '{"valid": false}'::jsonb, 'NULL');
select is(public.verify_training_certificate('hello'), '{"valid": false}'::jsonb, 'sai định dạng');
select is(public.verify_training_certificate('CGS-2026-0123456789'' or 1=1 --'), '{"valid": false}'::jsonb, 'chuỗi kiểu SQL injection chỉ là mã sai');
select is(public.verify_training_certificate('CGS-2026-' || repeat('A', 500)), '{"valid": false}'::jsonb, 'chuỗi quá dài');
select is(public.verify_training_certificate('CGS-2026-%'), '{"valid": false}'::jsonb, 'ký tự đại diện LIKE không khớp gì');
select is(public.verify_training_certificate('CGS-GUEST-ABCDEF1234'), '{"valid": false, "kind": "guest"}'::jsonb, 'mã khách được nhận diện, không bao giờ hợp lệ');
reset role;

-- ===== Che tên =====
select is(private.mask_display_name('An'), 'A***', 'tên một từ');
select is(private.mask_display_name('  Trần   Thị  Nga '), 'T*** T*** N***', 'nhiều khoảng trắng');
select is(private.mask_display_name('a b c d e f'), 'a*** b*** c*** d***', 'tối đa 4 từ');
select is(private.mask_display_name(''), '', 'rỗng');
select is(private.mask_display_name(null), '', 'NULL');

-- ===== Mã mới có entropy cao hơn =====
select ok(private.new_certificate_code() ~ '^CGS-[0-9]{4}-[0-9A-F]{16}$', 'mã mới: 16 ký tự hex (64 bit)');
select isnt(private.new_certificate_code(), private.new_certificate_code(), 'hai mã sinh ra khác nhau');

insert into private.training_certificates (id, certificate_code, user_id, run_id, display_name, username, scenario_total, completed, correct, accuracy, score, rating) values
  ('00000000-0000-0000-0000-0000000000c9', 'CGS-2026-ABCDEF0123', '00000000-0000-0000-0000-00000000b001',
   '00000000-0000-0000-0000-0000000000f9', 'Nguyễn Văn Minh', 'member_m', 10, 10, 10, 100, 1200, 'XUẤT SẮC');
select ok(
  (select certificate_code ~ '^CGS-[0-9]{4}-[0-9A-F]{16}$' and certificate_code <> 'CGS-2026-ABCDEF0123'
     from private.training_certificates where id = '00000000-0000-0000-0000-0000000000c9'),
  'trigger nâng mã dạng cũ (10 hex) của chứng nhận mới lên 16 hex');
insert into private.training_certificates (id, certificate_code, user_id, run_id, display_name, username, scenario_total, completed, correct, accuracy, score, rating) values
  ('00000000-0000-0000-0000-0000000000ca', 'CGS-2026-FEDCBA9876543210', '00000000-0000-0000-0000-00000000b001',
   '00000000-0000-0000-0000-0000000000fa', 'Nguyễn Văn Minh', 'member_m', 10, 10, 10, 100, 1200, 'XUẤT SẮC');
select is(
  (select certificate_code from private.training_certificates where id = '00000000-0000-0000-0000-0000000000ca'),
  'CGS-2026-FEDCBA9876543210', 'mã đã đủ dài được giữ nguyên');

-- ===== Luồng thật: chơi hết bài -> cấp chứng nhận -> xác minh công khai =====
insert into public.site_content (slug, content, published, updated_by)
values ('main', jsonb_build_object('version', 1, 'scenarios', jsonb_build_array(
    jsonb_build_object('id', 1, 'title', 'Tình huống 1', 'difficulty', 'Dễ', 'choices', jsonb_build_array(
      jsonb_build_object('text', 'A', 'correct', true,  'moneyDelta', 0,         'awarenessDelta', 5,   'feedback', 'FB1'),
      jsonb_build_object('text', 'B', 'correct', false, 'moneyDelta', -50000000, 'awarenessDelta', -20, 'feedback', 'FB2'),
      jsonb_build_object('text', 'C', 'correct', false, 'moneyDelta', -30000000, 'awarenessDelta', -10, 'feedback', 'FB3'))),
    jsonb_build_object('id', 2, 'title', 'Tình huống 2', 'difficulty', 'Trung bình', 'choices', jsonb_build_array(
      jsonb_build_object('text', 'A', 'correct', false, 'moneyDelta', -40000000, 'awarenessDelta', -15, 'feedback', 'FB4'),
      jsonb_build_object('text', 'B', 'correct', true,  'moneyDelta', 0,         'awarenessDelta', 5,   'feedback', 'FB5'),
      jsonb_build_object('text', 'C', 'correct', false, 'moneyDelta', -20000000, 'awarenessDelta', -5,  'feedback', 'FB6'))))),
  true, '00000000-0000-0000-0000-00000000f001');

do $$ begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-0000-0000-00000000f001', 'role', 'authenticated',
    'aal', 'aal1', 'session_id', '00000000-0000-0000-0000-0000000005f1')::text, true);
end $$;
set local role authenticated;
create temp table issued as
  with state as (select public.get_game_state() as s),
       p1 as (select public.submit_game_choice(((select s from state) ->> 'run_id')::uuid, 1, 0) as s),
       p2 as (select public.submit_game_choice(((select s from state) ->> 'run_id')::uuid, 2, 1) as s)
  select public.issue_training_certificate(((select s from state) ->> 'run_id')::uuid) as certificate
  from p1, p2;
grant all on issued to public;
select ok((select certificate ->> 'certificateCode' ~ '^CGS-[0-9]{4}-[0-9A-F]{16}$' from issued),
  'chứng nhận cấp qua luồng thật có mã 16 hex');
reset role;

set local role anon;
select is(
  (public.verify_training_certificate((select certificate ->> 'certificateCode' from issued)) ->> 'name'),
  'L*** T***', 'mã vừa cấp xác minh được; tên bị che');
select is(
  (public.verify_training_certificate((select certificate ->> 'certificateCode' from issued)) ->> 'completed')::integer,
  2, 'số tình huống đã hoàn thành');
select is(
  (public.verify_training_certificate(lower((select certificate ->> 'certificateCode' from issued))) ->> 'valid')::boolean,
  true, 'xác minh không phân biệt hoa thường');
reset role;

-- ===== Giới hạn tốc độ: route có trong hook, đếm được vì lệnh gọi trả bình thường =====
delete from private.api_rate_limits;
do $$
begin
  perform set_config('request.method', 'POST', true);
  perform set_config('request.path', '/rpc/verify_training_certificate', true);
  perform set_config('request.headers', '{"cf-connecting-ip":"198.51.100.20"}', true);
  for i in 1..30 loop
    perform private.data_api_pre_request();
  end loop;
end $$;
select throws_ok($$select private.data_api_pre_request()$$, 'PGRST', null,
  'lượt xác minh thứ 31 trong 5 phút từ cùng IP bị 429');

select * from finish();
rollback;
