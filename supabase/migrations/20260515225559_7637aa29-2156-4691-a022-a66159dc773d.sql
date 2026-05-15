
-- Restrict SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_published_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Tighten inquiries insert with basic validation
DROP POLICY IF EXISTS "Anyone creates inquiries" ON public.inquiries;
CREATE POLICY "Anyone creates valid inquiries" ON public.inquiries FOR INSERT
  WITH CHECK (
    length(name) BETWEEN 2 AND 120
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(message) BETWEEN 5 AND 2000
  );

-- Restrict public bucket listing (allow read individual files via direct URL only)
DROP POLICY IF EXISTS "Property images public read" ON storage.objects;
CREATE POLICY "Property images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] IS NOT NULL);
