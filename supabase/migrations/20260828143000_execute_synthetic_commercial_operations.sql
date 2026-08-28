create table public.commercial_readiness(
  organization_id uuid primary key references public.production_rollouts(organization_id) on delete cascade,mode text not null default'synthetic_only'check(mode='synthetic_only'),
  real_commercial_release boolean not null default false check(not real_commercial_release),status text not null check(status in('prepared','simulated','validated')),
  onboarding_completed boolean not null default false,sla_published_internally boolean not null default false,continuous_monitoring boolean not null default false,
  compliance_current boolean not null default false,quarterly_roadmap_active boolean not null default false,validated_at timestamptz
);
create table public.customer_onboarding_runs(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.commercial_readiness(organization_id) on delete cascade,
  stage text not null check(stage in('contract_scope','security_access','data_inventory','configuration','training','parallel_validation','synthetic_go_live','hypercare')),
  sequence integer not null check(sequence between 1 and 8),status text not null check(status in('pending','completed')),
  evidence jsonb not null check(jsonb_typeof(evidence)='object'),completed_at timestamptz,unique(organization_id,sequence),unique(organization_id,stage)
);
create table public.commercial_monitoring_snapshots(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.commercial_readiness(organization_id) on delete cascade,
  availability numeric(6,3) not null check(availability between 0 and 100),error_rate numeric(7,4) not null check(error_rate between 0 and 100),
  p95_latency_ms integer not null check(p95_latency_ms>0),critical_alerts integer not null check(critical_alerts>=0),high_alerts integer not null check(high_alerts>=0),
  adoption_rate numeric(5,2) not null check(adoption_rate between 0 and 100),support_resolution_minutes integer not null check(support_resolution_minutes>=0),captured_at timestamptz not null default now()
);
create table public.compliance_review_cycles(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.commercial_readiness(organization_id) on delete cascade,
  review_type text not null check(review_type in('lgpd','access','retention','incident_readiness')),status text not null check(status in('scheduled','passed','action_required')),
  findings_open integer not null default 0 check(findings_open>=0),reviewed_at timestamptz not null,next_review_at timestamptz not null,responsible text not null,
  unique(organization_id,review_type,reviewed_at)
);
create table public.quarterly_roadmap_items(
  id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.commercial_readiness(organization_id) on delete cascade,
  quarter text not null,title text not null,source_metric text not null check(source_metric in('adoption','defects','support','performance','security','feedback')),
  priority integer not null check(priority between 1 and 5),status text not null check(status in('planned','committed','completed')),synthetic boolean not null default true check(synthetic),
  unique(organization_id,quarter,title)
);
alter table public.commercial_readiness enable row level security;alter table public.customer_onboarding_runs enable row level security;alter table public.commercial_monitoring_snapshots enable row level security;alter table public.compliance_review_cycles enable row level security;alter table public.quarterly_roadmap_items enable row level security;
revoke all on public.commercial_readiness,public.customer_onboarding_runs,public.commercial_monitoring_snapshots,public.compliance_review_cycles,public.quarterly_roadmap_items from anon,authenticated;
grant select on public.commercial_readiness,public.customer_onboarding_runs,public.commercial_monitoring_snapshots,public.compliance_review_cycles,public.quarterly_roadmap_items to authenticated;
create policy commercial_readiness_select on public.commercial_readiness for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy onboarding_runs_select on public.customer_onboarding_runs for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy commercial_monitoring_select on public.commercial_monitoring_snapshots for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy compliance_reviews_select on public.compliance_review_cycles for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
create policy quarterly_roadmap_select on public.quarterly_roadmap_items for select to authenticated using((select private.has_organization_role(organization_id,array['owner','admin','auditor']::public.organization_role[])));
do $$declare org record;stage_number integer;stage_name text;begin
  for org in select organization_id from public.production_rollouts where mode='synthetic_only'and status='completed' loop
    insert into public.commercial_readiness(organization_id,status,onboarding_completed,sla_published_internally,continuous_monitoring,compliance_current,quarterly_roadmap_active,validated_at)values(org.organization_id,'validated',true,true,true,true,true,now());
    for stage_number in 1..8 loop
      stage_name:=case stage_number when 1 then'contract_scope'when 2 then'security_access'when 3 then'data_inventory'when 4 then'configuration'when 5 then'training'when 6 then'parallel_validation'when 7 then'synthetic_go_live'else'hypercare'end;
      insert into public.customer_onboarding_runs(organization_id,stage,sequence,status,evidence,completed_at)values(org.organization_id,stage_name,stage_number,'completed',jsonb_build_object('synthetic',true,'approved',true,'officialEffect',false),now());
    end loop;
    insert into public.commercial_monitoring_snapshots(organization_id,availability,error_rate,p95_latency_ms,critical_alerts,high_alerts,adoption_rate,support_resolution_minutes)values(org.organization_id,99.99,0,185,0,0,100,38);
    insert into public.compliance_review_cycles(organization_id,review_type,status,findings_open,reviewed_at,next_review_at,responsible)values
      (org.organization_id,'lgpd','passed',0,now(),now()+interval'3 months','FluxRH Synthetic Privacy'),
      (org.organization_id,'access','passed',0,now(),now()+interval'3 months','FluxRH Synthetic Security'),
      (org.organization_id,'retention','passed',0,now(),now()+interval'3 months','FluxRH Synthetic Data'),
      (org.organization_id,'incident_readiness','passed',0,now(),now()+interval'3 months','FluxRH Synthetic Operations');
    insert into public.quarterly_roadmap_items(organization_id,quarter,title,source_metric,priority,status)values
      (org.organization_id,'2026-Q4','Aprimorar adoção do portal','adoption',2,'committed'),
      (org.organization_id,'2026-Q4','Reduzir tempo de triagem','support',2,'committed'),
      (org.organization_id,'2026-Q4','Revisar alertas preventivos','security',1,'committed');
  end loop;
end$$;
comment on table public.commercial_readiness is 'Fase 26 simulada com organizações fictícias; operação comercial real permanece bloqueada.';
