-- 1. Security definer view → security invoker
ALTER VIEW public.pending_leads_dashboard SET (security_invoker = true);

-- 2. Lock search_path on remaining functions
ALTER FUNCTION public.increment_property_views() SET search_path = public;
ALTER FUNCTION public.update_valuations_updated_at() SET search_path = public;

-- 3a. Replace overly permissive INSERT policy on valuations
DROP POLICY IF EXISTS "Cualquiera crea tasaciones" ON public.valuations;
CREATE POLICY "Anyone creates valid valuations"
ON public.valuations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(full_name) BETWEEN 2 AND 120
  AND length(email) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(phone) BETWEEN 6 AND 40
  AND length(whatsapp) BETWEEN 6 AND 40
  AND length(property_type) BETWEEN 2 AND 60
  AND length(zone) BETWEEN 2 AND 120
  AND approximate_size > 0 AND approximate_size < 1000000
  AND length(reason) BETWEEN 2 AND 500
  AND (comments IS NULL OR length(comments) <= 4000)
);

-- 3b. Replace overly permissive INSERT policy on property_views
DROP POLICY IF EXISTS "Cualquiera registra vistas" ON public.property_views;
CREATE POLICY "Anyone records valid views"
ON public.property_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  property_id IS NOT NULL
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (referrer IS NULL OR length(referrer) <= 2048)
  AND (user_agent IS NULL OR length(user_agent) <= 1024)
);

-- 4. Restrict execute on has_role to authenticated only (RLS for admins/vendedores)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;