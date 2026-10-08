-- =============================================================================
-- ALISAGRO — Puntaje del reto al estilo Kahoot
-- 8 segundos. Acertar al instante vale 1000. Al final del tiempo vale 500.
-- Incorrecta o sin respuesta vale 0.
-- Ejecutar en Supabase → SQL Editor si ya corriste 005.
-- =============================================================================

ALTER TABLE public.ali_reto_jugador DROP CONSTRAINT IF EXISTS ali_reto_jugador_puntaje_check;
ALTER TABLE public.ali_reto_jugador
  ADD CONSTRAINT ali_reto_jugador_puntaje_check CHECK (puntaje BETWEEN 0 AND 5000);

ALTER TABLE public.ali_reto_respuesta
  ADD COLUMN IF NOT EXISTS puntos SMALLINT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.ali_reto_guardar_respuesta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  estado_sala TEXT;
  indice_sala INT;
  correcta INT;
  empieza TIMESTAMPTZ;
  tardanza NUMERIC;
  ganados INT;
BEGIN
  SELECT s.estado, s.indice, (s.clave ->> NEW.indice)::INT, s.pregunta_empieza
  INTO estado_sala, indice_sala, correcta, empieza
  FROM public.ali_reto_sala s
  WHERE s.id = NEW.sala_id;

  IF estado_sala IS DISTINCT FROM 'pregunta' OR indice_sala IS DISTINCT FROM NEW.indice THEN
    RAISE EXCEPTION 'La pregunta no está abierta';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ali_reto_jugador j
    WHERE j.id = NEW.jugador_id AND j.sala_id = NEW.sala_id
  ) THEN
    RAISE EXCEPTION 'Jugador ajeno a la sala';
  END IF;

  NEW.acierto := NEW.opcion = correcta;
  ganados := 0;
  IF NEW.acierto THEN
    tardanza := EXTRACT(EPOCH FROM (clock_timestamp() - COALESCE(empieza, clock_timestamp())));
    IF tardanza < 0 THEN tardanza := 0; END IF;
    IF tardanza > 8 THEN tardanza := 8; END IF;
    ganados := ROUND((1 - ((tardanza / 8.0) / 2.0)) * 1000);
  END IF;
  NEW.puntos := ganados;
  IF ganados > 0 THEN
    UPDATE public.ali_reto_jugador
    SET puntaje = LEAST(5000, puntaje + ganados)
    WHERE id = NEW.jugador_id;
  END IF;
  RETURN NEW;
END;
$$;
