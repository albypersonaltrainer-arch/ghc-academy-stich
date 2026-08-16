-- Bound user/admin free-text fields at the database layer so direct RPC clients
-- cannot persist arbitrarily large payloads. Existing data was verified against
-- these limits before this migration was applied.

alter table public.academy_refund_requests
  add constraint academy_refund_requests_reason_text_length_ck
  check (reason_text is null or char_length(reason_text) <= 8000) not valid;

alter table public.academy_refund_requests
  add constraint academy_refund_requests_decision_reason_length_ck
  check (decision_reason is null or char_length(decision_reason) <= 8000) not valid;

alter table public.academy_refund_requests
  validate constraint academy_refund_requests_reason_text_length_ck;

alter table public.academy_refund_requests
  validate constraint academy_refund_requests_decision_reason_length_ck;