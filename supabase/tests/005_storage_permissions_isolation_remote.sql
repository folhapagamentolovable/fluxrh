begin;

do $$
declare
  organization_a uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  organization_b uuid := '10000000-0000-4000-8000-000000000022';
  employee_a uuid := '10000000-0000-4000-8000-000000000001';
  employee_a_other uuid := '10000000-0000-4000-8000-000000000002';
  manager_a uuid := '10000000-0000-4000-8000-000000000003';
  outsider_b uuid := '10000000-0000-4000-8000-000000000004';
  self_asset jsonb;
  manager_report jsonb;
  denied boolean;
begin
  insert into auth.users(
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', employee_a, 'authenticated', 'authenticated', 'phase22-employee-a@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', employee_a_other, 'authenticated', 'authenticated', 'phase22-employee-other@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', manager_a, 'authenticated', 'authenticated', 'phase22-manager@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', outsider_b, 'authenticated', 'authenticated', 'phase22-outsider@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into public.organizations(id, name, document, created_by)
  values (organization_b, 'Phase 22 Tenant B', '99.999.999/0001-22', outsider_b)
  on conflict (id) do nothing;

  insert into public.organization_members(organization_id, user_id, role, status)
  values
    (organization_a, employee_a, 'employee', 'active'),
    (organization_a, employee_a_other, 'employee', 'active'),
    (organization_a, manager_a, 'manager', 'active'),
    (organization_b, outsider_b, 'owner', 'active')
  on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active';

  perform set_config('request.jwt.claims', json_build_object('sub', employee_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  self_asset := public.prepare_file_upload(jsonb_build_object(
    'organizationId', organization_a,
    'subjectUserId', employee_a,
    'category', 'documents',
    'originalName', 'self-document.pdf',
    'mimeType', 'application/pdf',
    'sizeBytes', 1024
  ));
  execute 'reset role';

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_a,
      'subjectUserId', employee_a_other,
      'category', 'documents',
      'originalName', 'other-document.pdf',
      'mimeType', 'application/pdf',
      'sizeBytes', 1024
    ));
  exception when sqlstate '42501' then
    denied := sqlerrm = 'subject_access_denied';
  end;
  execute 'reset role';
  if not denied then raise exception 'employee uploaded for another user'; end if;

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_a,
      'subjectUserId', employee_a,
      'category', 'contracts',
      'originalName', 'contract.pdf',
      'mimeType', 'application/pdf',
      'sizeBytes', 1024
    ));
  exception when sqlstate '42501' then
    denied := sqlerrm = 'category_access_denied';
  end;
  execute 'reset role';
  if not denied then raise exception 'employee uploaded a restricted contract'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', manager_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  manager_report := public.prepare_file_upload(jsonb_build_object(
    'organizationId', organization_a,
    'category', 'reports',
    'originalName', 'team-report.pdf',
    'mimeType', 'application/pdf',
    'sizeBytes', 2048
  ));
  execute 'reset role';

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_a,
      'category', 'payslips',
      'originalName', 'payslip.pdf',
      'mimeType', 'application/pdf',
      'sizeBytes', 1024
    ));
  exception when sqlstate '42501' then
    denied := sqlerrm = 'category_access_denied';
  end;
  execute 'reset role';
  if not denied then raise exception 'manager uploaded a restricted payslip'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', outsider_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.file_assets where organization_id = organization_a) then
    raise exception 'tenant B can read tenant A metadata';
  end if;
  execute 'reset role';

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_a,
      'category', 'documents',
      'originalName', 'cross-tenant.pdf',
      'mimeType', 'application/pdf',
      'sizeBytes', 1024
    ));
  exception when sqlstate '42501' then
    denied := sqlerrm = 'organization_access_denied';
  end;
  execute 'reset role';
  if not denied then raise exception 'tenant B uploaded into tenant A'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', employee_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if (select count(*) from public.file_assets where id in ((self_asset->>'id')::uuid, (manager_report->>'id')::uuid)) <> 1 then
    raise exception 'employee metadata visibility is broader than self scope';
  end if;

  denied := false;
  begin
    insert into storage.objects(bucket_id, name, owner, owner_id, metadata)
    values (
      'fluxrh-private', manager_report->>'objectPath', employee_a, employee_a::text,
      jsonb_build_object('size', 2048, 'mimetype', 'application/pdf')
    );
  exception when sqlstate '42501' then
    denied := true;
  end;
  execute 'reset role';
  if not denied then raise exception 'employee inserted manager report object'; end if;

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.prepare_file_upload(jsonb_build_object(
      'organizationId', organization_a,
      'subjectUserId', employee_a,
      'category', 'documents',
      'originalName', 'spoofed.exe',
      'mimeType', 'application/pdf',
      'sizeBytes', 1024
    ));
  exception when sqlstate '22023' then
    denied := sqlerrm = 'file_extension_mime_mismatch';
  end;
  execute 'reset role';
  if not denied then raise exception 'extension/MIME spoof was accepted'; end if;

  if has_table_privilege('authenticated', 'public.audit_events', 'insert')
     or has_table_privilege('authenticated', 'public.audit_events', 'update')
     or has_table_privilege('authenticated', 'public.audit_events', 'delete') then
    raise exception 'audit log is mutable by authenticated role';
  end if;
end
$$;

select 'storage_permissions_isolation_remote_passed' as result;

rollback;
