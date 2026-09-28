alter table public.companies
  add column if not exists responsible_name text,
  add column if not exists responsible_role text,
  add column if not exists phone text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists postal_code text;

alter table public.organization_units
  add column if not exists manager_name text,
  add column if not exists document text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state char(2),
  add column if not exists postal_code text;

alter table public.companies
  add constraint companies_phone_digits_check check (phone is null or phone ~ '^\d{10,11}$') not valid,
  add constraint companies_postal_code_digits_check check (postal_code is null or postal_code ~ '^\d{8}$') not valid;

alter table public.organization_units
  add constraint organization_units_document_digits_check check (document is null or document ~ '^\d{14}$') not valid,
  add constraint organization_units_phone_digits_check check (phone is null or phone ~ '^\d{10,11}$') not valid,
  add constraint organization_units_postal_code_digits_check check (postal_code is null or postal_code ~ '^\d{8}$') not valid;

comment on column public.organization_units.parent_id is
  'Nulo para estabelecimento; estabelecimento para departamento; departamento para centro de custo.';
