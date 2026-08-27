-- Event-trigger functions are invoked by PostgreSQL itself and must not be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
