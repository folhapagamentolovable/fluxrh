create table public.controlled_real_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  competence date not null check (competence = date_trunc('month', competence)::date),
  title text not null check (length(trim(title)) between 5 and 160),
  status text not null default 'prepared' check (status in ('prepared','approved','in_progress','completed','rolled_back','cancelled')),
  scope jsonb not null check (jsonb_typeof(scope) = 'array' and jsonb_array_length(scope) > 0),
  checklist jsonb not null,
  human_reviewer text not null check (length(trim(human_reviewer)) between 3 and 120),
  rollback_plan text not null check (length(trim(rollback_plan)) between 20 and 4000),
  approval_note text,
  prepared_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, competence, title)
);

create table public.controlled_real_cycle_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cycle_id uuid not null references public.controlled_real_cycles(id) on delete restrict,
  kind text not null check (kind in ('input','comparison','decision','audit','rollback')),
  label text not null check (length(trim(label)) between 3 and 160),
  reference text not null check (length(trim(reference)) between 3 and 2000),
  sha256 text check (sha256 is null or sha256 ~ '^[a-fA-F0-9]{64}$'),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now()
);

alter table public.controlled_real_cycles enable row level security;
alter table public.controlled_real_cycle_evidence enable row level security;
revoke all on public.controlled_real_cycles, public.controlled_real_cycle_evidence from anon, authenticated;
grant select on public.controlled_real_cycles, public.controlled_real_cycle_evidence to authenticated;

create policy controlled_cycles_super_admin_select on public.controlled_real_cycles for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role::text='super_admin')
);
create policy controlled_cycle_evidence_super_admin_select on public.controlled_real_cycle_evidence for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.status='active' and m.role::text='super_admin')
);

create or replace function public.prepare_controlled_real_cycle(competence_value date,title_value text,scope_value jsonb,human_reviewer_value text,rollback_plan_value text,checklist_value jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare org uuid; cycle_id uuid;
begin
  if not public.can_execute_real_operations() then raise exception 'real_operations_gate_required' using errcode='42501'; end if;
  select m.organization_id into org from public.organization_members m where m.user_id=(select auth.uid()) and m.status='active' and m.role::text='super_admin' order by m.created_at limit 1;
  if org is null then raise exception 'active_super_admin_membership_required' using errcode='42501'; end if;
  if checklist_value <> '{"termsApproved":true,"ownersNamed":true,"accessReviewed":true,"backupVerified":true,"rollbackTested":true,"dataInventoryApproved":true,"humanReviewerNamed":true}'::jsonb then raise exception 'readiness_checklist_incomplete' using errcode='22023'; end if;
  insert into public.controlled_real_cycles(organization_id,competence,title,scope,checklist,human_reviewer,rollback_plan,prepared_by)
  values(org,date_trunc('month',competence_value)::date,trim(title_value),scope_value,checklist_value,trim(human_reviewer_value),trim(rollback_plan_value),(select auth.uid())) returning id into cycle_id;
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data) values(org,'user',(select auth.uid()),'real_cycle.prepared','controlled_real_cycle',cycle_id::text,jsonb_build_object('competence',date_trunc('month',competence_value)::date,'scope',scope_value,'humanReviewer',trim(human_reviewer_value)));
  return cycle_id;
end; $$;

create or replace function public.approve_controlled_real_cycle(cycle_id_value uuid,approval_note_value text) returns void
language plpgsql security definer set search_path='' as $$
declare org uuid; previous jsonb;
begin
  if not public.can_execute_real_operations() then raise exception 'real_operations_gate_required' using errcode='42501'; end if;
  select organization_id,to_jsonb(c) into org,previous from public.controlled_real_cycles c where id=cycle_id_value and status='prepared' for update;
  if org is null then raise exception 'prepared_cycle_not_found' using errcode='P0002'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=(select auth.uid()) and m.status='active' and m.role::text='super_admin') then raise exception 'cycle_approval_forbidden' using errcode='42501'; end if;
  update public.controlled_real_cycles set status='approved',approval_note=trim(approval_note_value),approved_by=(select auth.uid()),approved_at=now(),updated_at=now() where id=cycle_id_value;
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,before_data,after_data) values(org,'user',(select auth.uid()),'real_cycle.approved','controlled_real_cycle',cycle_id_value::text,previous,(select to_jsonb(c) from public.controlled_real_cycles c where id=cycle_id_value));
end; $$;

create or replace function public.append_controlled_cycle_evidence(cycle_id_value uuid,kind_value text,label_value text,reference_value text,sha256_value text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare org uuid; evidence_id uuid;
begin
  select organization_id into org from public.controlled_real_cycles where id=cycle_id_value;
  if org is null then raise exception 'cycle_not_found' using errcode='P0002'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=(select auth.uid()) and m.status='active' and m.role::text='super_admin') then raise exception 'cycle_evidence_forbidden' using errcode='42501'; end if;
  insert into public.controlled_real_cycle_evidence(organization_id,cycle_id,kind,label,reference,sha256,recorded_by) values(org,cycle_id_value,kind_value,trim(label_value),trim(reference_value),lower(sha256_value),(select auth.uid())) returning id into evidence_id;
  insert into public.audit_events(organization_id,actor_type,actor_id,action,resource_type,resource_id,after_data) values(org,'user',(select auth.uid()),'real_cycle.evidence_added','controlled_real_cycle_evidence',evidence_id::text,jsonb_build_object('cycleId',cycle_id_value,'kind',kind_value,'label',trim(label_value),'sha256',lower(sha256_value)));
  return evidence_id;
end; $$;

revoke all on function public.prepare_controlled_real_cycle(date,text,jsonb,text,text,jsonb), public.approve_controlled_real_cycle(uuid,text), public.append_controlled_cycle_evidence(uuid,text,text,text,text) from public, anon;
grant execute on function public.prepare_controlled_real_cycle(date,text,jsonb,text,text,jsonb), public.approve_controlled_real_cycle(uuid,text), public.append_controlled_cycle_evidence(uuid,text,text,text,text) to authenticated;

comment on table public.controlled_real_cycles is 'Registro auditável do ciclo real paralelo; preparar ou aprovar não executa folha oficial.';
