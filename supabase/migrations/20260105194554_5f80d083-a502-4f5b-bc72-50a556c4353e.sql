CREATE OR REPLACE FUNCTION public.try_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.try_uuid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_uuid(text) TO authenticated;