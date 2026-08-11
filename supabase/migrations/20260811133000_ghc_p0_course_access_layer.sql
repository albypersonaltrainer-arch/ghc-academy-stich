create table if not exists public.course_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','revoked','expired')),
  access_source text not null default 'manual' check (access_source in ('manual','admin','preventa','sumup','stripe','migration')),
  provider_reference text,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_access_user_course_unique unique (user_id, course_id)
);

create index if not exists course_access_user_status_idx on public.course_access(user_id,status);
create index if not exists course_access_course_status_idx on public.course_access(course_id,status);
alter table public.course_access enable row level security;

drop policy if exists "Students can read own course access" on public.course_access;
create policy "Students can read own course access"
on public.course_access for select to authenticated
using (auth.uid()=user_id or public.ghc_is_admin());

create or replace function public.ghc_has_course_access_for_user(p_user_id uuid,p_course_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select p_user_id is not null and p_course_id is not null and (
    exists(select 1 from public.profiles p where p.id=p_user_id and p.role in('admin','owner','superadmin'))
    or exists(
      select 1 from public.course_access ca
      where ca.user_id=p_user_id and ca.course_id=p_course_id and ca.status='active'
        and ca.granted_at is not null and (ca.expires_at is null or ca.expires_at>now())
    )
  );
$$;
revoke execute on function public.ghc_has_course_access_for_user(uuid,uuid) from public,anon,authenticated;

create or replace function public.ghc_student_has_course_access(p_course_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.ghc_has_course_access_for_user(auth.uid(),p_course_id);
$$;
revoke execute on function public.ghc_student_has_course_access(uuid) from public,anon;
grant execute on function public.ghc_student_has_course_access(uuid) to authenticated;

create or replace function public.ghc_admin_grant_course_access(
  p_user_id uuid,p_course_id uuid,p_access_source text default 'admin',
  p_provider_reference text default null,p_expires_at timestamptz default null,
  p_reason text default null,p_metadata jsonb default '{}'::jsonb
)
returns public.course_access language plpgsql security definer set search_path=public as $$
declare
  v_result public.course_access;
  v_source text:=lower(trim(coalesce(p_access_source,'admin')));
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  if v_source not in('manual','admin','preventa','sumup','stripe','migration') then raise exception 'Origen de acceso no válido.'; end if;
  if not exists(select 1 from auth.users u where u.id=p_user_id) then raise exception 'El usuario no existe.'; end if;
  if not exists(select 1 from public.courses c where c.id=p_course_id) then raise exception 'El curso no existe.'; end if;

  insert into public.course_access(user_id,course_id,status,access_source,provider_reference,granted_by,granted_at,expires_at,revoked_at,reason,metadata,created_at,updated_at)
  values(p_user_id,p_course_id,'active',v_source,nullif(trim(coalesce(p_provider_reference,'')),''),auth.uid(),now(),p_expires_at,null,p_reason,coalesce(p_metadata,'{}'::jsonb),now(),now())
  on conflict(user_id,course_id) do update set status='active',access_source=excluded.access_source,
    provider_reference=excluded.provider_reference,granted_by=excluded.granted_by,granted_at=excluded.granted_at,
    expires_at=excluded.expires_at,revoked_at=null,reason=excluded.reason,metadata=excluded.metadata,updated_at=now()
  returning * into v_result;
  return v_result;
end;
$$;
revoke execute on function public.ghc_admin_grant_course_access(uuid,uuid,text,text,timestamptz,text,jsonb) from public,anon;
grant execute on function public.ghc_admin_grant_course_access(uuid,uuid,text,text,timestamptz,text,jsonb) to authenticated;

create or replace function public.ghc_admin_revoke_course_access(p_user_id uuid,p_course_id uuid,p_reason text default null)
returns public.course_access language plpgsql security definer set search_path=public as $$
declare v_result public.course_access;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  update public.course_access set status='revoked',revoked_at=now(),reason=p_reason,updated_at=now()
  where user_id=p_user_id and course_id=p_course_id returning * into v_result;
  if v_result.id is null then raise exception 'No existe una matrícula para ese usuario y curso.'; end if;
  return v_result;
end;
$$;
revoke execute on function public.ghc_admin_revoke_course_access(uuid,uuid,text) from public,anon;
grant execute on function public.ghc_admin_revoke_course_access(uuid,uuid,text) to authenticated;

-- Known beta testers. This migration intentionally seeds only the current audit accounts.
insert into public.course_access(user_id,course_id,status,access_source,provider_reference,granted_at,reason,metadata)
values
('44b7c5d8-dd66-46f4-bc35-1a59939486ad'::uuid,'afcc3f99-05bf-48c1-b388-2260701077ed'::uuid,'active','migration','academy-audit-2026-08-11',now(),'Acceso de auditoría de Alby',jsonb_build_object('purpose','academy_audit')),
('60a4505b-abd8-4790-a826-efba0ba3afbb'::uuid,'afcc3f99-05bf-48c1-b388-2260701077ed'::uuid,'active','migration','academy-audit-2026-08-11',now(),'Acceso de alumno tester José Luis',jsonb_build_object('purpose','student_feedback')),
('6bf6edc9-4a56-48c8-bd3b-9a32c7ea9d97'::uuid,'afcc3f99-05bf-48c1-b388-2260701077ed'::uuid,'active','migration','academy-audit-2026-08-11',now(),'Acceso de admin tester José Luis',jsonb_build_object('purpose','admin_feedback'))
on conflict(user_id,course_id) do update set status='active',access_source=excluded.access_source,
provider_reference=excluded.provider_reference,granted_at=excluded.granted_at,revoked_at=null,
reason=excluded.reason,metadata=excluded.metadata,updated_at=now();
