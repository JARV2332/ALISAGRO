-- =============================================================================
-- ALISAGRO — Tablas nuevas con prefijo Ali (no toca tablas existentes del proyecto)
-- Proyecto: https://lhbalfmlctawmfbpccfo.supabase.co
-- Ejecutar TODO este archivo en: Supabase → SQL Editor → Run
-- =============================================================================

-- Tabla principal de lecturas (IoT + OCR manual)
CREATE TABLE IF NOT EXISTS public.ali_lecturas_monitoreo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  temp_suelo NUMERIC,
  humedad_suelo NUMERIC,
  temp_ambiente NUMERIC,
  humedad_ambiente NUMERIC,
  metodo_captura TEXT NOT NULL
    CONSTRAINT ali_lecturas_metodo_captura_check
    CHECK (metodo_captura IN ('IOT', 'OCR_MANUAL'))
);

COMMENT ON TABLE public.ali_lecturas_monitoreo IS
  'ALISAGRO — Lecturas suelo/clima (ESP32 + OCR). Prefijo Ali, independiente de otras tablas.';

CREATE INDEX IF NOT EXISTS idx_ali_lecturas_created_at
  ON public.ali_lecturas_monitoreo (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ali_lecturas_device_id
  ON public.ali_lecturas_monitoreo (device_id);

-- Permisos REST para clave pública (anon / publishable)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.ali_lecturas_monitoreo TO anon, authenticated;

-- Row Level Security (demo feria AGTECH — lectura e inserción pública)
ALTER TABLE public.ali_lecturas_monitoreo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali: lectura pública" ON public.ali_lecturas_monitoreo;
CREATE POLICY "Ali: lectura pública"
  ON public.ali_lecturas_monitoreo
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Ali: inserción pública" ON public.ali_lecturas_monitoreo;
CREATE POLICY "Ali: inserción pública"
  ON public.ali_lecturas_monitoreo
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Realtime (WebSockets en el dashboard)
-- Si ya estaba en la publicación, ignorar el error o comentar la siguiente línea.
ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_lecturas_monitoreo;

-- Dato de prueba opcional (descomenta si quieres ver el dashboard al instante)
/*
INSERT INTO public.ali_lecturas_monitoreo (
  device_id, temp_suelo, humedad_suelo, temp_ambiente, humedad_ambiente, metodo_captura
) VALUES (
  'nodo-esp32-01', 22.4, 48.0, 26.1, 61.0, 'IOT'
);
*/
