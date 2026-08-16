-- GHC Academy security hardening: remove the legacy NULL-auth administrative bypass
-- from certificate issuance/revocation without duplicating or rewriting their proven logic.

alter function public.ghc_admin_issue_certificate(uuid, uuid, uuid)
  rename to ghc_internal_issue_certificate_legacy;
alter function public.ghc_internal_issue_certificate_legacy(uuid, uuid, uuid)
  set schema private;

alter function public.ghc_admin_revoke_certificate(uuid, text)
  rename to ghc_internal_revoke_certificate_legacy;
alter function public.ghc_internal_revoke_certificate_legacy(uuid, text)
  set schema private;

revoke all on function private.ghc_internal_issue_certificate_legacy(uuid, uuid, uuid) from public;
revoke all on function private.ghc_internal_issue_certificate_legacy(uuid, uuid, uuid) from anon, authenticated;
revoke all on function private.ghc_internal_revoke_certificate_legacy(uuid, text) from public;
revoke all on function private.ghc_internal_revoke_certificate_legacy(uuid, text) from anon, authenticated;

create function public.ghc_admin_issue_certificate(
  p_user_id uuid,
  p_course_id uuid,
  p_exam_id uuid default null
)
returns public.certificates
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then
    raise exception 'No autorizado: solo un administrador autenticado puede emitir certificados.';
  end if;

  return private.ghc_internal_issue_certificate_legacy(
    p_user_id,
    p_course_id,
    p_exam_id
  );
end;
$$;

create function public.ghc_admin_revoke_certificate(
  p_certificate_id uuid,
  p_reason text default null
)
returns public.certificates
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then
    raise exception 'No autorizado: solo un administrador autenticado puede revocar certificados.';
  end if;

  return private.ghc_internal_revoke_certificate_legacy(
    p_certificate_id,
    p_reason
  );
end;
$$;

revoke all on function public.ghc_admin_issue_certificate(uuid, uuid, uuid) from public;
revoke all on function public.ghc_admin_issue_certificate(uuid, uuid, uuid) from anon;
grant execute on function public.ghc_admin_issue_certificate(uuid, uuid, uuid) to authenticated;

revoke all on function public.ghc_admin_revoke_certificate(uuid, text) from public;
revoke all on function public.ghc_admin_revoke_certificate(uuid, text) from anon;
grant execute on function public.ghc_admin_revoke_certificate(uuid, text) to authenticated;