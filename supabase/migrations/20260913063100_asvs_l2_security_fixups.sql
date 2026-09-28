-- Follow-up grants and route normalization for the ASVS L2 hardening migration.
-- The public role-discovery RPC is SECURITY INVOKER, so authenticated callers
-- need narrowly scoped access to the private read-only helper it delegates to.

grant usage on schema private to authenticated, service_role;
grant execute on function private.get_content_management_role() to authenticated, service_role;

create or replace function private.data_api_pre_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req_method text := upper(coalesce(current_setting('request.method', true), ''));
  req_path text := trim(leading '/' from coalesce(current_setting('request.path', true), ''));
  req_ip inet := private.request_source_ip();
  req_uid uuid := auth.uid();
  route_key text;
  request_limit integer;
  window_length interval := interval '5 minutes';
  recent_count integer;
begin
  if req_method not in ('POST', 'PUT', 'PATCH', 'DELETE') or req_ip is null then
    return;
  end if;

  route_key := case
    when req_path ~ '(^|/)rpc/evaluate_guest_choice$' then 'rpc/evaluate_guest_choice'
    when req_path ~ '(^|/)rpc/save_managed_site_content$' then 'rpc/save_managed_site_content'
    when req_path ~ '(^|/)rpc/set_content_manager_role$' then 'rpc/set_content_manager_role'
    else null
  end;
  if route_key is null then return; end if;

  request_limit := case route_key
    when 'rpc/evaluate_guest_choice' then 60
    when 'rpc/save_managed_site_content' then 30
    when 'rpc/set_content_manager_role' then 10
    else null
  end;

  delete from private.api_rate_limits
  where source_ip = req_ip and route = route_key and request_at < clock_timestamp() - interval '1 hour';

  select count(*) into recent_count
  from private.api_rate_limits
  where source_ip = req_ip
    and route = route_key
    and request_at >= clock_timestamp() - window_length;

  if recent_count >= request_limit then
    raise log 'security_event action=RATE_LIMIT_EXCEEDED ip=% route=% actor=%', req_ip, route_key, req_uid;
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'rate_limit_exceeded', 'message', 'Too many requests. Please try again later.')::text,
      detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', '300'))::text;
  end if;

  insert into private.api_rate_limits(source_ip, route, actor_user_id, request_at)
  values(req_ip, route_key, req_uid, clock_timestamp());
end;
$$;

notify pgrst, 'reload config';
