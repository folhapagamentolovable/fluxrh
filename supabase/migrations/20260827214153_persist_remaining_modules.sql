create table public.module_repository_states (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_name text not null check (module_name in (
    'absences', 'benefits', 'payroll', 'special_calculations',
    'occupational_health', 'patrols', 'communications', 'portal',
    'terminations', 'analytics', 'governance'
  )),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  version bigint not null default 1 check (version > 0),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, module_name)
);

create index module_repository_states_updated_idx
  on public.module_repository_states (organization_id, updated_at desc);

alter table public.module_repository_states enable row level security;

revoke all on public.module_repository_states from anon, authenticated;
grant select on public.module_repository_states to authenticated;

create or replace function private.can_access_module_state(
  organization_id_value uuid,
  module_name_value text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed_roles public.organization_role[];
begin
  allowed_roles := case module_name_value
    when 'portal' then array['owner','admin','hr','manager','employee']::public.organization_role[]
    when 'patrols' then array['owner','admin','hr','manager']::public.organization_role[]
    when 'analytics' then array['owner','admin','hr','manager','auditor']::public.organization_role[]
    when 'governance' then array['owner','admin']::public.organization_role[]
    when 'communications' then array['owner','admin','hr','manager']::public.organization_role[]
    else array['owner','admin','hr','payroll']::public.organization_role[]
  end;

  return private.has_organization_role(organization_id_value, allowed_roles);
end;
$$;

revoke all on function private.can_access_module_state(uuid, text)
  from public, anon, authenticated, service_role;

create policy module_repository_states_select
  on public.module_repository_states
  for select
  to authenticated
  using ((select private.can_access_module_state(organization_id, module_name)));

create or replace function public.save_module_repository_state(
  organization_id_value uuid,
  module_name_value text,
  state_value jsonb,
  expected_version_value bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version bigint;
  affected_rows integer;
begin
  if module_name_value not in (
    'absences', 'benefits', 'payroll', 'special_calculations',
    'occupational_health', 'patrols', 'communications', 'portal',
    'terminations', 'analytics', 'governance'
  ) then
    raise exception 'invalid_module_name' using errcode = '22023';
  end if;

  if jsonb_typeof(state_value) <> 'object' then
    raise exception 'invalid_module_state' using errcode = '22023';
  end if;

  if not private.can_access_module_state(organization_id_value, module_name_value) then
    raise exception 'module_state_forbidden' using errcode = '42501';
  end if;

  if expected_version_value = 0 then
    insert into public.module_repository_states(
      organization_id, module_name, state, version, updated_by
    ) values (
      organization_id_value, module_name_value, state_value, 1, (select auth.uid())
    )
    on conflict (organization_id, module_name) do nothing
    returning version into next_version;
  else
    update public.module_repository_states
    set state = state_value,
        version = version + 1,
        updated_by = (select auth.uid()),
        updated_at = now()
    where organization_id = organization_id_value
      and module_name = module_name_value
      and version = expected_version_value
    returning version into next_version;
  end if;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'module_state_conflict' using errcode = '40001';
  end if;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    organization_id_value, 'user', (select auth.uid()),
    module_name_value || '.state_saved', 'module_state', module_name_value,
    jsonb_build_object('version', next_version)
  );

  return next_version;
end;
$$;

revoke all on function public.save_module_repository_state(uuid, text, jsonb, bigint)
  from public, anon;
grant execute on function public.save_module_repository_state(uuid, text, jsonb, bigint)
  to authenticated;
