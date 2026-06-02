-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic trigger function: POSTs a Supabase-webhook-shaped payload to the edge function
CREATE OR REPLACE FUNCTION public.notify_lead_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  payload jsonb;
  fn_url text := 'https://clhmhcxteuvtbvjicdfm.supabase.co/functions/v1/send-lead-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaG1oY3h0ZXV2dGJ2amljZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzQyMjAsImV4cCI6MjA5NDQ1MDIyMH0.IJJ9pYf_V_IbNtSyWS5e8MJDnjDUufuNyTApanoSToc';
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

-- Drop existing triggers if re-running
DROP TRIGGER IF EXISTS on_inquiry_insert_notify ON public.inquiries;
DROP TRIGGER IF EXISTS on_property_submission_insert_notify ON public.property_submissions;
DROP TRIGGER IF EXISTS on_valuation_insert_notify ON public.valuations;

CREATE TRIGGER on_inquiry_insert_notify
AFTER INSERT ON public.inquiries
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_webhook();

CREATE TRIGGER on_property_submission_insert_notify
AFTER INSERT ON public.property_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_webhook();

CREATE TRIGGER on_valuation_insert_notify
AFTER INSERT ON public.valuations
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_webhook();