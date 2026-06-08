CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.grant_admin_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, COALESCE(NEW.requested_role, 'vendedor'::public.app_role))
    ON CONFLICT DO NOTHING;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  ALTER POLICY "Admins update requests" ON public.admin_requests
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins view all requests" ON public.admin_requests
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Users create own request" ON public.admin_requests
    WITH CHECK ((auth.uid() = user_id) AND ((length(reason) >= 10) AND (length(reason) <= 1000)) AND (NOT private.has_role(auth.uid(), 'admin'::public.app_role)));

  ALTER POLICY "Admins update inquiries" ON public.inquiries
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins view all inquiries" ON public.inquiries
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));

  ALTER POLICY "Admins view all profiles" ON public.profiles
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Vendedores view profiles basic" ON public.profiles
    USING (private.has_role(auth.uid(), 'vendedor'::public.app_role));

  ALTER POLICY "Admins can update any property" ON public.properties
    USING (private.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins delete any property" ON public.properties
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins update any property" ON public.properties
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins view all properties" ON public.properties
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Vendedores create properties" ON public.properties
    WITH CHECK ((auth.uid() = owner_id) AND (private.has_role(auth.uid(), 'vendedor'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

  ALTER POLICY "Admins manage all images" ON public.property_images
    USING (private.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins view all images" ON public.property_images
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));

  ALTER POLICY "Admins delete submissions" ON public.property_submissions
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins update submissions" ON public.property_submissions
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Admins view submissions" ON public.property_submissions
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));

  ALTER POLICY "Solo staff ve analytics" ON public.property_views
    USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'vendedor'::public.app_role));

  ALTER POLICY "Admins view all roles" ON public.user_roles
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Solo admins gestionan roles" ON public.user_roles
    USING (private.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

  ALTER POLICY "Solo admin elimina tasaciones" ON public.valuations
    USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  ALTER POLICY "Staff actualiza tasaciones" ON public.valuations
    USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'vendedor'::public.app_role));
  ALTER POLICY "Staff ve tasaciones" ON public.valuations
    USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'vendedor'::public.app_role));
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Some policies were already renamed or absent; continuing.';
END $$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;