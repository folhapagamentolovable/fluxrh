create table public.legal_parameter_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('inss','irrf','fgts','dsr','collective_agreement')),
  code text not null,
  name text not null,
  version integer not null check (version > 0),
  effective_from date not null,
  effective_to date,
  jurisdiction text not null,
  source_name text not null,
  source_url text,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  parameters jsonb not null check (jsonb_typeof(parameters) = 'object'),
  change_summary jsonb not null default '[]'::jsonb check (jsonb_typeof(change_summary) = 'array'),
  created_at timestamptz not null default now(),
  unique (organization_id, code, version),
  check (effective_to is null or effective_to >= effective_from)
);

create index legal_parameter_sets_resolution_idx
  on public.legal_parameter_sets (organization_id, kind, effective_from desc, effective_to);

alter table public.legal_parameter_sets enable row level security;
revoke all on public.legal_parameter_sets from anon, authenticated;
grant select on public.legal_parameter_sets to authenticated;
create policy legal_parameter_sets_select on public.legal_parameter_sets
  for select to authenticated
  using (private.has_organization_role(
    organization_id,
    array['owner','admin','hr','payroll','auditor']::public.organization_role[]
  ));

comment on table public.legal_parameter_sets is
  'Immutable, tenant-scoped legal and collective parameters resolved by competence.';

with parameter_seed(kind,code,name,version,effective_from,effective_to,jurisdiction,source_name,source_url,parameters,change_summary) as (
  values
  ('inss','inss_employee','INSS empregado',1,date '2025-01-01',date '2025-12-31','BR','Portaria Interministerial MPS/MF 6/2025','https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal',
   '{"brackets":[{"from":0,"to":1518,"rate":7.5,"deduction":0},{"from":1518.01,"to":2793.88,"rate":9,"deduction":22.77},{"from":2793.89,"to":4190.83,"rate":12,"deduction":106.59},{"from":4190.84,"to":8157.41,"rate":14,"deduction":190.4}],"ceiling":951.63}'::jsonb,
   '["baseline imported for comparison"]'::jsonb),
  ('inss','inss_employee','INSS empregado',2,date '2026-01-01',null,'BR','Portaria Interministerial MPS/MF 13/2026','https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal',
   '{"brackets":[{"from":0,"to":1621,"rate":7.5,"deduction":0},{"from":1621.01,"to":2902.84,"rate":9,"deduction":24.32},{"from":2902.85,"to":4354.27,"rate":12,"deduction":111.4},{"from":4354.28,"to":8475.55,"rate":14,"deduction":198.49}],"ceiling":988.09}'::jsonb,
   '["minimum bracket: 1518.00 -> 1621.00","ceiling bracket: 8157.41 -> 8475.55","maximum contribution: 951.63 -> 988.09"]'::jsonb),
  ('irrf','irrf_monthly','IRRF mensal',1,date '2025-05-01',date '2025-12-31','BR','Receita Federal — tributação 2025','https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025',
   '{"brackets":[{"from":0,"to":2428.8,"rate":0,"deduction":0},{"from":2428.81,"to":2826.65,"rate":7.5,"deduction":182.16},{"from":2826.66,"to":3751.05,"rate":15,"deduction":394.16},{"from":3751.06,"to":4664.68,"rate":22.5,"deduction":675.49},{"from":4664.69,"to":null,"rate":27.5,"deduction":908.73}],"simplifiedDeduction":607.2,"monthlyReduction":null}'::jsonb,
   '["baseline imported for comparison"]'::jsonb),
  ('irrf','irrf_monthly','IRRF mensal',2,date '2026-01-01',null,'BR','Receita Federal — tributação 2026','https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
   '{"brackets":[{"from":0,"to":2428.8,"rate":0,"deduction":0},{"from":2428.81,"to":2826.65,"rate":7.5,"deduction":182.16},{"from":2826.66,"to":3751.05,"rate":15,"deduction":394.16},{"from":3751.06,"to":4664.68,"rate":22.5,"deduction":675.49},{"from":4664.69,"to":null,"rate":27.5,"deduction":908.73}],"simplifiedDeduction":607.2,"monthlyReduction":{"zeroUntil":5000,"linearUntil":7350,"maximum":312.89,"intercept":978.62,"factor":0.133145}}'::jsonb,
   '["monthly reduction introduced: zero tax up to taxable income of 5000.00","linear reduction between 5000.01 and 7350.00"]'::jsonb),
  ('fgts','fgts_employee','FGTS mensal',1,date '2026-01-01',null,'BR','Lei 8.036/1990','https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm',
   '{"rate":8}'::jsonb,'["8% statutory baseline"]'::jsonb),
  ('dsr','dsr_variables','DSR sobre variáveis',1,date '2026-01-01',null,'BR','Lei 605/1949','https://www.planalto.gov.br/ccivil_03/leis/l0605.htm',
   '{"formula":"variableEarnings / workingDays * restDays","holidayCalendarRequired":true}'::jsonb,'["calendar-driven DSR formula"]'::jsonb),
  ('collective_agreement','sindeepres_aud0001','SINDEEPRES — premissas AUD-0001',1,date '2026-01-01',null,'SP','Convenção coletiva SINDEEPRES — confirmação do responsável',null,
   '{"salaryDivisor":220,"schedule12x36Authorized":true,"documentRegistrationPending":true}'::jsonb,'["divisor 220 confirmed","12x36 authorization confirmed"]'::jsonb)
)
insert into public.legal_parameter_sets(
  organization_id,kind,code,name,version,effective_from,effective_to,jurisdiction,
  source_name,source_url,source_hash,parameters,change_summary
)
select
  organization.id, seed.kind, seed.code, seed.name, seed.version, seed.effective_from,
  seed.effective_to, seed.jurisdiction, seed.source_name, seed.source_url,
  encode(extensions.digest(convert_to(coalesce(seed.source_url,'') || seed.parameters::text,'UTF8'),'sha256'),'hex'),
  seed.parameters, seed.change_summary
from parameter_seed seed
cross join public.organizations organization
where organization.id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid;

insert into public.audit_events(organization_id,actor_type,action,resource_type,resource_id,after_data)
values(
  '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid,
  'system','legal_parameters.versioned','organization','8428115c-2a43-46e8-abd1-9cfd81b48839',
  jsonb_build_object('versions',7,'kinds',jsonb_build_array('inss','irrf','fgts','dsr','collective_agreement'),'caseId','AUD-0001')
);

do $$
begin
  if (select count(*) from public.legal_parameter_sets where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid) <> 7 then
    raise exception 'legal_parameter_seed_count_mismatch';
  end if;
  if exists (
    select 1 from public.legal_parameter_sets
    where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
      and source_hash !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'legal_parameter_source_hash_invalid';
  end if;
end;
$$;
