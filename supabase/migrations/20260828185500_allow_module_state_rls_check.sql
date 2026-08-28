-- The RLS policy on module_repository_states invokes this helper while
-- evaluating authenticated reads. PostgreSQL therefore requires EXECUTE for
-- the authenticated role even though the function is SECURITY DEFINER.
grant execute on function private.can_access_module_state(uuid, text)
  to authenticated;

