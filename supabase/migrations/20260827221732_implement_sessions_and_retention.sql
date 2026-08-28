create or replace function private.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when nullif((select auth.jwt()->>'session_id'), '') is null then true
    else exists (
      select 1
      from auth.sessions session_value
      where session_value.id = ((select auth.jwt()->>'session_id'))::uuid
        and session_value.user_id = (select auth.uid())
        and (session_value.not_after is null or session_value.not_after > now())
    )
  end;
$$;

revoke all on function private.is_current_session_active()
  from public, anon, authenticated, service_role;

create or replace function private.is_active_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_session_active() and exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_session_active() and exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role::text = 'super_admin'
        or membership.role = any(allowed_roles)
      )
  );
$$;

revoke all on function private.is_active_member(uuid) from public, anon;
revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public, anon;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;

create or replace function public.list_organization_sessions()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
begin
  select membership.organization_id
  into organization_id_value
  from public.organization_members membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and (
      membership.role::text = 'super_admin'
      or membership.role in ('owner', 'admin', 'auditor')
    )
  order by membership.created_at
  limit 1;

  if organization_id_value is null or not private.is_current_session_active() then
    raise exception 'session_list_forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', session_value.id,
      'userId', session_value.user_id,
      'userName', coalesce(nullif(profile.full_name, ''), auth_user.email, 'Usuário'),
      'userAgent', coalesce(session_value.user_agent, 'Dispositivo não identificado'),
      'ipAddress', coalesce(host(session_value.ip), 'Não informado'),
      'createdAt', session_value.created_at,
      'lastSeenAt', coalesce(session_value.refreshed_at at time zone 'UTC', session_value.updated_at, session_value.created_at),
      'expiresAt', session_value.not_after,
      'current', session_value.id::text = (select auth.jwt()->>'session_id'),
      'status', case
        when session_value.not_after is not null and session_value.not_after <= now() then 'expired'
        else 'active'
      end
    ) order by coalesce(session_value.refreshed_at at time zone 'UTC', session_value.updated_at, session_value.created_at) desc)
    from auth.sessions session_value
    join public.organization_members membership
      on membership.user_id = session_value.user_id
     and membership.organization_id = organization_id_value
     and membership.status = 'active'
    join auth.users auth_user on auth_user.id = session_value.user_id
    left join public.profiles profile on profile.user_id = session_value.user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.revoke_organization_session(
  session_id_value uuid,
  justification_value text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
  target_user_id uuid;
  revoked_session jsonb;
begin
  if length(trim(coalesce(justification_value, ''))) < 3 then
    raise exception 'invalid_revocation_justification' using errcode = '22023';
  end if;

  if session_id_value::text = (select auth.jwt()->>'session_id') then
    raise exception 'current_session_cannot_be_revoked' using errcode = '22023';
  end if;

  select membership.organization_id
  into organization_id_value
  from public.organization_members membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and (
      membership.role::text = 'super_admin'
      or membership.role in ('owner', 'admin')
    )
  order by membership.created_at
  limit 1;

  if organization_id_value is null or not private.is_current_session_active() then
    raise exception 'session_revoke_forbidden' using errcode = '42501';
  end if;

  select session_value.user_id
  into target_user_id
  from auth.sessions session_value
  where session_value.id = session_id_value
    and exists (
      select 1
      from public.organization_members target_membership
      where target_membership.organization_id = organization_id_value
        and target_membership.user_id = session_value.user_id
        and target_membership.status = 'active'
    )
  for update;

  if target_user_id is null then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  revoked_session := jsonb_build_object(
    'id', session_id_value,
    'userId', target_user_id,
    'status', 'revoked',
    'revokedAt', now()
  );

  delete from auth.sessions where id = session_id_value;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    organization_id_value, 'user', (select auth.uid()), 'session.revoked',
    'auth_session', session_id_value::text,
    revoked_session || jsonb_build_object('justification', trim(justification_value))
  );

  return revoked_session;
end;
$$;

revoke all on function public.list_organization_sessions() from public, anon;
revoke all on function public.revoke_organization_session(uuid, text) from public, anon;
grant execute on function public.list_organization_sessions() to authenticated;
grant execute on function public.revoke_organization_session(uuid, text) to authenticated;

create table public.file_retention_policies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in (
    'documents', 'medical_certificates', 'contracts',
    'payslips', 'reports', 'patrol_evidence'
  )),
  retention_days integer not null check (retention_days between 30 and 36500),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, category)
);

create index file_retention_policies_organization_idx
  on public.file_retention_policies(organization_id);

alter table public.file_retention_policies enable row level security;
revoke all on public.file_retention_policies from anon, authenticated;
grant select on public.file_retention_policies to authenticated;

create policy file_retention_policies_select
  on public.file_retention_policies
  for select to authenticated
  using ((select private.has_organization_role(
    organization_id,
    array['owner','admin','hr','payroll','auditor']::public.organization_role[]
  )));

create or replace function private.seed_file_retention_policies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.file_retention_policies(organization_id, category, retention_days)
  values
    (new.id, 'documents', 1825),
    (new.id, 'medical_certificates', 7300),
    (new.id, 'contracts', 7300),
    (new.id, 'payslips', 7300),
    (new.id, 'reports', 1825),
    (new.id, 'patrol_evidence', 730)
  on conflict (organization_id, category) do nothing;
  return new;
end;
$$;

revoke all on function private.seed_file_retention_policies()
  from public, anon, authenticated, service_role;

drop trigger if exists organizations_seed_file_retention on public.organizations;
create trigger organizations_seed_file_retention
after insert on public.organizations
for each row execute function private.seed_file_retention_policies();

insert into public.file_retention_policies(organization_id, category, retention_days)
select organization.id, defaults.category, defaults.retention_days
from public.organizations organization
cross join (values
  ('documents', 1825),
  ('medical_certificates', 7300),
  ('contracts', 7300),
  ('payslips', 7300),
  ('reports', 1825),
  ('patrol_evidence', 730)
) as defaults(category, retention_days)
on conflict (organization_id, category) do nothing;

alter table public.file_assets
  add column retention_until timestamptz,
  add column legal_hold boolean not null default false,
  add column legal_hold_reason text;

update public.file_assets asset
set retention_until = asset.created_at + make_interval(days => policy.retention_days)
from public.file_retention_policies policy
where policy.organization_id = asset.organization_id
  and policy.category = asset.category
  and asset.retention_until is null;

alter table public.file_assets alter column retention_until set not null;

create index file_assets_disposal_candidates_idx
  on public.file_assets(organization_id, retention_until)
  where legal_hold = false and status in ('uploaded', 'superseded');

create or replace function private.set_file_retention_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.retention_until is null then
    select new.created_at + make_interval(days => policy.retention_days)
    into new.retention_until
    from public.file_retention_policies policy
    where policy.organization_id = new.organization_id
      and policy.category = new.category;
  end if;
  if new.retention_until is null then
    raise exception 'file_retention_policy_required' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.set_file_retention_deadline()
  from public, anon, authenticated, service_role;

drop trigger if exists file_assets_set_retention on public.file_assets;
create trigger file_assets_set_retention
before insert on public.file_assets
for each row execute function private.set_file_retention_deadline();

create or replace function public.update_file_retention_policy(
  organization_id_value uuid,
  category_value text,
  retention_days_value integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_value jsonb;
begin
  if not private.has_organization_role(
    organization_id_value,
    array['owner','admin']::public.organization_role[]
  ) then
    raise exception 'retention_policy_update_forbidden' using errcode = '42501';
  end if;
  if category_value not in (
    'documents', 'medical_certificates', 'contracts',
    'payslips', 'reports', 'patrol_evidence'
  ) or retention_days_value not between 30 and 36500 then
    raise exception 'invalid_retention_policy' using errcode = '22023';
  end if;

  insert into public.file_retention_policies(
    organization_id, category, retention_days, updated_by
  ) values (
    organization_id_value, category_value, retention_days_value, (select auth.uid())
  )
  on conflict (organization_id, category) do update
  set retention_days = excluded.retention_days,
      updated_by = excluded.updated_by,
      updated_at = now()
  returning jsonb_build_object(
    'organizationId', organization_id,
    'category', category,
    'retentionDays', retention_days,
    'updatedAt', updated_at
  ) into result_value;

  update public.file_assets
  set retention_until = created_at + make_interval(days => retention_days_value),
      updated_at = now()
  where organization_id = organization_id_value
    and category = category_value
    and legal_hold = false
    and status <> 'deleted';

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    organization_id_value, 'user', (select auth.uid()), 'file.retention_updated',
    'file_retention_policy', category_value, result_value
  );

  return result_value;
end;
$$;

create or replace function public.set_file_legal_hold(
  asset_id_value uuid,
  enabled_value boolean,
  reason_value text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset public.file_assets;
begin
  select * into asset from public.file_assets where id = asset_id_value for update;
  if asset.id is null then
    raise exception 'file_asset_not_found' using errcode = 'P0002';
  end if;
  if not private.has_organization_role(
    asset.organization_id,
    case when enabled_value
      then array['owner','admin','hr','auditor']::public.organization_role[]
      else array['owner','admin']::public.organization_role[]
    end
  ) then
    raise exception 'file_legal_hold_forbidden' using errcode = '42501';
  end if;
  if length(trim(coalesce(reason_value, ''))) < 3 then
    raise exception 'legal_hold_reason_required' using errcode = '22023';
  end if;

  update public.file_assets
  set legal_hold = enabled_value,
      legal_hold_reason = case when enabled_value then trim(reason_value) else null end,
      updated_at = now()
  where id = asset_id_value;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    asset.organization_id, 'user', (select auth.uid()),
    case when enabled_value then 'file.legal_hold_enabled' else 'file.legal_hold_disabled' end,
    'file_asset', asset_id_value::text,
    jsonb_build_object('reason', trim(reason_value))
  );
end;
$$;

revoke all on function public.update_file_retention_policy(uuid, text, integer) from public, anon;
revoke all on function public.set_file_legal_hold(uuid, boolean, text) from public, anon;
grant execute on function public.update_file_retention_policy(uuid, text, integer) to authenticated;
grant execute on function public.set_file_legal_hold(uuid, boolean, text) to authenticated;
