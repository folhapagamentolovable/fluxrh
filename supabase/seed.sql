-- Local demonstration data only. No personal or production data.
-- A login-capable user should be created through local Studio/Auth API.

insert into public.organizations(id, name, document, status)
values ('10000000-0000-4000-8000-000000000001', 'Grupo Flux Local', '00.000.000/0001-00', 'active')
on conflict (id) do nothing;

insert into public.companies(id, organization_id, legal_name, trade_name, document, city, state)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Flux Serviços Locais Ltda.',
  'Grupo Flux Local',
  '00.000.000/0001-00',
  'São Paulo',
  'SP'
)
on conflict (id) do nothing;

insert into public.organization_units(id, organization_id, company_id, type, code, name)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'establishment', 'EST-LOCAL', 'Matriz Local'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'department', 'DEP-RH', 'Pessoas e Cultura'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'cost_center', 'CC-RH', 'RH Corporativo')
on conflict (id) do nothing;

insert into public.workflow_definitions(id, organization_id, key, name, version, definition)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'admission',
  'Admissão completa',
  1,
  '{"steps":["digital_admission","documents","validation","contract","onboarding"]}'::jsonb
)
on conflict (id) do nothing;
