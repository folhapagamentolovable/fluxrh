create or replace function public.load_internal_pilot(
  target_organization_id uuid,
  pilot_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '15s'
as $$
declare
  company_id_value uuid;
  employee_id_value uuid;
  establishment_id_value uuid;
  department_id_value uuid;
  cost_center_id_value uuid;
  schedule_id_value uuid;
  item jsonb;
  employee_count integer;
begin
  if (select auth.uid()) is null
    or not private.is_current_session_active()
    or not private.has_organization_role(
      target_organization_id,
      array['owner', 'admin', 'hr']::public.organization_role[]
    ) then
    raise exception 'pilot_load_forbidden' using errcode = '42501';
  end if;

  if jsonb_typeof(pilot_payload) <> 'object'
    or pilot_payload->>'scenarioId' <> 'pilot_internal_2026_08'
    or (pilot_payload->>'version')::integer <> 1
    or pilot_payload->>'competence' <> '2026-08'
    or jsonb_array_length(coalesce(pilot_payload->'employees', '[]'::jsonb)) <> 120
    or jsonb_array_length(coalesce(pilot_payload->'schedules', '[]'::jsonb)) <> 3
  then
    raise exception 'invalid_pilot_payload' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(pilot_payload->'employees') employee
    group by employee->>'registration' having count(*) > 1
  ) then
    raise exception 'duplicate_pilot_registration' using errcode = '22023';
  end if;

  insert into public.companies(organization_id, legal_name, trade_name, document, status)
  values (
    target_organization_id,
    pilot_payload->'company'->>'legalName',
    pilot_payload->'company'->>'tradeName',
    pilot_payload->'company'->>'document',
    'active'
  )
  on conflict (organization_id, document) do update
  set legal_name = excluded.legal_name, trade_name = excluded.trade_name,
      status = excluded.status, updated_at = now()
  returning id into company_id_value;

  for item in select value from jsonb_array_elements(pilot_payload->'units') loop
    insert into public.organization_units(organization_id, company_id, type, code, name, status)
    values (
      target_organization_id, company_id_value,
      (item->>'type')::public.organization_unit_type,
      item->>'code', item->>'name', 'active'
    )
    on conflict (organization_id, code) do update
    set company_id = excluded.company_id, type = excluded.type, name = excluded.name,
        status = excluded.status, updated_at = now();
  end loop;

  for item in select value from jsonb_array_elements(pilot_payload->'schedules') loop
    insert into public.time_schedules(
      organization_id, name, pattern, start_time, end_time, break_minutes, weekly_hours, night_shift
    ) values (
      target_organization_id, item->>'name', item->>'pattern',
      (item->>'startTime')::time, (item->>'endTime')::time,
      (item->>'breakMinutes')::integer, (item->>'weeklyHours')::numeric, false
    )
    on conflict (organization_id, name) do update
    set pattern = excluded.pattern, start_time = excluded.start_time, end_time = excluded.end_time,
        break_minutes = excluded.break_minutes, weekly_hours = excluded.weekly_hours, active = true;
  end loop;

  for item in select value from jsonb_array_elements(pilot_payload->'employees') loop
    select id into establishment_id_value from public.organization_units
      where organization_id = target_organization_id and code = item->>'establishmentCode';
    select id into department_id_value from public.organization_units
      where organization_id = target_organization_id and code = item->>'departmentCode';
    select id into cost_center_id_value from public.organization_units
      where organization_id = target_organization_id and code = item->>'costCenterCode';
    select id into schedule_id_value from public.time_schedules
      where organization_id = target_organization_id and name = item->>'scheduleName';

    if establishment_id_value is null or department_id_value is null
      or cost_center_id_value is null or schedule_id_value is null then
      raise exception 'pilot_reference_not_found:%', item->>'registration' using errcode = '23503';
    end if;

    insert into public.employees(
      organization_id, company_id, registration, full_name, cpf, email, phone, birth_date, status
    ) values (
      target_organization_id, company_id_value, item->>'registration', item->>'fullName', item->>'cpf',
      nullif(item->>'email', ''), nullif(item->>'phone', ''), nullif(item->>'birthDate', '')::date,
      (item->>'status')::public.employee_status
    )
    on conflict (organization_id, registration) do update
    set company_id = excluded.company_id, full_name = excluded.full_name, cpf = excluded.cpf,
        email = excluded.email, phone = excluded.phone, birth_date = excluded.birth_date,
        status = excluded.status, updated_at = now()
    returning id into employee_id_value;

    update public.employment_links set
      establishment_id = establishment_id_value, department_id = department_id_value,
      cost_center_id = cost_center_id_value, position = item->>'position',
      contract_type = item->>'contractType', salary = (item->>'salary')::numeric,
      work_schedule = item->>'workSchedule',
      termination_date = case when item->>'status' = 'terminated' then greatest((item->>'hireDate')::date, date '2026-08-31') else null end,
      active = item->>'status' <> 'terminated', updated_at = now()
    where organization_id = target_organization_id and employee_id = employee_id_value
      and hire_date = (item->>'hireDate')::date;

    if not found then
      insert into public.employment_links(
        organization_id, employee_id, establishment_id, department_id, cost_center_id,
        position, contract_type, salary, work_schedule, hire_date, termination_date, active
      ) values (
        target_organization_id, employee_id_value, establishment_id_value, department_id_value,
        cost_center_id_value, item->>'position', item->>'contractType', (item->>'salary')::numeric,
        item->>'workSchedule', (item->>'hireDate')::date,
        case when item->>'status' = 'terminated' then greatest((item->>'hireDate')::date, date '2026-08-31') else null end,
        item->>'status' <> 'terminated'
      );
    end if;

    insert into public.employee_schedules(organization_id, employee_id, schedule_id, valid_from)
    values (target_organization_id, employee_id_value, schedule_id_value, date '2026-08-01')
    on conflict (employee_id, valid_from) do update set schedule_id = excluded.schedule_id;
  end loop;

  insert into public.module_repository_states(organization_id, module_name, state, version, updated_by)
  values (target_organization_id, 'patrols', pilot_payload->'patrolState', 1, (select auth.uid()))
  on conflict (organization_id, module_name) do update
  set state = excluded.state,
      version = case when public.module_repository_states.state is distinct from excluded.state
        then public.module_repository_states.version + 1 else public.module_repository_states.version end,
      updated_by = excluded.updated_by, updated_at = now();

  select count(*) into employee_count from public.employees employee
  where employee.organization_id = target_organization_id
    and employee.registration in (
      select value->>'registration' from jsonb_array_elements(pilot_payload->'employees')
    );

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action, resource_type, resource_id, after_data
  ) values (
    target_organization_id, 'user', (select auth.uid()), 'pilot.loaded', 'pilot',
    pilot_payload->>'scenarioId', jsonb_build_object(
      'version', (pilot_payload->>'version')::integer,
      'competence', pilot_payload->>'competence', 'employees', employee_count
    )
  );

  return jsonb_build_object(
    'scenarioId', pilot_payload->>'scenarioId', 'organizationId', target_organization_id,
    'companyId', company_id_value, 'employees', employee_count, 'idempotent', true
  );
end;
$$;

revoke all on function public.load_internal_pilot(uuid, jsonb)
  from public, anon, service_role;
grant execute on function public.load_internal_pilot(uuid, jsonb) to authenticated;

comment on function public.load_internal_pilot(uuid, jsonb) is
  'Loads the fixed internal pilot through a real active owner/admin/HR session with tenant-scoped idempotent upserts.';
