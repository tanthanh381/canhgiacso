create or replace function private.is_google_organic_source(
  p_referrer_host text,
  p_utm_source text,
  p_utm_medium text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(coalesce(p_utm_medium, '')) in ('cpc','ppc','paidsearch','paid_search','paid') then false
    when private.is_google_referrer(p_referrer_host) then true
    when lower(coalesce(p_utm_source, '')) = 'google' and lower(coalesce(p_utm_medium, '')) = 'organic' then true
    else false
  end;
$$;

revoke all on function private.is_google_organic_source(text, text, text) from public, anon, authenticated;

create or replace function private.analytics_referrer_group(
  p_referrer_host text,
  p_utm_source text,
  p_utm_medium text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when private.is_google_organic_source(p_referrer_host, p_utm_source, p_utm_medium) then 'Google'
    when p_referrer_host is null and p_utm_source is null and p_utm_medium is null then 'Direct / Unknown'
    else 'Other'
  end;
$$;

revoke all on function private.analytics_referrer_group(text, text, text) from public, anon, authenticated;

create or replace function private.analytics_channel_group(
  p_referrer_host text,
  p_utm_source text,
  p_utm_medium text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(coalesce(p_utm_medium, '')) in ('cpc','ppc','paidsearch','paid_search','paid') then 'Paid Search'
    when lower(coalesce(p_utm_medium, '')) = 'organic' then 'Organic Search'
    when private.is_google_organic_source(p_referrer_host, p_utm_source, p_utm_medium) then 'Organic Search'
    when lower(coalesce(p_referrer_host, '')) ~ '(^|[.])(bing[.]com|duckduckgo[.]com|search[.]yahoo[.]com|yandex[.])' then 'Organic Search'
    when lower(coalesce(p_utm_medium, '')) in ('social','social-network','social_media','social-media') then 'Social'
    when lower(coalesce(p_referrer_host, '')) ~ '(^|[.])(facebook[.]com|instagram[.]com|linkedin[.]com|tiktok[.]com|twitter[.]com|x[.]com)$' then 'Social'
    when lower(coalesce(p_utm_medium, '')) in ('email','e-mail') then 'Email'
    when p_utm_source is not null or p_utm_medium is not null then 'Campaign'
    when p_referrer_host is null then 'Direct / Unknown'
    else 'Referral'
  end;
$$;

create or replace function public.get_google_traffic_dashboard(p_window text default '24h')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_window text := lower(trim(coalesce(p_window, '24h')));
  window_start timestamptz;
  series_data jsonb;
  landing_pages_data jsonb;
  organic_landing_pages_data jsonb;
  referrer_mix_data jsonb;
  browser_data jsonb;
  os_data jsonb;
  device_data jsonb;
  google_sessions_count integer := 0;
  google_users_count integer := 0;
  google_pageviews_count integer := 0;
  google_legacy_sessions_count integer := 0;
  google_new_users_count integer := 0;
  google_returning_users_count integer := 0;
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

  select
    count(distinct p.session_id)::int,
    count(distinct s.visitor_id)::int,
    count(*)::int,
    count(distinct p.session_id) filter (where s.visitor_id is null)::int
  into google_sessions_count, google_users_count, google_pageviews_count, google_legacy_sessions_count
  from private.web_analytics_pageviews p
  join private.web_analytics_sessions s on s.session_id = p.session_id
  where p.viewed_at >= window_start
    and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium);

  select coalesce(jsonb_agg(to_jsonb(series_rows) order by series_rows.bucket), '[]'::jsonb)
  into series_data
  from (
    select
      case when normalized_window = '24h'
        then to_char(date_trunc('hour', p.viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:00')
        else to_char(date_trunc('day', p.viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')
      end as bucket,
      count(*)::int as views,
      count(distinct p.session_id)::int as sessions,
      count(distinct s.visitor_id)::int as users
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
    group by 1
  ) series_rows;

  with google_session_rollup as (
    select
      s.session_id,
      s.visitor_id,
      s.entry_path,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
    group by s.session_id, s.visitor_id, s.entry_path
  )
  select coalesce(jsonb_agg(to_jsonb(page_rows) order by page_rows.sessions desc, page_rows.views desc, page_rows.path), '[]'::jsonb)
  into landing_pages_data
  from (
    select
      entry_path as path,
      sum(views)::int as views,
      count(*)::int as sessions,
      count(distinct visitor_id)::int as users,
      count(*) filter (where visitor_id is null)::int as legacy_sessions
    from google_session_rollup
    group by entry_path
    order by count(*) desc, sum(views) desc, entry_path
    limit 12
  ) page_rows;

  with organic_session_rollup as (
    select
      s.session_id,
      s.visitor_id,
      s.entry_path,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and private.analytics_channel_group(s.entry_referrer_host, s.utm_source, s.utm_medium) = 'Organic Search'
    group by s.session_id, s.visitor_id, s.entry_path
  )
  select coalesce(jsonb_agg(to_jsonb(page_rows) order by page_rows.sessions desc, page_rows.views desc, page_rows.path), '[]'::jsonb)
  into organic_landing_pages_data
  from (
    select
      entry_path as path,
      sum(views)::int as views,
      count(*)::int as sessions,
      count(distinct visitor_id)::int as users,
      count(*) filter (where visitor_id is null)::int as legacy_sessions
    from organic_session_rollup
    group by entry_path
    order by count(*) desc, sum(views) desc, entry_path
    limit 12
  ) page_rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.sessions desc, rows.source), '[]'::jsonb)
  into referrer_mix_data
  from (
    select
      private.analytics_referrer_group(s.entry_referrer_host, s.utm_source, s.utm_medium) as source,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views,
      count(*) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by 1
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.users desc, rows.sessions desc, rows.name), '[]'::jsonb)
  into browser_data
  from (
    select
      coalesce(s.browser, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and s.visitor_id is not null
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
    group by coalesce(s.browser, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(distinct p.session_id) desc
    limit 10
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.users desc, rows.sessions desc, rows.name), '[]'::jsonb)
  into os_data
  from (
    select
      coalesce(s.operating_system, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and s.visitor_id is not null
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
    group by coalesce(s.operating_system, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(distinct p.session_id) desc
    limit 10
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.users desc, rows.sessions desc, rows.name), '[]'::jsonb)
  into device_data
  from (
    select
      coalesce(s.device_type, 'Không xác định') as name,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and s.visitor_id is not null
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
    group by coalesce(s.device_type, 'Không xác định')
    order by count(distinct s.visitor_id) desc, count(distinct p.session_id) desc
    limit 10
  ) rows;

  with google_active_users as (
    select distinct s.visitor_id
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and s.visitor_id is not null
      and private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium)
  ), first_session as (
    select distinct on (visitor_id)
      visitor_id,
      first_seen,
      entry_referrer_host,
      utm_source,
      utm_medium
    from private.web_analytics_sessions
    where visitor_id is not null
    order by visitor_id, first_seen, session_id
  )
  select
    count(*) filter (
      where f.first_seen >= window_start
        and private.is_google_organic_source(f.entry_referrer_host, f.utm_source, f.utm_medium)
    )::int,
    count(*) filter (
      where not (
        f.first_seen >= window_start
        and private.is_google_organic_source(f.entry_referrer_host, f.utm_source, f.utm_medium)
      )
    )::int
  into google_new_users_count, google_returning_users_count
  from google_active_users g
  join first_session f using (visitor_id);

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'googleUsers', google_users_count,
    'googleSessions', google_sessions_count,
    'googlePageviews', google_pageviews_count,
    'googleLegacySessions', google_legacy_sessions_count,
    'googleNewUsers', google_new_users_count,
    'googleReturningUsers', google_returning_users_count,
    'googleSeries', series_data,
    'googleLandingPages', landing_pages_data,
    'organicLandingPages', organic_landing_pages_data,
    'referrerMix', referrer_mix_data,
    'googleBrowsers', browser_data,
    'googleOperatingSystems', os_data,
    'googleDevices', device_data
  );
end;
$$;

revoke all on function public.get_google_traffic_dashboard(text) from public, anon;
grant execute on function public.get_google_traffic_dashboard(text) to authenticated;

notify pgrst, 'reload schema';
