-- Server-issued certificates. Apply after secure_gameplay.sql and profile/auth setup.
begin;

create table if not exists private.training_certificates (
  id uuid primary key,
  certificate_code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  issued_at timestamptz not null default clock_timestamp(),
  display_name text not null,
  username text not null,
  scenario_total smallint not null check (scenario_total between 1 and 100),
  completed smallint not null check (completed between 1 and 100),
  correct smallint not null check (correct between 0 and 100),
  accuracy smallint not null check (accuracy between 0 and 100),
  score integer not null check (score >= 0),
  rating text not null check (rating in ('ĐẠT CƠ BẢN', 'ĐẠT', 'TỐT', 'XUẤT SẮC')),
  unique (user_id, run_id)
);
create index if not exists training_certificates_user_issued_idx
  on private.training_certificates(user_id, issued_at desc);
alter table private.training_certificates enable row level security;
revoke all on private.training_certificates from public, anon, authenticated;

create or replace function private.ensure_training_certificate(target_uid uuid, target_run uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  scenario_total integer;
  completed_count integer;
  correct_count integer;
  accuracy_value integer;
  score_value integer;
  rating_value text;
  profile_row public.profiles;
  certificate_id uuid;
begin
  select c.total into scenario_total
  from (
    select jsonb_array_length(content->'scenarios') as total
    from public.site_content
    where slug = 'main' and published
    limit 1
  ) c;
  if scenario_total is null or scenario_total < 1 then return null; end if;

  if not exists (
    select 1 from public.user_progress p
    where p.user_id = target_uid and p.run_id = target_run
  ) then return null; end if;

  select count(*), count(*) filter (where a.correct),
    coalesce(sum(case when a.correct then 120 else 20 end), 0)
  into completed_count, correct_count, score_value
  from public.test_attempts a
  where a.user_id = target_uid and a.server_verified;

  if completed_count < scenario_total then return null; end if;
  accuracy_value := round((correct_count::numeric / scenario_total::numeric) * 100)::integer;
  rating_value := case
    when accuracy_value >= 90 then 'XUẤT SẮC'
    when accuracy_value >= 80 then 'TỐT'
    when accuracy_value >= 70 then 'ĐẠT'
    else 'ĐẠT CƠ BẢN'
  end;
  select * into profile_row from public.profiles where id = target_uid;
  if not found then return null; end if;

  select id into certificate_id
  from private.training_certificates
  where user_id = target_uid and run_id = target_run;
  if certificate_id is not null then return certificate_id; end if;

  certificate_id := gen_random_uuid();
  insert into private.training_certificates(
    id, certificate_code, user_id, run_id, display_name, username,
    scenario_total, completed, correct, accuracy, score, rating
  ) values (
    certificate_id,
    'CGS-' || to_char(clock_timestamp(), 'YYYY') || '-' || upper(substr(replace(certificate_id::text, '-', ''), 1, 10)),
    target_uid, target_run, profile_row.display_name, profile_row.username,
    scenario_total, scenario_total, correct_count, accuracy_value, score_value, rating_value
  )
  on conflict (user_id, run_id) do nothing;

  select id into certificate_id
  from private.training_certificates
  where user_id = target_uid and run_id = target_run;
  return certificate_id;
end $$;
revoke all on function private.ensure_training_certificate(uuid, uuid) from public, anon, authenticated;

create or replace function private.issue_training_certificate(expected_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); certificate_id uuid; payload jsonb;
begin
  if uid is null or not exists (
    select 1 from auth.sessions s
    where s.user_id = uid and s.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise exception 'Active sign-in required' using errcode = '42501'; end if;

  if not exists (
    select 1 from public.user_progress p
    where p.user_id = uid and p.run_id = expected_run
  ) then raise exception 'Run changed. Reload progress.' using errcode = '22023'; end if;

  certificate_id := private.ensure_training_certificate(uid, expected_run);
  if certificate_id is null then
    raise exception 'Complete all training scenarios before requesting a certificate' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'certificateId', c.id,
    'certificateCode', c.certificate_code,
    'runId', c.run_id,
    'issuedAt', c.issued_at,
    'displayName', c.display_name,
    'username', c.username,
    'scenarioTotal', c.scenario_total,
    'completed', c.completed,
    'correct', c.correct,
    'accuracy', c.accuracy,
    'score', c.score,
    'rating', c.rating
  ) into payload
  from private.training_certificates c
  where c.id = certificate_id and c.user_id = uid;
  return payload;
end $$;

create or replace function private.get_my_training_certificates()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); payload jsonb;
begin
  if uid is null or not exists (
    select 1 from auth.sessions s
    where s.user_id = uid and s.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise exception 'Active sign-in required' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(item order by issued_at desc), '[]'::jsonb) into payload
  from (
    select c.issued_at, jsonb_build_object(
      'certificateId', c.id,
      'certificateCode', c.certificate_code,
      'runId', c.run_id,
      'issuedAt', c.issued_at,
      'displayName', c.display_name,
      'username', c.username,
      'scenarioTotal', c.scenario_total,
      'completed', c.completed,
      'correct', c.correct,
      'accuracy', c.accuracy,
      'score', c.score,
      'rating', c.rating
    ) as item
    from private.training_certificates c
    where c.user_id = uid
    order by c.issued_at desc
    limit 20
  ) recent;
  return payload;
end $$;

revoke all on function private.issue_training_certificate(uuid), private.get_my_training_certificates() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.issue_training_certificate(uuid), private.get_my_training_certificates() to authenticated;

create or replace function public.issue_training_certificate(expected_run uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.issue_training_certificate(expected_run)
$$;
create or replace function public.get_my_training_certificates()
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_my_training_certificates()
$$;
revoke all on function public.issue_training_certificate(uuid), public.get_my_training_certificates() from public, anon;
grant execute on function public.issue_training_certificate(uuid), public.get_my_training_certificates() to authenticated;

-- Ensure the final verified answer automatically issues the certificate.
create or replace function private.submit_game_choice(expected_run uuid, scenario_id integer, choice_index integer, scenario_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.user_progress; s jsonb; c jsonb; target_rank integer;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into p from public.user_progress where user_id = uid for update;
  if not found or expected_run is distinct from p.run_id then raise exception 'Run changed. Reload progress.' using errcode = '22023'; end if;
  if exists(select 1 from public.test_attempts a where a.user_id = uid and a.scenario_id = submit_game_choice.scenario_id) then return private.game_state(); end if;
  select item into s from public.site_content t cross join lateral jsonb_array_elements(t.content->'scenarios') item
    where t.slug = 'main' and t.published and (item->>'id')::integer = scenario_id;
  if s is null or s is distinct from scenario_snapshot then raise exception 'Content changed. Reload the scenario.' using errcode = '22023'; end if;
  target_rank := case s->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else null end;
  if target_rank is null then raise exception 'Invalid scenario difficulty' using errcode = '22023'; end if;
  if exists (
    select 1
    from public.site_content t
    cross join lateral jsonb_array_elements(t.content->'scenarios') lower_item
    where t.slug = 'main' and t.published
      and (case lower_item->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else 99 end) < target_rank
      and not exists (
        select 1 from public.test_attempts completed_attempt
        where completed_attempt.user_id = uid
          and completed_attempt.scenario_id = (lower_item->>'id')::smallint
      )
  ) then raise exception 'Complete lower difficulty scenarios first' using errcode = '42501'; end if;
  if choice_index is null or choice_index not between 0 and 2 then raise exception 'Invalid choice' using errcode = '22023'; end if;
  c := s->'choices'->choice_index;
  if c is null or jsonb_typeof(c->'correct') <> 'boolean' then raise exception 'Invalid scenario'; end if;
  p.balance := greatest(0, least(300000000, p.balance + (c->>'moneyDelta')::integer));
  p.awareness := greatest(0, least(100, p.awareness + (c->>'awarenessDelta')::integer));
  insert into public.test_attempts(user_id, scenario_id, choice_index, correct, balance_after, awareness_after, server_verified)
    values(uid, scenario_id, choice_index, (c->>'correct')::boolean, p.balance, p.awareness, true);
  update public.user_progress set balance = p.balance, awareness = p.awareness, updated_at = now() where user_id = uid;
  perform private.ensure_training_certificate(uid, p.run_id);
  return private.game_state();
end $$;

-- Preserve a certificate before a completed run is archived and restarted.
create or replace function private.restart_game(expected_run uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.user_progress;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into p from public.user_progress where user_id = uid for update;
  if not found then raise exception 'Progress not found'; end if;
  if expected_run is distinct from p.run_id then return private.game_state(); end if;
  perform private.ensure_training_certificate(uid, p.run_id);
  insert into private.game_history(run_id, user_id, balance, awareness, attempts)
    select p.run_id, uid, p.balance, p.awareness, coalesce(jsonb_agg(to_jsonb(a) order by a.attempted_at), '[]'::jsonb)
    from public.test_attempts a where a.user_id = uid;
  delete from public.test_attempts where user_id = uid;
  update public.user_progress set run_id = gen_random_uuid(), balance = 300000000, awareness = 100, updated_at = now() where user_id = uid;
  return private.game_state();
end $$;

-- Backfill certificates for already-completed current runs.
with total as (
  select jsonb_array_length(content->'scenarios')::integer as scenario_total
  from public.site_content where slug = 'main' and published limit 1
), eligible as (
  select p.user_id, p.run_id, pr.display_name, pr.username, t.scenario_total,
    count(*)::integer as completed,
    count(*) filter (where a.correct)::integer as correct,
    coalesce(sum(case when a.correct then 120 else 20 end), 0)::integer as score,
    gen_random_uuid() as certificate_id
  from public.user_progress p
  join public.profiles pr on pr.id = p.user_id
  join public.test_attempts a on a.user_id = p.user_id and a.server_verified
  cross join total t
  group by p.user_id, p.run_id, pr.display_name, pr.username, t.scenario_total
  having count(*) >= t.scenario_total
)
insert into private.training_certificates(
  id, certificate_code, user_id, run_id, display_name, username,
  scenario_total, completed, correct, accuracy, score, rating
)
select e.certificate_id,
  'CGS-' || to_char(clock_timestamp(), 'YYYY') || '-' || upper(substr(replace(e.certificate_id::text, '-', ''), 1, 10)),
  e.user_id, e.run_id, e.display_name, e.username, e.scenario_total, e.scenario_total, e.correct,
  round((e.correct::numeric / e.scenario_total::numeric) * 100)::integer,
  e.score,
  case
    when round((e.correct::numeric / e.scenario_total::numeric) * 100) >= 90 then 'XUẤT SẮC'
    when round((e.correct::numeric / e.scenario_total::numeric) * 100) >= 80 then 'TỐT'
    when round((e.correct::numeric / e.scenario_total::numeric) * 100) >= 70 then 'ĐẠT'
    else 'ĐẠT CƠ BẢN'
  end
from eligible e
on conflict (user_id, run_id) do nothing;

notify pgrst, 'reload schema';
commit;
