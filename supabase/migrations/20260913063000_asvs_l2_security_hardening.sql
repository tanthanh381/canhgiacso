-- OWASP ASVS Level 2 hardening for Cảnh Giác Số.
-- Privileged content administration requires a live session + TOTP AAL2.
-- Data API write/RPC abuse is rate-limited by client IP.
-- Successful privileged changes are written to an internal append-only audit trail.

create table if not exists private.security_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_user_id uuid,
  actor_session_id uuid,
  actor_aal text,
  action text not null check (length(action) between 1 and 80),
  target_type text,
  target_id text,
  outcome text not null default 'success' check (outcome in ('success', 'denied', 'error')),
  source_ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  constraint security_audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists security_audit_log_occurred_at_idx
  on private.security_audit_log (occurred_at desc);
create index if not exists security_audit_log_actor_idx
  on private.security_audit_log (actor_user_id, occurred_at desc);
create index if not exists security_audit_log_action_idx
  on private.security_audit_log (action, occurred_at desc);

revoke all on table private.security_audit_log from public, anon, authenticated;
revoke all on sequence private.security_audit_log_id_seq from public, anon, authenticated;
grant select on table private.security_audit_log to service_role;

create or replace function private.request_source_ip()
returns inet
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  raw_ip text;
begin
  raw_ip := coalesce(
    nullif(headers->>'cf-connecting-ip', ''),
    nullif(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1), '')
  );
  if raw_ip is null then return null; end if;
  begin
    return trim(raw_ip)::inet;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function private.log_security_event(
  event_action text,
  event_target_type text default null,
  event_target_id text default null,
  event_outcome text default 'success',
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
begin
  insert into private.security_audit_log(
    actor_user_id,
    actor_session_id,
    actor_aal,
    action,
    target_type,
    target_id,
    outcome,
    source_ip,
    user_agent,
    metadata
  ) values (
    auth.uid(),
    case when coalesce(jwt->>'session_id', '') ~* '^[0-9a-f-]{36}$' then (jwt->>'session_id')::uuid else null end,
    coalesce(jwt->>'aal', 'aal1'),
    left(event_action, 80),
    event_target_type,
    event_target_id,
    event_outcome,
    private.request_source_ip(),
    left(coalesce(headers->>'user-agent', ''), 1000),
    coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function private.request_source_ip() from public, anon, authenticated;
revoke execute on function private.log_security_event(text,text,text,text,jsonb) from public, anon, authenticated;

-- AAL1-safe role discovery is intentionally read-only. It allows the frontend
-- to decide whether an authenticated user must complete MFA before entering the
-- administration area. All privileged data/actions remain AAL2-enforced below.
create or replace function private.get_content_management_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when not exists (
      select 1 from auth.sessions s
      where s.user_id = (select auth.uid())
        and s.id::text = (select auth.jwt()->>'session_id')
    ) then null
    when exists (select 1 from private.app_admins a where a.user_id = (select auth.uid())) then 'admin'
    when exists (select 1 from private.app_editors e where e.user_id = (select auth.uid())) then 'editor'
    else null
  end;
$$;

create or replace function public.get_content_management_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_content_management_role()
$$;

revoke execute on function private.get_content_management_role() from public, anon, authenticated;
revoke execute on function public.get_content_management_role() from public, anon;
grant execute on function public.get_content_management_role() to authenticated, service_role;

-- Privileged helpers now require a live Supabase session and AAL2.
create or replace function private.user_can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    and exists (
      select 1 from auth.sessions session_row
      where session_row.user_id = (select auth.uid())
        and session_row.id::text = (select auth.jwt()->>'session_id')
    )
    and (
      exists (select 1 from private.app_admins where user_id = (select auth.uid()))
      or exists (select 1 from private.app_editors where user_id = (select auth.uid()))
    );
$$;

create or replace function private.user_is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
    and exists (
      select 1 from auth.sessions session_row
      where session_row.user_id = (select auth.uid())
        and session_row.id::text = (select auth.jwt()->>'session_id')
    )
    and exists (
      select 1 from private.app_admins where user_id = (select auth.uid())
    );
$$;

create or replace function private.save_managed_site_content(target_slug text, target_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_published boolean;
  saved_at timestamptz := clock_timestamp();
begin
  if not private.user_can_edit_content() then
    raise log 'security_event action=CONTENT_WRITE_DENIED actor=% aal=%', auth.uid(), coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Content management access and MFA required' using errcode = '42501';
  end if;

  if target_slug not in ('main', 'main-draft') then
    raise exception 'Invalid content target' using errcode = '22023';
  end if;

  is_published := target_slug = 'main';
  if is_published and not private.user_is_app_admin() then
    raise log 'security_event action=CONTENT_PUBLISH_DENIED actor=% aal=%', auth.uid(), coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Administrator access and MFA required to publish' using errcode = '42501';
  end if;

  if jsonb_typeof(target_content) <> 'object'
     or jsonb_typeof(target_content->'scenarios') <> 'array'
     or jsonb_array_length(target_content->'scenarios') < 1
     or pg_column_size(target_content) > 1048576 then
    raise exception 'Invalid site content' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_content->'scenarios') scenario_item
    where jsonb_typeof(scenario_item->'choices') <> 'array'
      or jsonb_array_length(scenario_item->'choices') <> 3
      or (
        select count(*)
        from jsonb_array_elements(scenario_item->'choices') choice_item
        where jsonb_typeof(choice_item->'correct') = 'boolean'
          and (choice_item->>'correct')::boolean
      ) <> 1
  ) then
    raise exception 'Every scenario must contain three choices and one correct answer' using errcode = '22023';
  end if;

  insert into public.site_content(slug, content, published, updated_by, updated_at)
  values(target_slug, target_content, is_published, uid, saved_at)
  on conflict (slug) do update set
    content = excluded.content,
    published = excluded.published,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  perform private.log_security_event(
    case when is_published then 'CONTENT_PUBLISHED' else 'CONTENT_DRAFT_SAVED' end,
    'site_content', target_slug, 'success',
    jsonb_build_object('payload_bytes', pg_column_size(target_content))
  );

  return jsonb_build_object('slug', target_slug, 'updated_at', saved_at);
end
$$;

create or replace function private.set_content_manager_role(target_user_id uuid, target_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_role text := lower(trim(coalesce(target_role, '')));
  target_email text;
  previous_role text;
begin
  if not (select private.user_is_app_admin()) then
    raise log 'security_event action=ROLE_CHANGE_DENIED actor=% target=% aal=%', auth.uid(), target_user_id, coalesce(auth.jwt()->>'aal', 'aal1');
    raise exception 'Administrator access and MFA required' using errcode = '42501';
  end if;
  if normalized_role not in ('admin', 'editor', 'member') then
    raise exception 'Invalid content role' using errcode = '22023';
  end if;
  if target_user_id = (select auth.uid()) and normalized_role <> 'admin' then
    raise exception 'Administrators cannot change their own role' using errcode = '42501';
  end if;

  select email into target_email from auth.users where id = target_user_id;
  if target_email is null then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  previous_role := case
    when exists (select 1 from private.app_admins where user_id = target_user_id) then 'admin'
    when exists (select 1 from private.app_editors where user_id = target_user_id) then 'editor'
    else 'member'
  end;

  delete from private.app_editors where user_id = target_user_id;
  delete from private.app_admins where user_id = target_user_id;
  if normalized_role = 'admin' then
    insert into private.app_admins (user_id) values (target_user_id);
  elsif normalized_role = 'editor' then
    insert into private.app_editors (user_id) values (target_user_id);
  end if;

  perform private.log_security_event(
    'ROLE_CHANGED', 'user', target_user_id::text, 'success',
    jsonb_build_object('previous_role', previous_role, 'new_role', normalized_role)
  );

  return jsonb_build_object('userId', target_user_id, 'email', target_email, 'role', normalized_role);
end;
$$;

-- PostgREST pre-request rate limiting. Authentication endpoints retain
-- Supabase Auth's built-in rate limits; this control protects Data API RPCs.
create table if not exists private.api_rate_limits (
  source_ip inet not null,
  route text not null,
  actor_user_id uuid,
  request_at timestamptz not null default clock_timestamp()
);
create index if not exists api_rate_limits_lookup_idx
  on private.api_rate_limits (route, source_ip, request_at desc);
revoke all on table private.api_rate_limits from public, anon, authenticated;

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
  request_limit integer;
  window_length interval := interval '5 minutes';
  recent_count integer;
begin
  if req_method not in ('POST', 'PUT', 'PATCH', 'DELETE') or req_ip is null then
    return;
  end if;

  request_limit := case req_path
    when 'rpc/evaluate_guest_choice' then 60
    when 'rpc/save_managed_site_content' then 30
    when 'rpc/set_content_manager_role' then 10
    else null
  end;
  if request_limit is null then return; end if;

  delete from private.api_rate_limits
  where source_ip = req_ip and route = req_path and request_at < clock_timestamp() - interval '1 hour';

  select count(*) into recent_count
  from private.api_rate_limits
  where source_ip = req_ip
    and route = req_path
    and request_at >= clock_timestamp() - window_length;

  if recent_count >= request_limit then
    raise log 'security_event action=RATE_LIMIT_EXCEEDED ip=% route=% actor=%', req_ip, req_path, req_uid;
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'rate_limit_exceeded', 'message', 'Too many requests. Please try again later.')::text,
      detail = json_build_object('status', 429, 'headers', json_build_object('Retry-After', '300'))::text;
  end if;

  insert into private.api_rate_limits(source_ip, route, actor_user_id, request_at)
  values(req_ip, req_path, req_uid, clock_timestamp());
end;
$$;

revoke execute on function private.data_api_pre_request() from public, anon, authenticated;
grant usage on schema private to authenticator;
grant execute on function private.data_api_pre_request() to authenticator;
alter role authenticator set pgrst.db_pre_request = 'private.data_api_pre_request';
notify pgrst, 'reload config';
