create table if not exists public.employee_documents(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, name text not null,
  status text not null check(status in('valid','pending','expired')), expires_at date, created_at timestamptz not null default now()
);
create table if not exists public.employee_dependents(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, name text not null, relationship text not null, birth_date date not null, created_at timestamptz not null default now()
);
create table if not exists public.employee_timeline(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, title text not null, description text not null,
  category text not null, occurred_at timestamptz not null default now()
);
create index if not exists employee_documents_employee_idx on public.employee_documents(employee_id);
create index if not exists employee_dependents_employee_idx on public.employee_dependents(employee_id);
create index if not exists employee_timeline_employee_idx on public.employee_timeline(employee_id,occurred_at desc);
alter table public.employee_documents enable row level security;alter table public.employee_dependents enable row level security;alter table public.employee_timeline enable row level security;
revoke all on public.employee_documents,public.employee_dependents,public.employee_timeline from anon,authenticated;
grant select,insert,update,delete on public.employee_documents,public.employee_dependents to authenticated;grant select on public.employee_timeline to authenticated;
create policy employee_documents_select on public.employee_documents for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[])));
create policy employee_documents_write on public.employee_documents for all to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','hr']::public.organization_role[]))) with check((select private.has_organization_role(organization_id,array['owner','admin','hr']::public.organization_role[])));
create policy employee_dependents_select on public.employee_dependents for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[])));
create policy employee_dependents_write on public.employee_dependents for all to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','hr']::public.organization_role[]))) with check((select private.has_organization_role(organization_id,array['owner','admin','hr']::public.organization_role[])));
create policy employee_timeline_select on public.employee_timeline for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[])));
create or replace function private.create_employee_timeline_entry() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.employee_timeline(organization_id,employee_id,title,description,category,occurred_at) values(new.organization_id,new.id,'Colaborador cadastrado','Prontuário criado no FluxRH.','Cadastro',new.created_at);return new;end;$$;
drop trigger if exists employee_create_timeline on public.employees;create trigger employee_create_timeline after insert on public.employees for each row execute function private.create_employee_timeline_entry();
insert into public.employee_timeline(organization_id,employee_id,title,description,category,occurred_at) select e.organization_id,e.id,'Colaborador cadastrado','Prontuário criado no FluxRH.','Cadastro',e.created_at from public.employees e where not exists(select 1 from public.employee_timeline t where t.employee_id=e.id and t.category='Cadastro');
