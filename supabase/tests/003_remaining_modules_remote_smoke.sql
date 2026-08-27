begin;

do $$
declare
  organization_id_value uuid := '8428115c-2a43-46e8-abd1-9cfd81b48839';
  user_id_value uuid := '7d134f64-fa70-49f7-8055-eec0b66369e0';
  module_name_value text;
  created_version bigint;
  updated_version bigint;
  conflict_detected boolean;
  modules constant text[] := array[
    'absences', 'benefits', 'payroll', 'special_calculations',
    'occupational_health', 'patrols', 'communications', 'portal',
    'terminations', 'analytics', 'governance'
  ];
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id_value, 'role', 'authenticated')::text,
    true
  );

  foreach module_name_value in array modules loop
    created_version := public.save_module_repository_state(
      organization_id_value,
      module_name_value,
      jsonb_build_object('module', module_name_value, 'status', 'seeded'),
      0
    );

    if created_version <> 1 then
      raise exception 'unexpected initial version for %', module_name_value;
    end if;

    updated_version := public.save_module_repository_state(
      organization_id_value,
      module_name_value,
      jsonb_build_object('module', module_name_value, 'status', 'updated'),
      created_version
    );

    if updated_version <> 2 then
      raise exception 'unexpected updated version for %', module_name_value;
    end if;

    conflict_detected := false;
    begin
      perform public.save_module_repository_state(
        organization_id_value,
        module_name_value,
        '{}'::jsonb,
        created_version
      );
    exception when sqlstate '40001' then
      conflict_detected := sqlerrm = 'module_state_conflict';
    end;

    if not conflict_detected then
      raise exception 'optimistic conflict was not detected for %', module_name_value;
    end if;
  end loop;

  if (select count(*) from public.module_repository_states
      where organization_id = organization_id_value) <> cardinality(modules) then
    raise exception 'not all module states were persisted';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_module_repository_state(uuid,text,jsonb,bigint)',
    'execute'
  ) then
    raise exception 'anon must not execute save_module_repository_state';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_module_repository_state(uuid,text,jsonb,bigint)',
    'execute'
  ) then
    raise exception 'authenticated must execute save_module_repository_state';
  end if;
end
$$;

select 'remaining_modules_remote_smoke_passed' as result;

rollback;
