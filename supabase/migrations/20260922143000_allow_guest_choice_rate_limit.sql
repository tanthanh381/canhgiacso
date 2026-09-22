-- evaluate_guest_choice is protected by the PostgREST pre-request rate limit.
-- That hook writes to private.api_rate_limits, so the public RPC must not run
-- in a read-only transaction.
create or replace function public.evaluate_guest_choice(scenario_id integer, choice_index integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$ select private.evaluate_choice(scenario_id, choice_index) $$;

revoke all on function public.evaluate_guest_choice(integer, integer) from public;
grant execute on function public.evaluate_guest_choice(integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
