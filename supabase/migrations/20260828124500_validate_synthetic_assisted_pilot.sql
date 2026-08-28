do $$
declare
  client_count integer;
  cycle_count integer;
  synthetic_employee_count integer;
  open_blocker_count integer;
  unsafe_cycle_count integer;
  missing_evidence_count integer;
begin
  select count(*) into client_count from public.assisted_pilot_clients where synthetic_data_only and status='completed';
  select count(*) into cycle_count from public.assisted_pilot_cycles where status='completed' and reconciled;
  select count(*) into synthetic_employee_count from public.employees where email like '%@example.invalid';
  select count(*) into open_blocker_count from public.assisted_pilot_divergences where status='open' and severity in('critical','high');
  select count(*) into unsafe_cycle_count from public.assisted_pilot_cycles where official_payroll_replaced;
  select count(*) into missing_evidence_count from public.assisted_pilot_cycles c where (select count(*) from public.assisted_pilot_evidence e where e.cycle_id=c.id)<6;
  if client_count<>3 then raise exception 'expected_3_completed_synthetic_clients_got_%',client_count;end if;
  if cycle_count<>6 then raise exception 'expected_6_reconciled_cycles_got_%',cycle_count;end if;
  if synthetic_employee_count<168 then raise exception 'expected_at_least_168_synthetic_employees_got_%',synthetic_employee_count;end if;
  if open_blocker_count<>0 then raise exception 'open_blocking_divergences_%',open_blocker_count;end if;
  if unsafe_cycle_count<>0 then raise exception 'official_payroll_was_replaced';end if;
  if missing_evidence_count<>0 then raise exception 'cycles_without_complete_evidence_%',missing_evidence_count;end if;
end $$;
