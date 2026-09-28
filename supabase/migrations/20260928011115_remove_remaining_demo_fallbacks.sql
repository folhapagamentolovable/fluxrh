do $$
declare
  officecamp_id constant uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  neozinho_id constant uuid := '7d134f64-fa70-49f7-8055-eec0b66369e0';
begin
  perform pg_advisory_xact_lock(hashtext('fluxrh_remove_remaining_demo_fallbacks_20260927'));

  if (select count(*) from public.workflow_definitions) <> 1
    or not exists (
      select 1 from public.workflow_definitions
      where organization_id = officecamp_id
        and key = 'pilot_admission'
        and name = 'Admissão piloto 2026-08'
    ) then
    raise exception 'unexpected_workflow_definition_state';
  end if;

  delete from public.workflow_definitions
  where organization_id = officecamp_id
    and key = 'pilot_admission'
    and name = 'Admissão piloto 2026-08';

  insert into public.audit_events(
    organization_id, actor_type, actor_id, action,
    resource_type, resource_id, after_data
  ) values (
    officecamp_id, 'service', neozinho_id,
    'organization.demo_fallbacks_removed',
    'organization', officecamp_id::text,
    jsonb_build_object(
      'removedWorkflowDefinition', 'pilot_admission',
      'mode', 'real_data_onboarding'
    )
  );

  if exists (select 1 from public.workflow_definitions) then
    raise exception 'demo_workflow_definition_cleanup_failed';
  end if;
end;
$$;
