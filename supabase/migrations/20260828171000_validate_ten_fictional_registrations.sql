do $$
declare
  demo_organization uuid;
  company_count integer;
  unit_count integer;
  employee_count integer;
  link_count integer;
  unsafe_count integer;
begin
  select id into demo_organization
  from public.organizations
  where document = 'FICT-DEMO-ORG-20260828';

  if demo_organization is null then
    raise exception 'fictional_demo_organization_missing';
  end if;

  select count(*) into company_count
  from public.companies
  where organization_id = demo_organization
    and document like 'FICT-%';

  select count(*) into unit_count
  from public.organization_units
  where organization_id = demo_organization;

  select count(*) into employee_count
  from public.employees
  where organization_id = demo_organization
    and cpf like 'FICT-%'
    and email like '%@example.invalid';

  select count(*) into link_count
  from public.employment_links link
  join public.employees employee
    on employee.id = link.employee_id
   and employee.organization_id = link.organization_id
  where link.organization_id = demo_organization
    and link.active;

  select count(*) into unsafe_count
  from public.employees
  where organization_id = demo_organization
    and (cpf not like 'FICT-%' or email not like '%@example.invalid');

  if company_count <> 1 then raise exception 'expected_1_fictional_company_got_%', company_count; end if;
  if unit_count <> 3 then raise exception 'expected_3_fictional_units_got_%', unit_count; end if;
  if employee_count <> 10 then raise exception 'expected_10_fictional_employees_got_%', employee_count; end if;
  if link_count <> 10 then raise exception 'expected_10_fictional_links_got_%', link_count; end if;
  if unsafe_count <> 0 then raise exception 'non_fictional_record_detected_%', unsafe_count; end if;
end
$$;
