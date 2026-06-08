DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') ILIKE '%has_role%' OR coalesce(with_check, '') ILIKE '%has_role%')
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;

GRANT SELECT ON public.properties TO anon;
GRANT INSERT ON public.property_submissions TO anon;