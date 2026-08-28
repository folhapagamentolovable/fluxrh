-- Dependentes e fechamento de competência de jornada.
create table if not exists public.employee_dependents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 3),
  document text,
  birth_date date not null,
  relationship text not null,
  eligible_for_benefits boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_dependents_employee_idx on public.employee_dependents(employee_id);
alter table public.employee_dependents enable row level security;
revoke all on public.employee_dependents from anon, authenticated;
grant select, insert, update on public.employee_dependents to authenticated;
create policy employee_dependents_org_access on public.employee_dependents for all to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','auditor']::public.organization_role[]))
with check (private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[]));

create table if not exists public.time_competence_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  competence date not null,
  status text not null default 'open' check (status in ('open','in_review','closed','reopened')),
  closing_progress integer not null default 0 check (closing_progress between 0 and 100),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  notes text,
  unique (organization_id, competence)
);

alter table public.time_competence_closures enable row level security;
revoke all on public.time_competence_closures from anon, authenticated;
grant select, insert, update on public.time_competence_closures to authenticated;
create policy time_competence_org_access on public.time_competence_closures for all to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','auditor']::public.organization_role[]))
with check (private.has_organization_role(organization_id, array['owner','admin','hr']::public.organization_role[]));

create or replace function public.close_time_competence(p_id uuid, p_notes text default null)
returns public.time_competence_closures
language plpgsql security definer set search_path = public
as $$
declare result public.time_competence_closures;
begin
  update public.time_competence_closures c set status='closed', closing_progress=100, closed_at=now(), closed_by=auth.uid(), notes=coalesce(p_notes,c.notes)
  where c.id=p_id and c.status in ('open','in_review')
    and private.has_organization_role(c.organization_id, array['owner','admin','hr']::public.organization_role[])
    and c.closing_progress=100
  returning c.* into result;
  if result.id is null then raise exception 'competence_not_ready_or_not_authorized'; end if;
  return result;
end;
$$;
revoke all on function public.close_time_competence(uuid,text) from public, anon;
grant execute on function public.close_time_competence(uuid,text) to authenticated;
