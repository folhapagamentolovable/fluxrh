begin;

do $$
declare
  organization_id_value uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  admin_user_id uuid := '20000000-0000-4000-8000-000000000001';
  employee_user_id uuid := '20000000-0000-4000-8000-000000000002';
  admin_session_id uuid := '20000000-0000-4000-8000-000000000011';
  employee_session_id uuid := '20000000-0000-4000-8000-000000000012';
  prepared jsonb;
  asset_id_value uuid;
  denied boolean;
begin
  insert into auth.users(
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', admin_user_id, 'authenticated', 'authenticated', 'phase22-session-admin@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', employee_user_id, 'authenticated', 'authenticated', 'phase22-session-employee@fluxrh.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into public.organization_members(organization_id, user_id, role, status)
  values
    (organization_id_value, admin_user_id, 'admin', 'active'),
    (organization_id_value, employee_user_id, 'employee', 'active')
  on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active';

  insert into auth.sessions(id, user_id, created_at, updated_at, refreshed_at, user_agent, ip)
  values
    (admin_session_id, admin_user_id, now(), now(), now() at time zone 'UTC', 'Mozilla/5.0 Windows Chrome/120.0', '127.0.0.1'),
    (employee_session_id, employee_user_id, now(), now(), now() at time zone 'UTC', 'Mozilla/5.0 Android Chrome/120.0', '127.0.0.2')
  on conflict (id) do nothing;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', admin_user_id,
      'role', 'authenticated',
      'session_id', admin_session_id
    )::text,
    true
  );
  execute 'set local role authenticated';

  if jsonb_array_length(public.list_organization_sessions()) < 2 then
    raise exception 'organization sessions were not listed';
  end if;

  perform public.revoke_organization_session(
    employee_session_id,
    'Dispositivo perdido durante o teste de segurança.'
  );
  execute 'reset role';

  if exists (select 1 from auth.sessions where id = employee_session_id) then
    raise exception 'revoked session still exists';
  end if;
  if not exists (
    select 1 from public.audit_events
    where action = 'session.revoked' and resource_id = employee_session_id::text
  ) then
    raise exception 'session revocation was not audited';
  end if;

  denied := false;
  begin
    execute 'set local role authenticated';
    perform public.revoke_organization_session(
      admin_session_id,
      'Tentativa de revogar a sessão atual.'
    );
  exception when sqlstate '22023' then
    denied := sqlerrm = 'current_session_cannot_be_revoked';
  end;
  execute 'reset role';
  if not denied then raise exception 'current session was revocable'; end if;

  execute 'set local role authenticated';
  if (select count(*) from public.file_retention_policies where organization_id = organization_id_value) <> 6 then
    raise exception 'default retention policies are missing';
  end if;

  perform public.update_file_retention_policy(
    organization_id_value,
    'documents',
    3650
  );

  prepared := public.prepare_file_upload(jsonb_build_object(
    'organizationId', organization_id_value,
    'category', 'documents',
    'originalName', 'retention-test.pdf',
    'mimeType', 'application/pdf',
    'sizeBytes', 1024
  ));
  asset_id_value := (prepared->>'id')::uuid;

  if not exists (
    select 1 from public.file_assets
    where id = asset_id_value
      and retention_until >= created_at + interval '3649 days'
      and retention_until <= created_at + interval '3651 days'
  ) then
    raise exception 'retention deadline was not applied';
  end if;

  perform public.set_file_legal_hold(
    asset_id_value,
    true,
    'Documento preservado para investigação interna.'
  );
  execute 'reset role';

  if not exists (
    select 1 from public.file_assets
    where id = asset_id_value and legal_hold = true
  ) then
    raise exception 'legal hold was not applied';
  end if;

  delete from auth.sessions where id = admin_session_id;
  execute 'set local role authenticated';
  denied := false;
  begin
    perform public.list_organization_sessions();
  exception when sqlstate '42501' then
    denied := sqlerrm = 'session_list_forbidden';
  end;
  execute 'reset role';
  if not denied then raise exception 'revoked JWT session remained authorized'; end if;
end
$$;

select 'sessions_retention_remote_passed' as result;

rollback;
