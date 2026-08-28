do $$
declare
  super_user uuid;
  active_organization uuid;
  demo_company uuid;
  demo_establishment uuid;
  demo_department uuid;
  demo_cost_center uuid;
  seeded_employee_id uuid;
  employee_number integer;
begin
  select user_id
  into super_user
  from public.organization_members
  where role::text = 'super_admin'
    and status = 'active'
  order by created_at
  limit 1;

  select organization_id
  into active_organization
  from public.organization_members
  where user_id = super_user
    and status = 'active'
  order by created_at
  limit 1;

  if active_organization is null then
    raise exception 'active_organization_for_fictional_seed_missing';
  end if;

  insert into public.companies (
    organization_id, legal_name, trade_name, document, status, city, state
  ) values (
    active_organization,
    'Companhia Exemplo de Testes Fictícios Ltda.',
    'Companhia Exemplo Fictícia',
    'FICT-ACTIVE-CNPJ-20260828',
    'active',
    'Cidade Exemplo',
    'SP'
  )
  on conflict (organization_id, document) do update
  set trade_name = excluded.trade_name,
      updated_at = now()
  returning id into demo_company;

  insert into public.organization_units (
    organization_id, company_id, type, code, name
  ) values (
    active_organization, demo_company, 'establishment', 'FICT-ATIVA-MATRIZ', 'Matriz Fictícia Visível'
  )
  on conflict (organization_id, code) do update
  set company_id = excluded.company_id,
      name = excluded.name,
      updated_at = now()
  returning id into demo_establishment;

  insert into public.organization_units (
    organization_id, company_id, type, code, name
  ) values (
    active_organization, demo_company, 'department', 'FICT-ATIVA-RH', 'Departamento Fictício Visível'
  )
  on conflict (organization_id, code) do update
  set company_id = excluded.company_id,
      name = excluded.name,
      updated_at = now()
  returning id into demo_department;

  insert into public.organization_units (
    organization_id, company_id, type, code, name
  ) values (
    active_organization, demo_company, 'cost_center', 'FICT-ATIVA-CC', 'Centro de Custo Fictício Visível'
  )
  on conflict (organization_id, code) do update
  set company_id = excluded.company_id,
      name = excluded.name,
      updated_at = now()
  returning id into demo_cost_center;

  for employee_number in 1..10 loop
    insert into public.employees (
      organization_id, company_id, registration, full_name, cpf, email,
      phone, birth_date, status
    ) values (
      active_organization,
      demo_company,
      'FICT-VIS-' || lpad(employee_number::text, 3, '0'),
      'Pessoa Fictícia Visível ' || lpad(employee_number::text, 2, '0'),
      'FICT-VISIBLE-CPF-' || lpad(employee_number::text, 4, '0'),
      'pessoa.ficticia.visivel.' || employee_number || '@example.invalid',
      '+55 00 10000-' || lpad(employee_number::text, 4, '0'),
      date '1988-01-01' + (employee_number * 101),
      'active'
    )
    on conflict (organization_id, registration) do update
    set company_id = excluded.company_id,
        full_name = excluded.full_name,
        cpf = excluded.cpf,
        email = excluded.email,
        updated_at = now()
    returning id into seeded_employee_id;

    if not exists (
      select 1 from public.employment_links link
      where link.organization_id = active_organization
        and link.employee_id = seeded_employee_id
        and link.active
    ) then
      insert into public.employment_links (
        organization_id, employee_id, establishment_id, department_id,
        cost_center_id, position, contract_type, salary, work_schedule,
        hire_date, active
      ) values (
        active_organization,
        seeded_employee_id,
        demo_establishment,
        demo_department,
        demo_cost_center,
        case when employee_number = 1 then 'Coordenador Fictício' else 'Analista Fictício' end,
        'CLT-FICTICIO',
        3250 + (employee_number * 150),
        '5x2',
        date '2026-02-01' + employee_number,
        true
      );
    end if;
  end loop;

  if (
    select count(*)
    from public.employees
    where organization_id = active_organization
      and registration like 'FICT-VIS-%'
      and email like '%@example.invalid'
  ) <> 10 then
    raise exception 'active_organization_fictional_seed_validation_failed';
  end if;
end
$$;
