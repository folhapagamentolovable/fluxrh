import { writeFile } from "node:fs/promises";
import { buildPilotLoadPayload } from "./pilot-loader.js";

const [outputPath, organizationId] = process.argv.slice(2);
if (!outputPath || !organizationId) throw new Error("usage: generate-pilot-validation-sql <output> <organization-uuid>");
const payload = JSON.stringify(await buildPilotLoadPayload()).replaceAll("'", "''");

const sql = `begin;
do $validation$
declare
  target_org uuid := '${organizationId}';
  actor_id uuid;
  actor_session uuid;
  isolation_user uuid := gen_random_uuid();
  isolation_session uuid := gen_random_uuid();
  first_result jsonb;
  second_result jsonb;
  pilot jsonb := '${payload}'::jsonb;
  count_value integer;
begin
  select membership.user_id, session_value.id
  into actor_id, actor_session
  from public.organization_members membership
  join auth.sessions session_value on session_value.user_id = membership.user_id
    and (session_value.not_after is null or session_value.not_after > now())
  where membership.organization_id = target_org
    and membership.status = 'active'
    and membership.role::text = 'super_admin'
  order by session_value.updated_at desc
  limit 1;
  if actor_session is null then raise exception 'active_super_admin_session_missing'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', actor_id, 'role', 'authenticated', 'session_id', actor_session
  )::text, true);
  execute 'set local role authenticated';
  first_result := public.load_internal_pilot(target_org, pilot);
  second_result := public.load_internal_pilot(target_org, pilot);
  execute 'reset role';

  if first_result->>'employees' <> '120' or second_result->>'employees' <> '120' then
    raise exception 'pilot_rpc_count_failed';
  end if;
  select count(*) into count_value from public.employees employee
  where employee.organization_id = target_org
    and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'));
  if count_value <> 120 then raise exception 'pilot_employee_count_failed:%', count_value; end if;

  select count(*) into count_value from public.employment_links link
  join public.employees employee on employee.id = link.employee_id
  where link.organization_id = target_org
    and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'));
  if count_value <> 120 then raise exception 'pilot_link_count_failed:%', count_value; end if;

  select count(*) into count_value from public.employee_schedules assignment
  join public.employees employee on employee.id = assignment.employee_id
  where assignment.organization_id = target_org and assignment.valid_from = date '2026-08-01'
    and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'));
  if count_value <> 120 then raise exception 'pilot_schedule_count_failed:%', count_value; end if;

  if exists (
    select employee.registration from public.employees employee
    where employee.organization_id = target_org
      and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'))
    group by employee.registration having count(*) <> 1
  ) then raise exception 'pilot_duplicate_employee_failed'; end if;

  if (select count(*) from public.employment_links link
      join public.employees employee on employee.id = link.employee_id
      join public.organization_units unit on unit.id = link.establishment_id
      where link.organization_id = target_org and unit.code = 'est_sp'
        and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'))) <> 80
    or (select count(*) from public.employment_links link
      join public.employees employee on employee.id = link.employee_id
      join public.organization_units unit on unit.id = link.establishment_id
      where link.organization_id = target_org and unit.code = 'est_santos'
        and employee.registration in (select value->>'registration' from jsonb_array_elements(pilot->'employees'))) <> 40
  then raise exception 'pilot_establishment_distribution_failed'; end if;

  if jsonb_array_length((select state->'assignments' from public.module_repository_states
      where organization_id = target_org and module_name = 'patrols')) <> 120 then
    raise exception 'pilot_patrol_assignment_count_failed';
  end if;

  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
  values ('00000000-0000-0000-0000-000000000000',isolation_user,'authenticated','authenticated',
    'pilot-isolation-'||isolation_user||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
  insert into public.organization_members(organization_id,user_id,role,status)
  values(target_org,isolation_user,'hr','active');
  insert into auth.sessions(id,user_id,created_at,updated_at,refreshed_at,user_agent,ip)
  values(isolation_session,isolation_user,now(),now(),now() at time zone 'UTC','FluxRH pilot isolation validation','127.0.0.1');
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',isolation_user,'role','authenticated','session_id',isolation_session
  )::text,true);
  execute 'set local role authenticated';
  if (select count(distinct organization_id) from public.employees) <> 1
    or (select organization_id from public.employees limit 1) <> target_org then
    raise exception 'pilot_rls_isolation_failed';
  end if;
  execute 'reset role';
  delete from auth.users where id = isolation_user;

  raise notice 'pilot_validation_passed employees=120 links=120 schedules=120 establishments=80/40 patrol_assignments=120 idempotent=true isolated=true';
end
$validation$;
commit;

select jsonb_build_object(
  'scenarioId', 'pilot_internal_2026_08',
  'organizationId', '${organizationId}',
  'employees', count(*),
  'establishmentSp', count(*) filter (where unit.code = 'est_sp'),
  'establishmentSantos', count(*) filter (where unit.code = 'est_santos'),
  'links', count(link.id),
  'schedules', count(schedule.id)
) as validation
from public.employees employee
join public.employment_links link on link.employee_id = employee.id
join public.organization_units unit on unit.id = link.establishment_id
left join public.employee_schedules schedule on schedule.employee_id = employee.id and schedule.valid_from = date '2026-08-01'
where employee.organization_id = '${organizationId}'
  and employee.registration in (select value->>'registration' from jsonb_array_elements('${payload}'::jsonb->'employees'));
`;

await writeFile(outputPath, sql, { encoding: "utf8", flag: "wx" });
