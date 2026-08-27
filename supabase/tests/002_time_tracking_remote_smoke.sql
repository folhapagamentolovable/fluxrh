begin;

do $$
declare
  organization_id_value uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  user_id_value uuid := '7d134f64-fa70-49f7-8055-eec0b66369e0';
  company_id_value uuid := gen_random_uuid();
  employee_id_value uuid := gen_random_uuid();
  exception_id_value uuid := gen_random_uuid();
  punch_id_value uuid;
  station_token_value text;
  approval_blocked boolean := false;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id_value, 'role', 'authenticated')::text,
    true
  );

  insert into public.companies(id, organization_id, legal_name, trade_name, document)
  values(company_id_value, organization_id_value, 'FluxRH Smoke Test Ltda', 'FluxRH Smoke', '99999999000199');

  insert into public.employees(id, organization_id, company_id, registration, full_name, cpf, status)
  values(employee_id_value, organization_id_value, company_id_value, 'SMOKE-TIME', 'Teste Jornada', '99999999999', 'active');

  select token into station_token_value
  from public.time_stations
  where organization_id = organization_id_value and active
  order by created_at
  limit 1;

  punch_id_value := public.register_time_punch(
    employee_id_value,
    'clock_in',
    station_token_value,
    'smoke-device',
    'Validação remota'
  );

  if not exists(select 1 from public.time_punches where id = punch_id_value) then
    raise exception 'register_time_punch did not persist the punch';
  end if;

  insert into public.time_exceptions(
    id, organization_id, employee_id, date, type, title, description, severity
  ) values(
    exception_id_value, organization_id_value, employee_id_value, current_date,
    'missing_punch', 'Marcação ausente', 'Exceção criada pelo smoke test', 'high'
  );

  begin
    perform public.approve_employee_timesheet(employee_id_value, date_trunc('month', current_date)::date);
  exception when sqlstate '22023' then
    approval_blocked := sqlerrm = 'timesheet_has_open_exceptions';
  end;

  if not approval_blocked then
    raise exception 'open exception did not block timesheet approval';
  end if;

  perform public.resolve_time_exception(exception_id_value, 'Validada no smoke test remoto');
  perform public.approve_employee_timesheet(employee_id_value, date_trunc('month', current_date)::date);

  if not exists(
    select 1 from public.time_exceptions
    where id = exception_id_value and status = 'resolved' and resolution_note is not null
  ) then
    raise exception 'resolve_time_exception did not resolve the exception';
  end if;

  if not exists(
    select 1 from public.timesheet_approvals
    where employee_id = employee_id_value and status = 'approved'
  ) then
    raise exception 'approve_employee_timesheet did not approve the competence';
  end if;
end
$$;

select 'time_tracking_remote_smoke_passed' as result;

rollback;
