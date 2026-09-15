alter table private.web_analytics_sessions
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

alter table private.web_analytics_sessions
  drop constraint if exists web_analytics_sessions_utm_source_check;
alter table private.web_analytics_sessions
  add constraint web_analytics_sessions_utm_source_check check (utm_source is null or length(utm_source) <= 80);
alter table private.web_analytics_sessions
  drop constraint if exists web_analytics_sessions_utm_medium_check;
alter table private.web_analytics_sessions
  add constraint web_analytics_sessions_utm_medium_check check (utm_medium is null or length(utm_medium) <= 80);
alter table private.web_analytics_sessions
  drop constraint if exists web_analytics_sessions_utm_campaign_check;
alter table private.web_analytics_sessions
  add constraint web_analytics_sessions_utm_campaign_check check (utm_campaign is null or length(utm_campaign) <= 120);

create index if not exists web_analytics_sessions_campaign_idx
  on private.web_analytics_sessions(utm_campaign) where utm_campaign is not null;

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
    when private.is_google_referrer(p_referrer_host) then 'Organic Search'
    when lower(coalesce(p_referrer_host, '')) ~ '(^|[.])(bing[.]com|duckduckgo[.]com|search[.]yahoo[.]com|yandex[.])' then 'Organic Search'
    when lower(coalesce(p_utm_medium, '')) in ('social','social-network','social_media','social-media') then 'Social'
    when lower(coalesce(p_referrer_host, '')) ~ '(^|[.])(facebook[.]com|instagram[.]com|linkedin[.]com|tiktok[.]com|twitter[.]com|x[.]com)$' then 'Social'
    when lower(coalesce(p_utm_medium, '')) in ('email','e-mail') then 'Email'
    when p_utm_source is not null or p_utm_medium is not null then 'Campaign'
    when p_referrer_host is null then 'Direct / Unknown'
    else 'Referral'
  end;
$$;

create or replace function public.record_web_analytics_event_v4(
  p_session_id text,
  p_visitor_id text,
  p_path text,
  p_referrer_host text default null,
  p_browser text default null,
  p_operating_system text default null,
  p_device_type text default null,
  p_country_code text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
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
  normalized_utm_source text;
  normalized_utm_medium text;
  normalized_utm_campaign text;
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

  normalized_utm_source := nullif(left(lower(regexp_replace(trim(coalesce(p_utm_source, '')), '[[:cntrl:]]', '', 'g')), 80), '');
  normalized_utm_medium := nullif(left(lower(regexp_replace(trim(coalesce(p_utm_medium, '')), '[[:cntrl:]]', '', 'g')), 80), '');
  normalized_utm_campaign := nullif(left(regexp_replace(trim(coalesce(p_utm_campaign, '')), '[[:cntrl:]]', '', 'g'), 120), '');

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
    entry_referrer_host, browser, operating_system, device_type, country_code,
    utm_source, utm_medium, utm_campaign, pageviews
  ) values (
    normalized_session, normalized_visitor, now(), now(), normalized_path, normalized_path,
    normalized_referrer, normalized_browser, normalized_os, normalized_device, normalized_country,
    normalized_utm_source, normalized_utm_medium, normalized_utm_campaign,
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
    utm_source = coalesce(private.web_analytics_sessions.utm_source, excluded.utm_source),
    utm_medium = coalesce(private.web_analytics_sessions.utm_medium, excluded.utm_medium),
    utm_campaign = coalesce(private.web_analytics_sessions.utm_campaign, excluded.utm_campaign),
    pageviews = private.web_analytics_sessions.pageviews + case when should_count then 1 else 0 end;

  if should_count then
    insert into private.web_analytics_pageviews(session_id, path, viewed_at)
    values (normalized_session, normalized_path, now());
  end if;
end;
$$;

revoke all on function public.record_web_analytics_event_v4(text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.record_web_analytics_event_v4(text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.get_web_analytics_insights(p_window text default '24h')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_window text := lower(trim(coalesce(p_window, '24h')));
  window_length interval;
  window_start timestamptz;
  previous_start timestamptz;
  previous_data jsonb;
  behavior_data jsonb;
  landing_data jsonb;
  exit_data jsonb;
  channel_data jsonb;
  campaign_data jsonb;
  duration_data jsonb;
begin
  if not (select private.user_is_app_admin()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  case normalized_window
    when '7d' then window_length := interval '7 days';
    when '30d' then window_length := interval '30 days';
    when '90d' then window_length := interval '90 days';
    else normalized_window := '24h'; window_length := interval '24 hours';
  end case;
  window_start := now() - window_length;
  previous_start := window_start - window_length;

  with current_sessions as (
    select s.*, greatest(0, extract(epoch from (s.last_seen - s.first_seen))) as duration_sec
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
  )
  select jsonb_build_object(
    'pagesPerSession', coalesce(round(avg(pageviews)::numeric, 2), 0),
    'avgSessionDurationSeconds', coalesce(round(avg(duration_sec)::numeric, 1), 0),
    'engagedSessions', count(*) filter (where pageviews >= 2 or duration_sec >= 10)::int,
    'engagementRate', case when count(*) > 0 then round((count(*) filter (where pageviews >= 2 or duration_sec >= 10)::numeric / count(*)::numeric) * 100, 1) else 0 end,
    'bounceRate', case when count(*) > 0 then round((count(*) filter (where pageviews < 2 and duration_sec < 10)::numeric / count(*)::numeric) * 100, 1) else 0 end,
    'sessions', count(*)::int
  ) into behavior_data
  from current_sessions;

  with previous_sessions as (
    select s.*, greatest(0, extract(epoch from (s.last_seen - s.first_seen))) as duration_sec
    from private.web_analytics_sessions s
    where s.first_seen >= previous_start and s.first_seen < window_start
  ), previous_users as (
    select count(distinct s.visitor_id)::int as users
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= previous_start and p.viewed_at < window_start and s.visitor_id is not null
  ), previous_views as (
    select count(*)::int as views, count(distinct session_id)::int as sessions
    from private.web_analytics_pageviews
    where viewed_at >= previous_start and viewed_at < window_start
  )
  select jsonb_build_object(
    'users', (select users from previous_users),
    'sessions', (select sessions from previous_views),
    'pageviews', (select views from previous_views),
    'pagesPerSession', coalesce(round(avg(pageviews)::numeric, 2), 0),
    'avgSessionDurationSeconds', coalesce(round(avg(duration_sec)::numeric, 1), 0),
    'engagedSessions', count(*) filter (where pageviews >= 2 or duration_sec >= 10)::int,
    'engagementRate', case when count(*) > 0 then round((count(*) filter (where pageviews >= 2 or duration_sec >= 10)::numeric / count(*)::numeric) * 100, 1) else 0 end
  ) into previous_data
  from previous_sessions;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.sessions desc, rows.views desc, rows.path), '[]'::jsonb)
  into landing_data
  from (
    select
      s.entry_path as path,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views,
      count(*) filter (where s.pageviews >= 2 or s.last_seen - s.first_seen >= interval '10 seconds')::int as engaged_sessions,
      coalesce(round(avg(greatest(0, extract(epoch from (s.last_seen - s.first_seen))))::numeric, 1), 0) as avg_duration_seconds
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by s.entry_path
    order by count(*) desc, sum(s.pageviews) desc
    limit 15
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.sessions desc, rows.path), '[]'::jsonb)
  into exit_data
  from (
    select
      s.last_path as path,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by s.last_path
    order by count(*) desc, s.last_path
    limit 15
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.sessions desc, rows.name), '[]'::jsonb)
  into channel_data
  from (
    select
      private.analytics_channel_group(s.entry_referrer_host, s.utm_source, s.utm_medium) as name,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
    group by 1
    order by count(*) desc
  ) rows;

  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.sessions desc, rows.campaign, rows.source), '[]'::jsonb)
  into campaign_data
  from (
    select
      coalesce(s.utm_campaign, '(not set)') as campaign,
      coalesce(s.utm_source, '(not set)') as source,
      coalesce(s.utm_medium, '(not set)') as medium,
      count(*)::int as sessions,
      count(distinct s.visitor_id)::int as users,
      coalesce(sum(s.pageviews), 0)::int as views
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
      and (s.utm_source is not null or s.utm_medium is not null or s.utm_campaign is not null)
    group by s.utm_campaign, s.utm_source, s.utm_medium
    order by count(*) desc
    limit 20
  ) rows;

  with bucketed as (
    select case
      when s.last_seen - s.first_seen < interval '10 seconds' then '0–9 giây'
      when s.last_seen - s.first_seen < interval '30 seconds' then '10–29 giây'
      when s.last_seen - s.first_seen < interval '1 minute' then '30–59 giây'
      when s.last_seen - s.first_seen < interval '5 minutes' then '1–4 phút'
      else '5+ phút'
    end as bucket,
    case
      when s.last_seen - s.first_seen < interval '10 seconds' then 1
      when s.last_seen - s.first_seen < interval '30 seconds' then 2
      when s.last_seen - s.first_seen < interval '1 minute' then 3
      when s.last_seen - s.first_seen < interval '5 minutes' then 4
      else 5
    end as sort_order
    from private.web_analytics_sessions s
    where s.first_seen >= window_start
  )
  select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'sessions', sessions) order by sort_order), '[]'::jsonb)
  into duration_data
  from (
    select bucket, sort_order, count(*)::int as sessions
    from bucketed
    group by bucket, sort_order
  ) rows;

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'behavior', behavior_data,
    'previousPeriod', previous_data,
    'landingPages', landing_data,
    'exitPages', exit_data,
    'channels', channel_data,
    'campaigns', campaign_data,
    'durationBuckets', duration_data
  );
end;
$$;

revoke all on function public.get_web_analytics_insights(text) from public, anon;
grant execute on function public.get_web_analytics_insights(text) to authenticated;

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
    select coalesce(s.country_code, 'ZZ') as code,
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
    select coalesce(s.country_code, 'ZZ') as code,
      count(distinct s.visitor_id)::int as users,
      count(distinct p.session_id)::int as sessions,
      count(*)::int as views,
      count(distinct p.session_id) filter (where s.visitor_id is null)::int as legacy_sessions
    from private.web_analytics_pageviews p
    join private.web_analytics_sessions s on s.session_id = p.session_id
    where p.viewed_at >= window_start
      and private.is_google_referrer(s.entry_referrer_host)
    group by coalesce(s.country_code, 'ZZ')
    order by users desc, views desc
    limit 20
  ) rows;

  return jsonb_build_object(
    'generatedAt', now(), 'window', normalized_window,
    'totalSessions', (select count(distinct p.session_id)::int from private.web_analytics_pageviews p where p.viewed_at >= window_start),
    'knownCountrySessions', (select count(distinct p.session_id)::int from private.web_analytics_pageviews p join private.web_analytics_sessions s on s.session_id=p.session_id where p.viewed_at>=window_start and s.country_code is not null),
    'knownCountryUsers', (select count(distinct s.visitor_id)::int from private.web_analytics_pageviews p join private.web_analytics_sessions s on s.session_id=p.session_id where p.viewed_at>=window_start and s.country_code is not null and s.visitor_id is not null),
    'countries', country_data, 'googleCountries', google_country_data
  );
end;
$$;

revoke all on function public.get_country_traffic_dashboard(text) from public, anon;
grant execute on function public.get_country_traffic_dashboard(text) to authenticated;

notify pgrst, 'reload schema';
