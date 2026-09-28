-- ASVS L2 authorization contract tests.
-- Run against a migrated Supabase database. These assertions are catalog-based
-- and intentionally avoid production user identities.

begin;

do $$
declare
  exposed_definers integer;
  unprotected_tables integer;
  anon_privileged_rpc boolean;
  auth_audit_writable boolean;
  role_helper_def text;
begin
  select count(*) into exposed_definers
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE')
    and p.proname <> 'record_web_analytics_event_v4';
  if exposed_definers <> 0 then
    raise exception 'ASVS authz failure: anon can execute % unexpected public SECURITY DEFINER function(s)', exposed_definers;
  end if;

  if not has_function_privilege(
    'anon',
    'public.record_web_analytics_event_v4(text,text,text,text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'ASVS analytics failure: active v4 analytics RPC is not callable by anon';
  end if;

  if has_function_privilege('anon', 'public.evaluate_guest_choice(integer,integer)', 'EXECUTE') then
    raise exception 'ASVS authz failure: obsolete guest choice RPC remains callable by anon';
  end if;

  if has_function_privilege('anon', 'public.record_web_analytics_event(text,text,text,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.record_web_analytics_event_v2(text,text,text,text,text,text,text,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.record_web_analytics_event_v3(text,text,text,text,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'ASVS analytics failure: legacy analytics RPC remains callable by anon';
  end if;

  select count(*) into unprotected_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public','private')
    and c.relkind in ('r','p')
    and not c.relrowsecurity
    and c.relname not in ('schema_migrations');
  if unprotected_tables <> 0 then
    raise exception 'ASVS authz failure: % application table(s) do not have RLS enabled', unprotected_tables;
  end if;

  select has_function_privilege('anon', 'public.save_managed_site_content(text,jsonb)', 'EXECUTE')
      or has_function_privilege('anon', 'public.set_content_manager_role(uuid,text)', 'EXECUTE')
      or has_function_privilege('anon', 'public.get_managed_site_content()', 'EXECUTE')
    into anon_privileged_rpc;
  if anon_privileged_rpc then
    raise exception 'ASVS authz failure: anon has privileged content-management RPC access';
  end if;

  select has_table_privilege('authenticated', 'private.security_audit_log', 'INSERT')
      or has_table_privilege('authenticated', 'private.security_audit_log', 'UPDATE')
      or has_table_privilege('authenticated', 'private.security_audit_log', 'DELETE')
    into auth_audit_writable;
  if auth_audit_writable then
    raise exception 'ASVS logging failure: authenticated role can mutate the security audit log';
  end if;

  select pg_get_functiondef('private.user_can_edit_content()'::regprocedure) into role_helper_def;
  if position('''aal2''' in role_helper_def) = 0 then
    raise exception 'ASVS MFA failure: editor authorization helper does not require AAL2';
  end if;

  select pg_get_functiondef('private.user_is_app_admin()'::regprocedure) into role_helper_def;
  if position('''aal2''' in role_helper_def) = 0 then
    raise exception 'ASVS MFA failure: admin authorization helper does not require AAL2';
  end if;
end;
$$;

-- Horizontal authorization: policies for user-owned records must bind the JWT
-- subject to the record owner in both selection and mutation checks.
do $$
declare
  bad_policy_count integer;
begin
  select count(*) into bad_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'test_attempts', 'user_progress')
    and roles::text like '%authenticated%'
    and cmd in ('SELECT','INSERT','UPDATE','DELETE')
    and coalesce(qual, with_check, '') not like '%auth.uid()%'
    and coalesce(with_check, qual, '') not like '%auth.uid()%';

  if bad_policy_count <> 0 then
    raise exception 'ASVS horizontal authorization failure: % ownership policy/policies do not bind auth.uid()', bad_policy_count;
  end if;
end;
$$;

rollback;
