-- Consolida as premissas coletivas autorizadas e a simulação auditável de 08/2026.
insert into public.audit_events (
  organization_id, actor_type, action, resource_type, resource_id, after_data
)
select
  '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid,
  'system',
  'employee.payroll_competence_audited',
  'employee',
  'f1000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'caseId', 'AUD-0001',
    'competence', '2026-08',
    'calculationVersion', 2,
    'collectiveAssumptions', jsonb_build_object(
      'union', 'SINDEEPRES',
      'schedule12x36Authorized', true,
      'salaryDivisor', 220,
      'authorizationSource', 'user_confirmed_collective_convention'
    ),
    'scenario', jsonb_build_object(
      'regularShifts', 16,
      'workedHoursPerShift', 11,
      'overtime50Hours', 0,
      'overtime100Hours', 0,
      'payableNightHours', 125.714288,
      'workingDays', 26,
      'restDays', 5,
      'nationalOrLocalHolidays', 0
    ),
    'earnings', jsonb_build_object(
      'monthlySalary', 2091.57,
      'nightAdditional', 239.04,
      'dsrOnVariables', 45.97,
      'grossPay', 2376.58
    ),
    'deductionsAndCharges', jsonb_build_object(
      'inssEmployee', 189.58,
      'irrf', 0.00,
      'fgtsEmployer', 190.13,
      'netPay', 2187.00
    ),
    'legalParameters', jsonb_build_object(
      'inssTable', 'Portaria Interministerial MPS/MF 13/2026',
      'irrfTable', 'Receita Federal 2026 com desconto simplificado e reducao mensal',
      'fgtsRate', 0.08,
      'dsrFormula', 'verbas_variaveis / dias_uteis * repousos'
    ),
    'findings', jsonb_build_array(
      'inss_2026_catalog_previously_contained_2025_brackets',
      'irrf_2026_previously_ignored_simplified_deduction_and_monthly_reduction',
      'dsr_on_variable_earnings_was_not_calculated',
      'no_overtime_due_in_regular_authorized_12x36_scenario'
    )
  )
where not exists (
  select 1 from public.audit_events
  where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
    and action = 'employee.payroll_competence_audited'
    and resource_id = 'f1000000-0000-4000-8000-000000000001'
    and after_data ->> 'competence' = '2026-08'
);
