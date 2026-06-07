-- Fix Data API GRANTs for property_submissions (was missing, causing permission denied)
GRANT INSERT ON public.property_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_submissions TO authenticated;
GRANT ALL ON public.property_submissions TO service_role;