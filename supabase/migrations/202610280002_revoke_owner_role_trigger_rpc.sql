-- The owner-role function is only intended to run from its auth.users trigger.
-- Prevent direct RPC execution by API roles; trigger invocation remains intact.
REVOKE EXECUTE ON FUNCTION public.grant_nesai_owner_admin_role()
  FROM PUBLIC, anon, authenticated;
