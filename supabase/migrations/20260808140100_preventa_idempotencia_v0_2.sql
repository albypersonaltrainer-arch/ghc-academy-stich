-- GHC Academy · Preventa 2026 · idempotencia V0.2
-- NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

create or replace function public.preventa_create_draft_v1(
  p_order_reference text,
  p_request_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_country text,
  p_phone text,
  p_payment_plan text,
  p_total_amount_cents integer,
  p_first_installment_cents integer,
  p_second_installment_cents integer,
  p_offer_code text,
  p_offer_version text,
  p_terms_version text,
  p_privacy_version text,
  p_legal_package_version text,
  p_marketing_consent boolean,
  p_source_channel text,
  p_source_detail text,
  p_campaign_code text,
  p_closer_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order_id uuid;
  v_order_reference text;
  v_created boolean := false;
begin
  insert into public.preventa_orders (
    order_reference,
    request_key,
    offer_code,
    offer_version,
    first_name,
    last_name,
    email,
    country,
    phone,
    payment_plan,
    total_amount_cents,
    first_installment_cents,
    second_installment_cents,
    second_due_at,
    status,
    founder_status,
    terms_version,
    privacy_version,
    legal_package_version
  ) values (
    p_order_reference,
    p_request_key,
    p_offer_code,
    p_offer_version,
    p_first_name,
    p_last_name,
    p_email,
    p_country,
    nullif(p_phone, ''),
    p_payment_plan,
    p_total_amount_cents,
    p_first_installment_cents,
    p_second_installment_cents,
    null,
    'draft',
    'pending',
    p_terms_version,
    p_privacy_version,
    p_legal_package_version
  )
  on conflict (request_key) do nothing
  returning id, order_reference into v_order_id, v_order_reference;

  if v_order_id is null then
    select id, order_reference
      into v_order_id, v_order_reference
    from public.preventa_orders
    where request_key = p_request_key;

    if v_order_id is null then
      raise exception 'No se pudo resolver la orden idempotente.';
    end if;

    return jsonb_build_object(
      'order_id', v_order_id,
      'order_reference', v_order_reference,
      'idempotent_replay', true
    );
  end if;

  v_created := true;

  insert into public.preventa_payments (
    order_id, installment_no, expected_amount_cents, due_at, status
  ) values (
    v_order_id, 1, p_first_installment_cents, null, 'pending'
  );

  if p_payment_plan = 'split' then
    insert into public.preventa_payments (
      order_id, installment_no, expected_amount_cents, due_at, status
    ) values (
      v_order_id, 2, p_second_installment_cents, null, 'pending'
    );
  end if;

  insert into public.preventa_acceptances (
    order_id, acceptance_type, accepted, document_version, evidence_metadata
  ) values
    (v_order_id, 'terms', true, p_terms_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'privacy_notice', true, p_privacy_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'private_training_ack', true, p_legal_package_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'marketing', coalesce(p_marketing_consent, false), p_privacy_version, jsonb_build_object('request_key', p_request_key));

  insert into public.preventa_attribution (
    order_id, source_channel, source_detail, campaign_code, closer_code
  ) values (
    v_order_id,
    nullif(p_source_channel, ''),
    nullif(p_source_detail, ''),
    nullif(p_campaign_code, ''),
    nullif(p_closer_code, '')
  );

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload
  ) values (
    v_order_id,
    'order.draft.created',
    'order:' || p_request_key || ':draft-created',
    jsonb_build_object(
      'order_reference', v_order_reference,
      'payment_plan', p_payment_plan,
      'total_amount_cents', p_total_amount_cents,
      'offer_code', p_offer_code,
      'offer_version', p_offer_version
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'idempotent_replay', not v_created
  );
end;
$$;

revoke all on function public.preventa_create_draft_v1(
  text, text, text, text, text, text, text, text,
  integer, integer, integer,
  text, text, text, text, text,
  boolean,
  text, text, text, text
) from public, anon, authenticated;

grant execute on function public.preventa_create_draft_v1(
  text, text, text, text, text, text, text, text,
  integer, integer, integer,
  text, text, text, text, text,
  boolean,
  text, text, text, text
) to service_role;

comment on function public.preventa_create_draft_v1 is 'Crea de forma atómica e idempotente un borrador de preventa. La unicidad de request_key protege también reintentos concurrentes. Solo service_role.';

commit;
