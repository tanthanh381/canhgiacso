create or replace function private.get_ciso_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  payload jsonb;
begin
  if not (select private.user_is_app_admin()) then
    raise exception 'CISO access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', coalesce((
      select jsonb_agg(to_jsonb(user_rows) order by user_rows.risk_rank, user_rows.display_name)
      from (
        select
          profile_row.username,
          profile_row.display_name,
          profile_row.created_at,
          count(attempt_row.scenario_id)::integer as completed,
          count(attempt_row.scenario_id) filter (where attempt_row.correct)::integer as correct,
          count(attempt_row.scenario_id) filter (where attempt_row.scenario_id between 43 and 48)::integer as advanced_completed,
          count(attempt_row.scenario_id) filter (where attempt_row.scenario_id between 43 and 48 and attempt_row.correct)::integer as advanced_correct,
          max(attempt_row.attempted_at) filter (where attempt_row.scenario_id between 43 and 48) as advanced_completed_at,
          case when count(attempt_row.scenario_id) = 0 then 0
            else round(100.0 * count(attempt_row.scenario_id) filter (where attempt_row.correct) / count(attempt_row.scenario_id))::integer
          end as accuracy,
          coalesce(progress_row.awareness, 100)::integer as awareness,
          coalesce(progress_row.balance, 300000000)::integer as balance,
          greatest(0, 300000000 - coalesce(progress_row.balance, 300000000))::integer as loss,
          case
            when count(attempt_row.scenario_id) = 0 then 'Trung bình'
            when (100.0 * count(attempt_row.scenario_id) filter (where attempt_row.correct) / count(attempt_row.scenario_id)) < 60 or coalesce(progress_row.awareness, 100) < 70 then 'Cao'
            when (100.0 * count(attempt_row.scenario_id) filter (where attempt_row.correct) / count(attempt_row.scenario_id)) < 80 or coalesce(progress_row.awareness, 100) < 85 then 'Trung bình'
            else 'Thấp'
          end as risk,
          case
            when count(attempt_row.scenario_id) > 0 and ((100.0 * count(attempt_row.scenario_id) filter (where attempt_row.correct) / count(attempt_row.scenario_id)) < 60 or coalesce(progress_row.awareness, 100) < 70) then 0
            when count(attempt_row.scenario_id) = 0 or (100.0 * count(attempt_row.scenario_id) filter (where attempt_row.correct) / nullif(count(attempt_row.scenario_id), 0)) < 80 or coalesce(progress_row.awareness, 100) < 85 then 1
            else 2
          end as risk_rank
        from public.profiles profile_row
        left join public.user_progress progress_row on progress_row.user_id = profile_row.id
        left join public.test_attempts attempt_row
          on attempt_row.user_id = profile_row.id
         and attempt_row.server_verified
        group by profile_row.id, profile_row.username, profile_row.display_name, profile_row.created_at,
                 progress_row.awareness, progress_row.balance
      ) user_rows
    ), '[]'::jsonb),
    'scenarios', coalesce((
      select jsonb_agg(to_jsonb(scenario_rows) order by scenario_rows.scenario_id)
      from (
        select
          scenario_list.scenario_id,
          count(attempt_row.scenario_id)::integer as attempts,
          count(attempt_row.scenario_id) filter (where not attempt_row.correct)::integer as wrong,
          case when count(attempt_row.scenario_id) = 0 then 0
            else round(100.0 * count(attempt_row.scenario_id) filter (where not attempt_row.correct) / count(attempt_row.scenario_id))::integer
          end as rate
        from (
          select (item ->> 'id')::smallint as scenario_id
          from public.site_content content_row
          cross join lateral jsonb_array_elements(content_row.content -> 'scenarios') item
          where content_row.slug = 'main' and content_row.published
          union all
          select generate_series(1, 10)::smallint
          where not exists (
            select 1 from public.site_content where slug = 'main' and published
          )
        ) as scenario_list
        left join public.test_attempts attempt_row
          on attempt_row.scenario_id = scenario_list.scenario_id
         and attempt_row.server_verified
        group by scenario_list.scenario_id
      ) scenario_rows
    ), '[]'::jsonb)
  ) into payload;

  return payload;
end;
$function$;

comment on function private.get_ciso_dashboard() is
'Admin-only dashboard. Award fields use the current run and server-verified attempts only.';