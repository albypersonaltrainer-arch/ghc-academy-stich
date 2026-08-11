create or replace function public.ghc_normalize_academy_order_pre_payment()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if new.status='awaiting_payment' and new.fully_paid_at is null then
    new.withdrawal_ends_at:=null;
    new.withdrawal_waived_at:=null;
    new.access_start_at:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_normalize_academy_order_pre_payment_before on public.academy_orders;
create trigger ghc_normalize_academy_order_pre_payment_before
before insert on public.academy_orders
for each row execute function public.ghc_normalize_academy_order_pre_payment();

create or replace function public.ghc_start_academy_withdrawal_clock_on_first_payment()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_order public.academy_orders;
  v_policy public.academy_commercial_policies;
  v_anchor timestamptz;
  v_has_loss_ack boolean:=false;
begin
  if new.status='paid' and (old.status is distinct from 'paid' or old.paid_at is distinct from new.paid_at) then
    select * into v_order from public.academy_orders where id=new.order_id for update;
    if v_order.id is not null and v_order.withdrawal_ends_at is null then
      select * into v_policy from public.academy_commercial_policies where id=v_order.policy_id;
      v_anchor:=coalesce(new.paid_at,now());
      select exists(
        select 1 from public.academy_legal_acceptances a
        where a.order_id=v_order.id and a.acceptance_type='withdrawal_loss_ack' and a.accepted=true
      ) into v_has_loss_ack;

      update public.academy_orders set
        withdrawal_ends_at=v_anchor+make_interval(days=>coalesce(v_policy.withdrawal_days,14)),
        withdrawal_waived_at=case when v_order.immediate_start and v_has_loss_ack then v_anchor else null end,
        access_start_at=case when v_order.immediate_start then v_anchor else v_anchor+make_interval(days=>coalesce(v_policy.withdrawal_days,14)) end,
        updated_at=now()
      where id=v_order.id;

      insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
      values(v_order.id,'withdrawal_clock_started',case when new.provider='manual' then 'admin' else 'provider' end,
        'Plazo comercial/legal anclado al primer pago confirmado',jsonb_build_object(
          'first_paid_at',v_anchor,
          'withdrawal_days',coalesce(v_policy.withdrawal_days,14),
          'immediate_start',v_order.immediate_start,
          'withdrawal_loss_ack',v_has_loss_ack,
          'access_start_at',case when v_order.immediate_start then v_anchor else v_anchor+make_interval(days=>coalesce(v_policy.withdrawal_days,14)) end
        ));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_start_academy_withdrawal_clock_after_payment on public.academy_installments;
create trigger ghc_start_academy_withdrawal_clock_after_payment
after update of status,paid_at on public.academy_installments
for each row execute function public.ghc_start_academy_withdrawal_clock_on_first_payment();

revoke execute on function public.ghc_normalize_academy_order_pre_payment() from public,anon,authenticated;
revoke execute on function public.ghc_start_academy_withdrawal_clock_on_first_payment() from public,anon,authenticated;
