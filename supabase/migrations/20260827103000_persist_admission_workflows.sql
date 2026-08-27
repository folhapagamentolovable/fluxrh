alter table public.workflow_tasks add column if not exists assignee_label text not null default 'FluxRH';

create or replace function public.save_admission_workflow(admission_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare organization_id_value uuid; definition_id_value uuid; instance_id_value uuid; task jsonb; existing_id uuid; event_name text;
begin
  select organization_id into organization_id_value from public.organization_members
  where user_id=(select auth.uid()) and status='active' order by created_at limit 1;
  if organization_id_value is null or not private.has_organization_role(organization_id_value,array['owner','admin','hr']::public.organization_role[])
    then raise exception 'workflow_write_forbidden' using errcode='42501'; end if;
  insert into public.workflow_definitions(organization_id,key,name,version,definition)
  values(organization_id_value,'admission','Admissão completa',1,'{"steps":["digital_admission","documents","validation","contract","onboarding"]}'::jsonb)
  on conflict(organization_id,key,version) do update set active=true returning id into definition_id_value;
  existing_id:=nullif(admission_payload->>'id','')::uuid;
  event_name:=case when existing_id is null then 'admission.created' else 'admission.transitioned' end;
  if existing_id is null then
    insert into public.workflow_instances(organization_id,definition_id,subject_type,subject_id,status,current_step,context,due_at,started_at)
    values(organization_id_value,definition_id_value,'candidate',gen_random_uuid(),(admission_payload->>'status')::public.workflow_status,
      admission_payload->>'currentStep',admission_payload-'id'-'tasks',(admission_payload->>'dueAt')::timestamptz,(admission_payload->>'startedAt')::timestamptz)
    returning id into instance_id_value;
  else
    update public.workflow_instances set status=(admission_payload->>'status')::public.workflow_status,current_step=admission_payload->>'currentStep',
      context=admission_payload-'id'-'tasks',completed_at=case when admission_payload->>'status'='completed' then now() else null end,updated_at=now()
    where id=existing_id and organization_id=organization_id_value returning id into instance_id_value;
    if instance_id_value is null then raise exception 'admission_not_found'; end if;
    delete from public.workflow_tasks where instance_id=instance_id_value and organization_id=organization_id_value;
  end if;
  for task in select value from jsonb_array_elements(admission_payload->'tasks') loop
    insert into public.workflow_tasks(id,organization_id,instance_id,step_key,title,description,kind,status,assignee_label,due_at,completed_at)
    values((task->>'id')::uuid,organization_id_value,instance_id_value,task->>'stepKey',task->>'title',task->>'description',
      (task->>'kind')::public.task_kind,(task->>'status')::public.task_status,task->>'assignee',(task->>'dueAt')::timestamptz,nullif(task->>'completedAt','')::timestamptz);
  end loop;
  insert into public.domain_events(organization_id,aggregate_type,aggregate_id,event_type,payload)
  values(organization_id_value,'admission',instance_id_value,event_name,jsonb_build_object('step',admission_payload->>'currentStep'));
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data)
  values(organization_id_value,'user',(select auth.uid()),event_name,'workflow_instance',instance_id_value::text,admission_payload-'tasks');
  return instance_id_value;
end; $$;
revoke all on function public.save_admission_workflow(jsonb) from public,anon;
grant execute on function public.save_admission_workflow(jsonb) to authenticated;
