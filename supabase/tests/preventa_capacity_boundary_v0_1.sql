\set ON_ERROR_STOP on

-- GHC Academy · Preventa 2026 · frontera exacta del capacity hold
-- Regresión: occurred_at == held_until debe considerarse EXPIRADO.

select public.preventa_create_draft_v1(
  'GHC-BOUND001','request_boundary_exact_001','Test','Boundary','boundary@example.test','ES',null,
  'single',169000,169000,0,'GHC_FOUNDERS_2026','2026-08-08','TERMS_TEST','PRIVACY_TEST','LEGAL_TEST',
  false,'ci','capacity-boundary',null,null
);

select public.preventa_reserve_capacity_v1(
  'GHC-BOUND001','GHC-BOUND001-I1-ABOUND1','2026-09-03T10:45:00Z'::timestamptz,
  'capacity:GHC-BOUND001-I1-ABOUND1','2026-09-03T10:00:00Z'::timestamptz
);

select public.preventa_attach_capacity_checkout_v1(
  'GHC-BOUND001','GHC-BOUND001-I1-ABOUND1','sumup-checkout-boundary-001',
  '2026-09-03T10:00:01Z'::timestamptz
);

select public.preventa_register_checkout_attempt_v1(
  'GHC-BOUND001',1::smallint,'GHC-BOUND001-I1-ABOUND1','sumup-checkout-boundary-001',
  'https://checkout.example.test/boundary-001',169000,'checkout:boundary-001',
  '2026-09-03T10:00:02Z'::timestamptz
);

-- Exactamente en held_until: la confirmación DEBE ser rechazada.
do $$
begin
  begin
    perform public.preventa_confirm_payment_v1(
      'GHC-BOUND001',1::smallint,169000,'sumup-payment-boundary-001','sumup:boundary:001:paid',
      '2026-09-03T10:45:00Z'::timestamptz,
      '{"provider":"sumup","checkout_id":"sumup-checkout-boundary-001","verified_via_sumup_api":true}'::jsonb
    );
    raise exception 'FAIL: pago aceptado exactamente en held_until';
  exception
    when others then
      if sqlerrm = 'FAIL: pago aceptado exactamente en held_until' then raise; end if;
      if sqlerrm <> 'ACTIVE_CAPACITY_HOLD_REQUIRED' then
        raise exception 'FAIL: error inesperado en frontera exacta: %', sqlerrm;
      end if;
  end;
end $$;

-- El fallo debe ser atómico: nada cobrado, nada adjudicado y hold sin consumir.
do $$
declare
  v_order public.preventa_orders%rowtype;
  v_payment public.preventa_payments%rowtype;
  v_hold public.preventa_capacity_holds%rowtype;
begin
  select * into v_order from public.preventa_orders where order_reference='GHC-BOUND001';
  select * into v_payment from public.preventa_payments where order_id=v_order.id and installment_no=1;
  select * into v_hold from public.preventa_capacity_holds where order_id=v_order.id;

  if v_order.status <> 'awaiting_payment'
     or v_order.paid_at is not null
     or v_order.founder_place_number is not null
     or v_order.founder_status <> 'pending' then
    raise exception 'FAIL: frontera exacta mutó la matrícula';
  end if;

  if v_payment.status <> 'processing'
     or v_payment.paid_at is not null
     or v_payment.paid_amount_cents <> 0
     or v_payment.provider_payment_id is not null then
    raise exception 'FAIL: frontera exacta mutó el pago';
  end if;

  if v_hold.status <> 'attached' or v_hold.consumed_at is not null then
    raise exception 'FAIL: frontera exacta consumió el hold';
  end if;

  if exists (
    select 1 from public.preventa_events
    where idempotency_key='sumup:boundary:001:paid'
  ) then
    raise exception 'FAIL: frontera exacta registró evento de pago';
  end if;
end $$;

-- Limpieza lógica del hold para no interferir con suites posteriores.
select public.preventa_release_capacity_v1(
  'GHC-BOUND001','GHC-BOUND001-I1-ABOUND1','boundary_regression_cleanup',
  '2026-09-03T10:45:01Z'::timestamptz
);

select 'PREVENTA_CAPACITY_BOUNDARY_V01_OK' as result;
