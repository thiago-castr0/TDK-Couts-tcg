-- Migration: Bucket privado de uploads (planilhas e comprovantes PIX) para TDK & COUTS TCG
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tcg-uploads',
  'tcg-uploads',
  false,
  5242880,
  ARRAY[
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'tcg_uploads_select_auth'
  ) THEN
    CREATE POLICY tcg_uploads_select_auth ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'tcg-uploads'
        AND (SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'tcg_uploads_insert_auth'
  ) THEN
    CREATE POLICY tcg_uploads_insert_auth ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'tcg-uploads'
        AND (SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'tcg_uploads_update_auth'
  ) THEN
    CREATE POLICY tcg_uploads_update_auth ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'tcg-uploads'
        AND (SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER')
      )
      WITH CHECK (
        bucket_id = 'tcg-uploads'
        AND (SELECT private.tcg_current_role()) IN ('ADMIN', 'PARTNER', 'TREASURER')
      );
  END IF;
END $$;
