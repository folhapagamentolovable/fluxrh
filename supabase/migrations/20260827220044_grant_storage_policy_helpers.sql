-- These helpers are private-schema functions used by RLS expressions.
-- The schema is not exposed through the Data API, while PostgreSQL still
-- requires the calling role to have EXECUTE permission during policy checks.
grant execute on function private.can_read_file_asset(public.file_assets)
  to authenticated;
grant execute on function private.can_write_file_asset(public.file_assets)
  to authenticated;
