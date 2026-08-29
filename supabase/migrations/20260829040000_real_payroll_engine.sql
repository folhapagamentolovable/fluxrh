-- Motor de folha por competência. Mantém a migration histórica de snapshots,
-- mas torna cálculo, rubricas, exceções, aprovação e fechamento normalizados.
create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  competence date not null check (competence = date_trunc('month', competence)::date),
  status text not null default 'draft' check (status in ('draft','calculating','review','approved','closed')),
  input_hash text not null,
  calculation_version integer not null default 1 check (calculation_version > 0),
  employees_count integer not null default 0,
  processed_count integer not null default 0,
  exceptions_count integer not null default 0,
  gross_total numeric(14,2) not null default 0,
  deductions_total numeric(14,2) not null default 0,
  net_total numeric(14,2) not null default 0,
  employer_charges_total numeric(14,2) not null default 0,
  processed_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, competence)
);

create table if not exists public.payroll_employee_calculations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  employee_name text not null,
  registration text not null,
  position text not null,
  department_name text not null,
  base_salary numeric(14,2) not null check (base_salary >= 0),
  gross_pay numeric(14,2) not null check (gross_pay >= 0),
  deductions numeric(14,2) not null check (deductions >= 0),
  net_pay numeric(14,2) not null,
  employer_charges numeric(14,2) not null check (employer_charges >= 0),
  status text not null default 'pending' check (status in ('pending','exception','approved')),
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, employee_id)
);

create table if not exists public.payroll_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  calculation_id uuid not null references public.payroll_employee_calculations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  code text not null,
  name text not null,
  kind text not null check (kind in ('earning','deduction','informational')),
  category text not null check (category in ('salary','overtime','additional','absence','tax','benefit','vacation','other')),
  quantity numeric not null default 0,
  reference text not null,
  amount numeric(14,2) not null check (amount >= 0),
  automatic boolean not null default true,
  source_type text not null,
  source_id text,
  source_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  calculation_id uuid not null references public.payroll_employee_calculations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  code text not null,
  title text not null,
  description text not null,
  severity text not null check (severity in ('critical','high','medium','low')),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id, employee_id, code)
);

create index if not exists payroll_runs_org_competence_idx on public.payroll_runs(organization_id, competence desc);
create index if not exists payroll_calculations_run_idx on public.payroll_employee_calculations(run_id, employee_id);
create index if not exists payroll_events_calculation_idx on public.payroll_events(calculation_id, code);
create index if not exists payroll_exceptions_open_idx on public.payroll_exceptions(run_id, status);

alter table public.payroll_runs enable row level security;
alter table public.payroll_employee_calculations enable row level security;
alter table public.payroll_events enable row level security;
alter table public.payroll_exceptions enable row level security;
revoke all on public.payroll_runs, public.payroll_employee_calculations, public.payroll_events, public.payroll_exceptions from anon, authenticated;
grant select on public.payroll_runs, public.payroll_employee_calculations, public.payroll_events, public.payroll_exceptions to authenticated;

create policy payroll_runs_select on public.payroll_runs for select to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','payroll','auditor']::public.organization_role[]));
create policy payroll_calculations_select on public.payroll_employee_calculations for select to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','payroll','auditor']::public.organization_role[]));
create policy payroll_events_select on public.payroll_events for select to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','payroll','auditor']::public.organization_role[]));
create policy payroll_exceptions_select on public.payroll_exceptions for select to authenticated
using (private.has_organization_role(organization_id, array['owner','admin','hr','payroll','auditor']::public.organization_role[]));

create or replace function public.save_payroll_calculation(competence_value date, input_hash_value text, employees_value jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid; run_value uuid; employee_value jsonb; calculation_value uuid; event_value jsonb; exception_value jsonb;
begin
  select organization_id into org from public.organization_members where user_id=(select auth.uid()) and status='active' order by created_at limit 1;
  if org is null or not private.has_organization_role(org,array['owner','admin','hr','payroll']::public.organization_role[]) then raise exception 'payroll_process_forbidden' using errcode='42501'; end if;
  if competence_value <> date_trunc('month',competence_value)::date or jsonb_typeof(employees_value)<>'array' then raise exception 'invalid_payroll_payload' using errcode='22023'; end if;
  insert into public.payroll_runs(organization_id,competence,status,input_hash,processed_at)
  values(org,competence_value,'calculating',input_hash_value,now())
  on conflict(organization_id,competence) do update set status='calculating',input_hash=excluded.input_hash,calculation_version=public.payroll_runs.calculation_version+1,processed_at=now(),updated_at=now()
  where public.payroll_runs.status<>'closed' returning id into run_value;
  if run_value is null then raise exception 'payroll_run_closed' using errcode='22023'; end if;
  delete from public.payroll_employee_calculations where run_id=run_value;
  for employee_value in select value from jsonb_array_elements(employees_value) loop
    insert into public.payroll_employee_calculations(organization_id,run_id,employee_id,employee_name,registration,position,department_name,base_salary,gross_pay,deductions,net_pay,employer_charges,status,input_snapshot)
    values(org,run_value,(employee_value->>'employeeId')::uuid,employee_value->>'employeeName',employee_value->>'registration',employee_value->>'position',employee_value->>'departmentName',(employee_value->>'baseSalary')::numeric,(employee_value->>'grossPay')::numeric,(employee_value->>'deductions')::numeric,(employee_value->>'netPay')::numeric,(employee_value->>'employerCharges')::numeric,case when jsonb_array_length(employee_value->'exceptions')>0 then 'exception' else 'pending' end,employee_value->'inputSnapshot') returning id into calculation_value;
    for event_value in select value from jsonb_array_elements(employee_value->'events') loop
      insert into public.payroll_events(organization_id,run_id,calculation_id,employee_id,code,name,kind,category,quantity,reference,amount,automatic,source_type,source_id,source_snapshot)
      values(org,run_value,calculation_value,(employee_value->>'employeeId')::uuid,event_value->>'code',event_value->>'name',event_value->>'kind',event_value->>'category',(event_value->>'quantity')::numeric,event_value->>'reference',(event_value->>'amount')::numeric,coalesce((event_value->>'automatic')::boolean,true),event_value->>'sourceType',event_value->>'sourceId',coalesce(event_value->'sourceSnapshot','{}'::jsonb));
    end loop;
    for exception_value in select value from jsonb_array_elements(employee_value->'exceptions') loop
      insert into public.payroll_exceptions(organization_id,run_id,calculation_id,employee_id,code,title,description,severity)
      values(org,run_value,calculation_value,(employee_value->>'employeeId')::uuid,exception_value->>'code',exception_value->>'title',exception_value->>'description',exception_value->>'severity');
    end loop;
  end loop;
  update public.payroll_runs set status='review',updated_at=now(),
    employees_count=(select count(*) from public.payroll_employee_calculations where run_id=run_value),
    processed_count=(select count(*) from public.payroll_employee_calculations where run_id=run_value),
    exceptions_count=(select count(*) from public.payroll_exceptions where run_id=run_value and status='open'),
    gross_total=(select coalesce(sum(gross_pay),0) from public.payroll_employee_calculations where run_id=run_value),
    deductions_total=(select coalesce(sum(deductions),0) from public.payroll_employee_calculations where run_id=run_value),
    net_total=(select coalesce(sum(net_pay),0) from public.payroll_employee_calculations where run_id=run_value),
    employer_charges_total=(select coalesce(sum(employer_charges),0) from public.payroll_employee_calculations where run_id=run_value)
  where id=run_value;
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data) values(org,'user',(select auth.uid()),'payroll.processed','payroll_run',run_value::text,jsonb_build_object('competence',competence_value,'inputHash',input_hash_value,'employees',jsonb_array_length(employees_value)));
  return run_value;
end; $$;

create or replace function public.resolve_payroll_exception(exception_id_value uuid,note_value text)
returns void language plpgsql security definer set search_path='' as $$
declare org uuid; calc uuid;
begin
 select organization_id,calculation_id into org,calc from public.payroll_exceptions where id=exception_id_value and status='open' for update;
 if org is null then raise exception 'payroll_exception_not_found' using errcode='P0002'; end if;
 if not private.has_organization_role(org,array['owner','admin','hr','payroll']::public.organization_role[]) or length(trim(coalesce(note_value,'')))<3 then raise exception 'payroll_exception_forbidden_or_invalid' using errcode='42501'; end if;
 update public.payroll_exceptions set status='resolved',resolution_note=trim(note_value),resolved_by=(select auth.uid()),resolved_at=now() where id=exception_id_value;
 update public.payroll_runs set exceptions_count=(select count(*) from public.payroll_exceptions where run_id=payroll_runs.id and status='open'),updated_at=now() where id=(select run_id from public.payroll_employee_calculations where id=calc);
 if not exists(select 1 from public.payroll_exceptions where calculation_id=calc and status='open') then update public.payroll_employee_calculations set status='pending',updated_at=now() where id=calc; end if;
 insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data) values(org,'user',(select auth.uid()),'payroll.exception_resolved','payroll_exception',exception_id_value::text,jsonb_build_object('note',trim(note_value)));
end; $$;

create or replace function public.approve_payroll_employee(run_id_value uuid,employee_id_value uuid)
returns void language plpgsql security definer set search_path='' as $$
declare org uuid; calc uuid;
begin
 select organization_id,id into org,calc from public.payroll_employee_calculations where run_id=run_id_value and employee_id=employee_id_value for update;
 if org is null then raise exception 'payroll_employee_not_found' using errcode='P0002'; end if;
 if not private.has_organization_role(org,array['owner','admin','hr','payroll']::public.organization_role[]) then raise exception 'payroll_approve_forbidden' using errcode='42501'; end if;
 if exists(select 1 from public.payroll_exceptions where calculation_id=calc and status='open') then raise exception 'employee_has_open_exceptions' using errcode='22023'; end if;
 update public.payroll_employee_calculations set status='approved',approved_by=(select auth.uid()),approved_at=now(),updated_at=now() where id=calc;
 update public.payroll_runs r set status=case when not exists(select 1 from public.payroll_employee_calculations c where c.run_id=r.id and c.status<>'approved') then 'approved' else 'review' end,approved_at=case when not exists(select 1 from public.payroll_employee_calculations c where c.run_id=r.id and c.status<>'approved') then now() else null end,updated_at=now() where id=run_id_value;
end; $$;

create or replace function public.close_payroll_run(run_id_value uuid)
returns void language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
 select organization_id into org from public.payroll_runs where id=run_id_value for update;
 if org is null then raise exception 'payroll_run_not_found' using errcode='P0002'; end if;
 if not private.has_organization_role(org,array['owner','admin','payroll']::public.organization_role[]) then raise exception 'payroll_close_forbidden' using errcode='42501'; end if;
 if exists(select 1 from public.payroll_employee_calculations where run_id=run_id_value and status<>'approved') then raise exception 'employees_pending' using errcode='22023'; end if;
 update public.payroll_runs set status='closed',closed_at=now(),closed_by=(select auth.uid()),updated_at=now() where id=run_id_value and status='approved';
 if not found then raise exception 'payroll_not_approved' using errcode='22023'; end if;
 insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id) values(org,'user',(select auth.uid()),'payroll.closed','payroll_run',run_id_value::text);
end; $$;

revoke all on function public.save_payroll_calculation(date,text,jsonb),public.resolve_payroll_exception(uuid,text),public.approve_payroll_employee(uuid,uuid),public.close_payroll_run(uuid) from public,anon;
grant execute on function public.save_payroll_calculation(date,text,jsonb),public.resolve_payroll_exception(uuid,text),public.approve_payroll_employee(uuid,uuid),public.close_payroll_run(uuid) to authenticated;
