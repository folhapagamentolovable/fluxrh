create table public.operational_environment_gate (
  singleton boolean primary key default true check (singleton),
  real_operations_enabled boolean not null default false,
  activated_by uuid references auth.users(id),
  activated_at timestamptz,
  reason text not null,
  updated_at timestamptz not null default now(),
  check (
    (real_operations_enabled and activated_by is not null and activated_at is not null)
    or not real_operations_enabled
  )
);

alter table public.operational_environment_gate enable row level security;
revoke all on public.operational_environment_gate from anon, authenticated;
grant select on public.operational_environment_gate to authenticated;

create policy operational_gate_super_admin_select
on public.operational_environment_gate
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role::text = 'super_admin'
  )
);

create or replace function public.can_execute_real_operations()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operational_environment_gate gate
    where gate.singleton
      and gate.real_operations_enabled
  ) and exists (
    select 1
    from public.organization_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role::text = 'super_admin'
  );
$$;

revoke all on function public.can_execute_real_operations() from public, anon;
grant execute on function public.can_execute_real_operations() to authenticated;

insert into public.operational_environment_gate (
  singleton,
  real_operations_enabled,
  activated_by,
  activated_at,
  reason
)
select
  true,
  true,
  membership.user_id,
  now(),
  'Liberação explícita do ambiente operacional externo exclusivamente para super_admin.'
from public.organization_members membership
where membership.status = 'active'
  and membership.role::text = 'super_admin'
order by membership.created_at
limit 1;

do $$
begin
  if not exists (
    select 1
    from public.operational_environment_gate
    where singleton and real_operations_enabled
  ) then
    raise exception 'real_operations_activation_requires_active_super_admin';
  end if;
end
$$;

comment on table public.operational_environment_gate is
  'Gate único do ambiente externo. Operações reais somente são autorizadas a sessões com vínculo ativo super_admin.';

comment on function public.can_execute_real_operations() is
  'Retorna true somente quando o ambiente real está habilitado e o usuário autenticado é super_admin ativo.';
