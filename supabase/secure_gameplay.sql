-- Server-authoritative scoring. Apply after schema.sql. Existing results remain intact.
begin;
alter table public.user_progress add column if not exists run_id uuid not null default gen_random_uuid();
alter table public.test_attempts add column if not exists server_verified boolean not null default false;
create table if not exists private.game_history (
  run_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  finished_at timestamptz not null default clock_timestamp(),
  balance integer not null,
  awareness integer not null,
  attempts jsonb not null
);
create index if not exists game_history_user_idx on private.game_history(user_id);
alter table private.game_history enable row level security;
revoke all on private.game_history from public, anon, authenticated;

create or replace function private.game_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); payload jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select jsonb_build_object('run_id', p.run_id, 'balance', p.balance, 'awareness', p.awareness,
    'results', coalesce((select jsonb_agg(jsonb_build_object('scenarioId', a.scenario_id, 'choiceIndex', a.choice_index, 'correct', a.correct) order by a.attempted_at, a.scenario_id) from public.test_attempts a where a.user_id = uid), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(h.item order by h.finished_at desc) from (
      select finished_at, jsonb_build_object('runId', run_id, 'finishedAt', finished_at, 'balance', balance,
        'completed', jsonb_array_length(attempts), 'correct', (select count(*) from jsonb_array_elements(attempts) a where (a->>'correct')::boolean)) item
      from private.game_history where user_id = uid order by finished_at desc limit 50
    ) h), '[]'::jsonb)) into payload from public.user_progress p where user_id = uid;
  if payload is null then raise exception 'Progress not found'; end if;
  return payload;
end $$;

create or replace function private.submit_game_choice(expected_run uuid, scenario_id integer, choice_index integer, scenario_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.user_progress; s jsonb; c jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into p from public.user_progress where user_id = uid for update;
  if not found or expected_run is distinct from p.run_id then raise exception 'Run changed. Reload progress.' using errcode = '22023'; end if;
  -- Retries return the already committed state and never charge twice.
  if exists(select 1 from public.test_attempts a where a.user_id = uid and a.scenario_id = submit_game_choice.scenario_id) then return private.game_state(); end if;
  select item into s from public.site_content t cross join lateral jsonb_array_elements(t.content->'scenarios') item
    where t.slug = 'main' and t.published and (item->>'id')::integer = scenario_id;
  if s is null or s is distinct from scenario_snapshot then raise exception 'Content changed. Reload the scenario.' using errcode = '22023'; end if;
  if choice_index is null or choice_index not between 0 and 2 then raise exception 'Invalid choice' using errcode = '22023'; end if;
  c := s->'choices'->choice_index;
  if c is null or jsonb_typeof(c->'correct') <> 'boolean' then raise exception 'Invalid scenario'; end if;
  p.balance := greatest(0, least(300000000, p.balance + (c->>'moneyDelta')::integer));
  p.awareness := greatest(0, least(100, p.awareness + (c->>'awarenessDelta')::integer));
  insert into public.test_attempts(user_id, scenario_id, choice_index, correct, balance_after, awareness_after, server_verified)
    values(uid, scenario_id, choice_index, (c->>'correct')::boolean, p.balance, p.awareness, true);
  update public.user_progress set balance = p.balance, awareness = p.awareness, updated_at = now() where user_id = uid;
  return private.game_state();
end $$;

create or replace function private.restart_game(expected_run uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p public.user_progress;
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into p from public.user_progress where user_id = uid for update;
  if not found then raise exception 'Progress not found'; end if;
  if expected_run is distinct from p.run_id then return private.game_state(); end if;
  insert into private.game_history(run_id, user_id, balance, awareness, attempts)
    select p.run_id, uid, p.balance, p.awareness, coalesce(jsonb_agg(to_jsonb(a) order by a.attempted_at), '[]'::jsonb)
    from public.test_attempts a where a.user_id = uid;
  delete from public.test_attempts where user_id = uid;
  update public.user_progress set run_id = gen_random_uuid(), balance = 300000000, awareness = 100, updated_at = now() where user_id = uid;
  return private.game_state();
end $$;

revoke all on function private.game_state(), private.submit_game_choice(uuid, integer, integer, jsonb), private.restart_game(uuid) from public, anon, authenticated;
grant execute on function private.game_state(), private.submit_game_choice(uuid, integer, integer, jsonb), private.restart_game(uuid) to authenticated;
create or replace function public.get_game_state() returns jsonb language sql security invoker set search_path = '' as $$ select private.game_state() $$;
create or replace function public.submit_game_choice(expected_run uuid, scenario_id integer, choice_index integer, scenario_snapshot jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select private.submit_game_choice(expected_run, scenario_id, choice_index, scenario_snapshot) $$;
create or replace function public.restart_game(expected_run uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.restart_game(expected_run) $$;
revoke all on function public.get_game_state(), public.submit_game_choice(uuid, integer, integer, jsonb), public.restart_game(uuid) from public, anon;
grant execute on function public.get_game_state(), public.submit_game_choice(uuid, integer, integer, jsonb), public.restart_game(uuid) to authenticated;
-- RLS alone controls ownership, not integrity. Only the scorer may write results.
revoke insert, update, delete on public.test_attempts, public.user_progress from anon, authenticated;

create or replace function private.training_history_summary()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.user_is_app_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'runs', (select count(*) from private.game_history),
    'attempts', (select coalesce(sum(jsonb_array_length(attempts)), 0) from private.game_history),
    'correct', (select count(*) from private.game_history h cross join lateral jsonb_array_elements(h.attempts) a where (a->>'correct')::boolean),
    'legacyAttempts', (select count(*) from public.test_attempts where not server_verified) +
      (select count(*) from private.game_history h cross join lateral jsonb_array_elements(h.attempts) a where not coalesce((a->>'server_verified')::boolean, false))
  );
end $$;
revoke all on function private.training_history_summary() from public, anon;
grant execute on function private.training_history_summary() to authenticated;
create or replace function public.get_training_history_summary() returns jsonb language sql security invoker set search_path = '' as $$ select private.training_history_summary() $$;
revoke all on function public.get_training_history_summary() from public, anon;
grant execute on function public.get_training_history_summary() to authenticated;
commit;
