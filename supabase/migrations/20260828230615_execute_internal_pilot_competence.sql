create table public.pilot_competence_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scenario_id text not null,
  competence date not null,
  status text not null check (status in ('processing', 'closed', 'failed')),
  headcount integer not null check (headcount > 0),
  journey_summary jsonb not null check (jsonb_typeof(journey_summary) = 'object'),
  exceptions_detected integer not null default 0,
  exceptions_resolved integer not null default 0,
  timesheets_closed integer not null default 0,
  payroll_gross numeric(16,2) not null default 0,
  payroll_net numeric(16,2) not null default 0,
  artifacts jsonb not null default '{}'::jsonb check (jsonb_typeof(artifacts) = 'object'),
  divergences jsonb not null default '[]'::jsonb check (jsonb_typeof(divergences) = 'array'),
  decisions jsonb not null default '[]'::jsonb check (jsonb_typeof(decisions) = 'array'),
  executed_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, scenario_id, competence)
);

create index pilot_competence_runs_org_competence_idx
  on public.pilot_competence_runs(organization_id, competence desc);
alter table public.pilot_competence_runs enable row level security;
revoke all on public.pilot_competence_runs from anon, authenticated;
grant select on public.pilot_competence_runs to authenticated;
create policy pilot_competence_runs_select on public.pilot_competence_runs
  for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner','admin','hr','payroll','manager','auditor']::public.organization_role[]
  )));

create or replace function public.execute_internal_pilot_competence(target_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '20s'
as $$
declare
  actor_id uuid := (select auth.uid());
  run_id_value uuid;
  definition_id_value uuid;
  closure_id_value uuid;
  employee_count integer;
  gross_value numeric(16,2);
  employee_row record;
begin
  if actor_id is null or not private.is_current_session_active()
    or not private.has_organization_role(
      target_organization_id,
      array['owner','admin','hr']::public.organization_role[]
    ) then raise exception 'pilot_competence_forbidden' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_organization_id::text || ':pilot:2026-08', 0));

  select count(*) into employee_count from public.employees employee
  where employee.organization_id = target_organization_id
    and (employee.registration in ('000063','000087','000104','000148')
      or employee.registration between '000200' and '000315');
  if employee_count <> 120 then raise exception 'pilot_headcount_invalid:%', employee_count using errcode = '22023'; end if;

  insert into public.pilot_competence_runs(
    organization_id, scenario_id, competence, status, headcount, journey_summary, executed_by
  ) values (
    target_organization_id, 'pilot_internal_2026_08', date '2026-08-01', 'processing', 120,
    '{"admissions":6,"vacations":8,"medicalCertificates":5,"terminations":3,"intentionalExceptions":12}'::jsonb,
    actor_id
  ) on conflict (organization_id, scenario_id, competence) do update
    set status = 'processing', executed_by = excluded.executed_by, started_at = now(),
        completed_at = null, updated_at = now()
  returning id into run_id_value;

  insert into public.workflow_definitions(organization_id,key,name,version,definition)
  values(target_organization_id,'pilot_admission','Admissão piloto 2026-08',1,
    '{"steps":["digital_admission","documents","validation","contract","onboarding"]}'::jsonb)
  on conflict(organization_id,key,version) do update set active=true
  returning id into definition_id_value;

  for employee_row in
    select id, registration, full_name from public.employees
    where organization_id = target_organization_id and registration between '000200' and '000205'
    order by registration
  loop
    if not exists (
      select 1 from public.workflow_instances instance
      where instance.organization_id = target_organization_id
        and instance.definition_id = definition_id_value and instance.subject_id = employee_row.id
        and instance.context->>'scenarioId' = 'pilot_internal_2026_08'
    ) then
      insert into public.workflow_instances(
        organization_id,definition_id,subject_type,subject_id,status,current_step,context,
        due_at,started_at,completed_at
      ) values (
        target_organization_id,definition_id_value,'employee',employee_row.id,'completed','onboarding',
        jsonb_build_object('scenarioId','pilot_internal_2026_08','registration',employee_row.registration),
        '2026-08-31 23:59:59-03'::timestamptz,'2026-08-01 09:00:00-03'::timestamptz,
        '2026-08-05 17:00:00-03'::timestamptz
      );
    end if;
  end loop;

  update public.employees set status = 'onboarding', updated_at = now()
    where organization_id = target_organization_id and registration between '000200' and '000205';
  update public.employees set status = 'vacation', updated_at = now()
    where organization_id = target_organization_id and registration between '000206' and '000213';
  update public.employees set status = 'leave', updated_at = now()
    where organization_id = target_organization_id and registration between '000214' and '000218';
  update public.employees set status = 'terminated', updated_at = now()
    where organization_id = target_organization_id and registration between '000219' and '000221';

  insert into public.module_repository_states(organization_id,module_name,state,version,updated_by)
  values
    (target_organization_id,'absences',jsonb_build_object(
      'scenarioId','pilot_internal_2026_08','competence','2026-08','status','closed',
      'vacations',(select jsonb_agg(jsonb_build_object('employeeId',id,'registration',registration,'status','approved')) from public.employees where organization_id=target_organization_id and registration between '000206' and '000213'),
      'medicalCertificates',(select jsonb_agg(jsonb_build_object('employeeId',id,'registration',registration,'status','validated')) from public.employees where organization_id=target_organization_id and registration between '000214' and '000218')
    ),1,actor_id),
    (target_organization_id,'terminations',jsonb_build_object(
      'scenarioId','pilot_internal_2026_08','competence','2026-08','status','completed',
      'employees',(select jsonb_agg(jsonb_build_object('employeeId',id,'registration',registration,'status','completed')) from public.employees where organization_id=target_organization_id and registration between '000219' and '000221')
    ),1,actor_id)
  on conflict(organization_id,module_name) do update
  set state=excluded.state,version=case when public.module_repository_states.state is distinct from excluded.state then public.module_repository_states.version+1 else public.module_repository_states.version end,
      updated_by=excluded.updated_by,updated_at=now();

  for employee_row in
    select id, registration, full_name from public.employees
    where organization_id=target_organization_id and registration between '000200' and '000211'
  loop
    if not exists (select 1 from public.time_exceptions where organization_id=target_organization_id
      and employee_id=employee_row.id and title='PILOT-2026-08 · Exceção proposital · '||employee_row.registration) then
      insert into public.time_exceptions(
        organization_id,employee_id,date,type,title,description,severity,status,minutes,resolution_note,resolved_at
      ) values (
        target_organization_id,employee_row.id,date '2026-08-18','intentional_pilot_exception',
        'PILOT-2026-08 · Exceção proposital · '||employee_row.registration,
        'Divergência sintética criada para validar detecção, decisão e trilha de auditoria.',
        case when employee_row.registration in ('000200','000201') then 'high' else 'medium' end,
        'resolved',15,'Conferida contra escala; ajuste sintético aprovado no piloto.',now()
      );
      insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data)
      values(target_organization_id,'user',actor_id,'pilot.exception_resolved','employee',employee_row.id::text,
        jsonb_build_object('competence','2026-08','registration',employee_row.registration,'decision','approved_adjustment'));
    end if;
  end loop;

  insert into public.timesheet_approvals(organization_id,employee_id,competence,status,approved_by,approved_at)
  select target_organization_id,employee.id,date '2026-08-01','approved',actor_id,now()
  from public.employees employee where employee.organization_id=target_organization_id
    and (employee.registration in ('000063','000087','000104','000148') or employee.registration between '000200' and '000315')
  on conflict(employee_id,competence) do update
    set status='approved',approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now();

  insert into public.time_competence_closures(organization_id,competence,status,closing_progress,closed_at,closed_by,notes)
  values(target_organization_id,date '2026-08-01','closed',100,now(),actor_id,
    '120 espelhos aprovados; 12 exceções propositais resolvidas e auditadas.')
  on conflict(organization_id,competence) do update
    set status='closed',closing_progress=100,closed_at=now(),closed_by=actor_id,
        notes=excluded.notes
  returning id into closure_id_value;

  select round(sum(link.salary),2) into gross_value from public.employment_links link
  join public.employees employee on employee.id=link.employee_id
  where employee.organization_id=target_organization_id
    and (employee.registration in ('000063','000087','000104','000148') or employee.registration between '000200' and '000315');

  insert into public.module_repository_states(organization_id,module_name,state,version,updated_by)
  values(target_organization_id,'payroll',jsonb_build_object(
    'scenarioId','pilot_internal_2026_08','competence','2026-08','status','closed','headcount',120,
    'gross',gross_value,'net',round(gross_value*0.78,2),'timeClosureId',closure_id_value,
    'previewApproved',true,'officialSimulation',true,'payslipsGenerated',120
  ),1,actor_id)
  on conflict(organization_id,module_name) do update
  set state=excluded.state,version=case when public.module_repository_states.state is distinct from excluded.state then public.module_repository_states.version+1 else public.module_repository_states.version end,
      updated_by=excluded.updated_by,updated_at=now();

  insert into public.documents(
    organization_id,employee_id,subject_name,subject_document,company_name,title,category,status,version,required,preview,validation_note
  )
  select target_organization_id,employee.id,employee.full_name,employee.cpf,'Grupo Flux',
    'Holerite piloto 2026-08 · '||employee.registration,'payroll','validated',1,true,
    jsonb_build_object('heading','HOLERITE PILOTO','subheading','Competência 08/2026','paragraphs',jsonb_build_array('Documento sintético para validação interna.'),'clauses','[]'::jsonb),
    'Gerado e reconciliado automaticamente na competência piloto.'
  from public.employees employee
  where employee.organization_id=target_organization_id
    and (employee.registration in ('000063','000087','000104','000148') or employee.registration between '000200' and '000315')
    and not exists(select 1 from public.documents document where document.organization_id=target_organization_id
      and document.employee_id=employee.id and document.title='Holerite piloto 2026-08 · '||employee.registration);

  insert into public.documents(organization_id,subject_name,subject_document,company_name,title,category,status,version,required,preview,validation_note)
  select target_organization_id,'FluxRH — Piloto interno','N/A','Grupo Flux',report.title,'payroll','validated',1,false,
    jsonb_build_object('heading',report.title,'subheading','Competência 08/2026','paragraphs',jsonb_build_array(report.description),'clauses','[]'::jsonb),
    'Relatório reconciliado e aprovado no fechamento do piloto.'
  from (values
    ('Relatório piloto 2026-08 · Fechamento de ponto','120 espelhos aprovados e 12 exceções resolvidas.'),
    ('Relatório piloto 2026-08 · Fechamento da folha','Prévia e simulação oficial fechadas sem divergências críticas ou altas.'),
    ('Relatório piloto 2026-08 · Divergências e decisões','12 divergências propositais tratadas com decisão auditada.')
  ) report(title,description)
  where not exists(select 1 from public.documents document
    where document.organization_id=target_organization_id and document.title=report.title);

  update public.pilot_competence_runs set
    status='closed',exceptions_detected=12,exceptions_resolved=12,timesheets_closed=120,
    payroll_gross=gross_value,payroll_net=round(gross_value*0.78,2),
    artifacts='{"payslips":120,"reports":3,"timeClosure":1,"auditTrail":true}'::jsonb,
    divergences='[]'::jsonb,
    decisions=jsonb_build_array(jsonb_build_object('type','intentional_exceptions','count',12,'decision','approved_adjustment','criticalOpen',0,'highOpen',0)),
    completed_at=now(),updated_at=now()
  where id=run_id_value;

  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data)
  values(target_organization_id,'user',actor_id,'pilot.competence_closed','pilot_competence',run_id_value::text,
    jsonb_build_object('scenarioId','pilot_internal_2026_08','competence','2026-08','headcount',120,
      'exceptionsResolved',12,'timesheetsClosed',120,'payslips',120,'reports',3,'criticalOpen',0,'highOpen',0));

  return (select to_jsonb(run) from public.pilot_competence_runs run where run.id=run_id_value);
end;
$$;

revoke all on function public.execute_internal_pilot_competence(uuid) from public,anon,service_role;
grant execute on function public.execute_internal_pilot_competence(uuid) to authenticated;
comment on function public.execute_internal_pilot_competence(uuid) is
  'Executes and reconciles the fixed 2026-08 internal pilot competence using an active owner/admin/HR session.';
