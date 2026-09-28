create table if not exists private.web_analytics_sessions (
  session_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  entry_path text not null,
  last_path text not null,
  entry_referrer_host text,
  pageviews integer not null default 0 check (pageviews >= 0)
);

create table if not exists private.web_analytics_pageviews (
  id bigint generated always as identity primary key,
  session_id uuid not null references private.web_analytics_sessions(session_id) on delete cascade,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists web_analytics_sessions_last_seen_idx on private.web_analytics_sessions(last_seen desc);
create index if not exists web_analytics_sessions_first_seen_idx on private.web_analytics_sessions(first_seen desc);
create index if not exists web_analytics_pageviews_viewed_at_idx on private.web_analytics_pageviews(viewed_at desc);
create index if not exists web_analytics_pageviews_path_viewed_at_idx on private.web_analytics_pageviews(path, viewed_at desc);
create index if not exists web_analytics_pageviews_session_viewed_at_idx on private.web_analytics_pageviews(session_id, viewed_at desc);

alter table private.web_analytics_sessions enable row level security;
alter table private.web_analytics_pageviews enable row level security;
revoke all on private.web_analytics_sessions from public, anon, authenticated;
revoke all on private.web_analytics_pageviews from public, anon, authenticated;

create or replace function public.record_web_analytics_event(
  p_session_id text,
  p_path text,
  p_referrer_host text default null,
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
  normalized_path text;
  normalized_referrer text;
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
  begin
    normalized_session := p_session_id::uuid;
  exception when invalid_text_representation then return;
  end;

  normalized_path := split_part(split_part(coalesce(p_path, '/'), '?', 1), '#', 1);
  normalized_path := left(normalized_path, 512);
  if normalized_path = '' or normalized_path !~ '^/' then normalized_path := '/'; end if;

  normalized_referrer := nullif(left(lower(trim(coalesce(p_referrer_host, ''))), 255), '');
  if normalized_referrer is not null and normalized_referrer !~ '^[a-z0-9.-]+$' then normalized_referrer := null; end if;
  if normalized_referrer in ('canhgiacso.com', 'www.canhgiacso.com') then normalized_referrer := null; end if;
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
    session_id, first_seen, last_seen, entry_path, last_path, entry_referrer_host, pageviews
  ) values (
    normalized_session, now(), now(), normalized_path, normalized_path, normalized_referrer,
    case when should_count then 1 else 0 end
  )
  on conflict (session_id) do update set
    last_seen = now(),
    last_path = excluded.last_path,
    pageviews = private.web_analytics_sessions.pageviews + case when should_count then 1 else 0 end;

  if should_count then
    insert into private.web_analytics_pageviews(session_id, path, viewed_at)
    values (normalized_session, normalized_path, now());
  end if;
end;
$$;

revoke all on function public.record_web_analytics_event(text, text, text, text) from public;
grant execute on function public.record_web_analytics_event(text, text, text, text) to anon, authenticated;

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
        then to_char(date_trunc('hour', viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:00')
        else to_char(date_trunc('day', viewed_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD')
      end as bucket,
      count(*)::int as views,
      count(distinct session_id)::int as visitors
    from private.web_analytics_pageviews
    where viewed_at >= window_start
    group by 1
  ) series_rows;

  select coalesce(jsonb_agg(to_jsonb(page_rows) order by page_rows.views desc, page_rows.path), '[]'::jsonb)
  into top_pages_data
  from (
    select path, count(*)::int as views, count(distinct session_id)::int as visitors
    from private.web_analytics_pageviews
    where viewed_at >= window_start
    group by path
    order by count(*) desc, path
    limit 12
  ) page_rows;

  select coalesce(jsonb_agg(to_jsonb(source_rows) order by source_rows.visitors desc, source_rows.source), '[]'::jsonb)
  into source_data
  from (
    select coalesce(entry_referrer_host, 'Trực tiếp / không xác định') as source, count(*)::int as visitors
    from private.web_analytics_sessions
    where first_seen >= window_start
    group by coalesce(entry_referrer_host, 'Trực tiếp / không xác định')
    order by count(*) desc
    limit 10
  ) source_rows;

  select coalesce(jsonb_agg(to_jsonb(live_rows) order by live_rows.active_visitors desc, live_rows.path), '[]'::jsonb)
  into live_pages_data
  from (
    select last_path as path, count(*)::int as active_visitors
    from private.web_analytics_sessions
    where last_seen >= now() - interval '5 minutes'
    group by last_path
    order by count(*) desc, last_path
    limit 10
  ) live_rows;

  return jsonb_build_object(
    'generatedAt', now(),
    'window', normalized_window,
    'onlineNow', (select count(*)::int from private.web_analytics_sessions where last_seen >= now() - interval '5 minutes'),
    'pageviewsToday', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'uniqueVisitorsToday', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= today_start),
    'pageviewsWindow', (select count(*)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'uniqueVisitorsWindow', (select count(distinct session_id)::int from private.web_analytics_pageviews where viewed_at >= window_start),
    'series', series_data,
    'topPages', top_pages_data,
    'sources', source_data,
    'livePages', live_pages_data
  );
end;
$$;

revoke all on function public.get_web_analytics_dashboard(text) from public, anon;
grant execute on function public.get_web_analytics_dashboard(text) to authenticated;

notify pgrst, 'reload schema';
