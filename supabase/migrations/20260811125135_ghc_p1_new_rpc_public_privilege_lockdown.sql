revoke all on function public.ghc_admin_list_entitlements() from public, anon;
revoke all on function public.ghc_admin_activate_entitlement(uuid,uuid[]) from public, anon;
revoke all on function public.ghc_admin_revoke_entitlement(uuid,text) from public, anon;
grant execute on function public.ghc_admin_list_entitlements() to authenticated;
grant execute on function public.ghc_admin_activate_entitlement(uuid,uuid[]) to authenticated;
grant execute on function public.ghc_admin_revoke_entitlement(uuid,text) to authenticated;

revoke all on function public.ghc_student_list_support_tickets() from public, anon;
revoke all on function public.ghc_student_create_support_ticket(text,text,text) from public, anon;
revoke all on function public.ghc_student_reply_support_ticket(uuid,text) from public, anon;
grant execute on function public.ghc_student_list_support_tickets() to authenticated;
grant execute on function public.ghc_student_create_support_ticket(text,text,text) to authenticated;
grant execute on function public.ghc_student_reply_support_ticket(uuid,text) to authenticated;

revoke all on function public.ghc_admin_list_support_tickets() from public, anon;
revoke all on function public.ghc_admin_reply_support_ticket(uuid,text,text) from public, anon;
revoke all on function public.ghc_admin_update_support_ticket(uuid,text,text) from public, anon;
grant execute on function public.ghc_admin_list_support_tickets() to authenticated;
grant execute on function public.ghc_admin_reply_support_ticket(uuid,text,text) to authenticated;
grant execute on function public.ghc_admin_update_support_ticket(uuid,text,text) to authenticated;
