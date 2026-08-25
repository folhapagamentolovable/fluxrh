
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('notificar-feriados-proximo-mes');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notificar-feriados-proximo-mes',
  '0 12 * * *',
  $$
  SELECT CASE
    WHEN EXTRACT(DAY FROM ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1)) = 1
    THEN net.http_post(
      url:='https://nmwrplxnjqyerorbbcxk.supabase.co/functions/v1/notificar-feriados-proximo-mes',
      headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td3JwbHhuanF5ZXJvcmJiY3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODA4OTYsImV4cCI6MjA3NTg1Njg5Nn0.Pf9j30tFgKQ5AMv0Y0puswj9NrPynDOWOuhkE2Hyfis"}'::jsonb,
      body:='{}'::jsonb
    )::text
    ELSE 'skipped'
  END;
  $$
);
