-- Daily per-user counter for the AI scam-check mode. It stores only a count:
-- the text users submit is never written to the database.
create table if not exists private.scam_check_usage (
  user_id uuid not null,
  usage_date date not null default (now() at time zone 'utc')::date,
  used integer not null default 0,
  primary key (user_id, usage_date)
);

create or replace function public.consume_scam_check_quota(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_used integer;
begin
  insert into private.scam_check_usage as u (user_id, usage_date, used)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date) do update set used = u.used + 1
  returning u.used into current_used;
  return current_used <= p_limit;
end;
$$;

revoke all on function public.consume_scam_check_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_scam_check_quota(uuid, integer) to service_role;

delete from private.scam_check_usage where usage_date < (now() at time zone 'utc')::date - 7;
notify pgrst, 'reload schema';
