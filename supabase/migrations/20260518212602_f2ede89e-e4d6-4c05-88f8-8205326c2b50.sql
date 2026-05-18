CREATE TYPE public.admin_request_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status admin_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX admin_requests_one_pending_per_user
  ON public.admin_requests(user_id) WHERE status = 'pending';

ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests" ON public.admin_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own request" ON public.admin_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND length(reason) BETWEEN 10 AND 1000
    AND NOT has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins view all requests" ON public.admin_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update requests" ON public.admin_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_admin_requests_updated_at
  BEFORE UPDATE ON public.admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an admin request is approved, grant the admin role automatically
CREATE OR REPLACE FUNCTION public.grant_admin_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    NEW.reviewed_at = now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_request_approval
  BEFORE UPDATE ON public.admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_on_approval();