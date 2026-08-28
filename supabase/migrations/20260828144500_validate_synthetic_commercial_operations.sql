do $$declare readiness integer;onboarding integer;monitoring integer;reviews integer;roadmap integer;unsafe integer;unhealthy integer;begin
  select count(*)into readiness from public.commercial_readiness where status='validated'and mode='synthetic_only';
  select count(*)into onboarding from public.customer_onboarding_runs where status='completed';
  select count(*)into monitoring from public.commercial_monitoring_snapshots;
  select count(*)into reviews from public.compliance_review_cycles where status='passed'and findings_open=0;
  select count(*)into roadmap from public.quarterly_roadmap_items where synthetic and status='committed';
  select count(*)into unsafe from public.commercial_readiness where real_commercial_release;
  select count(*)into unhealthy from public.commercial_monitoring_snapshots where availability<99.9 or error_rate>1 or p95_latency_ms>=500 or critical_alerts>0 or high_alerts>0;
  if readiness<>3 then raise exception'expected_3_validated_readiness_got_%',readiness;end if;
  if onboarding<>24 then raise exception'expected_24_onboarding_stages_got_%',onboarding;end if;
  if monitoring<>3 then raise exception'expected_3_monitoring_snapshots_got_%',monitoring;end if;
  if reviews<>12 then raise exception'expected_12_passed_reviews_got_%',reviews;end if;
  if roadmap<>9 then raise exception'expected_9_roadmap_items_got_%',roadmap;end if;
  if unsafe<>0 then raise exception'real_commercial_release_enabled';end if;
  if unhealthy<>0 then raise exception'unhealthy_commercial_monitoring_%',unhealthy;end if;
end$$;
