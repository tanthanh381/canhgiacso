create or replace function public.get_phase4_seo_monitor(p_window text default '7d')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_window text := lower(trim(coalesce(p_window, '7d')));
  requested_window_days numeric := 7;
  requested_window_seconds numeric := 604800;
  coverage_start timestamptz;
  coverage_seconds numeric := 0;
  comparison_window_seconds numeric := 0;
  comparison_window_days numeric := 0;
  current_start timestamptz;
  previous_start timestamptz;
  priority_pages_data jsonb;
  totals_data jsonb;
begin
  if not (select private.user_is_app_admin()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  case normalized_window
    when '24h' then requested_window_days := 1; requested_window_seconds := 86400;
    when '30d' then requested_window_days := 30; requested_window_seconds := 2592000;
    when '90d' then requested_window_days := 90; requested_window_seconds := 7776000;
    else normalized_window := '7d'; requested_window_days := 7; requested_window_seconds := 604800;
  end case;

  select min(first_seen) into coverage_start from private.web_analytics_sessions;
  if coverage_start is not null then
    coverage_seconds := greatest(0, extract(epoch from now() - coverage_start));
  end if;

  comparison_window_seconds := least(requested_window_seconds, greatest(0, coverage_seconds / 2));
  comparison_window_days := round((comparison_window_seconds / 86400)::numeric, 2);
  current_start := now() - make_interval(secs => comparison_window_seconds::double precision);
  previous_start := now() - make_interval(secs => (comparison_window_seconds * 2)::double precision);

  with priority_pages(path, label) as (
    values
      ('/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/', 'Cộng tác viên / việc nhẹ lương cao'),
      ('/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/', 'Kiểm tra số điện thoại'),
      ('/kien-thuc/gia-mao-ngan-hang/', 'Giả mạo ngân hàng'),
      ('/kien-thuc/kiem-tra-link-gia-mao/', 'Kiểm tra link giả mạo'),
      ('/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/', 'Xử lý khi bị lừa chuyển tiền'),
      ('/kien-thuc/phishing-la-gi/', 'Phishing là gì')
  ), current_rollup as (
    select
      s.entry_path as path,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views,
      count(*) filter (where private.analytics_channel_group(s.entry_referrer_host, s.utm_source, s.utm_medium) = 'Organic Search')::int as organic_sessions,
      count(*) filter (where private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium))::int as google_sessions,
      count(*) filter (where private.analytics_referrer_group(s.entry_referrer_host, s.utm_source, s.utm_medium) = 'Direct / Unknown')::int as direct_sessions
    from private.web_analytics_sessions s
    where s.first_seen >= current_start
      and s.first_seen < now()
      and s.entry_path in (select path from priority_pages)
    group by s.entry_path
  ), previous_rollup as (
    select
      s.entry_path as path,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views,
      count(*) filter (where private.analytics_channel_group(s.entry_referrer_host, s.utm_source, s.utm_medium) = 'Organic Search')::int as organic_sessions,
      count(*) filter (where private.is_google_organic_source(s.entry_referrer_host, s.utm_source, s.utm_medium))::int as google_sessions,
      count(*) filter (where private.analytics_referrer_group(s.entry_referrer_host, s.utm_source, s.utm_medium) = 'Direct / Unknown')::int as direct_sessions
    from private.web_analytics_sessions s
    where s.first_seen >= previous_start
      and s.first_seen < current_start
      and s.entry_path in (select path from priority_pages)
    group by s.entry_path
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'path', p.path,
    'label', p.label,
    'sessions', coalesce(c.sessions, 0),
    'users', coalesce(c.users, 0),
    'views', coalesce(c.views, 0),
    'organicSessions', coalesce(c.organic_sessions, 0),
    'googleSessions', coalesce(c.google_sessions, 0),
    'directSessions', coalesce(c.direct_sessions, 0),
    'previousSessions', coalesce(pr.sessions, 0),
    'previousOrganicSessions', coalesce(pr.organic_sessions, 0),
    'organicDelta', coalesce(c.organic_sessions, 0) - coalesce(pr.organic_sessions, 0)
  ) order by coalesce(c.organic_sessions, 0) desc, coalesce(c.sessions, 0) desc, p.path), '[]'::jsonb)
  into priority_pages_data
  from priority_pages p
  left join current_rollup c using (path)
  left join previous_rollup pr using (path);

  with current_all as (
    select
      count(*)::int as sessions,
      count(distinct visitor_id)::int as users,
      coalesce(sum(pageviews), 0)::int as views,
      count(*) filter (where private.analytics_channel_group(entry_referrer_host, utm_source, utm_medium) = 'Organic Search')::int as organic_sessions,
      count(*) filter (where private.analytics_referrer_group(entry_referrer_host, utm_source, utm_medium) = 'Direct / Unknown')::int as direct_sessions
    from private.web_analytics_sessions
    where first_seen >= current_start
      and first_seen < now()
  ), previous_all as (
    select
      count(*)::int as sessions,
      count(distinct visitor_id)::int as users,
      coalesce(sum(pageviews), 0)::int as views,
      count(*) filter (where private.analytics_channel_group(entry_referrer_host, utm_source, utm_medium) = 'Organic Search')::int as organic_sessions,
      count(*) filter (where private.analytics_referrer_group(entry_referrer_host, utm_source, utm_medium) = 'Direct / Unknown')::int as direct_sessions
    from private.web_analytics_sessions
    where first_seen >= previous_start
      and first_seen < current_start
  )
  select jsonb_build_object(
    'sessions', coalesce(c.sessions, 0),
    'users', coalesce(c.users, 0),
    'views', coalesce(c.views, 0),
    'organicSessions', coalesce(c.organic_sessions, 0),
    'directSessions', coalesce(c.direct_sessions, 0),
    'previousSessions', coalesce(p.sessions, 0),
    'previousOrganicSessions', coalesce(p.organic_sessions, 0),
    'organicDelta', coalesce(c.organic_sessions, 0) - coalesce(p.organic_sessions, 0)
  )
  into totals_data
  from current_all c cross join previous_all p;

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'requestedWindowDays', requested_window_days,
    'actualCoverageStart', coverage_start,
    'actualCoverageDays', case when coverage_start is null then 0 else round((coverage_seconds / 86400)::numeric, 2) end,
    'comparisonWindowDays', comparison_window_days,
    'comparisonPolicy', 'equal-length current vs previous windows bounded by actual first-party coverage',
    'currentWindowStart', current_start,
    'previousWindowStart', previous_start,
    'totals', totals_data,
    'priorityPages', priority_pages_data
  );
end;
$$;

revoke all on function public.get_phase4_seo_monitor(text) from public, anon;
grant execute on function public.get_phase4_seo_monitor(text) to authenticated;

notify pgrst, 'reload schema';
