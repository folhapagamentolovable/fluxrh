insert into public.legal_parameter_sets(
  organization_id,kind,code,name,version,effective_from,effective_to,jurisdiction,
  source_name,source_url,source_hash,parameters,change_summary
)
select
  organization_id,kind,code,'SINDEEPRES — CCT principal 2025/2026 + Aditivo 2026',4,
  effective_from,effective_to,jurisdiction,
  'CCT 2025/2026 — MTE SP003052/2025 e Termo Aditivo SP002405/2026',
  'https://www3.mte.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR002706/2025',
  '7f89a1328b2e4e1800d6c1421b5a8298b49fbc0796d7c1e3f92e6b21c9b978d6',
  parameters || jsonb_build_object(
    'principalAgreement',jsonb_build_object(
      'mteRegistration','SP003052/2025',
      'requestNumber','MR002706/2025',
      'processNumber','10260.202420/2025-88',
      'registeredAt','2025-03-14',
      'vigencyFrom','2025-01-01',
      'vigencyTo','2026-12-31',
      'canonicalReferenceHash','7f89a1328b2e4e1800d6c1421b5a8298b49fbc0796d7c1e3f92e6b21c9b978d6'
    ),
    'collectiveShiftRules',jsonb_build_array(
      jsonb_build_object(
        'code','12x36','authorized',true,'sourceClause',52,
        'workHours',12,'restHours',36,'salaryDivisor',220,
        'minimumBreakMinutes',30,'breakForbiddenFirstHours',2,'breakForbiddenLastHours',2,
        'workOnRestDaysMonthlyLimit',4,'workOnRestDayAdditionalRate',100,
        'replacementExtensionLimitHours',1,
        'sundaysAndHolidaysCompensatedBySchedule',true,
        'nightExtensionAlreadyRemuneratedBySchedule',true,
        'authorizationBasis','CCT principal and organization responsible confirmation'
      ),
      jsonb_build_object(
        'code','5x2','authorized',true,'sourceClause',53,
        'monthlyScaleHours',192,'salaryDivisor',220,'weeklyRestMinimumHours',24,
        'minimumBreakMinutes',30,'breakForbiddenFirstHours',2,'breakForbiddenLastHours',2,
        'hoursAboveMonthlyLimitAreOvertime',true,
        'authorizationBasis','CCT principal and organization responsible confirmation'
      )
    ),
    'automation',(parameters -> 'automation') || jsonb_build_object(
      'status','active_for_confirmed_company_mappings_and_shifts',
      'verifiedShiftRules',jsonb_build_array('12x36','5x2')
    )
  ),
  jsonb_build_array(
    'principal CCT identified as SP003052/2025, MR002706/2025 and process 10260.202420/2025-88',
    '12x36 authorization imported from clause 52 with divisor 220 and interval controls',
    '5x2 authorization imported from clause 53 with 192 monthly scale hours and divisor 220',
    'organization responsible confirmation for 12x36 and 5x2 recorded'
  )
from public.legal_parameter_sets
where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
  and code = 'sindeepres_aud0001' and version = 3;

insert into public.audit_events(organization_id,actor_type,action,resource_type,resource_id,after_data)
select
  organization_id,'system','collective_agreement.shift_rules_confirmed','legal_parameter_set',id,
  jsonb_build_object(
    'caseId','AUD-0001','version',version,'principalRegistration','SP003052/2025',
    'authorizedShifts',jsonb_build_array('12x36','5x2'),'salaryDivisor',220
  )
from public.legal_parameter_sets
where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
  and code = 'sindeepres_aud0001' and version = 4;

do $$
begin
  if not exists (
    select 1
    from public.legal_parameter_sets parameter_set
    where parameter_set.organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
      and parameter_set.code = 'sindeepres_aud0001' and parameter_set.version = 4
      and parameter_set.parameters #>> '{principalAgreement,mteRegistration}' = 'SP003052/2025'
      and parameter_set.parameters @> '{"collectiveShiftRules":[{"code":"12x36","authorized":true,"salaryDivisor":220},{"code":"5x2","authorized":true,"salaryDivisor":220}]}'::jsonb
  ) then
    raise exception 'principal_cct_shift_rules_verification_failed';
  end if;
end;
$$;
