-- Memória técnica da jornada noturna do caso controlado AUD-0001.
insert into public.audit_events (
  organization_id, actor_type, action, resource_type, resource_id, after_data
)
select
  '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid,
  'system',
  'employee.night_shift_audited',
  'employee',
  'f1000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'caseId', 'AUD-0001',
    'calculationVersion', 1,
    'timezone', 'America/Sao_Paulo',
    'schedule', jsonb_build_object(
      'pattern', '12x36', 'start', '18:00', 'end', '06:00',
      'breakStart', '22:00', 'breakEnd', '23:00', 'workedClockMinutes', 660
    ),
    'statutoryParameters', jsonb_build_object(
      'nightStart', '22:00', 'nightEnd', '05:00',
      'reducedNightHourMinutes', 52.5, 'minimumAdditionalRate', 0.20,
      'salaryDivisorAssumed', 220
    ),
    'perShiftResults', jsonb_build_object(
      'nightClockMinutesAfterBreak', 360,
      'reducedNightHours', 6.857143,
      'extensionAfter05Minutes', 60,
      'payableNightHours', 7.857143,
      'hourlyRate', 9.507136,
      'minimumNightAdditional', 14.94
    ),
    'findings', jsonb_build_array(
      'one_hour_break_compliant_with_general_minimum',
      'night_hours_were_previously_zeroed_in_time_and_payroll_engines',
      'overnight_expected_duration_was_previously_zero',
      '12x36_instrument_and_cct_divisor_not_verified'
    ),
    'legalSources', jsonb_build_array(
      'CLT arts. 59-A, 71 e 73',
      'TST Sumula 60, II'
    ),
    'scope', jsonb_build_object(
      'dsrIncluded', false,
      'taxesIncluded', false,
      'cctIncluded', false,
      'monthlyShiftCountIncluded', false
    )
  )
where not exists (
  select 1
  from public.audit_events
  where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
    and action = 'employee.night_shift_audited'
    and resource_id = 'f1000000-0000-4000-8000-000000000001'
    and after_data ->> 'caseId' = 'AUD-0001'
);
