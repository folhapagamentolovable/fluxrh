create table public.production_rollouts(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.assisted_pilot_clients(organization_id) on delete cascade,
  mode text not null default 'synthetic_only' check(mode='synthetic_only'),status text not null check(status in('prepared','running','completed')),
  official_operations_enabled boolean not null default false check(not official_operations_enabled),monitoring_owner text not null,
  started_at timestamptz not null default now(),completed_at timestamptz,unique(organization_id)
);
create table public.production_rollout_steps(
  id uuid primary key default gen_random_uuid(),rollout_id uuid not null references public.production_rollouts(id) on delete cascade,
  sequence integer not null check(sequence between 1 and 8),increment text not null check(increment in('registration_documents','admission','employee_portal','time_tracking','vacations_absences','payroll_preview','official_payroll_simulation','remaining_modules')),
  status text not null check(status in('prepared','running','completed','rolled_back')),rollback_checkpoint text not null,
  backup_verified boolean not null,recovery_verified boolean not null,explicit_approval boolean not null,
  critical_alerts integer not null default 0 check(critical_alerts>=0),high_alerts integer not null default 0 check(high_alerts>=0),
  adoption_rate numeric(5,2) not null check(adoption_rate between 0 and 100),error_rate numeric(7,4) not null check(error_rate between 0 and 100),
  p95_latency_ms integer not null check(p95_latency_ms>0),official_effect boolean not null default false check(not official_effect),
  completed_at timestamptz,created_at timestamptz not null default now(),unique(rollout_id,sequence),unique(rollout_id,increment)
);
create table public.production_rollout_events(
  id uuid primary key default gen_random_uuid(),step_id uuid not null references public.production_rollout_steps(id) on delete cascade,
  event_type text not null check(event_type in('gate_passed','monitoring_snapshot','approval','rollback_tested')),
  payload jsonb not null check(jsonb_typeof(payload)='object'),created_at timestamptz not null default now()
);
create index production_rollout_steps_rollout_idx on public.production_rollout_steps(rollout_id,sequence);
alter table public.production_rollouts enable row level security;alter table public.production_rollout_steps enable row level security;alter table public.production_rollout_events enable row level security;
revoke all on public.production_rollouts,public.production_rollout_steps,public.production_rollout_events from anon,authenticated;
grant select on public.production_rollouts,public.production_rollout_steps,public.production_rollout_events to authenticated;
create policy production_rollouts_select on public.production_rollouts for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy production_rollout_steps_select on public.production_rollout_steps for select to authenticated using(exists(select 1 from public.production_rollouts r where r.id=rollout_id and private.has_organization_role(r.organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy production_rollout_events_select on public.production_rollout_events for select to authenticated using(exists(select 1 from public.production_rollout_steps s join public.production_rollouts r on r.id=s.rollout_id where s.id=step_id and private.has_organization_role(r.organization_id,array['owner','admin','auditor']::public.organization_role[])));
do $$declare client record;rollout_id uuid;step_id uuid;step_number integer;increment_name text;begin
  for client in select organization_id from public.assisted_pilot_clients where synthetic_data_only and status='completed' loop
    insert into public.production_rollouts(organization_id,status,monitoring_owner,completed_at)values(client.organization_id,'completed','FluxRH Synthetic Operations',now())returning id into rollout_id;
    for step_number in 1..8 loop
      increment_name:=case step_number when 1 then'registration_documents' when 2 then'admission' when 3 then'employee_portal' when 4 then'time_tracking' when 5 then'vacations_absences' when 6 then'payroll_preview' when 7 then'official_payroll_simulation' else'remaining_modules'end;
      insert into public.production_rollout_steps(rollout_id,sequence,increment,status,rollback_checkpoint,backup_verified,recovery_verified,explicit_approval,critical_alerts,high_alerts,adoption_rate,error_rate,p95_latency_ms,completed_at)
      values(rollout_id,step_number,increment_name,'completed','synthetic-checkpoint-'||step_number,true,true,true,0,0,100,0,120+step_number*5,now())returning id into step_id;
      insert into public.production_rollout_events(step_id,event_type,payload)values
        (step_id,'rollback_tested',jsonb_build_object('restorable',true,'checkpoint','synthetic-checkpoint-'||step_number)),
        (step_id,'monitoring_snapshot',jsonb_build_object('criticalAlerts',0,'highAlerts',0,'errorRate',0,'adoptionRate',100)),
        (step_id,'gate_passed',jsonb_build_object('backup',true,'recovery',true,'safe',true)),
        (step_id,'approval',jsonb_build_object('kind','synthetic','officialEffect',false));
    end loop;
  end loop;
end$$;
comment on table public.production_rollouts is 'Fase 25 sintética; não representa ativação comercial ou operação oficial.';
