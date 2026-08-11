create or replace function public.ghc_student_prepare_academy_order(
  p_course_id uuid,
  p_installment_count integer,
  p_start_now boolean,
  p_withdrawal_loss_ack boolean,
  p_customer_type text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_terms_version text,
  p_privacy_version text
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
begin
  return public.ghc_student_prepare_academy_order(
    p_course_id,
    p_installment_count,
    p_start_now,
    p_withdrawal_loss_ack,
    'ZZ',
    p_customer_type,
    p_terms_accepted,
    p_privacy_accepted,
    p_terms_version,
    p_privacy_version
  );
end;
$$;

revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text) from public,anon;
grant execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text) to authenticated;
