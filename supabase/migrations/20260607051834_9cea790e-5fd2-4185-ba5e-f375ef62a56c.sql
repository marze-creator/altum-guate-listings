
-- Tighten property_views: require referenced property to exist and be published
DROP POLICY IF EXISTS "Anyone records valid views" ON public.property_views;
CREATE POLICY "Anyone records valid views" ON public.property_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    property_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'published')
    AND (session_id IS NULL OR length(session_id) <= 128)
    AND (referrer IS NULL OR length(referrer) <= 2048)
    AND (user_agent IS NULL OR length(user_agent) <= 1024)
  );

-- Webhook trigger: include shared secret header so the Edge Function can verify origin
CREATE OR REPLACE FUNCTION public.notify_lead_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  payload jsonb;
  fn_url text := 'https://clhmhcxteuvtbvjicdfm.supabase.co/functions/v1/send-lead-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaG1oY3h0ZXV2dGJ2amljZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzQyMjAsImV4cCI6MjA5NDQ1MDIyMH0.IJJ9pYf_V_IbNtSyWS5e8MJDnjDUufuNyTApanoSToc';
  webhook_secret text := '3d92e1cfe87de0fd4ced69f8efaef6611486ba6e93b8d928';
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP, 'table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW), 'old_record', NULL
  );
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-webhook-secret', webhook_secret
    ),
    body := payload
  );
  RETURN NEW;
END;
$function$;
