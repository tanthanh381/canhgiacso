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
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id) filter (where s.visitor_id is null)::int as legacy_sessions
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
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
    group by p.path
    order by count(*) desc, p.path
    limit 12
  ) page_rows;

  select coalesce(jsonb_agg(to_jsonb(source_rows) order by source_rows.sessions desc, source_rows.source), '[]'::jsonb)
  into source_data
  from (
    select
      coalesce(s.entry_referrer_host, 'Trực tiếp / không xác định') as source,
      count(*)::int as sessions,
      count(*)::int as visitors,
      count(distinct s.visitor_id)::int as users,
      count(*) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by coalesce(s.entry_referrer_host, 'Trực tiếp / không xác định')
    order by count(*) desc
    limit 10
  ) source_rows;

  select coalesce(jsonb_agg(to_jsonb(live_rows) order by live_rows.active_users desc, live_rows.active_visitors desc, live_rows.path), '[]'::jsonb)
  into live_pages_data
  from (
    select
      s.last_path as path,
      count(*)::int as active_visitors,
      count(distinct s.visitor_id)::int as active_users,
      count(*) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_sessions s
    where s.last_seen >= now() - interval '5 minutes'
    group by s.last_path
    order by count(distinct s.visitor_id) desc, count(*) desc, s.last_path
    limit 10
  ) live_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into browser_data
  from (
    select
      coalesce(s.browser, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start and s.visitor_id is not null
    group by coalesce(s.browser, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(*) desc
    limit 10
  ) summary_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into os_data
  from (
    select
      coalesce(s.operating_system, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start and s.visitor_id is not null
    group by coalesce(s.operating_system, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(*) desc
    limit 10
  ) summary_rows;

  select coalesce(jsonb_agg(to_jsonb(summary_rows) order by summary_rows.users desc, summary_rows.views desc, summary_rows.name), '[]'::jsonb)
  into device_data
  from (
    select
      coalesce(s.device_type, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start and s.visitor_id is not null
    group by coalesce(s.device_type, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(*) desc
    limit 10
  ) summary_rows;

  with active_users as (
    select distinct s.visitor_id
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start and s.visitor_id is not null
  ), first_seen as (
    select visitor_id, min(first_seen) as first_seen
    from private.web_analytics_sessions
    where visitor_id is not null
    group by visitor_id
  )
  select
    count(*) filter (where f.first_seen >= window_start)::int,
    count(*) filter (where f.first_seen < window_start)::int
  into new_users_count, returning_users_count
  from active_users a
  join first_seen f using (visitor_id);

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'onlineNow', (select count(*)::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes'),
    'onlineUsers', (select count(distinct visitor_id)::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes' and visitor_id is not null),
    'onlineLegacySessions', (select count(*)::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes' and visitor_id is null),
    'pageviewsToday', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'uniqueVisitorsToday', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'sessionsToday', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'uniqueUsersToday', (
      select count(distinct s.visitor_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= today_start and s.visitor_id is not null
    ),
    'identifiedSessionsToday', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= today_start and s.visitor_id is not null
    ),
    'legacySessionsToday', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= today_start and s.visitor_id is null
    ),
    'pageviewsWindow', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'uniqueVisitorsWindow', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'sessionsWindow', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'uniqueUsersWindow', (
      select count(distinct s.visitor_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.visitor_id is not null
    ),
    'identifiedSessionsWindow', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.visitor_id is not null
    ),
    'legacySessionsWindow', (
      select count(distinct p.session_id)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.visitor_id is null
    ),
    'identifiedPageviewsWindow', (
      select count(*)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.visitor_id is not null
    ),
    'legacyPageviewsWindow', (
      select count(*)::int
      from private.web_analytics_pageviews p
      join private.web_analytics_sessions s on s.session_id = p.session_id
      where p.viewed_at >= window_start and s.visitor_id is null
    ),
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
