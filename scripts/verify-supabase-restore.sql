\set ON_ERROR_STOP on

do $$
declare
  missing_tables text;
begin
  select string_agg(required.name, ', ' order by required.name)
    into missing_tables
  from (values
    ('organizations'),
    ('organization_memberships'),
    ('employees'),
    ('audit_logs'),
    ('file_assets'),
    ('file_retention_policies')
  ) as required(name)
  where to_regclass('public.' || required.name) is null;

  if missing_tables is not null then
    raise exception 'Tabelas obrigatórias ausentes: %', missing_tables;
  end if;
end
$$;

do $$
declare
  unprotected_tables text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into unprotected_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected_tables is not null then
    raise exception 'Tabelas públicas sem RLS: %', unprotected_tables;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'fluxrh-private' and public = false) then
    raise exception 'Bucket privado fluxrh-private ausente ou configurado como público.';
  end if;
end
$$;

select count(*) as migrations_restauradas
from supabase_migrations.schema_migrations;

select
  (select count(*) from public.organizations) as organizacoes,
  (select count(*) from public.organization_memberships) as vinculos,
  (select count(*) from public.employees) as colaboradores,
  (select count(*) from public.audit_logs) as eventos_auditoria,
  (select count(*) from public.file_assets) as metadados_arquivos;
