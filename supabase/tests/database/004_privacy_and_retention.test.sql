-- Quyền riêng tư của giới hạn tốc độ (không còn IP thô) và chính sách lưu trữ dữ liệu kỹ thuật.
begin;
set local search_path = public, extensions;
select plan(33);

-- ===== Cấu trúc: không còn cột IP thô =====
select is(
  (select count(*)::integer from information_schema.columns
    where table_schema = 'private' and table_name = 'api_rate_limits' and column_name = 'source_ip'),
  0, 'private.api_rate_limits không còn cột source_ip (IP thô)');
select is(
  (select data_type from information_schema.columns
    where table_schema = 'private' and table_name = 'api_rate_limits' and column_name = 'source_ip_hash'),
  'text', 'private.api_rate_limits có cột source_ip_hash');
select ok(
  (select char_length(value) >= 32 from private.security_settings where key = 'ip_hash_secret'),
  'khóa muối đã được sinh trong CSDL (không nằm trong repo)');
select is(
  (select value from private.security_settings where key = 'trusted_ip_header'),
  'cf-connecting-ip', 'header IP được tin mặc định là cf-connecting-ip');

-- ===== Hook giới hạn tốc độ: chỉ ghi mã băm =====
-- Hook là SECURITY DEFINER nên logic không phụ thuộc vai trò gọi; kiểm thử chạy bằng vai trò
-- chủ sở hữu. (PostgREST chạy hook sau khi chuyển sang vai trò yêu cầu, nên anon/authenticated
-- cần EXECUTE trên hàm và USAGE trên schema private: xem phần 0 của verification/production-checks.sql.)
select ok(
  has_function_privilege('anon', 'private.data_api_pre_request()', 'EXECUTE')
  and has_function_privilege('authenticated', 'private.data_api_pre_request()', 'EXECUTE')
  and has_function_privilege('authenticator', 'private.data_api_pre_request()', 'EXECUTE'),
  'các vai trò API vẫn được EXECUTE hook giới hạn tốc độ');
create function pg_temp.request(path text, headers jsonb, method text default 'POST') returns void
language plpgsql as $$
begin
  perform set_config('request.method', method, true);
  perform set_config('request.path', path, true);
  perform set_config('request.headers', headers::text, true);
end $$;

delete from private.api_rate_limits;

select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"cf-connecting-ip":"203.0.113.7"}');
select lives_ok($$select private.data_api_pre_request()$$, 'hook chạy được');
select lives_ok($$select private.data_api_pre_request()$$, 'hook chạy lại cho cùng IP');

select is((select count(*)::integer from private.api_rate_limits), 2, 'hai yêu cầu -> hai dòng');
select ok(
  (select bool_and(source_ip_hash ~ '^[0-9a-f]{64}$') from private.api_rate_limits),
  'source_ip_hash là SHA-256 dạng hex 64 ký tự');
select is(
  (select count(distinct source_ip_hash)::integer from private.api_rate_limits), 1,
  'cùng IP trong cùng ngày cho cùng mã băm (đủ để giới hạn tốc độ)');
select ok(
  not exists (select 1 from private.api_rate_limits r where to_jsonb(r)::text like '%203.0.113.7%'),
  'IP thô không xuất hiện ở bất kỳ cột nào của bảng giới hạn tốc độ');

select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"cf-connecting-ip":"203.0.113.8"}');
select lives_ok($$select private.data_api_pre_request()$$, 'hook chạy với IP khác');
select is(
  (select count(distinct source_ip_hash)::integer from private.api_rate_limits), 2,
  'IP khác cho mã băm khác');

-- Chỉ tin header do nền tảng đặt: x-forwarded-for do client điều khiển nên bị bỏ qua.
select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"x-forwarded-for":"198.51.100.9, 10.0.0.1"}');
select lives_ok($$select private.data_api_pre_request()$$, 'chỉ có x-forwarded-for: hook không lỗi');
select is((select count(*)::integer from private.api_rate_limits), 3, 'x-forwarded-for một mình không tạo dòng mới (không được tin)');

select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"cf-connecting-ip":"203.0.113.7","x-forwarded-for":"198.51.100.9"}');
select is(
  private.request_source_ip_hash(),
  (select source_ip_hash from private.api_rate_limits order by id limit 1),
  'có cả hai header: dùng cf-connecting-ip, bỏ qua x-forwarded-for giả mạo');

update private.security_settings set value = 'x-real-ip' where key = 'trusted_ip_header';
select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"x-real-ip":"203.0.113.7","cf-connecting-ip":"203.0.113.99"}');
select is(
  private.request_source_ip_hash(),
  (select source_ip_hash from private.api_rate_limits order by id limit 1),
  'đổi cài đặt trusted_ip_header sang x-real-ip có hiệu lực');
update private.security_settings set value = 'cf-connecting-ip' where key = 'trusted_ip_header';

-- Phương thức GET và route không giới hạn không bị ghi.
delete from private.api_rate_limits;
select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"cf-connecting-ip":"203.0.113.7"}', 'GET');
select lives_ok($$select private.data_api_pre_request()$$, 'GET không bị giới hạn');
select pg_temp.request('/rpc/get_public_site_content', '{"cf-connecting-ip":"203.0.113.7"}');
select lives_ok($$select private.data_api_pre_request()$$, 'route ngoài danh sách không bị giới hạn');
select is((select count(*)::integer from private.api_rate_limits), 0, 'GET và route ngoài danh sách không ghi dòng nào');

-- ===== Giới hạn tốc độ vẫn hiệu lực =====
select pg_temp.request('/rpc/set_content_manager_role', '{"cf-connecting-ip":"192.0.2.50"}');
do $$
begin
  for i in 1..10 loop
    perform private.data_api_pre_request();
  end loop;
end $$;
select throws_ok($$select private.data_api_pre_request()$$, 'PGRST', null,
  'yêu cầu thứ 11 tới set_content_manager_role bị 429 (PGRST)');
select pg_temp.request('/rpc/set_content_manager_role', '{"cf-connecting-ip":"192.0.2.51"}');
select lives_ok($$select private.data_api_pre_request()$$, 'IP khác không bị ảnh hưởng');

-- Giới hạn khách chấm điểm: 300/5 phút (mạng nội bộ dùng chung một IP), không còn 60.
select pg_temp.request('/rpc/evaluate_guest_choice', '{"cf-connecting-ip":"192.0.2.60"}');
insert into private.api_rate_limits (source_ip_hash, route)
select private.request_source_ip_hash(), 'rpc/evaluate_guest_choice' from generate_series(1, 100);
select lives_ok($$select private.data_api_pre_request()$$, '100 lượt chấm điểm khách trong 5 phút vẫn được phép');
insert into private.api_rate_limits (source_ip_hash, route)
select private.request_source_ip_hash(), 'rpc/evaluate_guest_choice' from generate_series(1, 199);
select throws_ok($$select private.data_api_pre_request()$$, 'PGRST', null, 'từ lượt thứ 301 bị giới hạn');

-- ===== Dọn dữ liệu hết hạn =====
delete from private.api_rate_limits;
insert into private.api_rate_limits (source_ip_hash, route, request_at)
select repeat('a', 64), 'rpc/x', now() - interval '25 hours' from generate_series(1, 25);
insert into private.api_rate_limits (source_ip_hash, route, request_at)
select repeat('b', 64), 'rpc/x', now() - interval '23 hours' from generate_series(1, 5);

select is(
  (select (private.purge_expired_security_data(10, 1) ->> 'api_rate_limits')::integer), 10,
  'dọn theo lô: một lô tối đa batch_size dòng');
select is((select count(*)::integer from private.api_rate_limits), 20, 'sau lô đầu còn 20 dòng');
select is(
  (select (private.purge_expired_security_data(10, 5) ->> 'api_rate_limits')::integer), 15,
  'nhiều lô xóa nốt các dòng quá 24 giờ');
select is((select count(*)::integer from private.api_rate_limits where source_ip_hash = repeat('b', 64)), 5,
  'dòng chưa quá 24 giờ được giữ lại');

insert into private.web_analytics_sessions (session_id, first_seen, last_seen, entry_path, last_path) values
  ('00000000-0000-0000-0000-0000000d0001', now() - interval '15 months', now() - interval '14 months', '/', '/'),
  ('00000000-0000-0000-0000-0000000d0002', now() - interval '15 months', now() - interval '1 day', '/', '/'),
  ('00000000-0000-0000-0000-0000000d0003', now() - interval '1 day', now(), '/', '/');
insert into private.web_analytics_pageviews (session_id, path, viewed_at) values
  ('00000000-0000-0000-0000-0000000d0001', '/', now() - interval '14 months'),
  ('00000000-0000-0000-0000-0000000d0002', '/', now() - interval '14 months'),
  ('00000000-0000-0000-0000-0000000d0002', '/b', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000d0003', '/', now());
select is(
  (select (private.purge_expired_security_data() ->> 'web_analytics_sessions')::integer), 1,
  'xóa phiên analytics quá 13 tháng');
select is(
  (select count(*)::integer from private.web_analytics_sessions where session_id::text like '00000000-0000-0000-0000-0000000d000%'), 2,
  'phiên còn hoạt động được giữ');
select is(
  (select count(*)::integer from private.web_analytics_pageviews where session_id::text like '00000000-0000-0000-0000-0000000d000%'), 2,
  'pageview quá 13 tháng bị xóa (kể cả của phiên còn hoạt động), pageview mới được giữ');

-- Dọn cơ hội ngay trong hook (xác suất ép = 1 để kiểm thử xác định).
insert into private.api_rate_limits (source_ip_hash, route, request_at)
select repeat('c', 64), 'rpc/x', now() - interval '30 hours' from generate_series(1, 7);
do $$ begin perform set_config('cgs.purge_probability', '1', true); end $$;
select pg_temp.request('/rpc/record_web_analytics_event_v4', '{"cf-connecting-ip":"192.0.2.70"}');
select lives_ok($$select private.data_api_pre_request()$$, 'hook chạy kèm dọn cơ hội');
select is((select count(*)::integer from private.api_rate_limits where source_ip_hash = repeat('c', 64)), 0,
  'dọn cơ hội trong hook xóa dòng quá hạn');

select * from finish();
rollback;
