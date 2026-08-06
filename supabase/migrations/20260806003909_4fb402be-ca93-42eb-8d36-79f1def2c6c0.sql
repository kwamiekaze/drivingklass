REVOKE EXECUTE ON FUNCTION public.partially_complete_session(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_session_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partially_complete_session(uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_details(uuid) TO authenticated, service_role;