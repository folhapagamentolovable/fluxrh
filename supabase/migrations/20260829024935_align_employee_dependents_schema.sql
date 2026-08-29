do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employee_dependents'
      and column_name = 'name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employee_dependents'
      and column_name = 'full_name'
  ) then
    alter table public.employee_dependents rename column name to full_name;
  end if;
end;
$$;

alter table public.employee_dependents
  add column if not exists document text,
  add column if not exists eligible_for_benefits boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.employee_dependents'::regclass
      and conname = 'employee_dependents_status_check'
  ) then
    alter table public.employee_dependents
      add constraint employee_dependents_status_check
      check (status in ('active', 'inactive'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.employee_dependents'::regclass
      and conname = 'employee_dependents_full_name_check'
  ) then
    alter table public.employee_dependents
      add constraint employee_dependents_full_name_check
      check (length(trim(full_name)) >= 3) not valid;
  end if;
end;
$$;
