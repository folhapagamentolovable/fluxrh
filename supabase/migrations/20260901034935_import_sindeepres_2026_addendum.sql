insert into public.legal_parameter_sets(
  organization_id,kind,code,name,version,effective_from,effective_to,jurisdiction,
  source_name,source_url,source_hash,parameters,change_summary
)
values(
  '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid,
  'collective_agreement',
  'sindeepres_aud0001',
  'SINDEEPRES — Termo Aditivo CCT 2026/2026',
  2,
  date '2026-01-01',
  date '2026-12-31',
  'Estado de São Paulo',
  'Termo Aditivo CCT 2026/2026 — MTE SP002405/2026',
  null,
  'bfd4cfd54e8661d72ae286a21894653fe0d49019953cd46477c4e554fa35a1ac',
  jsonb_build_object(
    'document', jsonb_build_object(
      'mteRegistration','SP002405/2026',
      'registeredAt','2026-03-05',
      'requestNumber','MR005910/2026',
      'processNumber','10260.202977/2026-08',
      'principalAgreementProcess','10260.202420/2025-88',
      'principalAgreementRegisteredAt','2025-03-14',
      'documentSha256','bfd4cfd54e8661d72ae286a21894653fe0d49019953cd46477c4e554fa35a1ac'
    ),
    'parties', jsonb_build_array(
      jsonb_build_object('role','employee_union','name','SINDEEPRES','cnpj','96.287.487/0001-04'),
      jsonb_build_object('role','employer_union','name','SINDEPRESTEM','cnpj','66.662.974/0001-49')
    ),
    'vigency', jsonb_build_object('from','2026-01-01','to','2026-12-31','baseDate','2026-01-01'),
    'applicability', jsonb_build_object(
      'territory','Estado de São Paulo',
      'status','requires_job_activity_classification',
      'includedActivities',jsonb_build_array('prestação de serviços a terceiros','trabalho temporário','leitura e medição de consumo','entrega de avisos de consumo','colocação e administração de mão de obra'),
      'excludedActivities',jsonb_build_array('asseio e conservação e limpeza pública','construção civil','temporários em feiras, congressos, promoções e eventos','vigilância e segurança patrimonial','logística','bombeiros civis'),
      'aud0001Warning','O cargo Vigia exige confirmação de que as atividades reais não configuram vigilância ou segurança patrimonial antes da aplicação automática.'
    ),
    'salary', jsonb_build_object(
      'monthlyHours',220,
      'generalFloor',1805.43,
      'specificFloors',jsonb_build_array(
        jsonb_build_object('roles',jsonb_build_array('Fiscal de Piso','Fiscal de Loja'), 'amount',2031.57),
        jsonb_build_object('roles',jsonb_build_array('Zelador'), 'amount',2144.33, 'roleAccumulationRate',20),
        jsonb_build_object('roles',jsonb_build_array('Monitor Ambiental'), 'amount',2100.46),
        jsonb_build_object('roles',jsonb_build_array('Porteiro','Controlador de Acesso','Recepcionista de Portaria'), 'amount',2031.57, 'referencedFromOtherCollectiveRule',true)
      ),
      'adjustmentBands',jsonb_build_array(
        jsonb_build_object('salaryTo',7380.07,'rate',6.25),
        jsonb_build_object('salaryFrom',7380.08,'salaryTo',16951.09,'rate',5.50)
      ),
      'postBaseDateAdmission',jsonb_build_object('proportionalTwelfths',true,'monthCountsFromDays',15)
    ),
    'casePremises', jsonb_build_object(
      'salaryDivisor',220,
      'schedule12x36AuthorizedByResponsible',true,
      'schedule12x36ClauseNotPresentInUploadedAddendum',true
    ),
    'plr', jsonb_build_object(
      'annualAmount',351.60,'installmentAmount',175.80,'firstDue','2026-08-31','secondDue','2027-03-30',
      'proportionalTwelfths',true,'monthCountsFromDays',15,'justifiedAbsenceReductionRate',20,
      'unjustifiedAbsenceReductionRate',25,'warningReductionRate',20,'suspensionReductionRate',25,
      'negotiationFee',13.00
    ),
    'benefits', jsonb_build_object(
      'meal',jsonb_build_object('netDailyAmount',24.80,'onlyWorkedDays',true,'minimumDailyHoursExclusive',6),
      'foodCard',jsonb_build_object('monthlyAmount',174.10,'salaryLimit',7380.07,'maximumUnjustifiedAbsences',1),
      'goodStandingAward',jsonb_build_object('monthlyAmount',110.00,'salaryLimit',7380.07,'requiresFullMonthWithoutAbsence',true,'nonRemunerative',true),
      'lifeInsurance',jsonb_build_object('naturalDeath',13444.01,'accidentalDeathOrPermanentDisability',20166.02,'funeralAdvance',984.94,'employeeDiscountLimit',2.40),
      'dental',jsonb_build_object('employerMonthlyAmount',28.31,'employeeAuthorizedDiscount',11.60)
    ),
    'unionContributions', jsonb_build_object(
      'marchOneDaySalary',true,
      'monthlyRate',1,'monthlyCap',180.54,'oppositionRequiredForExemption',true,
      'negotiationRate',2,'negotiationCap',107.30,'negotiationCompetence','2026-10'
    ),
    'automation', jsonb_build_object(
      'status','blocked_pending_applicability_confirmation',
      'safeParameters',jsonb_build_array('vigency','territory','document identifiers','monthly hours'),
      'requiresHumanValidation',jsonb_build_array('AUD-0001 occupational classification','economic clauses','union contributions and opposition','principal CCT clauses not reproduced by the addendum')
    )
  ),
  jsonb_build_array(
    'instrument registration, parties, territory and vigency identified',
    'economic clauses for 2026 imported from the uploaded addendum',
    'document explicitly excludes surveillance and property security activities',
    'automatic application to AUD-0001 blocked until occupational applicability is confirmed',
    'the addendum preserves non-economic clauses from the principal 2025/2026 CCT, which was not included in the uploaded PDF'
  )
);

insert into public.audit_events(organization_id,actor_type,action,resource_type,resource_id,after_data)
select
  organization_id,'system','collective_agreement.addendum_imported','legal_parameter_set',id,
  jsonb_build_object(
    'caseId','AUD-0001','code',code,'version',version,'mteRegistration','SP002405/2026',
    'sourceHash',source_hash,'automationStatus',parameters #>> '{automation,status}'
  )
from public.legal_parameter_sets
where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
  and code = 'sindeepres_aud0001' and version = 2;

do $$
begin
  if not exists (
    select 1 from public.legal_parameter_sets
    where organization_id = '8428115c-2a43-46e8-abd1-9cfd81b48839'::uuid
      and code = 'sindeepres_aud0001' and version = 2
      and source_hash = 'bfd4cfd54e8661d72ae286a21894653fe0d49019953cd46477c4e554fa35a1ac'
      and parameters #>> '{document,mteRegistration}' = 'SP002405/2026'
      and parameters #>> '{automation,status}' = 'blocked_pending_applicability_confirmation'
  ) then
    raise exception 'sindeepres_2026_addendum_import_verification_failed';
  end if;
end;
$$;
