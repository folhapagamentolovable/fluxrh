-- FluxRH foundation: identity, tenancy, roles and the first persistent journey.
-- Versioned migration for the authorized external Supabase project. Review before applying.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.entity_status as enum ('active', 'inactive');
create type public.organization_role as enum ('owner', 'admin', 'hr', 'payroll', 'manager', 'employee', 'auditor');
create type public.organization_unit_type as enum ('establishment', 'department', 'cost_center');
create type public.employee_status as enum ('active', 'vacation', 'leave', 'onboarding', 'terminated');
create type public.workflow_status as enum ('running', 'waiting', 'exception', 'completed', 'cancelled');
create type public.task_kind as enum ('automatic', 'human', 'approval');
create type public.task_status as enum ('pending', 'in_progress', 'completed', 'blocked');
create type public.exception_priority as enum ('critical', 'high', 'medium', 'low');
create type public.exception_status as enum ('open', 'in_review', 'resolved');
create type public.actor_type as enum ('user', 'system', 'service');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  document text not null,
  status public.entity_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  status public.entity_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index organization_members_user_role_idx on public.organization_members(user_id, role) where status = 'active';

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text not null,
  document text not null,
  status public.entity_status not null default 'active',
  city text,
  state char(2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document),
  unique (id, organization_id)
);

create table public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  parent_id uuid,
  type public.organization_unit_type not null,
  code text not null,
  name text not null,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (company_id, organization_id) references public.companies(id, organization_id) on delete cascade,
  foreign key (parent_id, organization_id) references public.organization_units(id, organization_id) on delete restrict
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  registration text not null,
  full_name text not null,
  social_name text,
  cpf text not null,
  email text,
  phone text,
  birth_date date,
  status public.employee_status not null default 'onboarding',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, registration),
  unique (organization_id, cpf),
  unique (id, organization_id),
  foreign key (company_id, organization_id) references public.companies(id, organization_id) on delete restrict
);

create table public.employment_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null,
  establishment_id uuid,
  department_id uuid,
  cost_center_id uuid,
  position text not null,
  contract_type text not null default 'CLT',
  salary numeric(14,2) not null check (salary >= 0),
  work_schedule text,
  manager_employee_id uuid,
  hire_date date not null,
  termination_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (termination_date is null or termination_date >= hire_date),
  foreign key (employee_id, organization_id) references public.employees(id, organization_id) on delete cascade,
  foreign key (establishment_id, organization_id) references public.organization_units(id, organization_id) on delete restrict,
  foreign key (department_id, organization_id) references public.organization_units(id, organization_id) on delete restrict,
  foreign key (cost_center_id, organization_id) references public.organization_units(id, organization_id) on delete restrict,
  foreign key (manager_employee_id, organization_id) references public.employees(id, organization_id) on delete restrict
);

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  version integer not null check (version > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, key, version),
  unique (id, organization_id)
);

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  definition_id uuid not null,
  subject_type text not null,
  subject_id uuid not null,
  status public.workflow_status not null default 'running',
  current_step text not null,
  context jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (definition_id, organization_id) references public.workflow_definitions(id, organization_id) on delete restrict
);

create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instance_id uuid not null,
  step_key text not null,
  title text not null,
  description text not null default '',
  kind public.task_kind not null,
  status public.task_status not null default 'pending',
  assignee_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (instance_id, organization_id) references public.workflow_instances(id, organization_id) on delete cascade
);

create table public.operational_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  title text not null,
  description text not null,
  priority public.exception_priority not null default 'medium',
  status public.exception_status not null default 'open',
  recommendation text,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  correlation_id uuid,
  occurred_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_type public.actor_type not null,
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid,
  occurred_at timestamptz not null default now()
);

create index companies_organization_idx on public.companies(organization_id);
create index organization_units_organization_idx on public.organization_units(organization_id);
create index organization_units_company_idx on public.organization_units(company_id);
create index employees_organization_idx on public.employees(organization_id);
create index employees_user_idx on public.employees(user_id) where user_id is not null;
create index employment_links_organization_idx on public.employment_links(organization_id);
create index employment_links_employee_idx on public.employment_links(employee_id);
create index workflow_definitions_organization_idx on public.workflow_definitions(organization_id);
create index workflow_instances_organization_idx on public.workflow_instances(organization_id);
create index workflow_tasks_organization_idx on public.workflow_tasks(organization_id);
create index workflow_tasks_assignee_idx on public.workflow_tasks(assignee_id) where assignee_id is not null;
create index operational_exceptions_organization_idx on public.operational_exceptions(organization_id);
create index operational_exceptions_assignee_idx on public.operational_exceptions(assigned_to) where assigned_to is not null;
create index domain_events_organization_idx on public.domain_events(organization_id);
create index audit_events_organization_occurred_idx on public.audit_events(organization_id, occurred_at desc);

create or replace function private.is_active_member(target_organization_id uuid)
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
  );
$$;

create or replace function private.has_organization_role(target_organization_id uuid, allowed_roles public.organization_role[])
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
      and membership.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_active_member(uuid) from public, anon;
revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public, anon;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;

create or replace function public.create_organization(organization_name text, organization_document text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.organizations(name, document, created_by)
  values (organization_name, organization_document, (select auth.uid()))
  returning id into new_organization_id;

  insert into public.organization_members(organization_id, user_id, role, invited_by)
  values (new_organization_id, (select auth.uid()), 'owner', (select auth.uid()));

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.audit_tenant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  resource_value text;
begin
  tenant_id := coalesce((to_jsonb(new) ->> 'organization_id')::uuid, (to_jsonb(old) ->> 'organization_id')::uuid);
  resource_value := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action, resource_type, resource_id, before_data, after_data
  ) values (
    tenant_id,
    case when (select auth.uid()) is null then 'system'::public.actor_type else 'user'::public.actor_type end,
    (select auth.uid()),
    tg_op,
    tg_table_name,
    resource_value,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger organization_members_updated_at before update on public.organization_members for each row execute function private.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute function private.set_updated_at();
create trigger organization_units_updated_at before update on public.organization_units for each row execute function private.set_updated_at();
create trigger employees_updated_at before update on public.employees for each row execute function private.set_updated_at();
create trigger employment_links_updated_at before update on public.employment_links for each row execute function private.set_updated_at();
create trigger workflow_instances_updated_at before update on public.workflow_instances for each row execute function private.set_updated_at();
create trigger workflow_tasks_updated_at before update on public.workflow_tasks for each row execute function private.set_updated_at();
create trigger operational_exceptions_updated_at before update on public.operational_exceptions for each row execute function private.set_updated_at();

create trigger companies_audit after insert or update or delete on public.companies for each row execute function private.audit_tenant_change();
create trigger organization_units_audit after insert or update or delete on public.organization_units for each row execute function private.audit_tenant_change();
create trigger employees_audit after insert or update or delete on public.employees for each row execute function private.audit_tenant_change();
create trigger employment_links_audit after insert or update or delete on public.employment_links for each row execute function private.audit_tenant_change();
create trigger workflow_instances_audit after insert or update or delete on public.workflow_instances for each row execute function private.audit_tenant_change();
create trigger workflow_tasks_audit after insert or update or delete on public.workflow_tasks for each row execute function private.audit_tenant_change();
create trigger operational_exceptions_audit after insert or update or delete on public.operational_exceptions for each row execute function private.audit_tenant_change();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.companies enable row level security;
alter table public.organization_units enable row level security;
alter table public.employees enable row level security;
alter table public.employment_links enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.operational_exceptions enable row level security;
alter table public.domain_events enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.profiles, public.organizations, public.organization_members,
  public.companies, public.organization_units, public.employees, public.employment_links,
  public.workflow_definitions, public.workflow_instances, public.workflow_tasks,
  public.operational_exceptions, public.domain_events, public.audit_events
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.companies, public.organization_units, public.employees, public.employment_links to authenticated;
grant select, insert, update on public.workflow_definitions, public.workflow_instances, public.workflow_tasks, public.operational_exceptions to authenticated;
grant select, insert on public.domain_events to authenticated;
grant select on public.audit_events to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy organizations_select_member on public.organizations for select to authenticated
using ((select private.is_active_member(id)));
create policy organizations_update_admin on public.organizations for update to authenticated
using ((select private.has_organization_role(id, array['owner','admin']::public.organization_role[])))
with check ((select private.has_organization_role(id, array['owner','admin']::public.organization_role[])));

create policy members_select_same_organization on public.organization_members for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy members_insert_admin on public.organization_members for insert to authenticated
with check ((select private.has_organization_role(organization_id, array['owner','admin']::public.organization_role[])));
create policy members_update_admin on public.organization_members for update to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin']::public.organization_role[])));
create policy members_delete_admin on public.organization_members for delete to authenticated
using (
  user_id <> (select auth.uid())
  and (select private.has_organization_role(organization_id, array['owner','admin']::public.organization_role[]))
);

create policy companies_select_member on public.companies for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy companies_write_admin_hr on public.companies for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])));

create policy units_select_member on public.organization_units for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy units_write_admin_hr on public.organization_units for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])));

create policy employees_select_authorized on public.employees for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[]))
);
create policy employees_write_hr on public.employees for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])));

create policy employment_links_select_authorized on public.employment_links for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[])));
create policy employment_links_write_hr on public.employment_links for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])));

create policy workflow_definitions_select_member on public.workflow_definitions for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy workflow_definitions_write_admin_hr on public.workflow_definitions for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[])));

create policy workflow_instances_select_member on public.workflow_instances for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy workflow_instances_write_operations on public.workflow_instances for all to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager']::public.organization_role[])))
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager']::public.organization_role[])));

create policy workflow_tasks_select_member on public.workflow_tasks for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy workflow_tasks_write_assignee_or_operations on public.workflow_tasks for all to authenticated
using (
  assignee_id = (select auth.uid())
  or (select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager']::public.organization_role[]))
)
with check ((select private.is_active_member(organization_id)));

create policy exceptions_select_member on public.operational_exceptions for select to authenticated
using ((select private.is_active_member(organization_id)));
create policy exceptions_write_assignee_or_operations on public.operational_exceptions for all to authenticated
using (
  assigned_to = (select auth.uid())
  or (select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager']::public.organization_role[]))
)
with check ((select private.is_active_member(organization_id)));

create policy domain_events_select_auditor on public.domain_events for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','auditor']::public.organization_role[])));
create policy domain_events_insert_operations on public.domain_events for insert to authenticated
with check ((select private.has_organization_role(organization_id, array['owner','admin','hr','payroll','manager']::public.organization_role[])));

create policy audit_events_select_auditor on public.audit_events for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner','admin','auditor']::public.organization_role[])));

comment on schema private is 'Internal authorization and trigger functions; not exposed through the Data API.';
comment on table public.audit_events is 'Append-only audit trail. Authenticated users receive SELECT only through RLS.';
