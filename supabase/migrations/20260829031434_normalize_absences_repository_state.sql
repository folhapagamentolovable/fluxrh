do $$
declare
  target record;
  normalized_requests jsonb;
  normalized_certificates jsonb;
  normalized_periods jsonb;
begin
  for target in
    select organization_id, state
    from public.module_repository_states
    where module_name = 'absences'
      and (
        not (state ? 'vacationRequests')
        or not (state ? 'certificates')
        or not (state ? 'occurrences')
        or not (state ? 'leaves')
      )
  loop
    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into normalized_requests
    from jsonb_array_elements(
      coalesce(target.state -> 'vacationRequests', target.state -> 'vacations', '[]'::jsonb)
    ) item
    where item ?& array[
      'id', 'employeeId', 'employeeName', 'companyName', 'departmentName',
      'periodId', 'startDate', 'endDate', 'days', 'soldDays',
      'advanceThirteenth', 'status', 'requestedAt', 'coverageStatus',
      'payrollEventStatus'
    ];

    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into normalized_certificates
    from jsonb_array_elements(
      coalesce(target.state -> 'certificates', target.state -> 'medicalCertificates', '[]'::jsonb)
    ) item
    where item ?& array[
      'id', 'employeeId', 'employeeName', 'startDate', 'endDate', 'days',
      'issuer', 'professionalRegistration', 'receivedAt', 'status',
      'documentName'
    ];

    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into normalized_periods
    from jsonb_array_elements(
      coalesce(target.state -> 'vacationPeriods', '[]'::jsonb)
    ) item
    where item ?& array[
      'id', 'employeeId', 'employeeName', 'acquisitionStart',
      'acquisitionEnd', 'concessionDeadline', 'earnedDays', 'usedDays',
      'scheduledDays', 'balanceDays', 'status', 'risk'
    ];

    update public.module_repository_states
    set state = jsonb_build_object(
          'summary', jsonb_build_object(
            'vacationBalance', coalesce((
              select sum((item ->> 'balanceDays')::numeric)
              from jsonb_array_elements(normalized_periods) item
            ), 0),
            'requestsPending', 0,
            'periodsAtRisk', 0,
            'certificatesUnderReview', 0,
            'employeesOnLeave', 0,
            'absencesThisMonth', 0
          ),
          'vacationPeriods', normalized_periods,
          'vacationRequests', normalized_requests,
          'occurrences', coalesce(target.state -> 'occurrences', '[]'::jsonb),
          'certificates', normalized_certificates,
          'leaves', coalesce(target.state -> 'leaves', '[]'::jsonb),
          'calendar', '[]'::jsonb,
          'legacyPilotMetadata', target.state - array[
            'summary', 'vacationPeriods', 'vacationRequests', 'vacations',
            'occurrences', 'certificates', 'medicalCertificates', 'leaves',
            'calendar'
          ]
        ),
        version = version + 1,
        updated_at = now()
    where organization_id = target.organization_id
      and module_name = 'absences';

    insert into public.audit_events (
      organization_id,
      actor_type,
      action,
      resource_type,
      resource_id,
      before_data,
      after_data
    ) values (
      target.organization_id,
      'system',
      'absences.state_normalized',
      'module_state',
      'absences',
      jsonb_build_object('legacyKeys', array(select jsonb_object_keys(target.state))),
      jsonb_build_object(
        'vacationPeriods', jsonb_array_length(normalized_periods),
        'vacationRequests', jsonb_array_length(normalized_requests),
        'certificates', jsonb_array_length(normalized_certificates)
      )
    );
  end loop;
end;
$$;
