create or replace function public.create_admission_exception(
  workflow_id uuid, exception_title text, exception_description text,
  exception_priority_value public.exception_priority default 'medium'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_id_value uuid; exception_id_value uuid; candidate_name_value text;
begin
  if length(trim(coalesce(exception_title,''))) < 3 or length(trim(coalesce(exception_description,''))) < 3 then raise exception 'invalid_exception_payload' using errcode='22023'; end if;
  select organization_id,context->>'candidateName' into organization_id_value,candidate_name_value from public.workflow_instances where id=workflow_id for update;
  if organization_id_value is null then raise exception 'admission_not_found' using errcode='P0002'; end if;
  if not private.has_organization_role(organization_id_value,array['owner','admin','hr','payroll','manager']::public.organization_role[]) then raise exception 'exception_create_forbidden' using errcode='42501'; end if;
  insert into public.operational_exceptions(organization_id,source_type,source_id,title,description,priority,status,recommendation,due_at)
  values(organization_id_value,'admission',workflow_id,trim(exception_title),trim(exception_description),exception_priority_value,'open','Revisar a divergência e registrar a decisão.',now()+case when exception_priority_value='critical' then interval '1 day' else interval '3 days' end)
  returning id into exception_id_value;
  update public.workflow_instances set status='exception',updated_at=now() where id=workflow_id;
  insert into public.domain_events(organization_id,aggregate_type,aggregate_id,event_type,payload) values(organization_id_value,'admission',workflow_id,'admission.exception_created',jsonb_build_object('exceptionId',exception_id_value,'candidateName',candidate_name_value));
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data) values(organization_id_value,'user',(select auth.uid()),'admission.exception_created','workflow_instance',workflow_id::text,jsonb_build_object('exceptionId',exception_id_value,'title',trim(exception_title)));
  return exception_id_value;
end; $$;
revoke all on function public.create_admission_exception(uuid,text,text,public.exception_priority) from public,anon;
grant execute on function public.create_admission_exception(uuid,text,text,public.exception_priority) to authenticated;

create or replace function public.resolve_operational_exception(exception_id uuid, resolution_note_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare organization_id_value uuid; source_id_value uuid; source_type_value text; previous_value jsonb;
begin
  if length(trim(coalesce(resolution_note_value,''))) < 3 then raise exception 'invalid_resolution_note' using errcode='22023'; end if;
  select organization_id,source_id,source_type,to_jsonb(e) into organization_id_value,source_id_value,source_type_value,previous_value from public.operational_exceptions e where id=exception_id for update;
  if organization_id_value is null then raise exception 'exception_not_found' using errcode='P0002'; end if;
  if not private.has_organization_role(organization_id_value,array['owner','admin','hr','payroll','manager']::public.organization_role[]) then raise exception 'exception_resolve_forbidden' using errcode='42501'; end if;
  update public.operational_exceptions set status='resolved',resolved_at=now(),resolution_note=trim(resolution_note_value),updated_at=now() where id=exception_id;
  if source_type_value='admission' and source_id_value is not null and not exists(select 1 from public.operational_exceptions where source_type='admission' and source_id=source_id_value and status<>'resolved' and id<>exception_id) then update public.workflow_instances set status='running',updated_at=now() where id=source_id_value and status='exception'; end if;
  insert into public.domain_events(organization_id,aggregate_type,aggregate_id,event_type,payload) values(organization_id_value,'operational_exception',exception_id,'exception.resolved',jsonb_build_object('note',trim(resolution_note_value)));
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,before_data,after_data) values(organization_id_value,'user',(select auth.uid()),'exception.resolved','operational_exception',exception_id::text,previous_value,(select to_jsonb(e) from public.operational_exceptions e where id=exception_id));
end; $$;
revoke all on function public.resolve_operational_exception(uuid,text) from public,anon;
grant execute on function public.resolve_operational_exception(uuid,text) to authenticated;
