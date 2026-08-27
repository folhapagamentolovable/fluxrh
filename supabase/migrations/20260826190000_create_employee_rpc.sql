create or replace function public.create_employee(
  target_organization_id uuid,
  target_company_id uuid,
  target_establishment_id uuid,
  target_department_id uuid,
  target_cost_center_id uuid,
  employee_full_name text,
  employee_cpf text,
  employee_email text,
  employee_phone text,
  employee_birth_date date,
  employment_hire_date date,
  employment_position text,
  employment_salary numeric,
  employment_work_schedule text,
  manager_name text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_employee_id uuid;
  next_registration text;
  resolved_manager_id uuid;
begin
  if (select auth.uid()) is null or not exists (
    select 1
      from public.organization_members member
     where member.organization_id = target_organization_id
       and member.user_id = (select auth.uid())
       and member.status = 'active'
       and member.role in ('owner', 'admin', 'hr')
  ) then
    raise exception 'not_authorized';
  end if;

  if employment_salary <= 0 then raise exception 'salary_must_be_positive'; end if;
  if length(trim(employee_full_name)) < 3 then raise exception 'invalid_employee_name'; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_organization_id::text, 0));
  select lpad((coalesce(max(e.registration::integer), 0) + 1)::text, 6, '0')
    into next_registration
    from public.employees e
   where e.organization_id = target_organization_id
     and e.registration ~ '^[0-9]+$';

  if manager_name is not null then
    select e.id into resolved_manager_id
      from public.employees e
     where e.organization_id = target_organization_id
       and lower(e.full_name) = lower(trim(manager_name))
     limit 1;
  end if;

  insert into public.employees(organization_id, company_id, registration, full_name, cpf, email, phone, birth_date)
  values (target_organization_id, target_company_id, next_registration, trim(employee_full_name), employee_cpf, employee_email, employee_phone, employee_birth_date)
  returning id into new_employee_id;

  insert into public.employment_links(organization_id, employee_id, establishment_id, department_id, cost_center_id, position, salary, work_schedule, manager_employee_id, hire_date)
  values (target_organization_id, new_employee_id, target_establishment_id, target_department_id, target_cost_center_id, trim(employment_position), employment_salary, employment_work_schedule, resolved_manager_id, employment_hire_date);

  return new_employee_id;
end;
$$;

revoke all on function public.create_employee(uuid, uuid, uuid, uuid, uuid, text, text, text, text, date, date, text, numeric, text, text) from public, anon;
grant execute on function public.create_employee(uuid, uuid, uuid, uuid, uuid, text, text, text, text, date, date, text, numeric, text, text) to authenticated;
