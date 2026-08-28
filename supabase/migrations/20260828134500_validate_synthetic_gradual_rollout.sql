do $$declare rollouts integer;steps integer;events integer;unsafe integer;failed_gates integer;begin
  select count(*)into rollouts from public.production_rollouts where mode='synthetic_only' and status='completed';
  select count(*)into steps from public.production_rollout_steps where status='completed';
  select count(*)into events from public.production_rollout_events;
  select (select count(*)from public.production_rollouts where official_operations_enabled)+(select count(*)from public.production_rollout_steps where official_effect)into unsafe;
  select count(*)into failed_gates from public.production_rollout_steps where not backup_verified or not recovery_verified or not explicit_approval or critical_alerts>0 or high_alerts>0 or error_rate>1;
  if rollouts<>3 then raise exception 'expected_3_completed_rollouts_got_%',rollouts;end if;
  if steps<>24 then raise exception 'expected_24_completed_steps_got_%',steps;end if;
  if events<>96 then raise exception 'expected_96_control_events_got_%',events;end if;
  if unsafe<>0 then raise exception 'official_operation_enabled';end if;
  if failed_gates<>0 then raise exception 'failed_rollout_gates_%',failed_gates;end if;
end$$;
