alter table private.web_analytics_sessions
  add column if not exists visitor_id uuid,
  add column if not exists browser text,
  add column if not exists operating_system text,
  add column if not exists device_type text;

create index if not exists web_analytics_sessions_visitor_id_idx
  on private.web_analytics_sessions(visitor_id) where visitor_id is not null;
create index if not exists web_analytics_sessions_browser_idx
  on private.web_analytics_sessions(browser) where browser is not null;
create index if not exists web_analytics_sessions_operating_system_idx
  on private.web_analytics_sessions(operating_system) where operating_system is not null;
create index if not exists web_analytics_sessions_device_type_idx
  on private.web_analytics_sessions(device_type) where device_type is not null;

create or replace function public.record_web_analytics_event_v2(
  p_session_id text,
  p_visitor_id text,
  p_path text,
  p_referrer_host text default null,
  p_browser text default null,
  p_operating_system text default null,
  p_device_type text default null,
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
  normalized_event text := lower(trim(coalesce(p_event_type, 'pageview')));
  should_count boolean := false;
begin
  begin
    request_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  request_origin := lower(coalesce(request_headers ->> 'origin', ''));
  if request_origin not in ('https://canhgiacso.com', 'https://www.canhgiacso.com') then
    return;
  end if;

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
    when 'Chrome' then 'Chrome'
    when 'Edge' then 'Edge'
    when 'Safari' then 'Safari'
    when 'Firefox' then 'Firefox'
    when 'Samsung Internet' then 'Samsung Internet'
    when 'Opera' then 'Opera'
    when 'Brave' then 'Brave'
    when 'Chromium' then 'Chromium'
    when 'Khác' then 'Khác'
    else 'Không xác định'
  end;

  normalized_os := case trim(coalesce(p_operating_system, ''))
    when 'Windows' then 'Windows'
    when 'macOS' then 'macOS'
    when 'iOS' then 'iOS'
    when 'Android' then 'Android'
    when 'Linux' then 'Linux'
    when 'ChromeOS' then 'ChromeOS'
    when 'Khác' then 'Khác'
    else 'Không xác định'
  end;

  normalized_device := case trim(coalesce(p_device_type, ''))
    when 'Desktop' then 'Desktop'
    when 'Mobile' then 'Mobile'
    when 'Tablet' then 'Tablet'
    when 'Khác' then 'Khác'
    else 'Không xác định'
  end;

  if normalized_event not in ('pageview', 'heartbeat') then return; end if;

  if normalized_event = 'pageview' then
    select not exists (
      select 1 from private.web_analytics_pageviews
      where session_id = normalized_session
        and path = normalized_path
        and viewed_at > now() - interval '2 seconds'
    ) into should_count;
  end if;

  insert into private.web_analytics_sessions (
    session_id, visitor_id, first_seen, last_seen, entry_path, last_path,
    entry_referrer_host, browser, operating_system, device_type, pageviews
  ) values (
    normalized_session, normalized_visitor, now(), now(), normalized_path, normalized_path,
    normalized_referrer, normalized_browser, normalized_os, normalized_device,
    case when should_count then 1 else 0 end
  )
  on conflict (session_id) do update set
    visitor_id = coalesce(private.web_analytics_sessions.visitor_id, excluded.visitor_id),
    last_seen = now(),
    last_path = excluded.last_path,
    browser = case
      when private.web_analytics_sessions.browser is null or private.web_analytics_sessions.browser = 'Không xác định'
        then excluded.browser else private.web_analytics_sessions.browser end,
    operating_system = case
      when private.web_analytics_sessions.operating_system is null or private.web_analytics_sessions.operating_system = 'Không xác định'
        then excluded.operating_system else private.web_analytics_sessions.operating_system end,
    device_type = case
      when private.web_analytics_sessions.device_type is null or private.web_analytics_sessions.device_type = 'Không xác định'
        then excluded.device_type else private.web_analytics_sessions.device_type end,
    pageviews = private.web_analytics_sessions.pageviews + case when should_count then 1 else 0 end;

  if should_count then
    insert into private.web_analytics_pageviews(session_id, path, viewed_at)
    values (normalized_session, normalized_path, now());
  end if;
end;
$$;

revoke all on function public.record_web_analytics_event_v2(text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_web_analytics_event_v2(text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_web_analytics_dashboard(p_window text default '24h')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_window text := lower(trim(coalesce(p_window, '24h')));
  window_start timestamptz;
  today_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh');
  series_data jsonb;
  top_pages_data jsonb;
  source_data jsonb;
  live_pages_data jsonb;
  browser_data jsonb;
  os_data jsonb;
  device_data jsonb;
  new_users_count integer := 0;
  returning_users_count integer := 0;
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

  select coalesce(jsonb_agg(to_jsonb(series_rows) order by series_rows.bucket), '[]'::jsonb)
  into series_data
  from (
    select
      case when normalized_window = '24h'
        then to_char(date_trunc('hour', p.viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:00')
        else to_char(date_trunc('day', p.viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')
      end as bucket,
      count(*)::int as views,
      count(distinct p.session_id)::int as visitors,
      count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int as users
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
    group by 1
  ) series_rows;

  select coalesce(jsonb_agg(to_jsonb(page_rows) order by page_rows.views desc, page_rows.path), '[]'::jsonb)
  into top_pages_data
  from (
    select
      p.path,
      count(*)::int as views,
      count(distinct p.session_id)::int as visitors,
      count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int as users
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
    group by p.path
    order by count(*) desc, p.path
    limit 12
  ) page_rows;

  select coalesce(jsonb_agg(to_jsonb(source_rows) order by source_rows.users desc, source_rows.sessions desc, source_rows.source), '[]'::jsonb)
  into source_data
  from (
    select
      coalesce(s.entry_referrer_host, 'Trực tiếp / không xác định') as source,
      count(*)::int as sessions,
      count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int as users,
      count(*)::int as visitors
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by coalesce(s.entry_referrer_host, 'Trực tiếp / không xác định')
    order by users desc, sessions desc
    limit 10
  ) source_rows;

  select coalesce(jsonb_agg(to_jsonb(live_rows) order by live_rows.active_users desc, live_rows.active_visitors desc, live_rows.path), '[]'::jsonb)
  into live_pages_data
  from (
    select
      s.last_path as path,
      count(*)::int as active_visitors,
      count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int as active_users
    from private.web_analytics_sessions s
    where s.last_seen >= now() - interval '5 minutes'
    group by s.last_path
    order by active_users desc, active_visitors desc, s.last_path
    limit 10
  ) live_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into browser_data
  from (
    with dim_rows as (
      select
        coalesce(s.browser, 'Không xác định') as name,
        coalesce(s.visitor_id::text, s.session_id::text) as user_key,
        s.session_id,
        count(*)::int as views
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start
      group by 1, 2, 3
    )
    select name, count(distinct user_key)::int as users, count(distinct session_id)::int as sessions, sum(views)::int as views
    from dim_rows group by name order by users desc, views desc limit 10
  ) summary_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into os_data
  from (
    with dim_rows as (
      select
        coalesce(s.operating_system, 'Không xác định') as name,
        coalesce(s.visitor_id::text, s.session_id::text) as user_key,
        s.session_id,
        count(*)::int as views
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start
      group by 1, 2, 3
    )
    select name, count(distinct user_key)::int as users, count(distinct session_id)::int as sessions, sum(views)::int as views
    from dim_rows group by name order by users desc, views desc limit 10
  ) summary_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into device_data
  from (
    with dim_rows as (
      select
        coalesce(s.device_type, 'Không xác định') as name,
        coalesce(s.visitor_id::text, s.session_id::text) as user_key,
        s.session_id,
        count(*)::int as views
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start
      group by 1, 2, 3
    )
    select name, count(distinct user_key)::int as users, count(distinct session_id)::int as sessions, sum(views)::int as views
    from dim_rows group by name order by users desc, views desc limit 10
  ) summary_rows;

  with active_users as (
    select distinct coalesce(s.visitor_id::text, s.session_id::text) as user_key
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
  ), first_seen as (
    select coalesce(visitor_id::text, session_id::text) as user_key, min(first_seen) as first_seen
    from private.web_analytics_sessions
    group by 1
  )
  select
    count(*) filter (where f.first_seen >= window_start)::int,
    count(*) filter (where f.first_seen < window_start)::int
  into new_users_count, returning_users_count
  from active_users a
  join first_seen f using (user_key);

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'onlineNow', (select count(*)::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes'),
    'onlineUsers', (select count(distinct coalesce(visitor_id::text, session_id::text))::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes'),
    'pageviewsToday', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'uniqueVisitorsToday', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'uniqueUsersToday', (
      select count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int
      from private.web_analytics_pageviews p join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= today_start
    ),
    'sessionsToday', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'pageviewsWindow', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'uniqueVisitorsWindow', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'uniqueUsersWindow', (
      select count(distinct coalesce(s.visitor_id::text, s.session_id::text))::int
      from private.web_analytics_pageviews p join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start
    ),
    'sessionsWindow', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'newUsersWindow', new_users_count,
    'returningUsersWindow', returning_users_count,
    'series', series_data,
    'topPages', top_pages_data,
    'sources', source_data,
    'livePages', live_pages_data,
    'browsers', browser_data,
    'operatingSystems', os_data,
    'devices', device_data
  );
end;
$$;

revoke all on function public.get_web_analytics_dashboard(text) from public, anon;
grant execute on function public.get_web_analytics_dashboard(text) to authenticated;

notify pgrst, 'reload schema';
