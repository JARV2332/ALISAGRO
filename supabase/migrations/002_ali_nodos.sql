-- =============================================================================
-- ALISAGRO — Catálogo de nodos (ubicación, parcela, finca)
-- Ejecutar en Supabase → SQL Editor después de 001_ali_lecturas_monitoreo.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ali_nodos (
  device_id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  parcela TEXT,
  ubicacion TEXT,
  finca TEXT,
  cultivo TEXT,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ali_nodos IS
  'ALISAGRO — Metadatos de cada nodo IoT u origen OCR (parcela, ubicación en finca).';

CREATE INDEX IF NOT EXISTS idx_ali_nodos_activo ON public.ali_nodos (activo);

GRANT SELECT ON public.ali_nodos TO anon, authenticated;

ALTER TABLE public.ali_nodos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali: lectura nodos pública" ON public.ali_nodos;
CREATE POLICY "Ali: lectura nodos pública"
  ON public.ali_nodos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Nodos de demostración (ajusta parcela/ubicación a tu finca real)
INSERT INTO public.ali_nodos (device_id, nombre, parcela, ubicacion, finca, cultivo, notas)
VALUES
  (
    'nodo-esp32-01',
    'Nodo suelo — Parcela A',
    'Parcela A · Lote 3',
    'Sector norte, hilera 12–18',
    'Finca El Retiro',
    'Café arábica',
    'Sensores YL-69, DS18B20 y DHT11'
  ),
  (
    'PANTALLA_OCR_MANUAL',
    'Captura manual OCR',
    'Parcela B · Punto de muestreo',
    'Termómetro LCD en bodega de campo',
    'Finca El Retiro',
    NULL,
    'Solo temperatura y humedad ambiente'
  )
ON CONFLICT (device_id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  parcela = EXCLUDED.parcela,
  ubicacion = EXCLUDED.ubicacion,
  finca = EXCLUDED.finca,
  cultivo = EXCLUDED.cultivo,
  notas = EXCLUDED.notas,
  updated_at = NOW();
