\set ON_ERROR_STOP on

-- GHC Academy · Preventa 2026 · integración SQL V0.2
-- PostgreSQL efímero de CI. Las RPC se invocan con sus tipos exactos.

-- PAGO ÚNICO + IDEMPOTENCIA ----------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-TEST0001','request_test_single_000001','Ada','Lovelace','ada@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','postgres17',null,null
);
select public.preventa_create_draft_v1(
  'GHC-IGNORED1','request_test_single_000001','Ada','Lovelace','ada@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','postgres17',null,null
);

do $$
begin
  if (select count(*) from public.preventa_orders where request_key='request_test_single_000001') <> 1 then
    raise exception 'FAIL: request_key no es idempotente';
  end if;
end $$;

-- La primera cuota sin hold debe ser imposible.
do $$
begin
  begin
    perform public.preventa_register_checkout_attempt_v1(
      'GHC-TEST0001',1::smallint,'GHC-TEST0001-I1-ANOHL01','sumup-checkout-nohold-001',
      'https://checkout.example.test/nohold-001',169000,'checkout:nohold-001',
      '2026-08-08T09:59:00Z'::timestamptz
    );
    raise exception 'FAIL: primera cuota aceptada sin capacity hold';
  exception
    when others then
      if sqlerrm = 'FAIL: primera cuota aceptada sin capacity hold' then raise; end if;
      if sqlerrm <> 'ACTIVE_CAPACITY_HOLD_REQUIRED' then
        raise exception 'FAIL: error inesperado sin hold: %', sqlerrm;
      end if;
  end;
end $$;

select public.preventa_reserve_capacity_v1(
  'GHC-TEST0001','GHC-TEST0001-I1-ATEST01','2026-08-08T10:30:00Z'::timestamptz,
  'capacity:GHC-TEST0001-I1-ATEST01','2026-08-08T10:00:00Z'::timestamptz
);
select public.preventa_attach_capacity_checkout_v1(
  'GHC-TEST0001','GHC-TEST0001-I1-ATEST01','sumup-checkout-single-001','2026-08-08T10:00:01Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0001',1::smallint,'GHC-TEST0001-I1-ATEST01','sumup-checkout-single-001',
  'https://checkout.example.test/single-001',169000,'checkout:sumup-checkout-single-001',
  '2026-08-08T10:00:02Z'::timestamptz
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0001',1::smallint,169000,'sumup-payment-single-001','sumup:single:001:paid',
  '2026-08-08T10:05:00Z'::timestamptz,
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-001","verified_via_sumup_api":true}'::jsonb
);

do $$
declare v public.preventa_orders%rowtype;
begin
  select * into v from public.preventa_orders where order_reference='GHC-TEST0001';
  if v.status <> 'paid' or v.founder_status <> 'confirmed' or v.founder_place_number <> 1 then
    raise exception 'FAIL: pago único/plaza fundadora';
  end if;
  if (select status from public.preventa_capacity_holds h join public.preventa_orders o on o.id=h.order_id where o.order_reference='GHC-TEST0001') <> 'consumed' then
    raise exception 'FAIL: hold single no quedó consumed';
  end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v.id) <> 169000 then
    raise exception 'FAIL: comisión base single';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v.id and template_code='E01' and status='queued') <> 1 then
    raise exception 'FAIL: E01';
  end if;
  if (select status from public.preventa_checkout_attempts where provider_checkout_id='sumup-checkout-single-001') <> 'paid' then
    raise exception 'FAIL: intento SumUp single no quedó paid';
  end if;
end $$;

select public.preventa_confirm_payment_v1(
  'GHC-TEST0001',1::smallint,169000,'sumup-payment-single-001','sumup:single:001:paid:duplicate',
  '2026-08-08T10:06:00Z'::timestamptz,
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-001","verified_via_sumup_api":true}'::jsonb
);

do $$
begin
  if (select count(*) from public.preventa_email_queue q join public.preventa_orders o on o.id=q.order_id where o.order_reference='GHC-TEST0001' and q.template_code='E01') <> 1 then
    raise exception 'FAIL: duplicado de pago duplicó E01';
  end if;
end $$;

-- REFUND + REUTILIZACIÓN DE PLAZA ---------------------------------------------
select public.preventa_full_refund_v1(
  'GHC-TEST0001','sumup-refund-single-001','sumup:refund:single:001','2026-08-09T10:00:00Z'::timestamptz
);

do $$
declare v public.preventa_orders%rowtype;
begin
  select * into v from public.preventa_orders where order_reference='GHC-TEST0001';
  if v.status <> 'refunded' or v.founder_status <> 'released' or v.founder_place_number is not null then
    raise exception 'FAIL: refund no libera plaza correctamente';
  end if;
end $$;

select public.preventa_create_draft_v1(
  'GHC-TEST0002','request_test_single_000002','Grace','Hopper','grace@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','postgres17',null,null
);
select public.preventa_reserve_capacity_v1(
  'GHC-TEST0002','GHC-TEST0002-I1-ATEST02','2026-08-09T11:30:00Z'::timestamptz,
  'capacity:GHC-TEST0002-I1-ATEST02','2026-08-09T11:00:00Z'::timestamptz
);
select public.preventa_attach_capacity_checkout_v1(
  'GHC-TEST0002','GHC-TEST0002-I1-ATEST02','sumup-checkout-single-002','2026-08-09T11:00:01Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0002',1::smallint,'GHC-TEST0002-I1-ATEST02','sumup-checkout-single-002',
  'https://checkout.example.test/single-002',169000,'checkout:sumup-checkout-single-002',
  '2026-08-09T11:00:02Z'::timestamptz
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0002',1::smallint,169000,'sumup-payment-single-002','sumup:single:002:paid',
  '2026-08-09T11:05:00Z'::timestamptz,
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-002","verified_via_sumup_api":true}'::jsonb
);

do $$
begin
  if (select founder_place_number from public.preventa_orders where order_reference='GHC-TEST0002') <> 1 then
    raise exception 'FAIL: plaza 1 liberada no fue reutilizada';
  end if;
end $$;

-- FRACCIONADO 895 + 895 --------------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-TEST0003','request_test_split_0000003','Katherine','Johnson','kj@example.test','ES',null,
  'split',179000,89500,89500,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','postgres17',null,null
);
select public.preventa_reserve_capacity_v1(
  'GHC-TEST0003','GHC-TEST0003-I1-ASPLIT1','2026-08-10T12:30:00Z'::timestamptz,
  'capacity:GHC-TEST0003-I1-ASPLIT1','2026-08-10T12:00:00Z'::timestamptz
);
select public.preventa_attach_capacity_checkout_v1(
  'GHC-TEST0003','GHC-TEST0003-I1-ASPLIT1','sumup-checkout-split-001','2026-08-10T12:00:01Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0003',1::smallint,'GHC-TEST0003-I1-ASPLIT1','sumup-checkout-split-001',
  'https://checkout.example.test/split-001',89500,'checkout:sumup-checkout-split-001',
  '2026-08-10T12:00:02Z'::timestamptz
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0003',1::smallint,89500,'sumup-payment-split-001','sumup:split:001:first-paid',
  '2026-08-10T12:05:00Z'::timestamptz,
  '{"provider":"sumup","checkout_id":"sumup-checkout-split-001","verified_via_sumup_api":true}'::jsonb
);

do $$
declare
  v public.preventa_orders%rowtype;
  expected_due timestamptz := '2026-08-25T12:05:00Z'::timestamptz;
begin
  select * into v from public.preventa_orders where order_reference='GHC-TEST0003';
  if v.status <> 'partial' or v.founder_status <> 'reserved' then
    raise exception 'FAIL: primera cuota split';
  end if;
  if v.second_due_at <> expected_due then raise exception 'FAIL: second_due_at no es +15 días'; end if;
  if (select count(*) from public.preventa_email_queue where order_id=v.id and template_code in ('E02','E03','E04','E05','E06','E07','E08','E09')) <> 8 then
    raise exception 'FAIL: cadena E02-E09';
  end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v.id) <> 89500 then
    raise exception 'FAIL: comisión primera cuota';
  end if;
  if (select status from public.preventa_capacity_holds where order_id=v.id) <> 'consumed' then
    raise exception 'FAIL: hold split no quedó consumed';
  end if;
end $$;

select public.preventa_mark_overdue_v1(
  'GHC-TEST0003','overdue:split:001','2026-08-26T12:05:00Z'::timestamptz
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0003',2::smallint,'GHC-TEST0003-I2-ASPLIT2','sumup-checkout-split-002',
  'https://checkout.example.test/split-002',89500,'checkout:sumup-checkout-split-002',
  '2026-08-26T12:10:00Z'::timestamptz
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0003',2::smallint,89500,'sumup-payment-split-002','sumup:split:002:second-paid',
  '2026-08-26T12:15:00Z'::timestamptz,
  '{"provider":"sumup","checkout_id":"sumup-checkout-split-002","verified_via_sumup_api":true}'::jsonb
);

do $$
declare v public.preventa_orders%rowtype;
begin
  select * into v from public.preventa_orders where order_reference='GHC-TEST0003';
  if v.status <> 'paid' or v.founder_status <> 'confirmed' then
    raise exception 'FAIL: segunda cuota tardía no recupera paid';
  end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v.id) <> 179000 then
    raise exception 'FAIL: comisión final split';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v.id and template_code='E10' and status='queued') <> 1 then
    raise exception 'FAIL: E10';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v.id and template_code in ('E03','E04','E05','E06','E07','E08','E09') and status <> 'cancelled') <> 0 then
    raise exception 'FAIL: E03-E09 no cancelados';
  end if;
end $$;

-- LIBERACIÓN EXPLÍCITA DEL HOLD ------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-TEST0004','request_test_release_000004','Test','Release','release@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','postgres17',null,null
);
select public.preventa_reserve_capacity_v1(
  'GHC-TEST0004','GHC-TEST0004-I1-AREL001','2026-08-30T10:30:00Z'::timestamptz,
  'capacity:GHC-TEST0004-I1-AREL001','2026-08-30T10:00:00Z'::timestamptz
);
select public.preventa_release_capacity_v1(
  'GHC-TEST0004','GHC-TEST0004-I1-AREL001','provider_failed','2026-08-30T10:01:00Z'::timestamptz
);

do $$
begin
  if (select status from public.preventa_capacity_holds h join public.preventa_orders o on o.id=h.order_id where o.order_reference='GHC-TEST0004') <> 'released' then
    raise exception 'FAIL: hold fallido no se liberó';
  end if;
end $$;

-- SEGURIDAD -------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon','public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb)','EXECUTE') then
    raise exception 'FAIL SECURITY: anon ejecuta confirm_payment';
  end if;
  if has_function_privilege('authenticated','public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb)','EXECUTE') then
    raise exception 'FAIL SECURITY: authenticated ejecuta confirm_payment';
  end if;
  if not has_function_privilege('service_role','public.preventa_reserve_capacity_v1(text,text,timestamptz,text,timestamptz)','EXECUTE') then
    raise exception 'FAIL SECURITY: service_role sin reserve_capacity';
  end if;
  if has_table_privilege('anon','public.preventa_capacity_holds','SELECT') then
    raise exception 'FAIL SECURITY: anon lee capacity_holds';
  end if;
end $$;

select 'PREVENTA_SQL_INTEGRATION_V02_OK' as result;
