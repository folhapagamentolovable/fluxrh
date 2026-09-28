-- Remove a massa sintética acumulada nas fases de piloto e preparar a
-- organização Officecamp para o primeiro cadastro real. A execução remota foi
-- precedida pelo snapshot privado backup_20260927_pre_real.

do $$
declare
  officecamp_id constant uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  neozinho_id constant uuid := '7d134f64-fa70-49f7-8055-eec0b66369e0';
begin
  perform pg_advisory_xact_lock(hashtext('fluxrh_remove_synthetic_data_20260927'));

  if not exists (
    select 1 from public.organizations
    where id = officecamp_id
      and name = 'Officecamp'
      and document = '45749568000148'
      and status = 'active'
  ) then
    raise exception 'officecamp_production_organization_not_found';
  end if;

  if not exists (
    select 1 from auth.users
    where id = neozinho_id
      and lower(email) = 'blogdoneozinho@gmail.com'
  ) or not exists (
    select 1 from public.organization_members
    where organization_id = officecamp_id
      and user_id = neozinho_id
      and role::text = 'super_admin'
      and status = 'active'
  ) then
    raise exception 'officecamp_super_admin_not_found';
  end if;

  if (select count(*) from public.organizations) <> 5
    or (select count(*) from public.companies) <> 6
    or (select count(*) from public.employees) <> 309
    or (select count(*) from storage.objects) <> 0 then
    raise exception 'synthetic_cleanup_precondition_changed';
  end if;

  -- Fases 24–26: pilotos, entrada gradual e operação comercial sintética.
  delete from public.commercial_monitoring_snapshots;
  delete from public.compliance_review_cycles;
  delete from public.customer_onboarding_runs;
  delete from public.quarterly_roadmap_items;
  delete from public.commercial_readiness;
  delete from public.production_rollout_events;
  delete from public.production_rollout_steps;
  delete from public.production_rollouts;
  delete from public.assisted_pilot_evidence;
  delete from public.assisted_pilot_divergences;
  delete from public.assisted_pilot_cycles;
  delete from public.assisted_pilot_clients;
  delete from public.pilot_competence_runs;

  -- Ciclos controlados, módulos agregados e trilhas geradas pelos cenários.
  delete from public.controlled_real_cycle_evidence;
  delete from public.controlled_real_cycles;
  delete from public.module_repository_states;
  delete from public.operational_exceptions;
  delete from public.domain_events;

  -- Documentos e arquivos sintéticos. Não havia objetos no Storage no corte.
  delete from public.document_acceptances;
  delete from public.document_events;
  delete from public.documents;
  delete from public.file_assets;

  -- Folha, jornada e vínculos sintéticos.
  delete from public.payroll_exceptions;
  delete from public.payroll_events;
  delete from public.payroll_employee_calculations;
  delete from public.payroll_runs;
  delete from public.time_competence_closures;
  delete from public.timesheet_approvals;
  delete from public.time_exceptions;
  delete from public.time_punches;
  delete from public.employee_schedules;
  delete from public.employee_dependents;
  delete from public.employee_documents;
  delete from public.employee_timeline;
  delete from public.workflow_tasks;
  delete from public.workflow_instances;
  delete from public.employment_links;
  delete from public.employees;
  delete from public.time_stations;
  delete from public.time_schedules;
  delete from public.organization_units;
  delete from public.companies;

  -- Remove organizações exclusivamente sintéticas e seus parâmetros próprios.
  delete from public.audit_events;
  delete from public.organization_members where organization_id <> officecamp_id;
  delete from public.organizations where id <> officecamp_id;

  -- Conserva apenas o conjunto consolidado da CCT real, removendo versões
  -- intermediárias criadas para o caso fictício AUD-0001.
  delete from public.legal_parameter_sets
  where organization_id = officecamp_id
    and kind = 'collective_agreement'
    and id <> '35f68882-a0cd-48fc-a8f0-006fdba7d157'::uuid;

  update public.legal_parameter_sets
  set code = 'sindeepres_2026',
      name = 'SINDEEPRES — CCT principal 2025/2026 + Aditivo 2026'
  where id = '35f68882-a0cd-48fc-a8f0-006fdba7d157'::uuid;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    officecamp_id, 'service', neozinho_id,
    'organization.synthetic_data_removed',
    'organization', officecamp_id::text,
    jsonb_build_object(
      'authorizedBy', 'Neozinho',
      'snapshotSchema', 'backup_20260927_pre_real',
      'removedOrganizations', 4,
      'removedCompanies', 6,
      'removedEmployees', 309,
      'mode', 'real_data_onboarding'
    )
  );

  if (select count(*) from public.organizations) <> 1
    or (select count(*) from public.organization_members) <> 1
    or (select count(*) from public.companies) <> 0
    or (select count(*) from public.organization_units) <> 0
    or (select count(*) from public.employees) <> 0
    or (select count(*) from public.employment_links) <> 0
    or (select count(*) from public.time_schedules) <> 0
    or (select count(*) from public.module_repository_states) <> 0
    or (select count(*) from public.legal_parameter_sets where organization_id = officecamp_id) <> 7
    or (select count(*) from public.audit_events) <> 1 then
    raise exception 'synthetic_cleanup_verification_failed';
  end if;
end;
$$;
