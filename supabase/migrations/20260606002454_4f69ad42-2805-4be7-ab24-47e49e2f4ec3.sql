
-- 1) Diferenciar vendedor vs admin en solicitudes
ALTER TABLE public.admin_requests
  ADD COLUMN IF NOT EXISTS requested_role public.app_role NOT NULL DEFAULT 'vendedor'::public.app_role;

-- 2) Reemplazar función para asignar el rol solicitado al aprobar (en vez de admin fijo)
CREATE OR REPLACE FUNCTION public.grant_admin_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3) Adjuntar el trigger (no existía)
DROP TRIGGER IF EXISTS trg_admin_requests_grant_role ON public.admin_requests;
CREATE TRIGGER trg_admin_requests_grant_role
BEFORE UPDATE ON public.admin_requests
FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_on_approval();

-- 4) Notificar por correo al admin cuando entra una solicitud nueva
DROP TRIGGER IF EXISTS trg_admin_requests_notify ON public.admin_requests;
CREATE TRIGGER trg_admin_requests_notify
AFTER INSERT ON public.admin_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_webhook();
