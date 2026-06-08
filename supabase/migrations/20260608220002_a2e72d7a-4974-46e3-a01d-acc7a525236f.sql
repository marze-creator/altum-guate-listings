GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

GRANT SELECT ON public.properties TO anon;
GRANT INSERT ON public.property_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_submissions TO authenticated;
GRANT ALL ON public.property_submissions TO service_role;