insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'fluxrh-private',
  'fluxrh-private',
  false,
  26214400,
  array[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.file_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  subject_user_id uuid references auth.users(id) on delete restrict,
  category text not null check (category in (
    'documents', 'medical_certificates', 'contracts',
    'payslips', 'reports', 'patrol_evidence'
  )),
  bucket_id text not null default 'fluxrh-private' references storage.buckets(id) on delete restrict,
  object_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  status text not null default 'pending' check (status in (
    'pending', 'uploaded', 'quarantined', 'superseded', 'deleted'
  )),
  related_entity_type text,
  related_entity_id text,
  replaces_asset_id uuid references public.file_assets(id) on delete restrict,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((related_entity_type is null) = (related_entity_id is null))
);

create index file_assets_organization_category_idx
  on public.file_assets (organization_id, category, created_at desc);
create index file_assets_subject_idx
  on public.file_assets (subject_user_id, created_at desc)
  where subject_user_id is not null and status <> 'deleted';
create index file_assets_related_entity_idx
  on public.file_assets (organization_id, related_entity_type, related_entity_id)
  where related_entity_id is not null and status <> 'deleted';
create index file_assets_replaces_idx
  on public.file_assets (replaces_asset_id)
  where replaces_asset_id is not null;

alter table public.file_assets enable row level security;
revoke all on public.file_assets from anon, authenticated;
grant select on public.file_assets to authenticated;

create or replace function private.can_read_file_asset(asset public.file_assets)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    asset.status <> 'deleted'
    and (
      asset.owner_user_id = (select auth.uid())
      or asset.subject_user_id = (select auth.uid())
      or private.has_organization_role(
        asset.organization_id,
        array['owner','admin','hr','payroll']::public.organization_role[]
      )
      or (
        asset.category in ('reports','patrol_evidence')
        and private.has_organization_role(
          asset.organization_id,
          array['manager','auditor']::public.organization_role[]
        )
      )
    );
$$;

create or replace function private.can_write_file_asset(asset public.file_assets)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    asset.status = 'pending'
    and (
      asset.owner_user_id = (select auth.uid())
      or private.has_organization_role(
        asset.organization_id,
        array['owner','admin','hr','payroll']::public.organization_role[]
      )
      or (
        asset.category = 'patrol_evidence'
        and private.has_organization_role(
          asset.organization_id,
          array['manager']::public.organization_role[]
        )
      )
      or (
        asset.category = 'reports'
        and private.has_organization_role(
          asset.organization_id,
          array['manager','auditor']::public.organization_role[]
        )
      )
    );
$$;

revoke all on function private.can_read_file_asset(public.file_assets)
  from public, anon, authenticated, service_role;
revoke all on function private.can_write_file_asset(public.file_assets)
  from public, anon, authenticated, service_role;

create policy file_assets_select
  on public.file_assets
  for select
  to authenticated
  using ((select private.can_read_file_asset(file_assets)));

create policy fluxrh_private_objects_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fluxrh-private'
    and exists (
      select 1
      from public.file_assets asset
      where asset.bucket_id = storage.objects.bucket_id
        and asset.object_path = storage.objects.name
        and (select private.can_write_file_asset(asset))
    )
  );

create policy fluxrh_private_objects_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fluxrh-private'
    and exists (
      select 1
      from public.file_assets asset
      where asset.bucket_id = storage.objects.bucket_id
        and asset.object_path = storage.objects.name
        and (select private.can_read_file_asset(asset))
    )
  );

create policy fluxrh_private_objects_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fluxrh-private'
    and exists (
      select 1
      from public.file_assets asset
      where asset.bucket_id = storage.objects.bucket_id
        and asset.object_path = storage.objects.name
        and (
          asset.owner_user_id = (select auth.uid())
          or private.has_organization_role(
            asset.organization_id,
            array['owner','admin','hr','payroll']::public.organization_role[]
          )
          or (
            asset.category = 'patrol_evidence'
            and private.has_organization_role(
              asset.organization_id,
              array['manager']::public.organization_role[]
            )
          )
        )
    )
  );

create or replace function public.prepare_file_upload(file_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid := (file_payload->>'organizationId')::uuid;
  subject_user_id_value uuid := nullif(file_payload->>'subjectUserId', '')::uuid;
  category_value text := file_payload->>'category';
  original_name_value text := trim(file_payload->>'originalName');
  mime_type_value text := lower(trim(file_payload->>'mimeType'));
  size_bytes_value bigint := (file_payload->>'sizeBytes')::bigint;
  related_entity_type_value text := nullif(trim(file_payload->>'relatedEntityType'), '');
  related_entity_id_value text := nullif(trim(file_payload->>'relatedEntityId'), '');
  replaces_asset_id_value uuid := nullif(file_payload->>'replacesAssetId', '')::uuid;
  asset_id_value uuid := gen_random_uuid();
  safe_name_value text;
  object_path_value text;
  privileged boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not private.is_active_member(organization_id_value) then
    raise exception 'organization_access_denied' using errcode = '42501';
  end if;

  if category_value not in (
    'documents', 'medical_certificates', 'contracts',
    'payslips', 'reports', 'patrol_evidence'
  ) then
    raise exception 'invalid_file_category' using errcode = '22023';
  end if;

  if size_bytes_value <= 0 or size_bytes_value > 26214400 then
    raise exception 'invalid_file_size' using errcode = '22023';
  end if;

  if mime_type_value not in (
    'application/pdf', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4'
  ) then
    raise exception 'invalid_mime_type' using errcode = '22023';
  end if;

  if category_value in ('contracts','payslips') and mime_type_value <> 'application/pdf' then
    raise exception 'category_requires_pdf' using errcode = '22023';
  end if;

  if category_value = 'medical_certificates'
     and mime_type_value not in ('application/pdf','image/jpeg','image/png','image/webp') then
    raise exception 'invalid_medical_certificate_type' using errcode = '22023';
  end if;

  if category_value = 'patrol_evidence'
     and mime_type_value not in ('image/jpeg','image/png','image/webp','video/mp4') then
    raise exception 'invalid_patrol_evidence_type' using errcode = '22023';
  end if;

  privileged := private.has_organization_role(
    organization_id_value,
    array['owner','admin','hr','payroll']::public.organization_role[]
  );

  if not privileged then
    if category_value in ('documents','medical_certificates') then
      if subject_user_id_value is distinct from (select auth.uid()) then
        raise exception 'subject_access_denied' using errcode = '42501';
      end if;
    elsif category_value = 'patrol_evidence' then
      if not private.has_organization_role(
        organization_id_value,
        array['manager']::public.organization_role[]
      ) then
        raise exception 'category_access_denied' using errcode = '42501';
      end if;
    elsif category_value = 'reports' then
      if not private.has_organization_role(
        organization_id_value,
        array['manager','auditor']::public.organization_role[]
      ) then
        raise exception 'category_access_denied' using errcode = '42501';
      end if;
    else
      raise exception 'category_access_denied' using errcode = '42501';
    end if;
  end if;

  if replaces_asset_id_value is not null and not exists (
    select 1 from public.file_assets previous
    where previous.id = replaces_asset_id_value
      and previous.organization_id = organization_id_value
      and previous.category = category_value
      and private.can_read_file_asset(previous)
  ) then
    raise exception 'replacement_asset_not_found' using errcode = 'P0002';
  end if;

  safe_name_value := regexp_replace(lower(original_name_value), '[^a-z0-9._-]+', '-', 'g');
  safe_name_value := trim(both '-.' from safe_name_value);
  if length(safe_name_value) < 3 or length(safe_name_value) > 180 then
    raise exception 'invalid_file_name' using errcode = '22023';
  end if;

  object_path_value := organization_id_value::text || '/' || category_value || '/'
    || coalesce(subject_user_id_value::text, 'shared') || '/'
    || asset_id_value::text || '/' || safe_name_value;

  insert into public.file_assets(
    id, organization_id, owner_user_id, subject_user_id, category,
    object_path, original_name, mime_type, size_bytes,
    related_entity_type, related_entity_id, replaces_asset_id
  ) values (
    asset_id_value, organization_id_value, (select auth.uid()), subject_user_id_value,
    category_value, object_path_value, original_name_value, mime_type_value,
    size_bytes_value, related_entity_type_value, related_entity_id_value,
    replaces_asset_id_value
  );

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    organization_id_value, 'user', (select auth.uid()), 'file.upload_prepared',
    'file_asset', asset_id_value::text,
    jsonb_build_object('category', category_value, 'mimeType', mime_type_value)
  );

  return jsonb_build_object(
    'id', asset_id_value,
    'bucketId', 'fluxrh-private',
    'objectPath', object_path_value,
    'status', 'pending'
  );
end;
$$;

create or replace function public.complete_file_upload(
  asset_id_value uuid,
  checksum_sha256_value text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset public.file_assets;
  storage_metadata jsonb;
begin
  select * into asset from public.file_assets where id = asset_id_value for update;
  if asset.id is null then raise exception 'file_asset_not_found' using errcode = 'P0002'; end if;
  if not private.can_write_file_asset(asset) then
    raise exception 'file_asset_write_denied' using errcode = '42501';
  end if;
  if checksum_sha256_value is not null and checksum_sha256_value !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_checksum' using errcode = '22023';
  end if;

  select metadata into storage_metadata
  from storage.objects
  where bucket_id = asset.bucket_id and name = asset.object_path;
  if storage_metadata is null then
    raise exception 'storage_object_not_found' using errcode = 'P0002';
  end if;

  update public.file_assets
  set status = 'uploaded',
      checksum_sha256 = checksum_sha256_value,
      uploaded_at = now(),
      updated_at = now()
  where id = asset_id_value;

  if asset.replaces_asset_id is not null then
    update public.file_assets
    set status = 'superseded', updated_at = now()
    where id = asset.replaces_asset_id and status <> 'deleted';
  end if;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    asset.organization_id, 'user', (select auth.uid()), 'file.upload_completed',
    'file_asset', asset.id::text,
    jsonb_build_object('category', asset.category, 'sizeBytes', asset.size_bytes)
  );
end;
$$;

create or replace function public.mark_file_asset_deleted(asset_id_value uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset public.file_assets;
begin
  select * into asset from public.file_assets where id = asset_id_value for update;
  if asset.id is null then raise exception 'file_asset_not_found' using errcode = 'P0002'; end if;
  if not (
    asset.owner_user_id = (select auth.uid())
    or private.has_organization_role(
      asset.organization_id,
      array['owner','admin','hr','payroll']::public.organization_role[]
    )
    or (
      asset.category = 'patrol_evidence'
      and private.has_organization_role(
        asset.organization_id,
        array['manager']::public.organization_role[]
      )
    )
  ) then
    raise exception 'file_asset_delete_denied' using errcode = '42501';
  end if;
  if exists (
    select 1 from storage.objects
    where bucket_id = asset.bucket_id and name = asset.object_path
  ) then
    raise exception 'storage_object_still_exists' using errcode = '55000';
  end if;

  update public.file_assets
  set status = 'deleted', deleted_at = now(), updated_at = now()
  where id = asset_id_value;

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    asset.organization_id, 'user', (select auth.uid()), 'file.deleted',
    'file_asset', asset.id::text,
    jsonb_build_object('category', asset.category)
  );
end;
$$;

revoke all on function public.prepare_file_upload(jsonb) from public, anon;
revoke all on function public.complete_file_upload(uuid, text) from public, anon;
revoke all on function public.mark_file_asset_deleted(uuid) from public, anon;
grant execute on function public.prepare_file_upload(jsonb) to authenticated;
grant execute on function public.complete_file_upload(uuid, text) to authenticated;
grant execute on function public.mark_file_asset_deleted(uuid) to authenticated;
