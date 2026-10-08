-- =============================================================================
-- ALISAGRO — Tabla solo para la demo AWS Community Day
-- No modifica ali_lecturas_monitoreo ni ali_nodos.
-- Ejecutar en Supabase → SQL Editor después de las migraciones 001 y 002.
-- Revertir: DROP TABLE IF EXISTS public.ali_lecturas_aws_demo;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ali_lecturas_aws_demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  temp_suelo NUMERIC,
  humedad_suelo NUMERIC,
  temp_ambiente NUMERIC,
  humedad_ambiente NUMERIC,
  metodo_captura TEXT NOT NULL
    CONSTRAINT ali_lecturas_aws_demo_metodo_captura_check
    CHECK (metodo_captura IN ('IOT', 'OCR_MANUAL'))
);

COMMENT ON TABLE public.ali_lecturas_aws_demo IS
  'ALISAGRO demo AWS. Misma forma que ali_lecturas_monitoreo. El sitio de producción no la consulta.';

CREATE INDEX IF NOT EXISTS idx_ali_lecturas_aws_demo_created_at
  ON public.ali_lecturas_aws_demo (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ali_lecturas_aws_demo_device_id
  ON public.ali_lecturas_aws_demo (device_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.ali_lecturas_aws_demo TO anon, authenticated;

ALTER TABLE public.ali_lecturas_aws_demo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali demo: lectura pública" ON public.ali_lecturas_aws_demo;
CREATE POLICY "Ali demo: lectura pública"
  ON public.ali_lecturas_aws_demo
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Ali demo: inserción pública" ON public.ali_lecturas_aws_demo;
CREATE POLICY "Ali demo: inserción pública"
  ON public.ali_lecturas_aws_demo
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_lecturas_aws_demo;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
