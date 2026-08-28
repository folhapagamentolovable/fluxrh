begin;
do $$declare clients integer;cycles integer;employees integer;open_blockers integer;unsafe integer;begin
  select count(*)into clients from public.assisted_pilot_clients where synthetic_data_only;
  select count(*)into cycles from public.assisted_pilot_cycles where status='completed' and reconciled;
  select count(*)into employees from public.employees where email like '%@example.invalid';
  select count(*)into open_blockers from public.assisted_pilot_divergences where status='open' and severity in('critical','high');
  select count(*)into unsafe from public.assisted_pilot_cycles where official_payroll_replaced;
  if clients<>3 then raise exception 'expected_3_synthetic_clients_got_%',clients;end if;
  if cycles<>6 then raise exception 'expected_6_completed_cycles_got_%',cycles;end if;
  if employees<168 then raise exception 'expected_at_least_168_synthetic_employees_got_%',employees;end if;
  if open_blockers<>0 then raise exception 'open_blocking_divergences_%',open_blockers;end if;
  if unsafe<>0 then raise exception 'official_payroll_was_replaced';end if;
end$$;
rollback;
