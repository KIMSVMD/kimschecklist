-- Vibe Base one-time setup, run with the OWNER connection after `npm run db:push`.
-- Tables created by the owner role don't pick up the platform's default grants (those are defined
-- for objects created by "postgres"), so give the app's rw role the same access here.
-- :rw is replaced with the rw role name by script/vb-grant-rw.cjs.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :rw;
GRANT SELECT, USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, USAGE, UPDATE ON SEQUENCES TO :rw;
-- NoA rule: RLS on for user tables. Access control stays in the app (admin token), so the app's
-- rw role gets one policy covering every row.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS app_rw_all ON public.%I', t.tablename);
    EXECUTE format('CREATE POLICY app_rw_all ON public.%I FOR ALL TO %I USING (true) WITH CHECK (true)', t.tablename, ':rw_name');
  END LOOP;
END $$;
