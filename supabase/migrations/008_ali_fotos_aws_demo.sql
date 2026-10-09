-- =============================================================================
-- ALISAGRO — Fotos que la Raspberry deja en S3 y la charla muestra en /aws
-- No modifica ali_lecturas_monitoreo ni las lecturas de sensores.
-- Ejecutar en Supabase → SQL Editor.
-- Revertir: DROP TABLE IF EXISTS public.ali_fotos_aws_demo;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ali_fotos_aws_demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  bucket TEXT NOT NULL,
  objeto TEXT NOT NULL,
  url TEXT NOT NULL,
  cobertura NUMERIC,
  verde NUMERIC,
  amarillo NUMERIC,
  seco NUMERIC
);

COMMENT ON TABLE public.ali_fotos_aws_demo IS
  'Foto de la Pi en S3. Verde, amarillo y seco son color de la imagen, no un diagnóstico.';

CREATE INDEX IF NOT EXISTS idx_ali_fotos_aws_demo_created_at
  ON public.ali_fotos_aws_demo (created_at DESC);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.ali_fotos_aws_demo TO anon, authenticated;

ALTER TABLE public.ali_fotos_aws_demo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali fotos demo: lectura pública" ON public.ali_fotos_aws_demo;
CREATE POLICY "Ali fotos demo: lectura pública"
  ON public.ali_fotos_aws_demo
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Ali fotos demo: inserción pública" ON public.ali_fotos_aws_demo;
CREATE POLICY "Ali fotos demo: inserción pública"
  ON public.ali_fotos_aws_demo
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_fotos_aws_demo;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
