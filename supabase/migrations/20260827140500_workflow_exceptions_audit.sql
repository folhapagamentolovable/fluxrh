create or replace function public.resolve_operational_exception(exception_id uuid, resolution_note_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare organization_id_value uuid; previous_value jsonb;
begin
  if length(trim(coalesce(resolution_note_value,''))) < 3 then raise exception 'invalid_resolution_note' using errcode='22023'; end if;
  select organization_id,to_jsonb(e) into organization_id_value,previous_value from public.operational_exceptions e where id=exception_id for update;
  if organization_id_value is null then raise exception 'exception_not_found' using errcode='P0002'; end if;
  if not private.has_organization_role(organization_id_value,array['owner','admin','hr','payroll','manager']::public.organization_role[]) then raise exception 'exception_resolve_forbidden' using errcode='42501'; end if;
  update public.operational_exceptions set status='resolved',resolved_at=now(),resolution_note=trim(resolution_note_value),updated_at=now() where id=exception_id;
  insert into public.domain_events(organization_id,aggregate_type,aggregate_id,event_type,payload) values(organization_id_value,'operational_exception',exception_id,'exception.resolved',jsonb_build_object('note',trim(resolution_note_value)));
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,before_data,after_data) values(organization_id_value,'user',(select auth.uid()),'exception.resolved','operational_exception',exception_id::text,previous_value,(select to_jsonb(e) from public.operational_exceptions e where id=exception_id));
end; $$;
revoke all on function public.resolve_operational_exception(uuid,text) from public,anon;
grant execute on function public.resolve_operational_exception(uuid,text) to authenticated;
