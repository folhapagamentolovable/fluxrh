create table public.assisted_pilot_clients (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  profile text not null check (profile in ('small_company','multi_site_company','hr_advisory')),
  synthetic_data_only boolean not null default true check (synthetic_data_only),
  official_process_remains_source boolean not null default true check (official_process_remains_source),
  status text not null check (status in ('prepared','running','completed')),
  participant_label text not null,
  planned_cycles integer not null default 2 check (planned_cycles >= 2),
  completed_cycles integer not null default 0 check (completed_cycles between 0 and planned_cycles),
  formal_approval text not null check (formal_approval in ('pending','synthetic_approved','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assisted_pilot_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.assisted_pilot_clients(organization_id) on delete cascade,
  cycle_number integer not null check (cycle_number in (1,2)),
  competence date not null,
  status text not null check (status in ('prepared','running','completed')),
  official_source text not null default 'synthetic_reference',
  official_payroll_replaced boolean not null default false check (not official_payroll_replaced),
  headcount integer not null check (headcount > 0),
  fluxrh_gross numeric(14,2) not null check (fluxrh_gross >= 0),
  reference_gross numeric(14,2) not null check (reference_gross >= 0),
  fluxrh_net numeric(14,2) not null check (fluxrh_net >= 0),
  reference_net numeric(14,2) not null check (reference_net >= 0),
  critical_open integer not null default 0 check (critical_open >= 0),
  high_open integer not null default 0 check (high_open >= 0),
  reconciled boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, cycle_number)
);

create table public.assisted_pilot_divergences (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assisted_pilot_cycles(id) on delete cascade,
  severity text not null check (severity in ('critical','high','medium','low')),
  title text not null,
  cause text not null,
  decision text not null,
  status text not null check (status in ('open','resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assisted_pilot_evidence (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assisted_pilot_cycles(id) on delete cascade,
  kind text not null check (kind in ('comparison','decision_log','payroll_preview','time_closing','artifact_manifest','acceptance')),
  title text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  synthetic boolean not null default true check (synthetic),
  created_at timestamptz not null default now(),
  unique (cycle_id, kind)
);

create index assisted_pilot_cycles_org_idx on public.assisted_pilot_cycles(organization_id, cycle_number);
create index assisted_pilot_divergences_cycle_idx on public.assisted_pilot_divergences(cycle_id, status, severity);
alter table public.assisted_pilot_clients enable row level security;
alter table public.assisted_pilot_cycles enable row level security;
alter table public.assisted_pilot_divergences enable row level security;
alter table public.assisted_pilot_evidence enable row level security;
revoke all on public.assisted_pilot_clients,public.assisted_pilot_cycles,public.assisted_pilot_divergences,public.assisted_pilot_evidence from anon,authenticated;
grant select on public.assisted_pilot_clients,public.assisted_pilot_cycles,public.assisted_pilot_divergences,public.assisted_pilot_evidence to authenticated;
create policy assisted_pilot_clients_select on public.assisted_pilot_clients for select to authenticated using ((select private.has_organization_role(organization_id,array['owner','admin','hr','auditor']::public.organization_role[])));
create policy assisted_pilot_cycles_select on public.assisted_pilot_cycles for select to authenticated using ((select private.has_organization_role(organization_id,array['owner','admin','hr','auditor']::public.organization_role[])));
create policy assisted_pilot_divergences_select on public.assisted_pilot_divergences for select to authenticated using (exists(select 1 from public.assisted_pilot_cycles c where c.id=cycle_id and private.has_organization_role(c.organization_id,array['owner','admin','hr','auditor']::public.organization_role[])));
create policy assisted_pilot_evidence_select on public.assisted_pilot_evidence for select to authenticated using (exists(select 1 from public.assisted_pilot_cycles c where c.id=cycle_id and private.has_organization_role(c.organization_id,array['owner','admin','hr','auditor']::public.organization_role[])));

do $$
declare
  super_user uuid;
  org_id uuid;
  company_id uuid;
  establishment_a uuid;
  establishment_b uuid;
  employee_id uuid;
  cycle_id uuid;
  client_index integer;
  employee_index integer;
  employee_total integer;
  client_profile text;
  client_name text;
  org_document text;
  gross_value numeric(14,2);
begin
  select user_id into super_user from public.organization_members where role::text='super_admin' and status='active' order by created_at limit 1;
  if super_user is null then raise exception 'synthetic_pilot_requires_super_admin'; end if;

  for client_index in 1..3 loop
    client_profile:=case client_index when 1 then 'small_company' when 2 then 'multi_site_company' else 'hr_advisory' end;
    client_name:=case client_index when 1 then 'Aurora Serviços — Piloto Fictício' when 2 then 'Horizonte Multipostos — Piloto Fictício' else 'Prisma RH Consultivo — Piloto Fictício' end;
    org_document:='FICT-PILOT-'||client_index;
    employee_total:=case client_index when 1 then 36 when 2 then 120 else 12 end;
    org_id:=gen_random_uuid();company_id:=gen_random_uuid();establishment_a:=gen_random_uuid();establishment_b:=gen_random_uuid();
    insert into public.organizations(id,name,document,status,created_by)values(org_id,client_name,org_document,'active',super_user);
    insert into public.organization_members(organization_id,user_id,role,status,invited_by)values(org_id,super_user,'super_admin','active',super_user);
    insert into public.companies(id,organization_id,legal_name,trade_name,document,status,city,state)values(company_id,org_id,client_name||' Ltda.',client_name,'FICT-CNPJ-'||client_index,'active','Cidade Exemplo','SP');
    insert into public.organization_units(id,organization_id,company_id,type,code,name)values(establishment_a,org_id,company_id,'establishment','MATRIZ','Matriz Fictícia');
    insert into public.organization_units(id,organization_id,company_id,type,code,name)values(establishment_b,org_id,company_id,'establishment','POSTO-02','Posto Fictício 02');
    insert into public.assisted_pilot_clients(organization_id,profile,status,participant_label,completed_cycles,formal_approval)values(org_id,client_profile,'completed',client_name,2,'synthetic_approved');

    for employee_index in 1..employee_total loop
      employee_id:=gen_random_uuid();
      insert into public.employees(id,organization_id,company_id,registration,full_name,cpf,email,status)
      values(employee_id,org_id,company_id,'P'||client_index||lpad(employee_index::text,5,'0'),'Pessoa Fictícia '||client_index||'-'||lpad(employee_index::text,3,'0'),'FICT-CPF-'||client_index||'-'||lpad(employee_index::text,4,'0'),'piloto.'||client_index||'.'||employee_index||'@example.invalid','active');
      insert into public.employment_links(organization_id,employee_id,establishment_id,position,contract_type,salary,work_schedule,hire_date,active)
      values(org_id,employee_id,case when employee_index%2=0 then establishment_a else establishment_b end,case when employee_index%7=0 then 'Supervisor Fictício' else 'Analista Fictício' end,'CLT',2200+(employee_index%12)*275,case employee_index%3 when 0 then '5x2' when 1 then '12x36' else '6x1' end,date '2024-01-01'+(employee_index%365),true);
    end loop;

    gross_value:=(employee_total*3712.50)::numeric(14,2);
    for employee_index in 1..2 loop
      insert into public.assisted_pilot_cycles(organization_id,cycle_number,competence,status,headcount,fluxrh_gross,reference_gross,fluxrh_net,reference_net,critical_open,high_open,reconciled,completed_at)
      values(org_id,employee_index,date '2026-09-01'+((employee_index-1)*interval '1 month'), 'completed',employee_total,gross_value,gross_value,round(gross_value*.8124,2),round(gross_value*.8124,2),0,0,true,now())returning id into cycle_id;
      insert into public.assisted_pilot_divergences(cycle_id,severity,title,cause,decision,status,resolved_at)values
        (cycle_id,'medium','Marcação fictícia divergente','Evento proposital para validar o fluxo','Ajuste sintético aprovado com evidência','resolved',now()),
        (cycle_id,'low','Atestado fictício recebido após corte','Evento proposital para validar reprocessamento','Reprocessamento sintético concluído','resolved',now());
      insert into public.assisted_pilot_evidence(cycle_id,kind,title,payload)values
        (cycle_id,'comparison','Comparativo sintético',jsonb_build_object('grossDifference',0,'netDifference',0,'reconciled',true)),
        (cycle_id,'decision_log','Decisões do ciclo',jsonb_build_object('open',0,'resolved',2)),
        (cycle_id,'payroll_preview','Prévia de folha fictícia',jsonb_build_object('headcount',employee_total,'official',false)),
        (cycle_id,'time_closing','Fechamento de ponto fictício',jsonb_build_object('exceptionsOpen',0,'approved',employee_total)),
        (cycle_id,'artifact_manifest','Manifesto de artefatos',jsonb_build_object('payslips',employee_total,'reports',3,'synthetic',true)),
        (cycle_id,'acceptance','Aceite sintético',jsonb_build_object('approved',true,'kind','simulation'));
    end loop;
  end loop;
end $$;

comment on table public.assisted_pilot_clients is 'Fase 24: clientes-piloto. Registros iniciais são exclusivamente fictícios e não representam organizações reais.';
