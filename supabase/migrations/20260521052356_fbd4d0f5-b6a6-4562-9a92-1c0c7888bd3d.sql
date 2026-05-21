
CREATE TYPE public.submission_status AS ENUM ('nuevo', 'en_contacto', 'convertido', 'descartado');

CREATE TABLE public.property_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  property_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  zone TEXT NOT NULL,
  address TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  area_m2 NUMERIC,
  price NUMERIC,
  description TEXT,
  status public.submission_status NOT NULL DEFAULT 'nuevo',
  admin_notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone creates valid submissions"
ON public.property_submissions FOR INSERT
WITH CHECK (
  length(contact_name) BETWEEN 2 AND 120
  AND length(contact_email) BETWEEN 5 AND 254
  AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(property_type) BETWEEN 2 AND 40
  AND length(operation) BETWEEN 2 AND 20
  AND length(zone) BETWEEN 2 AND 120
  AND (description IS NULL OR length(description) <= 4000)
);

CREATE POLICY "Admins view submissions"
ON public.property_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update submissions"
ON public.property_submissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete submissions"
ON public.property_submissions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_property_submissions_updated_at
BEFORE UPDATE ON public.property_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_property_submissions_status ON public.property_submissions(status, created_at DESC);
