-- Migration: Ponte Server-Side Segura para API Next.js no Supabase + Storage (hash SHA-256)
CREATE TABLE IF NOT EXISTS private.tcg_app_secrets (
  secret_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.tcg_app_secrets (secret_hash)
VALUES ('8efdea44efd755ec7277bd1670d1e31ac715eaa29d56a880fe825c25c5d03972')
ON CONFLICT (secret_hash) DO NOTHING;

CREATE OR REPLACE FUNCTION private.tcg_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.tcg_profiles WHERE id = (SELECT auth.uid())::text LIMIT 1),
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM private.tcg_app_secrets s
        WHERE s.secret_hash = encode(
          sha256(
            convert_to(
              COALESCE((current_setting('request.headers', true)::json ->> 'x-tcg-backend-secret'), ''),
              'UTF8'
            )
          ),
          'hex'
        )
      ) THEN 'ADMIN'
      ELSE NULL
    END
  );
$$;

REVOKE EXECUTE ON FUNCTION private.tcg_current_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.tcg_current_role() TO anon, authenticated, service_role;

ALTER POLICY tcg_profiles_select_auth ON public.tcg_profiles TO anon, authenticated;
ALTER POLICY tcg_profiles_admin_write ON public.tcg_profiles TO anon, authenticated;
ALTER POLICY tcg_customers_select_auth ON public.tcg_customers TO anon, authenticated;
ALTER POLICY tcg_customers_write_auth ON public.tcg_customers TO anon, authenticated;
ALTER POLICY tcg_purchases_select_auth ON public.tcg_purchases TO anon, authenticated;
ALTER POLICY tcg_purchases_write_auth ON public.tcg_purchases TO anon, authenticated;
ALTER POLICY tcg_auctions_select_auth ON public.tcg_auctions TO anon, authenticated;
ALTER POLICY tcg_auctions_write_auth ON public.tcg_auctions TO anon, authenticated;
ALTER POLICY tcg_sales_select_auth ON public.tcg_sales TO anon, authenticated;
ALTER POLICY tcg_sales_insert_auth ON public.tcg_sales TO anon, authenticated;
ALTER POLICY tcg_sales_update_auth ON public.tcg_sales TO anon, authenticated;
ALTER POLICY tcg_sales_delete_auth ON public.tcg_sales TO anon, authenticated;
ALTER POLICY tcg_reconciliations_select_auth ON public.tcg_reconciliations TO anon, authenticated;
ALTER POLICY tcg_reconciliations_write_auth ON public.tcg_reconciliations TO anon, authenticated;
ALTER POLICY tcg_upload_logs_select_auth ON public.tcg_upload_logs TO anon, authenticated;
ALTER POLICY tcg_upload_logs_insert_auth ON public.tcg_upload_logs TO anon, authenticated;
ALTER POLICY tcg_uploads_select_auth ON storage.objects TO anon, authenticated;
ALTER POLICY tcg_uploads_insert_auth ON storage.objects TO anon, authenticated;
ALTER POLICY tcg_uploads_update_auth ON storage.objects TO anon, authenticated;
