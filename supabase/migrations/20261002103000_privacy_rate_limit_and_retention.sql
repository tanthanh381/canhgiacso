-- Quyền riêng tư của giới hạn tốc độ + chính sách lưu trữ dữ liệu kỹ thuật.
--
-- Vấn đề (trước migration này):
--   * private.data_api_pre_request() chèn IP THÔ (source_ip inet) và actor_user_id vào
--     private.api_rate_limits mỗi lần gọi record_web_analytics_event_v4 (heartbeat) và
--     các RPC khác. Chỉ có lệnh delete các dòng cũ của chính IP đang gọi, không có job
--     dọn, nên IP không quay lại được lưu vô thời hạn và bảng phình theo heartbeat.
--   * Tài liệu và giao diện nói "không lưu IP".
--   * private.request_source_ip() tin phần tử đầu của x-forwarded-for (client có thể
--     điều khiển) khi không có cf-connecting-ip.
--   * private.web_analytics_* không có chính sách lưu trữ.
--
-- Nội dung:
--   1. private.security_settings: khóa muối (sinh ngẫu nhiên NGAY TRONG CSDL lúc áp
--      dụng migration, không có trong repo) và tên header IP được tin.
--   2. private.request_source_ip(): chỉ tin MỘT header do nền tảng đặt (mặc định
--      cf-connecting-ip), bỏ x-forwarded-for.
--   3. private.request_source_ip_hash(): SHA-256(khóa muối : ngày UTC : IP). Muối kèm
--      ngày nên không liên kết được IP giữa các ngày; chỉ dùng cho giới hạn tốc độ.
--   4. private.api_rate_limits: XÓA dữ liệu cũ (IP thô, là dữ liệu kỹ thuật tạm thời),
--      thêm source_ip_hash, bỏ cột source_ip.
--   5. private.purge_expired_security_data(): xóa api_rate_limits > 24 giờ và
--      private.web_analytics_* > 13 tháng, theo lô.
--   6. Hook giới hạn tốc độ dùng mã băm, dọn cơ hội (xác suất ~1%, một lô nhỏ), tăng
--      giới hạn rpc/evaluate_guest_choice 60 -> 300 mỗi 5 phút/IP (mạng nội bộ dùng chung
--      một IP), thêm route cho RPC quản lý miền và nhật ký MFA.
--   7. Lên lịch pg_cron hằng giờ nếu có sẵn (không bắt buộc).
--
-- Nhật ký kiểm toán private.security_audit_log vẫn ghi IP của người dùng ĐẶC QUYỀN khi
-- họ thực hiện hành động quản trị (mục đích an ninh); không thuộc phạm vi dọn tự động.
-- Idempotent: chạy lại an toàn (chỉ dọn bảng giới hạn tốc độ ở lần chạy đầu tiên).

-- 1. Cài đặt riêng tư --------------------------------------------------------------
create table if not exists private.security_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  constraint security_settings_key_format check (key ~ '^[a-z0-9_]{1,64}$')
);

alter table private.security_settings enable row level security;
revoke all on table private.security_settings from public, anon, authenticated;

drop policy if exists security_settings_no_direct_access on private.security_settings;
create policy security_settings_no_direct_access
on private.security_settings
for all
to anon, authenticated
using (false)
with check (false);

-- Khóa muối được sinh tại đây (244 bit ngẫu nhiên); on conflict do nothing nên chạy lại
-- không làm xoay khóa. Xoay khóa: update private.security_settings set value = ... .
insert into private.security_settings (key, value)
values
  ('ip_hash_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
  ('trusted_ip_header', 'cf-connecting-ip')
on conflict (key) do nothing;

-- 2. Nguồn IP của yêu cầu ------------------------------------------------------------
-- Chỉ tin header do nền tảng đặt. Mặc định cf-connecting-ip (Cloudflare ghi đè giá trị
-- do client gửi). x-forwarded-for KHÔNG được tin vì phần tử đầu có thể do client đặt.
-- Giới hạn: nếu nền tảng không đặt header này thì không xác định được IP và giới hạn tốc
-- độ không áp dụng (fail-open); đổi header bằng cách cập nhật 'trusted_ip_header'.
create or replace function private.request_source_ip()
returns inet
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  headers jsonb;
  header_name text;
  raw_ip text;
begin
  begin
    headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    return null;
  end;

  select lower(btrim(value)) into header_name
  from private.security_settings
  where key = 'trusted_ip_header';
  if header_name is null or header_name !~ '^[a-z0-9-]{1,64}$' then
    header_name := 'cf-connecting-ip';
  end if;

  raw_ip := nullif(btrim(coalesce(headers->>header_name, '')), '');
  if raw_ip is null then return null; end if;

  begin
    return raw_ip::inet;
  exception when others then
    return null;
  end;
end;
$$;
revoke execute on function private.request_source_ip() from public, anon, authenticated;

-- 3. Mã băm muối của IP --------------------------------------------------------------
create or replace function private.request_source_ip_hash()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ip inet := private.request_source_ip();
  secret text;
  day_bucket text := (extract(epoch from (now() at time zone 'utc'))::bigint / 86400)::text;
begin
  if ip is null then return null; end if;
  select value into secret from private.security_settings where key = 'ip_hash_secret';
  -- Nếu khóa bị xóa nhầm, vẫn băm (muối rỗng) thay vì tắt giới hạn tốc độ.
  return encode(
    pg_catalog.sha256(convert_to(coalesce(secret, '') || ':' || day_bucket || ':' || host(ip), 'UTF8')),
    'hex'
  );
end;
$$;
revoke execute on function private.request_source_ip_hash() from public, anon, authenticated;

-- 4. Bảng giới hạn tốc độ: bỏ IP thô --------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'private'
      and table_name = 'api_rate_limits'
      and column_name = 'source_ip'
  ) then
    -- Dữ liệu cửa sổ giới hạn tốc độ chỉ có ý nghĩa trong vài phút; xóa toàn bộ IP thô cũ.
    truncate table private.api_rate_limits;
  end if;
end
$$;

alter table private.api_rate_limits add column if not exists source_ip_hash text;
-- Bỏ cột source_ip cũng xóa luôn chỉ mục api_rate_limits_lookup_idx cũ phụ thuộc vào nó.
alter table private.api_rate_limits drop column if exists source_ip;
alter table private.api_rate_limits alter column source_ip_hash set not null;

create index if not exists api_rate_limits_lookup_idx
  on private.api_rate_limits (route, source_ip_hash, request_at desc);
create index if not exists api_rate_limits_request_at_idx
  on private.api_rate_limits (request_at);

-- Dọn dữ liệu phân tích dùng sẵn các chỉ mục web_analytics_sessions_last_seen_idx và
-- web_analytics_pageviews_viewed_at_idx (tạo ở migration realtime_web_analytics).

-- 5. Dọn dữ liệu hết hạn ----------------------------------------------------------------
-- Giữ: api_rate_limits 24 giờ; web_analytics_* 13 tháng (cửa sổ dashboard tối đa 90 ngày).
-- Mỗi lô tối đa batch_size dòng/bảng, tối đa max_batches lô; dùng skip locked để không
-- chờ các dòng đang được ghi.
create or replace function private.purge_expired_security_data(
  batch_size integer default 5000,
  max_batches integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rate_cutoff timestamptz := clock_timestamp() - interval '24 hours';
  analytics_cutoff timestamptz := clock_timestamp() - interval '13 months';
  affected integer;
  batch integer;
  rate_deleted bigint := 0;
  pageviews_deleted bigint := 0;
  sessions_deleted bigint := 0;
begin
  batch_size := greatest(1, least(coalesce(batch_size, 5000), 50000));
  max_batches := greatest(1, least(coalesce(max_batches, 10), 100));

  for batch in 1..max_batches loop
    delete from private.api_rate_limits
    where id in (
      select id from private.api_rate_limits
      where request_at < rate_cutoff
      order by request_at
      limit batch_size
      for update skip locked
    );
    get diagnostics affected = row_count;
    rate_deleted := rate_deleted + affected;
    exit when affected < batch_size;
  end loop;

  for batch in 1..max_batches loop
    delete from private.web_analytics_pageviews
    where id in (
      select id from private.web_analytics_pageviews
      where viewed_at < analytics_cutoff
      order by viewed_at
      limit batch_size
      for update skip locked
    );
    get diagnostics affected = row_count;
    pageviews_deleted := pageviews_deleted + affected;
    exit when affected < batch_size;
  end loop;

  -- Xóa phiên cũ kéo theo pageview còn lại của phiên (ON DELETE CASCADE).
  for batch in 1..max_batches loop
    delete from private.web_analytics_sessions
    where session_id in (
      select session_id from private.web_analytics_sessions
      where last_seen < analytics_cutoff
      order by last_seen
      limit batch_size
      for update skip locked
    );
    get diagnostics affected = row_count;
    sessions_deleted := sessions_deleted + affected;
    exit when affected < batch_size;
  end loop;

  return jsonb_build_object(
    'api_rate_limits', rate_deleted,
    'web_analytics_pageviews', pageviews_deleted,
    'web_analytics_sessions', sessions_deleted
  );
end;
$$;
revoke all on function private.purge_expired_security_data(integer, integer) from public, anon, authenticated;

-- 6. Hook giới hạn tốc độ (PostgREST pre-request) ------------------------------------
create or replace function private.data_api_pre_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req_method text := upper(coalesce(current_setting('request.method', true), ''));
  req_path text := trim(leading '/' from coalesce(current_setting('request.path', true), ''));
  ip_hash text;
  req_uid uuid := auth.uid();
  route_key text;
  request_limit integer;
  window_length interval := interval '5 minutes';
  recent_count integer;
begin
  if req_method not in ('POST', 'PUT', 'PATCH', 'DELETE') then return; end if;

  route_key := case
    when req_path ~ '(^|/)rpc/record_web_analytics_event_v4$' then 'rpc/record_web_analytics_event_v4'
    when req_path ~ '(^|/)rpc/evaluate_guest_choice$' then 'rpc/evaluate_guest_choice'
    when req_path ~ '(^|/)rpc/save_managed_site_content$' then 'rpc/save_managed_site_content'
    when req_path ~ '(^|/)rpc/set_content_manager_role$' then 'rpc/set_content_manager_role'
    when req_path ~ '(^|/)rpc/set_privileged_email_domain$' then 'rpc/set_privileged_email_domain'
    when req_path ~ '(^|/)rpc/log_privileged_mfa_event$' then 'rpc/log_privileged_mfa_event'
    else null
  end;
  if route_key is null then return; end if;

  ip_hash := private.request_source_ip_hash();
  if ip_hash is null then return; end if;

  request_limit := case route_key
    when 'rpc/record_web_analytics_event_v4' then 300
    when 'rpc/evaluate_guest_choice' then 300
    when 'rpc/save_managed_site_content' then 30
    when 'rpc/set_content_manager_role' then 10
    when 'rpc/set_privileged_email_domain' then 10
    when 'rpc/log_privileged_mfa_event' then 20
    else null
  end;

  -- Dọn cơ hội (dự phòng khi pg_cron không có): ~1% yêu cầu dọn một lô nhỏ. GUC
  -- cgs.purge_probability (0..1) chỉ để kiểm thử; không client nào đặt được GUC này.
  if random() < coalesce(nullif(current_setting('cgs.purge_probability', true), '')::double precision, 0.01) then
    perform private.purge_expired_security_data(500, 1);
  end if;

  delete from private.api_rate_limits
  where source_ip_hash = ip_hash and route = route_key
    and request_at < clock_timestamp() - interval '1 hour';

  select count(*) into recent_count
  from private.api_rate_limits
  where source_ip_hash = ip_hash and route = route_key
    and request_at >= clock_timestamp() - window_length;

  if recent_count >= request_limit then
    raise log 'security_event action=RATE_LIMIT_EXCEEDED ip_hash=% route=% actor=%', left(ip_hash, 12), route_key, req_uid;
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'rate_limit_exceeded', 'message', 'Too many requests. Please try again later.')::text,
      detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', '300'))::text;
  end if;

  insert into private.api_rate_limits(source_ip_hash, route, actor_user_id, request_at)
  values(ip_hash, route_key, req_uid, clock_timestamp());
end;
$$;

revoke execute on function private.data_api_pre_request() from public;
grant execute on function private.data_api_pre_request()
  to anon, authenticated, service_role, authenticator;

-- 7. Lịch dọn bằng pg_cron (nếu có) -----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
    exception when others then
      raise notice 'pg_cron is available but could not be enabled (%); relying on opportunistic purge.', sqlerrm;
    end;
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule(
        'cgs-purge-expired-security-data',
        '17 * * * *',
        'select private.purge_expired_security_data()'
      );
    exception when others then
      raise notice 'Could not schedule the pg_cron purge job (%); relying on opportunistic purge.', sqlerrm;
    end;
  else
    raise notice 'pg_cron is not available; expired data is purged opportunistically by private.data_api_pre_request().';
  end if;
end
$$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
