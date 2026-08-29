do $$
declare
  target_organization_id constant uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  target_company_id constant uuid := 'de1536ee-b2db-49ac-9e9a-5e549ae6c5af';
  target_employee_id uuid := 'f1000000-0000-4000-8000-000000000001';
  target_schedule_id uuid := 'f1000000-0000-4000-8000-000000000002';
  target_establishment_id constant uuid := 'e5a3cb74-d158-48c3-b4ce-441bb1daac68';
  target_department_id constant uuid := 'b04a4ad8-cd59-4897-8141-f8e1cc689b68';
  target_cost_center_id constant uuid := 'f28d408a-6e8d-4bd2-b922-65106ba13db8';
  employee_name constant text := 'Samuel Ferreira de Almeida — Fictício';
  vacation_record jsonb;
  vacation_period jsonb;
  patrol_assignment jsonb;
begin
  if not exists (
    select 1
    from public.organizations
    where id = target_organization_id
  ) then
    raise exception 'audit_case_organization_not_found';
  end if;

  insert into public.employees (
    id,
    organization_id,
    company_id,
    registration,
    full_name,
    cpf,
    email,
    phone,
    birth_date,
    status
  ) values (
    target_employee_id,
    target_organization_id,
    target_company_id,
    'AUD-0001',
    employee_name,
    '90000000001',
    'samuel.ficticio@auditoria.fluxrh.local',
    '11900000001',
    '1988-06-15',
    'active'
  )
  on conflict (organization_id, registration) do update
  set full_name = excluded.full_name,
      company_id = excluded.company_id,
      status = excluded.status,
      updated_at = now();

  select id
  into target_employee_id
  from public.employees
  where organization_id = target_organization_id
    and registration = 'AUD-0001';

  insert into public.time_schedules (
    id,
    organization_id,
    name,
    pattern,
    start_time,
    end_time,
    break_minutes,
    weekly_hours,
    night_shift,
    color,
    active
  ) values (
    target_schedule_id,
    target_organization_id,
    'T1 Noturno',
    '12x36',
    '18:00',
    '06:00',
    60,
    42,
    true,
    '#312e81',
    true
  )
  on conflict (organization_id, name) do update
  set pattern = excluded.pattern,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      break_minutes = excluded.break_minutes,
      weekly_hours = excluded.weekly_hours,
      night_shift = excluded.night_shift,
      active = true;

  select id
  into target_schedule_id
  from public.time_schedules
  where organization_id = target_organization_id
    and name = 'T1 Noturno';

  update public.employment_links
  set active = false,
      updated_at = now()
  where organization_id = target_organization_id
    and employee_id = target_employee_id
    and active = true;

  insert into public.employment_links (
    organization_id,
    employee_id,
    establishment_id,
    department_id,
    cost_center_id,
    position,
    contract_type,
    salary,
    work_schedule,
    hire_date,
    active
  )
  select
    target_organization_id,
    target_employee_id,
    target_establishment_id,
    target_department_id,
    target_cost_center_id,
    'Vigia',
    'CLT',
    2091.57,
    'T1 Noturno — 18:00 às 06:00 — janta das 22:00 às 23:00',
    '2025-01-01',
    true
  where not exists (
    select 1
    from public.employment_links
    where organization_id = target_organization_id
      and employee_id = target_employee_id
      and hire_date = '2025-01-01'
      and position = 'Vigia'
  );

  update public.employment_links
  set establishment_id = target_establishment_id,
      department_id = target_department_id,
      cost_center_id = target_cost_center_id,
      salary = 2091.57,
      work_schedule = 'T1 Noturno — 18:00 às 06:00 — janta das 22:00 às 23:00',
      active = true,
      termination_date = null,
      updated_at = now()
  where organization_id = target_organization_id
    and employee_id = target_employee_id
    and hire_date = '2025-01-01'
    and position = 'Vigia';

  insert into public.employee_schedules (
    organization_id,
    employee_id,
    schedule_id,
    valid_from
  ) values (
    target_organization_id,
    target_employee_id,
    target_schedule_id,
    '2025-01-01'
  )
  on conflict (employee_id, valid_from) do update
  set schedule_id = excluded.schedule_id;

  vacation_record := jsonb_build_object(
    'id', 'vac_aud_0001_2026',
    'employeeId', target_employee_id,
    'employeeName', employee_name,
    'registration', 'AUD-0001',
    'companyName', 'Grupo Flux',
    'departmentName', 'Operações',
    'periodId', 'vp_aud_0001_2025',
    'startDate', '2026-09-01',
    'endDate', '2026-09-30',
    'returnDate', '2026-10-01',
    'days', 30,
    'soldDays', 0,
    'advanceThirteenth', false,
    'status', 'approved',
    'requestedAt', '2026-08-28T12:00:00-03:00',
    'approvedAt', '2026-08-28T12:05:00-03:00',
    'coverageStatus', 'confirmed',
    'payrollEventStatus', 'scheduled',
    'note', 'Caso fictício controlado para auditoria de férias, adicional noturno e folha.'
  );

  vacation_period := jsonb_build_object(
    'id', 'vp_aud_0001_2025',
    'employeeId', target_employee_id,
    'employeeName', employee_name,
    'acquisitionStart', '2025-01-01',
    'acquisitionEnd', '2025-12-31',
    'concessionDeadline', '2026-12-31',
    'earnedDays', 30,
    'usedDays', 0,
    'scheduledDays', 30,
    'balanceDays', 0,
    'status', 'scheduled',
    'risk', 'normal'
  );

  update public.module_repository_states
  set state = jsonb_set(
        jsonb_set(
          state,
          '{vacations}',
          coalesce(state -> 'vacations', '[]'::jsonb) || jsonb_build_array(vacation_record),
          true
        ),
        '{vacationPeriods}',
        coalesce(state -> 'vacationPeriods', '[]'::jsonb) || jsonb_build_array(vacation_period),
        true
      ),
      version = version + 1,
      updated_at = now()
  where organization_id = target_organization_id
    and module_name = 'absences'
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(state -> 'vacations', '[]'::jsonb)) item
      where item ->> 'id' = 'vac_aud_0001_2026'
    );

  patrol_assignment := jsonb_build_object(
    'employeeId', target_employee_id,
    'establishmentId', target_establishment_id,
    'postId', 'post_florence',
    'scheduleId', target_schedule_id,
    'journeys', jsonb_build_array('vacation', 'payroll_audit')
  );

  update public.module_repository_states
  set state = jsonb_set(
        jsonb_set(
          state,
          '{posts}',
          case
            when exists (
              select 1
              from jsonb_array_elements(coalesce(state -> 'posts', '[]'::jsonb)) item
              where item ->> 'id' = 'post_florence'
            ) then coalesce(state -> 'posts', '[]'::jsonb)
            else coalesce(state -> 'posts', '[]'::jsonb) || jsonb_build_array(
              jsonb_build_object(
                'id', 'post_florence',
                'name', 'Florence',
                'establishmentId', target_establishment_id
              )
            )
          end,
          true
        ),
        '{assignments}',
        coalesce(state -> 'assignments', '[]'::jsonb) || jsonb_build_array(patrol_assignment),
        true
      ),
      version = version + 1,
      updated_at = now()
  where organization_id = target_organization_id
    and module_name = 'patrols'
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(state -> 'assignments', '[]'::jsonb)) item
      where item ->> 'employeeId' = target_employee_id::text
        and item ->> 'postId' = 'post_florence'
    );

  insert into public.domain_events (
    organization_id,
    aggregate_type,
    aggregate_id,
    event_type,
    payload
  )
  select
    target_organization_id,
    'employee',
    target_employee_id,
    'employee.audit_case_created',
    jsonb_build_object(
      'registration', 'AUD-0001',
      'position', 'Vigia',
      'post', 'Florence',
      'schedule', 'T1 Noturno',
      'shiftStart', '18:00',
      'shiftEnd', '06:00',
      'dinnerStart', '22:00',
      'dinnerEnd', '23:00',
      'monthlySalary', 2091.57,
      'hireDate', '2025-01-01',
      'vacationStart', '2026-09-01',
      'vacationEnd', '2026-09-30',
      'returnDate', '2026-10-01',
      'purpose', 'cct_and_payroll_calculation_audit'
    )
  where not exists (
    select 1
    from public.domain_events
    where organization_id = target_organization_id
      and aggregate_id = target_employee_id
      and event_type = 'employee.audit_case_created'
  );

  insert into public.audit_events (
    organization_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    after_data
  )
  select
    target_organization_id,
    'system',
    'employee.audit_case_created',
    'employee',
    target_employee_id::text,
    jsonb_build_object(
      'registration', 'AUD-0001',
      'fictional', true,
      'salary', 2091.57,
      'position', 'Vigia',
      'post', 'Florence',
      'schedule', 'T1 Noturno',
      'workPeriod', '18:00-06:00',
      'dinnerPeriod', '22:00-23:00',
      'vacationPeriod', '2026-09-01/2026-09-30',
      'returnDate', '2026-10-01'
    )
  where not exists (
    select 1
    from public.audit_events
    where organization_id = target_organization_id
      and action = 'employee.audit_case_created'
      and resource_id = target_employee_id::text
  );
end;
$$;
