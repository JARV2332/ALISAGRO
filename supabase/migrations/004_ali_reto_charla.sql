-- =============================================================================
-- ALISAGRO — Pizarra del reto de la charla (Community Day)
-- No toca lecturas ni nodos. Solo guarda apodo y puntaje.
-- Ejecutar en Supabase → SQL Editor.
-- Revertir: DROP TABLE IF EXISTS public.ali_reto_charla;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ali_reto_charla (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 24),
  puntaje SMALLINT NOT NULL CHECK (puntaje BETWEEN 0 AND 5)
);

COMMENT ON TABLE public.ali_reto_charla IS
  'Puntajes del reto en vivo de /community-day. No forma parte del monitoreo.';

CREATE INDEX IF NOT EXISTS idx_ali_reto_charla_puntaje
  ON public.ali_reto_charla (puntaje DESC, created_at ASC);

GRANT SELECT, INSERT ON public.ali_reto_charla TO anon, authenticated;

ALTER TABLE public.ali_reto_charla ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali reto: lectura pública" ON public.ali_reto_charla;
CREATE POLICY "Ali reto: lectura pública"
  ON public.ali_reto_charla
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Ali reto: inserción pública" ON public.ali_reto_charla;
CREATE POLICY "Ali reto: inserción pública"
  ON public.ali_reto_charla
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_reto_charla;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
