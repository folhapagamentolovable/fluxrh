begin;
select plan(23);

select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'organization_members', 'organization_members exists');
select has_table('public', 'companies', 'companies exists');
select has_table('public', 'employees', 'employees exists');
select has_table('public', 'workflow_instances', 'workflow_instances exists');
select has_table('public', 'operational_exceptions', 'operational_exceptions exists');
select has_table('public', 'audit_events', 'audit_events exists');

select ok((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), 'organizations has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass), 'organization_members has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.companies'::regclass), 'companies has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.employees'::regclass), 'employees has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.workflow_instances'::regclass), 'workflow_instances has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.operational_exceptions'::regclass), 'exceptions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit has RLS');

select has_function('private', 'is_active_member', array['uuid'], 'membership helper exists');
select has_function('private', 'has_organization_role', array['uuid','organization_role[]'], 'role helper exists');
select has_function('public', 'create_organization', array['text','text'], 'organization bootstrap exists');

select ok(not has_table_privilege('anon', 'public.organizations', 'SELECT'), 'anon cannot select organizations');
select ok(not has_table_privilege('anon', 'public.employees', 'SELECT'), 'anon cannot select employees');
select ok(not has_table_privilege('anon', 'public.audit_events', 'SELECT'), 'anon cannot select audit');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'INSERT'), 'authenticated cannot insert audit');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE'), 'authenticated cannot update audit');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'DELETE'), 'authenticated cannot delete audit');

select * from finish();
rollback;
