-- =============================================================================
-- ALISAGRO — Avatar del jugador en el podio del reto
-- Ejecutar en Supabase → SQL Editor si ya corriste 005.
-- =============================================================================

ALTER TABLE public.ali_reto_jugador
  ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT 'brote';
