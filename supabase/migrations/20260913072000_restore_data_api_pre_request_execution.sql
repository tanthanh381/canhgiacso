-- PostgREST executes db_pre_request after switching to the request role.
-- Keep the hook private while allowing each standard API role to run it.
grant execute on function private.data_api_pre_request()
  to anon, authenticated, service_role;
