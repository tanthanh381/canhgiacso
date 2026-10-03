-- Giới hạn tốc độ cho các RPC mới của vòng đời tài khoản và xác minh chứng nhận.
--
-- Mỗi 5 phút / mỗi mã băm IP:
--   rpc/delete_my_account            5   (thao tác phá hủy; thêm lớp chặn dò cụm xác nhận)
--   rpc/export_my_data               10
--   rpc/verify_training_certificate  30  (công khai; chặn dò mã chứng nhận hàng loạt)
-- Các route cũ giữ nguyên giới hạn của 20261002103000. Hook này chỉ ĐẾM lệnh gọi thành công
-- vì lệnh gọi lỗi bị rollback cùng dòng đếm; RPC xác minh vì thế trả { valid: false } thay vì
-- raise khi mã sai.
-- Bản sao đầy đủ của hook (create or replace): nếu đổi hook ở nơi khác, hãy cập nhật cả hai.
-- Idempotent.

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
    when req_path ~ '(^|/)rpc/delete_my_account$' then 'rpc/delete_my_account'
    when req_path ~ '(^|/)rpc/export_my_data$' then 'rpc/export_my_data'
    when req_path ~ '(^|/)rpc/verify_training_certificate$' then 'rpc/verify_training_certificate'
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
    when 'rpc/delete_my_account' then 5
    when 'rpc/export_my_data' then 10
    when 'rpc/verify_training_certificate' then 30
    else null
  end;

  -- Dọn cơ hội (dự phòng khi pg_cron không có): ~1% yêu cầu dọn một lô nhỏ. GUC
  -- cgs.purge_probability (0..1) chỉ để kiểm thử; không client nào đặt được GUC này.
  if random() < coalesce(nullif(current_setting('cgs.purge_probability', true), '')::double precision, 0.01) then
    perform private.purge_expired_security_data(500, 1);
  end if;

  -- Tuần tự hoá "đếm rồi ghi" theo (IP, tuyến): không có khoá này, một đợt yêu cầu đồng
  -- thời cùng đọc số đếm dưới ngưỡng trước khi ai kịp ghi và đều được cho qua. Khoá
  -- chỉ sống đến hết giao dịch của chính yêu cầu nên không cần giải phóng thủ công.
  perform pg_advisory_xact_lock(hashtextextended(ip_hash || '|' || route_key, 0));

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

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
