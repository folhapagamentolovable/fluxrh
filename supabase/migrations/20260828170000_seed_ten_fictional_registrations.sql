do $$
declare
  super_user uuid;
  demo_organization uuid;
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

  if super_user is null then
    raise exception 'fictional_seed_requires_active_super_admin';
  end if;

  insert into public.organizations (name, document, status, created_by)
  values (
    'Empresa Modelo FluxRH — Cadastro Fictício',
    'FICT-DEMO-ORG-20260828',
    'active',
    super_user
  )
  on conflict (document) do update
  set name = excluded.name,
      updated_at = now()
  returning id into demo_organization;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (demo_organization, super_user, 'super_admin', 'active', super_user)
  on conflict (organization_id, user_id) do update
  set role = 'super_admin',
      status = 'active',
      updated_at = now();

  insert into public.companies (
    organization_id,
    legal_name,
    trade_name,
    document,
    status,
    city,
    state
  )
  values (
    demo_organization,
    'Empresa Modelo FluxRH Fictícia Ltda.',
    'FluxRH Fictícia',
    'FICT-DEMO-CNPJ-20260828',
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
    demo_organization, demo_company, 'establishment', 'DEMO-MATRIZ', 'Matriz Fictícia'
  )
  on conflict (organization_id, code) do update
  set name = excluded.name,
      updated_at = now()
  returning id into demo_establishment;

  insert into public.organization_units (
    organization_id, company_id, type, code, name
  ) values (
    demo_organization, demo_company, 'department', 'DEMO-RH', 'Departamento Fictício de Pessoas'
  )
  on conflict (organization_id, code) do update
  set name = excluded.name,
      updated_at = now()
  returning id into demo_department;

  insert into public.organization_units (
    organization_id, company_id, type, code, name
  ) values (
    demo_organization, demo_company, 'cost_center', 'DEMO-CC', 'Centro de Custo Fictício'
  )
  on conflict (organization_id, code) do update
  set name = excluded.name,
      updated_at = now()
  returning id into demo_cost_center;

  for employee_number in 1..10 loop
    insert into public.employees (
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
      demo_organization,
      demo_company,
      'DEMO-' || lpad(employee_number::text, 4, '0'),
      'Cadastro Fictício ' || lpad(employee_number::text, 2, '0'),
      'FICT-DEMO-CPF-' || lpad(employee_number::text, 4, '0'),
      'cadastro.ficticio.' || employee_number || '@example.invalid',
      '+55 00 00000-' || lpad(employee_number::text, 4, '0'),
      date '1990-01-01' + (employee_number * 37),
      'active'
    )
    on conflict (organization_id, registration) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now()
    returning id into seeded_employee_id;

    if not exists (
      select 1
      from public.employment_links link
      where link.organization_id = demo_organization
        and link.employee_id = seeded_employee_id
        and link.active
    ) then
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
      ) values (
        demo_organization,
        seeded_employee_id,
        demo_establishment,
        demo_department,
        demo_cost_center,
        case when employee_number = 1 then 'Gestor Fictício' else 'Analista Fictício' end,
        'CLT-FICTICIO',
        3000 + (employee_number * 175),
        case employee_number % 3 when 0 then '5x2' when 1 then '12x36' else '6x1' end,
        date '2026-01-05' + employee_number,
        true
      );
    end if;
  end loop;

  if (
    select count(*)
    from public.employees
    where organization_id = demo_organization
      and email like '%@example.invalid'
  ) < 10 then
    raise exception 'fictional_seed_validation_failed';
  end if;
end
$$;

comment on column public.organizations.document is
  'Documento organizacional; valores prefixados com FICT são reservados para massas artificiais de teste.';
