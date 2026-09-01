insert into public.legal_parameter_sets(
  organization_id,kind,code,name,version,effective_from,effective_to,jurisdiction,
  source_name,source_url,source_hash,parameters,change_summary
)
select
  organization_id,kind,code,'SINDEEPRES — Termo Aditivo 2026 + enquadramento empresarial',3,
  effective_from,effective_to,jurisdiction,source_name,source_url,source_hash,
  parameters || jsonb_build_object(
    'applicability', (parameters -> 'applicability') || jsonb_build_object(
      'status','confirmed_by_company_mapping',
      'confirmedAt','2026-09-01',
      'confirmedBy','organization_responsible'
    ),
    'companyJobMappings', jsonb_build_array(
      jsonb_build_object(
        'companyRole','Vigia',
        'collectiveRole','Fiscal de Piso / Fiscal de Loja',
        'collectiveFloor',2031.57,
        'companySalary',2091.57,
        'effectivePremium',60.00,
        'salaryPolicy','fixed_company_salary_above_collective_floor',
        'aud0001Applicable',true
      ),
      jsonb_build_object(
        'companyRole','Auxiliar de Limpeza',
        'collectiveRole','Auxiliar de Serviços Gerais / Operações',
        'collectiveFloor',1805.43,
        'salaryPolicy','at_least_collective_floor'
      ),
      jsonb_build_object(
        'companyRole','Zelador',
        'collectiveRole','Zelador',
        'collectiveFloor',2144.33,
        'roleAccumulationRate',20,
        'salaryPolicy','collective_rule_unchanged'
      )
    ),
    'automation', (parameters -> 'automation') || jsonb_build_object(
      'status','active_for_confirmed_company_mappings',
      'requiresHumanValidation',jsonb_build_array(
        'roles without an explicit company mapping',
        'union contributions and opposition',
        'principal CCT clauses not reproduced by the addendum'
      )
    )
  ),
  jsonb_build_array(
    'Vigia mapped to Fiscal de Piso / Fiscal de Loja',
    'Vigia company salary fixed at 2091.57, 60.00 above the 2031.57 collective floor',
    'Auxiliar de Limpeza mapped to Auxiliar de Serviços Gerais / Operações',
    'Zelador mapped without changing the collective floor and 20% role accumulation rule',
    'AUD-0001 applicability confirmed by the organization responsible'
  )
from public.legal_parameter_sets
where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
  and code = 'sindeepres_aud0001' and version = 2;

insert into public.audit_events(organization_id,actor_type,action,resource_type,resource_id,after_data)
select
  organization_id,'system','collective_agreement.job_mappings_confirmed','legal_parameter_set',id,
  jsonb_build_object(
    'caseId','AUD-0001','version',version,'vigiaSalary',2091.57,
    'vigiaCollectiveFloor',2031.57,'effectivePremium',60.00,
    'mappings',parameters -> 'companyJobMappings'
  )
from public.legal_parameter_sets
where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
  and code = 'sindeepres_aud0001' and version = 3;

do $$
declare
  vigia_mapping jsonb;
begin
  select mapping into vigia_mapping
  from public.legal_parameter_sets parameter_set
  cross join lateral jsonb_array_elements(parameter_set.parameters -> 'companyJobMappings') mapping
  where parameter_set.organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
    and parameter_set.code = 'sindeepres_aud0001' and parameter_set.version = 3
    and mapping ->> 'companyRole' = 'Vigia';

  if vigia_mapping is null
    or (vigia_mapping ->> 'companySalary')::numeric <> 2091.57
    or (vigia_mapping ->> 'effectivePremium')::numeric <> 60.00
    or not coalesce((vigia_mapping ->> 'aud0001Applicable')::boolean,false)
  then
    raise exception 'company_cct_job_mapping_verification_failed';
  end if;
end;
$$;
