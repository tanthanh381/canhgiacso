-- Security hardening: do not expose answer keys through the public Data API.
-- This migration is backward-compatible while the new web bundle is deployed.
begin;

create or replace function private.redact_site_content(source_content jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_set(
    source_content,
    '{scenarios}',
    coalesce((
      select jsonb_agg(
        (scenario_item - 'choices') || jsonb_build_object(
          'choices', coalesce((
            select jsonb_agg(choice_item - array['correct', 'moneyDelta', 'awarenessDelta', 'feedback'] order by choice_order)
            from jsonb_array_elements(scenario_item->'choices') with ordinality as choices(choice_item, choice_order)
          ), '[]'::jsonb)
        )
        order by scenario_order
      )
      from jsonb_array_elements(source_content->'scenarios') with ordinality as scenarios(scenario_item, scenario_order)
    ), '[]'::jsonb),
    true
  )
$$;
revoke all on function private.redact_site_content(jsonb) from public, anon, authenticated;

create or replace function public.get_public_site_content()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare payload jsonb;
begin
  select private.redact_site_content(content)
  into payload
  from public.site_content
  where slug = 'main' and published
  limit 1;
  return payload;
end
$$;
revoke all on function public.get_public_site_content() from public;
grant execute on function public.get_public_site_content() to anon, authenticated;

create or replace function public.get_managed_site_content()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare payload jsonb;
begin
  if not private.user_can_edit_content() then
    raise exception 'Content management access required' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug,
    'content', content,
    'updated_at', updated_at
  ) order by slug), '[]'::jsonb)
  into payload
  from public.site_content
  where slug in ('main', 'main-draft');
  return payload;
end
$$;
revoke all on function public.get_managed_site_content() from public, anon;
grant execute on function public.get_managed_site_content() to authenticated;

create or replace function public.save_managed_site_content(target_slug text, target_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); is_published boolean; saved_at timestamptz := clock_timestamp();
begin
  if not private.user_can_edit_content() then
    raise exception 'Content management access required' using errcode = '42501';
  end if;
  if target_slug not in ('main', 'main-draft') then
    raise exception 'Invalid content target' using errcode = '22023';
  end if;
  is_published := target_slug = 'main';
  if is_published and not private.user_is_app_admin() then
    raise exception 'Administrator access required to publish' using errcode = '42501';
  end if;
  if jsonb_typeof(target_content) <> 'object'
     or jsonb_typeof(target_content->'scenarios') <> 'array'
     or jsonb_array_length(target_content->'scenarios') < 1
     or pg_column_size(target_content) > 1048576 then
    raise exception 'Invalid site content' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(target_content->'scenarios') scenario_item
    where jsonb_typeof(scenario_item->'choices') <> 'array'
      or jsonb_array_length(scenario_item->'choices') <> 3
      or (select count(*) from jsonb_array_elements(scenario_item->'choices') choice_item
          where jsonb_typeof(choice_item->'correct') = 'boolean' and (choice_item->>'correct')::boolean) <> 1
  ) then
    raise exception 'Every scenario must contain three choices and one correct answer' using errcode = '22023';
  end if;

  insert into public.site_content(slug, content, published, updated_by, updated_at)
  values(target_slug, target_content, is_published, uid, saved_at)
  on conflict (slug) do update set
    content = excluded.content,
    published = excluded.published,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  return jsonb_build_object('slug', target_slug, 'updated_at', saved_at);
end
$$;
revoke all on function public.save_managed_site_content(text, jsonb) from public, anon;
grant execute on function public.save_managed_site_content(text, jsonb) to authenticated;

create or replace function private.evaluate_choice(scenario_id integer, choice_index integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare scenario_item jsonb; choice_item jsonb;
begin
  if choice_index is null or choice_index not between 0 and 2 then
    raise exception 'Invalid choice' using errcode = '22023';
  end if;
  select item into scenario_item
  from public.site_content content_row
  cross join lateral jsonb_array_elements(content_row.content->'scenarios') item
  where content_row.slug = 'main' and content_row.published
    and (item->>'id')::integer = scenario_id;
  if scenario_item is null then raise exception 'Scenario not found' using errcode = '22023'; end if;
  choice_item := scenario_item->'choices'->choice_index;
  if choice_item is null or jsonb_typeof(choice_item->'correct') <> 'boolean' then
    raise exception 'Invalid scenario content' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'scenarioId', scenario_id,
    'choiceIndex', choice_index,
    'correct', (choice_item->>'correct')::boolean,
    'moneyDelta', (choice_item->>'moneyDelta')::integer,
    'awarenessDelta', (choice_item->>'awarenessDelta')::integer,
    'feedback', choice_item->>'feedback'
  );
end
$$;
revoke all on function private.evaluate_choice(integer, integer) from public, anon, authenticated;

create or replace function public.evaluate_guest_choice(scenario_id integer, choice_index integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select private.evaluate_choice(scenario_id, choice_index) $$;
revoke all on function public.evaluate_guest_choice(integer, integer) from public;
grant execute on function public.evaluate_guest_choice(integer, integer) to anon, authenticated;

create or replace function private.submit_game_choice(expected_run uuid, scenario_id integer, choice_index integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); progress_row public.user_progress; scenario_item jsonb; outcome jsonb; target_rank integer;
begin
  if uid is null or not exists (
    select 1 from auth.sessions session_row
    where session_row.user_id = uid
      and session_row.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise exception 'Active sign-in required' using errcode = '42501'; end if;

  select * into progress_row from public.user_progress where user_id = uid for update;
  if not found or expected_run is distinct from progress_row.run_id then
    raise exception 'Run changed. Reload progress.' using errcode = '22023';
  end if;
  if exists(select 1 from public.test_attempts attempt_row where attempt_row.user_id = uid and attempt_row.scenario_id = submit_game_choice.scenario_id) then
    return private.game_state();
  end if;
  select item into scenario_item
  from public.site_content content_row
  cross join lateral jsonb_array_elements(content_row.content->'scenarios') item
  where content_row.slug = 'main' and content_row.published and (item->>'id')::integer = scenario_id;
  if scenario_item is null then raise exception 'Scenario not found' using errcode = '22023'; end if;

  target_rank := case scenario_item->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else null end;
  if target_rank is null then raise exception 'Invalid scenario difficulty' using errcode = '22023'; end if;
  if exists (
    select 1
    from public.site_content content_row
    cross join lateral jsonb_array_elements(content_row.content->'scenarios') lower_item
    where content_row.slug = 'main' and content_row.published
      and (case lower_item->>'difficulty' when 'Dễ' then 1 when 'Trung bình' then 2 when 'Khó' then 3 when 'Rất khó' then 4 else 99 end) < target_rank
      and not exists (
        select 1 from public.test_attempts completed_attempt
        where completed_attempt.user_id = uid
          and completed_attempt.scenario_id = (lower_item->>'id')::smallint
      )
  ) then raise exception 'Complete lower difficulty scenarios first' using errcode = '42501'; end if;

  outcome := private.evaluate_choice(scenario_id, choice_index);
  progress_row.balance := greatest(0, least(300000000, progress_row.balance + (outcome->>'moneyDelta')::integer));
  progress_row.awareness := greatest(0, least(100, progress_row.awareness + (outcome->>'awarenessDelta')::integer));
  insert into public.test_attempts(user_id, scenario_id, choice_index, correct, balance_after, awareness_after, server_verified)
  values(uid, scenario_id, choice_index, (outcome->>'correct')::boolean, progress_row.balance, progress_row.awareness, true);
  update public.user_progress set balance = progress_row.balance, awareness = progress_row.awareness, updated_at = now() where user_id = uid;
  perform private.ensure_training_certificate(uid, progress_row.run_id);
  return private.game_state() || jsonb_build_object('outcome', outcome);
end
$$;
revoke all on function private.submit_game_choice(uuid, integer, integer) from public, anon, authenticated;
grant execute on function private.submit_game_choice(uuid, integer, integer) to authenticated;

create or replace function public.submit_game_choice(expected_run uuid, scenario_id integer, choice_index integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_game_choice(expected_run, scenario_id, choice_index)
$$;
revoke all on function public.submit_game_choice(uuid, integer, integer) from public, anon;
grant execute on function public.submit_game_choice(uuid, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Run only after the new frontend is live:
-- revoke all on public.site_content from anon, authenticated;
-- revoke execute on function public.submit_game_choice(uuid, integer, integer, jsonb) from authenticated;
-- revoke execute on function private.submit_game_choice(uuid, integer, integer, jsonb) from authenticated;
