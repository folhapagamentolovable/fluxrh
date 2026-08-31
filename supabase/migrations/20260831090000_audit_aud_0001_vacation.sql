-- Registra a primeira memória de cálculo controlada do caso AUD-0001 e
-- restaura explicitamente a data de retorno no snapshot de férias.
do $$
declare
  target_organization_id uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  target_employee_id uuid := 'f1000000-0000-4000-8000-000000000001';
  requests jsonb;
begin
  select coalesce(jsonb_agg(
    case when item ->> 'id' = 'vac_aud_0001_2026' then
      item || jsonb_build_object(
        'returnDate', '2026-10-01',
        'audit', jsonb_build_object(
          'version', 1,
          'auditedAt', '2026-08-31',
          'acquisitionCompliant', true,
          'concessionCompliant', true,
          'paymentDeadline', '2026-08-30',
          'remunerationBase', 2091.57,
          'vacationRemuneration', 2091.57,
          'constitutionalThird', 697.19,
          'grossVacation', 2788.76,
          'taxesIncluded', false,
          'cctIncluded', false
        )
      )
    else item end
  ), '[]'::jsonb)
  into requests
  from public.module_repository_states state_row,
       jsonb_array_elements(coalesce(state_row.state -> 'vacationRequests', '[]'::jsonb)) item
  where state_row.organization_id = target_organization_id
    and state_row.module_name = 'absences';

  update public.module_repository_states
  set state = jsonb_set(state, '{vacationRequests}', requests, true),
      version = version + 1,
      updated_at = now()
  where organization_id = target_organization_id
    and module_name = 'absences'
    and exists (
      select 1 from jsonb_array_elements(coalesce(state -> 'vacationRequests', '[]'::jsonb)) item
      where item ->> 'id' = 'vac_aud_0001_2026'
        and not (item ? 'audit')
    );

  insert into public.audit_events (
    organization_id, actor_type, action, resource_type, resource_id, after_data
  )
  select target_organization_id, 'system', 'employee.vacation_audited', 'employee',
    target_employee_id::text,
    jsonb_build_object(
      'caseId', 'AUD-0001',
      'calculationVersion', 1,
      'acquisitionPeriod', jsonb_build_object('start', '2025-01-01', 'end', '2025-12-31'),
      'concessionDeadline', '2026-12-31',
      'vacationPeriod', jsonb_build_object('start', '2026-09-01', 'end', '2026-09-30', 'days', 30),
      'returnDate', '2026-10-01',
      'paymentDeadline', '2026-08-30',
      'formula', '(salario_mensal + media_variaveis) / 30 * dias + 1/3',
      'inputs', jsonb_build_object('monthlySalary', 2091.57, 'averageVariables', 0, 'soldDays', 0),
      'results', jsonb_build_object('vacationRemuneration', 2091.57, 'constitutionalThird', 697.19, 'grossVacation', 2788.76),
      'findings', jsonb_build_array('periods_compliant', 'payroll_event_not_processed'),
      'legalSources', jsonb_build_array(
        'Constituicao Federal art. 7, XVII',
        'CLT arts. 129, 130, 134, 137, 142 e 145'
      ),
      'scope', jsonb_build_object('taxesIncluded', false, 'cctIncluded', false)
    )
  where not exists (
    select 1 from public.audit_events
    where organization_id = target_organization_id
      and action = 'employee.vacation_audited'
      and resource_id = target_employee_id::text
      and after_data ->> 'caseId' = 'AUD-0001'
  );
end;
$$;
