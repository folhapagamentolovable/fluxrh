begin;

do $$
declare
  organization_id_value uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  user_id_value uuid := '7d134f64-fa70-49f7-8055-eec0b66369e0';
  category_value text;
  prepared jsonb;
  document_asset_id uuid;
  document_path text;
  pending_asset_id uuid;
  denied boolean := false;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id_value, 'role', 'authenticated')::text,
    true
  );

  foreach category_value in array array[
    'documents', 'medical_certificates', 'contracts',
    'payslips', 'reports', 'patrol_evidence'
  ] loop
    prepared := public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_id_value,
      'category', category_value,
      'originalName', category_value || case when category_value = 'patrol_evidence' then '.jpg' else '.pdf' end,
      'mimeType', case when category_value = 'patrol_evidence' then 'image/jpeg' else 'application/pdf' end,
      'sizeBytes', 128,
      'relatedEntityType', 'smoke_test',
      'relatedEntityId', category_value
    ));

    if prepared->>'status' <> 'pending' or prepared->>'bucketId' <> 'fluxrh-private' then
      raise exception 'invalid prepared asset for %', category_value;
    end if;

    if category_value = 'documents' then
      document_asset_id := (prepared->>'id')::uuid;
      document_path := prepared->>'objectPath';
    elsif category_value = 'reports' then
      pending_asset_id := (prepared->>'id')::uuid;
    end if;
  end loop;

  begin
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', gen_random_uuid(),
      'category', 'documents',
      'originalName', 'forbidden.pdf',
      'mimeType', 'application/pdf',
      'sizeBytes', 128
    ));
  exception when sqlstate '42501' then
    denied := sqlerrm = 'organization_access_denied';
  end;
  if not denied then raise exception 'cross-organization upload was not denied'; end if;

  execute 'set local role authenticated';

  if (select count(*) from public.file_assets where organization_id = organization_id_value) <> 6 then
    raise exception 'authenticated user cannot read prepared assets';
  end if;

  insert into storage.objects(bucket_id, name, owner, owner_id, metadata)
  values (
    'fluxrh-private', document_path, user_id_value, user_id_value::text,
    jsonb_build_object('size', 128, 'mimetype', 'application/pdf')
  );

  execute 'reset role';

  perform public.complete_file_upload(document_asset_id, repeat('a', 64));

  if not exists (
    select 1 from public.file_assets
    where id = document_asset_id and status = 'uploaded' and checksum_sha256 = repeat('a', 64)
  ) then
    raise exception 'uploaded asset was not completed';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'fluxrh_private_objects_delete' and cmd = 'DELETE'
  ) then
    raise exception 'storage delete policy is missing';
  end if;

  perform public.mark_file_asset_deleted(pending_asset_id);
  if not exists (select 1 from public.file_assets where id = pending_asset_id and status = 'deleted') then
    raise exception 'asset was not marked deleted';
  end if;

  if has_function_privilege('anon', 'public.prepare_file_upload(jsonb)', 'execute') then
    raise exception 'anon must not prepare uploads';
  end if;
end
$$;

select 'secure_storage_remote_smoke_passed' as result;

rollback;
