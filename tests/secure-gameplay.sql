-- Run inside a transaction after secure_gameplay.sql; always ROLLBACK.
-- Existing fixture account is selected without exposing any personal data.
select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from public.profiles limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare initial jsonb; fresh jsonb; after_answer jsonb; retried jsonb; after_reset jsonb; scenario jsonb; wrong_index integer;
begin
  initial := public.get_game_state();
  fresh := public.restart_game((initial->>'run_id')::uuid);
  select item into scenario from public.site_content c cross join lateral jsonb_array_elements(c.content->'scenarios') item where c.slug='main' and c.published limit 1;
  select ordinality::integer - 1 into wrong_index from jsonb_array_elements(scenario->'choices') with ordinality where not (value->>'correct')::boolean and (value->>'moneyDelta')::integer < 0 limit 1;
  after_answer := public.submit_game_choice((fresh->>'run_id')::uuid, (scenario->>'id')::integer, wrong_index, scenario);
  if jsonb_array_length(after_answer->'results') <> 1 or (after_answer->'results'->0->>'correct')::boolean then raise exception 'Scoring failed'; end if;
  if (after_answer->>'balance')::integer <> 300000000 + (scenario->'choices'->wrong_index->>'moneyDelta')::integer then raise exception 'Balance failed'; end if;
  retried := public.submit_game_choice((fresh->>'run_id')::uuid, (scenario->>'id')::integer, wrong_index, scenario);
  if retried <> after_answer then raise exception 'Retry charged twice'; end if;
  if has_table_privilege('authenticated', 'public.test_attempts', 'INSERT') or has_table_privilege('authenticated', 'public.user_progress', 'UPDATE') then raise exception 'Direct writes still allowed'; end if;
  after_reset := public.restart_game((fresh->>'run_id')::uuid);
  if jsonb_array_length(after_reset->'results') <> 0 or (after_reset->'history'->0->>'completed')::integer <> 1 then raise exception 'History lost'; end if;
  retried := public.restart_game((fresh->>'run_id')::uuid);
  if retried <> after_reset then raise exception 'Restart not idempotent'; end if;
  begin
    perform public.submit_game_choice((fresh->>'run_id')::uuid, (scenario->>'id')::integer, wrong_index, scenario);
    raise exception 'Old run accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_game_choice((after_reset->>'run_id')::uuid, (scenario->>'id')::integer, 99, scenario);
    raise exception 'Invalid answer accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.submit_game_choice((after_reset->>'run_id')::uuid, (scenario->>'id')::integer, wrong_index, jsonb_set(scenario, '{title}', '"tampered"'));
    raise exception 'Modified scenario accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select 'PASS: server scoring, atomic balance, duplicate retry, restricted writes, preserved history, idempotent reset, stale run, invalid answer, modified content' as tests;
