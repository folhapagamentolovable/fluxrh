alter type public.organization_role add value if not exists 'super_admin';

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role::text = 'super_admin'
        or membership.role = any(allowed_roles)
      )
  );
$$;

revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public, anon;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;

comment on function private.has_organization_role(uuid, public.organization_role[]) is
  'Authorizes the requested organization roles and always authorizes an active super-admin membership.';

