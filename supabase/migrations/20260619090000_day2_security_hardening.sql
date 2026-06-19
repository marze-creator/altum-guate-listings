-- Día 2 — Security hardening ALTUM Lux
-- Objetivo: bloquear publicación directa por vendedores, limitar solicitudes de rol y mover secretos fuera del código.

-- 1) Los vendedores solo pueden crear propiedades como borrador o pendiente.
-- Los admins sí pueden crear cualquier estado.
ALTER POLICY "Vendedores create properties" ON public.properties
  WITH CHECK (
    auth.uid() = owner_id
    AND (
      (private.has_role(auth.uid(), 'vendedor'::public.app_role) AND status IN ('draft', 'pending'))
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- 2) Los propietarios/vendedores solo pueden actualizar propiedades propias mientras sigan en borrador o pendiente.
-- La publicación/despublicación queda reservada al admin.
ALTER POLICY "Owners update own properties" ON public.properties
  USING (auth.uid() = owner_id AND status IN ('draft', 'pending'))
  WITH CHECK (auth.uid() = owner_id AND status IN ('draft', 'pending'));

-- 3) Un usuario normal solo puede solicitar rol vendedor desde el formulario público.
-- El rol admin debe asignarse manualmente por un admin desde un flujo interno.
ALTER POLICY "Users create own request" ON public.admin_requests
  WITH CHECK (
    auth.uid() = user_id
    AND length(reason) BETWEEN 10 AND 1000
    AND requested_role = 'vendedor'::public.app_role
    AND NOT private.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 4) Blindaje extra del trigger de aprobación: admin_requests solo concede vendedor.
-- Evita escalamiento accidental si requested_role fue manipulado en una solicitud.
CREATE OR REPLACE FUNCTION public.grant_admin_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.requested_role IS DISTINCT FROM 'vendedor'::public.app_role THEN
      RAISE EXCEPTION 'admin_requests solo puede aprobar rol vendedor';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'vendedor'::public.app_role)
    ON CONFLICT DO NOTHING;

    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at = now();
  END IF;

  RETURN NEW;
END;
$function$;
