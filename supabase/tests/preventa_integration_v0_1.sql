\set ON_ERROR_STOP on

-- GHC Academy · Preventa 2026 · integración SQL V0.1
-- Se ejecuta exclusivamente contra PostgreSQL efímero de CI.

-- -----------------------------------------------------------------------------
-- CASO 1 · Pago único 1.690 €, idempotencia, E01, refund y reutilización plaza.
-- -----------------------------------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-TEST0001',
  'request_test_single_000001',
  'Ada',
  'Lovelace',
  'ada@example.test',
  'ES',
  null,
  'single',
  169000,
  169000,
  0,
  'GHC_FOUNDERS_2026',
  '2026-08-08',
  'TERMS_TEST',
  'PRIVACY_TEST',
  'LEGAL_TEST',
  false,
  'ci',
  'postgres17',
  null,
  null
) as single_draft;

-- Repetición idempotente: no puede duplicar orden ni hijos.
select public.preventa_create_draft_v1(
  'GHC-IGNORED1',
  'request_test_single_000001',
  'Ada',
  'Lovelace',
  'ada@example.test',
  'ES',
  null,
  'single',
  169000,
  169000,
  0,
  'GHC_FOUNDERS_2026',
  '2026-08-08',
  'TERMS_TEST',
  'PRIVACY_TEST',
  'LEGAL_TEST',
  false,
  'ci',
  'postgres17',
  null,
  null
) as single_replay;

do $$
begin
  if (select count(*) from public.preventa_orders where request_key = 'request_test_single_000001') <> 1 then
    raise exception 'FAIL: request_key no es idempotente';
  end if;
  if (select count(*) from public.preventa_payments p join public.preventa_orders o on o.id=p.order_id where o.order_reference='GHC-TEST0001') <> 1 then
    raise exception 'FAIL: pago único debe tener una sola cuota';
  end if;
end $$;

select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0001',
  1,
  'GHC-TEST0001-I1-ATEST01',
  'sumup-checkout-single-001',
  'https://checkout.example.test/single-001',
  169000,
  'checkout:sumup-checkout-single-001',
  '2026-08-08T10:00:00Z'
) as single_checkout;

do $$
begin
  if (select status from public.preventa_orders where order_reference='GHC-TEST0001') <> 'awaiting_payment' then
    raise exception 'FAIL: registrar checkout 1 debe llevar draft -> awaiting_payment';
  end if;
end $$;

select public.preventa_confirm_payment_v1(
  'GHC-TEST0001',
  1,
  169000,
  'sumup-payment-single-001',
  'sumup:single:001:paid',
  '2026-08-08T10:05:00Z',
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-001","verified_via_sumup_api":true}'::jsonb
) as single_paid;

do $$
declare
  v_order public.preventa_orders%rowtype;
begin
  select * into v_order from public.preventa_orders where order_reference='GHC-TEST0001';
  if v_order.status <> 'paid' then raise exception 'FAIL: pago único no termina paid'; end if;
  if v_order.founder_status <> 'confirmed' then raise exception 'FAIL: plaza pago único no queda confirmed'; end if;
  if v_order.founder_place_number <> 1 then raise exception 'FAIL: primera plaza esperada = 1'; end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v_order.id) <> 169000 then
    raise exception 'FAIL: comisión base pago único';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v_order.id and template_code='E01' and status='queued') <> 1 then
    raise exception 'FAIL: falta E01';
  end if;
  if (select status from public.preventa_checkout_attempts where provider_checkout_id='sumup-checkout-single-001') <> 'paid' then
    raise exception 'FAIL: intento SumUp exacto no quedó paid';
  end if;
end $$;

-- El mismo provider_payment_id no puede duplicar efectos.
select public.preventa_confirm_payment_v1(
  'GHC-TEST0001',
  1,
  169000,
  'sumup-payment-single-001',
  'sumup:single:001:paid:duplicate-key',
  '2026-08-08T10:06:00Z',
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-001","verified_via_sumup_api":true}'::jsonb
) as single_duplicate_provider_payment;

do $$
begin
  if (select count(*) from public.preventa_email_queue q join public.preventa_orders o on o.id=q.order_id where o.order_reference='GHC-TEST0001' and q.template_code='E01') <> 1 then
    raise exception 'FAIL: duplicado de provider_payment_id duplicó E01';
  end if;
end $$;

select public.preventa_full_refund_v1(
  'GHC-TEST0001',
  'sumup-refund-single-001',
  'sumup:refund:single:001',
  '2026-08-09T10:00:00Z'
) as single_refunded;

do $$
declare
  v_order public.preventa_orders%rowtype;
begin
  select * into v_order from public.preventa_orders where order_reference='GHC-TEST0001';
  if v_order.status <> 'refunded' then raise exception 'FAIL: refund total no termina refunded'; end if;
  if v_order.founder_status <> 'released' then raise exception 'FAIL: refund no libera founder_status'; end if;
  if v_order.founder_place_number is not null then raise exception 'FAIL: refund no devolvió número al pool'; end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v_order.id) <> 0 then
    raise exception 'FAIL: refund no pone comisión a cero';
  end if;
end $$;

-- Nueva orden: debe poder reutilizar la plaza 1 liberada.
select public.preventa_create_draft_v1(
  'GHC-TEST0002', 'request_test_single_000002', 'Grace', 'Hopper', 'grace@example.test', 'ES', null,
  'single', 169000, 169000, 0,
  'GHC_FOUNDERS_2026', '2026-08-08', 'TERMS_TEST', 'PRIVACY_TEST', 'LEGAL_TEST', false,
  'ci', 'postgres17', null, null
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0002', 1, 'GHC-TEST0002-I1-ATEST02', 'sumup-checkout-single-002',
  'https://checkout.example.test/single-002', 169000, 'checkout:sumup-checkout-single-002', '2026-08-09T11:00:00Z'
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0002', 1, 169000, 'sumup-payment-single-002', 'sumup:single:002:paid', '2026-08-09T11:05:00Z',
  '{"provider":"sumup","checkout_id":"sumup-checkout-single-002","verified_via_sumup_api":true}'::jsonb
);

do $$
begin
  if (select founder_place_number from public.preventa_orders where order_reference='GHC-TEST0002') <> 1 then
    raise exception 'FAIL: plaza 1 liberada no fue reutilizada';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- CASO 2 · Fraccionado 895 + 895, +15 días, E02-E09, overdue, recuperación, E10.
-- -----------------------------------------------------------------------------
select public.preventa_create_draft_v1(
  'GHC-TEST0003', 'request_test_split_0000003', 'Katherine', 'Johnson', 'kj@example.test', 'ES', null,
  'split', 179000, 89500, 89500,
  'GHC_FOUNDERS_2026', '2026-08-08', 'TERMS_TEST', 'PRIVACY_TEST', 'LEGAL_TEST', false,
  'ci', 'postgres17', null, null
);
select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0003', 1, 'GHC-TEST0003-I1-ASPLIT1', 'sumup-checkout-split-001',
  'https://checkout.example.test/split-001', 89500, 'checkout:sumup-checkout-split-001', '2026-08-10T12:00:00Z'
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0003', 1, 89500, 'sumup-payment-split-001', 'sumup:split:001:first-paid', '2026-08-10T12:05:00Z',
  '{"provider":"sumup","checkout_id":"sumup-checkout-split-001","verified_via_sumup_api":true}'::jsonb
);

do $$
declare
  v_order public.preventa_orders%rowtype;
  v_due timestamptz := '2026-08-25T12:05:00Z'::timestamptz;
begin
  select * into v_order from public.preventa_orders where order_reference='GHC-TEST0003';
  if v_order.status <> 'partial' then raise exception 'FAIL: primera cuota split no queda partial'; end if;
  if v_order.founder_status <> 'reserved' then raise exception 'FAIL: primera cuota split no reserva plaza'; end if;
  if v_order.second_due_at <> v_due then raise exception 'FAIL: vencimiento segunda cuota no es +15 días'; end if;
  if (select due_at from public.preventa_payments where order_id=v_order.id and installment_no=2) <> v_due then
    raise exception 'FAIL: due_at de cuota 2 no coincide';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v_order.id and template_code in ('E02','E03','E04','E05','E06','E07','E08','E09')) <> 8 then
    raise exception 'FAIL: cadena E02-E09 incompleta';
  end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v_order.id) <> 89500 then
    raise exception 'FAIL: comisión base primera cuota';
  end if;
end $$;

select public.preventa_mark_overdue_v1(
  'GHC-TEST0003',
  'overdue:split:001',
  '2026-08-26T12:05:00Z'
);

do $$
begin
  if (select status from public.preventa_orders where order_reference='GHC-TEST0003') <> 'overdue' then
    raise exception 'FAIL: +1 día no marca overdue';
  end if;
end $$;

select public.preventa_register_checkout_attempt_v1(
  'GHC-TEST0003', 2, 'GHC-TEST0003-I2-ASPLIT2', 'sumup-checkout-split-002',
  'https://checkout.example.test/split-002', 89500, 'checkout:sumup-checkout-split-002', '2026-08-26T12:10:00Z'
);
select public.preventa_confirm_payment_v1(
  'GHC-TEST0003', 2, 89500, 'sumup-payment-split-002', 'sumup:split:002:second-paid', '2026-08-26T12:15:00Z',
  '{"provider":"sumup","checkout_id":"sumup-checkout-split-002","verified_via_sumup_api":true}'::jsonb
);

do $$
declare
  v_order public.preventa_orders%rowtype;
begin
  select * into v_order from public.preventa_orders where order_reference='GHC-TEST0003';
  if v_order.status <> 'paid' then raise exception 'FAIL: segunda cuota tardía no recupera paid'; end if;
  if v_order.founder_status <> 'confirmed' then raise exception 'FAIL: segunda cuota no confirma plaza'; end if;
  if (select commission_base_cents from public.preventa_attribution where order_id=v_order.id) <> 179000 then
    raise exception 'FAIL: comisión base final split';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v_order.id and template_code='E10' and status='queued') <> 1 then
    raise exception 'FAIL: falta E10';
  end if;
  if (select count(*) from public.preventa_email_queue where order_id=v_order.id and template_code in ('E03','E04','E05','E06','E07','E08','E09') and status <> 'cancelled') <> 0 then
    raise exception 'FAIL: recordatorios E03-E09 no fueron cancelados';
  end if;
  if (select status from public.preventa_checkout_attempts where provider_checkout_id='sumup-checkout-split-002') <> 'paid' then
    raise exception 'FAIL: intento de segunda cuota no quedó paid';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Seguridad básica de grants: cliente no debe poder ejecutar RPC económicas.
-- -----------------------------------------------------------------------------
do $$
begin
  if has_function_privilege('anon', 'public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb)', 'EXECUTE') then
    raise exception 'FAIL SECURITY: anon puede ejecutar preventa_confirm_payment_v1';
  end if;
  if has_function_privilege('authenticated', 'public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb)', 'EXECUTE') then
    raise exception 'FAIL SECURITY: authenticated puede ejecutar preventa_confirm_payment_v1';
  end if;
  if not has_function_privilege('service_role', 'public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb)', 'EXECUTE') then
    raise exception 'FAIL SECURITY: service_role no puede ejecutar preventa_confirm_payment_v1';
  end if;
end $$;

select 'PREVENTA_SQL_INTEGRATION_OK' as result;
