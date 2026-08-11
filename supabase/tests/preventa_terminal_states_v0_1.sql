\set ON_ERROR_STOP on

-- GHC Academy · Preventa 2026 · estados terminales de checkout

-- FAILED ----------------------------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-FAIL0001','request_terminal_failed_001','Test','Failed','failed@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','terminal-failed',null,null
);
select public.preventa_reserve_capacity_v1(
  'GHC-FAIL0001','GHC-FAIL0001-I1-AFAIL01','2026-09-01T10:45:00Z'::timestamptz,
  'capacity:GHC-FAIL0001-I1-AFAIL01','2026-09-01T10:00:00Z'::timestamptz
);
select public.preventa_attach_capacity_checkout_v1(
  'GHC-FAIL0001','GHC-FAIL0001-I1-AFAIL01','sumup-checkout-failed-001','2026-09-01T10:00:01Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-FAIL0001',1::smallint,'GHC-FAIL0001-I1-AFAIL01','sumup-checkout-failed-001',
  'https://checkout.example.test/failed-001',169000,'checkout:failed-001','2026-09-01T10:00:02Z'::timestamptz
);
select public.preventa_mark_checkout_terminal_v1(
  'GHC-FAIL0001',1::smallint,'sumup-checkout-failed-001','failed','sumup:failed-001:failed',
  '2026-09-01T10:05:00Z'::timestamptz,
  '{"provider":"sumup","checkout_status":"FAILED","verified_via_sumup_api":true}'::jsonb
);

-- Replay idempotente.
select public.preventa_mark_checkout_terminal_v1(
  'GHC-FAIL0001',1::smallint,'sumup-checkout-failed-001','failed','sumup:failed-001:failed',
  '2026-09-01T10:05:01Z'::timestamptz,
  '{"provider":"sumup","checkout_status":"FAILED","verified_via_sumup_api":true}'::jsonb
);

do $$
declare v public.preventa_orders%rowtype;
begin
  select * into v from public.preventa_orders where order_reference='GHC-FAIL0001';
  if v.status <> 'awaiting_payment' or v.founder_status <> 'pending' or v.founder_place_number is not null then
    raise exception 'FAIL: FAILED no dejó orden reintentable/sin plaza';
  end if;
  if (select status from public.preventa_payments where order_id=v.id and installment_no=1) <> 'failed' then
    raise exception 'FAIL: cuota no quedó failed';
  end if;
  if (select status from public.preventa_checkout_attempts where provider_checkout_id='sumup-checkout-failed-001') <> 'failed' then
    raise exception 'FAIL: intento no quedó failed';
  end if;
  if (select status from public.preventa_capacity_holds where provider_checkout_id='sumup-checkout-failed-001') <> 'released' then
    raise exception 'FAIL: hold no quedó released tras FAILED';
  end if;
  if (select count(*) from public.preventa_events where idempotency_key='sumup:failed-001:failed') <> 1 then
    raise exception 'FAIL: FAILED no fue idempotente';
  end if;
end $$;

-- EXPIRED ---------------------------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-EXPIR001','request_terminal_expired_001','Test','Expired','expired@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','terminal-expired',null,null
);
select public.preventa_reserve_capacity_v1(
  'GHC-EXPIR001','GHC-EXPIR001-I1-AEXP001','2026-09-02T10:45:00Z'::timestamptz,
  'capacity:GHC-EXPIR001-I1-AEXP001','2026-09-02T10:00:00Z'::timestamptz
);
select public.preventa_attach_capacity_checkout_v1(
  'GHC-EXPIR001','GHC-EXPIR001-I1-AEXP001','sumup-checkout-expired-001','2026-09-02T10:00:01Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-EXPIR001',1::smallint,'GHC-EXPIR001-I1-AEXP001','sumup-checkout-expired-001',
  'https://checkout.example.test/expired-001',169000,'checkout:expired-001','2026-09-02T10:00:02Z'::timestamptz
);
select public.preventa_mark_checkout_terminal_v1(
  'GHC-EXPIR001',1::smallint,'sumup-checkout-expired-001','expired','sumup:expired-001:expired',
  '2026-09-02T10:30:00Z'::timestamptz,
  '{"provider":"sumup","checkout_status":"EXPIRED","verified_via_sumup_api":true}'::jsonb
);

do $$
declare v public.preventa_orders%rowtype;
begin
  select * into v from public.preventa_orders where order_reference='GHC-EXPIR001';
  if v.status <> 'awaiting_payment' or v.founder_status <> 'pending' or v.founder_place_number is not null then
    raise exception 'FAIL: EXPIRED no dejó orden reintentable/sin plaza';
  end if;
  if (select status from public.preventa_payments where order_id=v.id and installment_no=1) <> 'pending' then
    raise exception 'FAIL: cuota expirada no volvió a pending';
  end if;
  if (select status from public.preventa_checkout_attempts where provider_checkout_id='sumup-checkout-expired-001') <> 'expired' then
    raise exception 'FAIL: intento no quedó expired';
  end if;
  if (select status from public.preventa_capacity_holds where provider_checkout_id='sumup-checkout-expired-001') <> 'expired' then
    raise exception 'FAIL: hold no quedó expired';
  end if;
end $$;

-- SEGURIDAD -------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon','public.preventa_mark_checkout_terminal_v1(text,smallint,text,text,text,timestamptz,jsonb)','EXECUTE') then
    raise exception 'FAIL SECURITY: anon ejecuta terminal checkout';
  end if;
  if has_function_privilege('authenticated','public.preventa_mark_checkout_terminal_v1(text,smallint,text,text,text,timestamptz,jsonb)','EXECUTE') then
    raise exception 'FAIL SECURITY: authenticated ejecuta terminal checkout';
  end if;
  if not has_function_privilege('service_role','public.preventa_mark_checkout_terminal_v1(text,smallint,text,text,text,timestamptz,jsonb)','EXECUTE') then
    raise exception 'FAIL SECURITY: service_role sin terminal checkout';
  end if;
end $$;

select 'PREVENTA_TERMINAL_STATES_V01_OK' as result;
