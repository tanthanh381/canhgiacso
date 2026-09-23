-- P0 follow-up: make future Data API exposure opt-in and make private
-- analytics denial explicit for auditability.

drop policy if exists web_analytics_sessions_no_direct_access on private.web_analytics_sessions;
create policy web_analytics_sessions_no_direct_access
on private.web_analytics_sessions
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists web_analytics_pageviews_no_direct_access on private.web_analytics_pageviews;
create policy web_analytics_pageviews_no_direct_access
on private.web_analytics_pageviews
for all
to anon, authenticated
using (false)
with check (false);

revoke execute on function public.record_web_analytics_event_v4(
  text,text,text,text,text,text,text,text,text,text,text,text
) from authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

notify pgrst, 'reload schema';
