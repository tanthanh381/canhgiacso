alter table private.web_analytics_sessions
  add column if not exists country_code text;

alter table private.web_analytics_sessions
  drop constraint if exists web_analytics_sessions_country_code_check;
alter table private.web_analytics_sessions
  add constraint web_analytics_sessions_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create index if not exists web_analytics_sessions_country_code_idx
  on private.web_analytics_sessions(country_code) where country_code is not null;

create or replace function public.record_web_analytics_event_v3(
  p_session_id text,
  p_visitor_id text,
  p_path text,
  p_referrer_host text default null,
  p_browser text default null,
  p_operating_system text default null,
  p_device_type text default null,
  p_country_code text default null,
  p_event_type text default 'pageview'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_headers jsonb := '{}'::jsonb;
  request_origin text := '';
  normalized_session uuid;
  normalized_visitor uuid;
  normalized_path text;
  normalized_referrer text;
  normalized_browser text;
  normalized_os text;
  normalized_device text;
  normalized_country text;
  normalized_event text := lower(trim(coalesce(p_event_type, 'pageview')));
  should_count boolean := false;
begin
  begin
    request_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  request_origin := lower(coalesce(request_headers ->> 'origin', ''));
  if request_origin not in ('https://canhgiacso.com', 'https://www.canhgiacso.com') then return; end if;

  if p_session_id is null or length(p_session_id) > 64 then return; end if;
  if p_visitor_id is null or length(p_visitor_id) > 64 then return; end if;
  begin
    normalized_session := p_session_id::uuid;
    normalized_visitor := p_visitor_id::uuid;
  exception when invalid_text_representation then
    return;
  end;

  normalized_path := split_part(split_part(coalesce(p_path, '/'), '?', 1), '#', 1);
  normalized_path := left(normalized_path, 512);
  if normalized_path = '' or normalized_path !~ '^/' then normalized_path := '/'; end if;

  normalized_referrer := nullif(left(lower(trim(coalesce(p_referrer_host, ''))), 255), '');
  if normalized_referrer is not null and normalized_referrer !~ '^[a-z0-9.-]+$' then normalized_referrer := null; end if;
  if normalized_referrer in ('canhgiacso.com', 'www.canhgiacso.com') then normalized_referrer := null; end if;

  normalized_browser := case trim(coalesce(p_browser, ''))
    when 'Chrome' then 'Chrome' when 'Edge' then 'Edge' when 'Safari' then 'Safari'
    when 'Firefox' then 'Firefox' when 'Samsung Internet' then 'Samsung Internet'
    when 'Opera' then 'Opera' when 'Brave' then 'Brave' when 'Chromium' then 'Chromium'
    when 'Khác' then 'Khác' else 'Không xác định' end;

  normalized_os := case trim(coalesce(p_operating_system, ''))
    when 'Windows' then 'Windows' when 'macOS' then 'macOS' when 'iOS' then 'iOS'
    when 'Android' then 'Android' when 'Linux' then 'Linux' when 'ChromeOS' then 'ChromeOS'
    when 'Khác' then 'Khác' else 'Không xác định' end;

  normalized_device := case trim(coalesce(p_device_type, ''))
    when 'Desktop' then 'Desktop' when 'Mobile' then 'Mobile' when 'Tablet' then 'Tablet'
    when 'Khác' then 'Khác' else 'Không xác định' end;

  normalized_country := upper(trim(coalesce(p_country_code, '')));
  if normalized_country !~ '^[A-Z]{2}$' then normalized_country := null; end if;

  if normalized_event not in ('pageview', 'heartbeat') then return; end if;

  if normalized_event = 'pageview' then
    select not exists (
      select 1 from private.web_analytics_pageviews
      where session_id = normalized_session and path = normalized_path
        and viewed_at > now() - interval '2 seconds'
    ) into should_count;
  end if;

  insert into private.web_analytics_sessions (
    session_id, visitor_id, first_seen, last_seen, entry_path, last_path,
    entry_referrer_host, browser, operating_system, device_type, country_code, pageviews
  ) values (
    normalized_session, normalized_visitor, now(), now(), normalized_path, normalized_path,
    normalized_referrer, normalized_browser, normalized_os, normalized_device, normalized_country,
    case when should_count then 1 else 0 end
  )
  on conflict (session_id) do update set
    visitor_id = coalesce(private.web_analytics_sessions.visitor_id, excluded.visitor_id),
    last_seen = now(),
    last_path = excluded.last_path,
    browser = case when private.web_analytics_sessions.browser is null or private.web_analytics_sessions.browser = 'Không xác định' then excluded.browser else private.web_analytics_sessions.browser end,
    operating_system = case when private.web_analytics_sessions.operating_system is null or private.web_analytics_sessions.operating_system = 'Không xác định' then excluded.operating_system else private.web_analytics_sessions.operating_system end,
    device_type = case when private.web_analytics_sessions.device_type is null or private.web_analytics_sessions.device_type = 'Không xác định' then excluded.device_type else private.web_analytics_sessions.device_type end,
    country_code = coalesce(private.web_analytics_sessions.country_code, excluded.country_code),
    pageviews = private.web_analytics_sessions.pageviews + case when should_count then 1 else 0 end;

  if should_count then
    insert into private.web_analytics_pageviews(session_id, path, viewed_at)
    values (normalized_session, normalized_path, now());
  end if;
end;
$$;

revoke all on function public.record_web_analytics_event_v3(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_web_analytics_event_v3(text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_country_traffic_dashboard(p_window text default '24h')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_window text := lower(trim(coalesce(p_window, '24h')));
  window_start timestamptz;
  country_data jsonb;
  google_country_data jsonb;
begin
  if not (select private.user_is_app_admin()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  case normalized_window
    when '7d' then window_start := now() - interval '7 days';
    when '30d' then window_start := now() - interval '30 days';
    when '90d' then window_start := now() - interval '90 days';
    else normalized_window := '24h'; window_start := now() - interval '24 hours';
  end case;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.users desc, rows.views desc, rows.code), '[]'::jsonb)
  into country_data
  from (
    select
      coalesce(s.country_code, 'ZZ') as code,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views,
      count(distinct p.session_id) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
    group by coalesce(s.country_code, 'ZZ')
    order by users desc, views desc
    limit 20
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.users desc, rows.views desc, rows.code), '[]'::jsonb)
  into google_country_data
  from (
    select
      coalesce(s.country_code, 'ZZ') as code,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views,
      count(distinct p.session_id) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and private.is_google_referrer_host(s.entry_referrer_host)
    group by coalesce(s.country_code, 'ZZ')
    order by users desc, views desc
    limit 20
  ) rows;

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'totalSessions', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      where p.viewed_at >= window_start
    ),
    'knownCountrySessions', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.country_code is not null
    ),
    'knownCountryUsers', (
      select count(distinct s.visitor_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.country_code is not null and s.visitor_id is not null
    ),
    'countries', country_data,
    'googleCountries', google_country_data
  );
end;
$$;

revoke all on function public.get_country_traffic_dashboard(text) from public, anon;
grant execute on function public.get_country_traffic_dashboard(text) to authenticated;

notify pgrst, 'reload schema';
