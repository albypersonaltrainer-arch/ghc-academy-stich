create table if not exists public.academy_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email_normalized text not null,
  source text not null,
  source_reference text not null,
  offer_code text null,
  status text not null default 'payment_pending',
  paid_at timestamptz null,
  activated_at timestamptz null,
  revoked_at timestamptz null,
  activated_by uuid null references auth.users(id) on delete set null,
  revoke_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_entitlements_source_check check (source in ('preventa','sumup','stripe','manual')),
  constraint academy_entitlements_status_check check (status in ('payment_pending','pending_activation','active','revoked')),
  constraint academy_entitlements_source_reference_unique unique (source, source_reference)
);
create index if not exists academy_entitlements_email_idx on public.academy_entitlements(email_normalized);
create index if not exists academy_entitlements_status_idx on public.academy_entitlements(status);
create index if not exists academy_entitlements_user_idx on public.academy_entitlements(user_id);
alter table public.academy_entitlements enable row level security;
drop policy if exists "GHC admins manage academy entitlements" on public.academy_entitlements;
create policy "GHC admins manage academy entitlements" on public.academy_entitlements for all to authenticated using (public.ghc_is_admin()) with check (public.ghc_is_admin());

create or replace function public.ghc_internal_resolve_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path=public,auth as $$
  select u.id from auth.users u where lower(trim(coalesce(u.email,'')))=lower(trim(coalesce(p_email,''))) order by u.created_at asc limit 1
$$;
revoke all on function public.ghc_internal_resolve_user_by_email(text) from public,anon,authenticated;

create or replace function public.ghc_sync_preventa_entitlement()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare v_status text; v_user_id uuid; v_email text;
begin
  v_email:=lower(trim(coalesce(new.email_normalized,new.email,'')));
  if v_email='' then return new; end if;
  v_user_id:=public.ghc_internal_resolve_user_by_email(v_email);
  v_status:=case when new.status='paid' then 'pending_activation' when new.status in ('cancelled','refunded') then 'revoked' else 'payment_pending' end;
  insert into public.academy_entitlements(user_id,email_normalized,source,source_reference,offer_code,status,paid_at,revoked_at,revoke_reason,metadata,created_at,updated_at)
  values(v_user_id,v_email,'preventa',new.order_reference,new.offer_code,v_status,new.paid_at,
    case when v_status='revoked' then coalesce(new.cancelled_at,now()) else null end,
    case when v_status='revoked' then 'Estado de preventa: '||new.status else null end,
    jsonb_build_object('offer_version',new.offer_version,'payment_plan',new.payment_plan,'currency',new.currency,'total_amount_cents',new.total_amount_cents,'founder_status',new.founder_status,'founder_place_number',new.founder_place_number,'preventa_status',new.status),
    new.created_at,now())
  on conflict(source,source_reference) do update set
    user_id=coalesce(public.academy_entitlements.user_id,excluded.user_id), email_normalized=excluded.email_normalized,
    offer_code=excluded.offer_code,
    status=case when public.academy_entitlements.status='active' and excluded.status='pending_activation' then 'active' else excluded.status end,
    paid_at=excluded.paid_at,revoked_at=excluded.revoked_at,revoke_reason=excluded.revoke_reason,
    metadata=public.academy_entitlements.metadata||excluded.metadata,updated_at=now();
  if v_status='revoked' then
    update public.course_access set status='revoked',revoked_at=now(),reason=coalesce(reason,'')||case when coalesce(reason,'')='' then '' else ' · ' end||'Derecho comercial revocado: '||new.order_reference,updated_at=now()
    where metadata->>'entitlement_source'='preventa' and metadata->>'entitlement_reference'=new.order_reference and status<>'revoked';
  end if;
  return new;
end$$;
revoke all on function public.ghc_sync_preventa_entitlement() from public,anon,authenticated;
drop trigger if exists ghc_sync_preventa_entitlement_after on public.preventa_orders;
create trigger ghc_sync_preventa_entitlement_after after insert or update of status,paid_at,cancelled_at,email,email_normalized,founder_status,founder_place_number on public.preventa_orders for each row execute function public.ghc_sync_preventa_entitlement();

insert into public.academy_entitlements(user_id,email_normalized,source,source_reference,offer_code,status,paid_at,revoked_at,revoke_reason,metadata,created_at,updated_at)
select public.ghc_internal_resolve_user_by_email(lower(trim(coalesce(o.email_normalized,o.email)))),lower(trim(coalesce(o.email_normalized,o.email))),'preventa',o.order_reference,o.offer_code,
  case when o.status='paid' then 'pending_activation' when o.status in ('cancelled','refunded') then 'revoked' else 'payment_pending' end,o.paid_at,
  case when o.status in ('cancelled','refunded') then coalesce(o.cancelled_at,now()) else null end,
  case when o.status in ('cancelled','refunded') then 'Estado de preventa: '||o.status else null end,
  jsonb_build_object('offer_version',o.offer_version,'payment_plan',o.payment_plan,'currency',o.currency,'total_amount_cents',o.total_amount_cents,'founder_status',o.founder_status,'founder_place_number',o.founder_place_number,'preventa_status',o.status),o.created_at,now()
from public.preventa_orders o where lower(trim(coalesce(o.email_normalized,o.email,'')))<>'' on conflict(source,source_reference) do nothing;

create or replace function public.ghc_admin_list_entitlements()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare v_result jsonb;
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'user_id',e.user_id,'email',e.email_normalized,'source',e.source,'source_reference',e.source_reference,'offer_code',e.offer_code,'status',e.status,'paid_at',e.paid_at,'activated_at',e.activated_at,'revoked_at',e.revoked_at,'metadata',e.metadata,'active_course_access',coalesce((select jsonb_agg(jsonb_build_object('course_id',ca.course_id,'status',ca.status,'granted_at',ca.granted_at)) from public.course_access ca where ca.metadata->>'entitlement_id'=e.id::text),'[]'::jsonb)) order by e.created_at desc),'[]'::jsonb) into v_result from public.academy_entitlements e;
  return v_result;
end$$;
grant execute on function public.ghc_admin_list_entitlements() to authenticated;
revoke execute on function public.ghc_admin_list_entitlements() from anon;

create or replace function public.ghc_admin_activate_entitlement(p_entitlement_id uuid,p_course_ids uuid[])
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_entitlement public.academy_entitlements; v_user_id uuid; v_course_id uuid; v_count integer:=0;
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  if p_entitlement_id is null then raise exception 'entitlement_id es obligatorio.'; end if;
  if p_course_ids is null or cardinality(p_course_ids)=0 then raise exception 'Selecciona al menos un curso.'; end if;
  select * into v_entitlement from public.academy_entitlements where id=p_entitlement_id for update;
  if v_entitlement.id is null then raise exception 'No existe el derecho comercial indicado.'; end if;
  if v_entitlement.status not in ('pending_activation','active') then raise exception 'El derecho comercial no está listo para activarse. Estado: %.',v_entitlement.status; end if;
  v_user_id:=coalesce(v_entitlement.user_id,public.ghc_internal_resolve_user_by_email(v_entitlement.email_normalized));
  if v_user_id is null then raise exception 'El comprador todavía no tiene una cuenta GHC Academy con ese email.'; end if;
  update public.academy_entitlements set user_id=v_user_id,status='active',activated_at=coalesce(activated_at,now()),activated_by=auth.uid(),updated_at=now() where id=v_entitlement.id;
  foreach v_course_id in array p_course_ids loop
    if not exists(select 1 from public.courses c where c.id=v_course_id) then raise exception 'No existe el curso %.',v_course_id; end if;
    insert into public.course_access(user_id,course_id,status,access_source,provider_reference,granted_by,granted_at,reason,metadata,created_at,updated_at)
    values(v_user_id,v_course_id,'active',case when v_entitlement.source in ('sumup','stripe','preventa') then v_entitlement.source else 'admin' end,v_entitlement.source_reference,auth.uid(),now(),'Activado desde derecho comercial '||v_entitlement.source_reference,jsonb_build_object('entitlement_id',v_entitlement.id,'entitlement_source',v_entitlement.source,'entitlement_reference',v_entitlement.source_reference,'offer_code',v_entitlement.offer_code),now(),now())
    on conflict(user_id,course_id) do update set status='active',access_source=excluded.access_source,provider_reference=excluded.provider_reference,granted_by=excluded.granted_by,granted_at=now(),revoked_at=null,reason=excluded.reason,metadata=public.course_access.metadata||excluded.metadata,updated_at=now();
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('entitlement_id',v_entitlement.id,'user_id',v_user_id,'status','active','courses_activated',v_count);
end$$;
grant execute on function public.ghc_admin_activate_entitlement(uuid,uuid[]) to authenticated;
revoke execute on function public.ghc_admin_activate_entitlement(uuid,uuid[]) from anon;

create or replace function public.ghc_admin_revoke_entitlement(p_entitlement_id uuid,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ref text; v_source text; v_updated integer;
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  update public.academy_entitlements set status='revoked',revoked_at=now(),revoke_reason=coalesce(nullif(trim(p_reason),''),'Revocado por administración'),updated_at=now() where id=p_entitlement_id returning source_reference,source into v_ref,v_source;
  if v_ref is null then raise exception 'No existe el derecho comercial indicado.'; end if;
  update public.course_access set status='revoked',revoked_at=now(),reason=coalesce(nullif(trim(p_reason),''),'Derecho comercial revocado'),updated_at=now() where metadata->>'entitlement_id'=p_entitlement_id::text and status<>'revoked';
  get diagnostics v_updated=row_count;
  return jsonb_build_object('entitlement_id',p_entitlement_id,'status','revoked','course_access_revoked',v_updated,'source',v_source,'reference',v_ref);
end$$;
grant execute on function public.ghc_admin_revoke_entitlement(uuid,text) to authenticated;
revoke execute on function public.ghc_admin_revoke_entitlement(uuid,text) from anon;
