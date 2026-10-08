-- =============================================================================
-- ALISAGRO — Sala en vivo del reto (estilo anfitrión / jugadores)
-- No toca lecturas ni nodos. La charla es el anfitrión; los teléfonos se unen.
-- Ejecutar en Supabase → SQL Editor.
-- Revertir:
--   DROP FUNCTION IF EXISTS public.ali_reto_mandar(text, text, text, int, boolean, jsonb, jsonb);
--   DROP FUNCTION IF EXISTS public.ali_reto_limpiar(text, text);
--   DROP FUNCTION IF EXISTS public.ali_reto_cerrar(text, text);
--   DROP FUNCTION IF EXISTS public.ali_reto_correcta(text);
--   DROP TABLE IF EXISTS public.ali_reto_respuesta;
--   DROP TABLE IF EXISTS public.ali_reto_jugador;
--   DROP TABLE IF EXISTS public.ali_reto_sala;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ali_reto_sala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  codigo TEXT NOT NULL UNIQUE CHECK (char_length(codigo) BETWEEN 4 AND 8),
  anfitrion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'lobby' CHECK (estado IN ('lobby', 'pregunta', 'revelada', 'fin')),
  mazo JSONB NOT NULL,
  clave JSONB NOT NULL,
  indice SMALLINT NOT NULL DEFAULT 0,
  pregunta_empieza TIMESTAMPTZ
);

COMMENT ON TABLE public.ali_reto_sala IS
  'Sala del reto en /community-day. clave no se entrega al público.';

CREATE TABLE IF NOT EXISTS public.ali_reto_jugador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sala_id UUID NOT NULL REFERENCES public.ali_reto_sala (id) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 24),
  puntaje SMALLINT NOT NULL DEFAULT 0 CHECK (puntaje BETWEEN 0 AND 5000)
);

CREATE UNIQUE INDEX IF NOT EXISTS ali_reto_jugador_apodo
  ON public.ali_reto_jugador (sala_id, lower(nombre));

CREATE TABLE IF NOT EXISTS public.ali_reto_respuesta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sala_id UUID NOT NULL REFERENCES public.ali_reto_sala (id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES public.ali_reto_jugador (id) ON DELETE CASCADE,
  indice SMALLINT NOT NULL,
  opcion SMALLINT NOT NULL,
  acierto BOOLEAN NOT NULL DEFAULT FALSE,
  puntos SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (jugador_id, indice)
);

GRANT SELECT (id, created_at, codigo, estado, mazo, indice, pregunta_empieza)
  ON public.ali_reto_sala TO anon, authenticated;
GRANT INSERT ON public.ali_reto_sala TO anon, authenticated;
GRANT SELECT, INSERT ON public.ali_reto_jugador TO anon, authenticated;
GRANT SELECT, INSERT ON public.ali_reto_respuesta TO anon, authenticated;

ALTER TABLE public.ali_reto_sala ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ali_reto_jugador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ali_reto_respuesta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ali sala: lectura" ON public.ali_reto_sala;
CREATE POLICY "Ali sala: lectura"
  ON public.ali_reto_sala FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Ali sala: crear" ON public.ali_reto_sala;
CREATE POLICY "Ali sala: crear"
  ON public.ali_reto_sala FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Ali jugador: lectura" ON public.ali_reto_jugador;
CREATE POLICY "Ali jugador: lectura"
  ON public.ali_reto_jugador FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Ali jugador: entrar" ON public.ali_reto_jugador;
CREATE POLICY "Ali jugador: entrar"
  ON public.ali_reto_jugador FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ali_reto_sala s
      WHERE s.id = sala_id AND s.estado = 'lobby'
    )
  );

DROP POLICY IF EXISTS "Ali respuesta: lectura" ON public.ali_reto_respuesta;
CREATE POLICY "Ali respuesta: lectura"
  ON public.ali_reto_respuesta FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Ali respuesta: enviar" ON public.ali_reto_respuesta;
CREATE POLICY "Ali respuesta: enviar"
  ON public.ali_reto_respuesta FOR INSERT TO anon, authenticated
  WITH CHECK (true);

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

DROP TRIGGER IF EXISTS ali_reto_respuesta_guardar ON public.ali_reto_respuesta;
CREATE TRIGGER ali_reto_respuesta_guardar
  BEFORE INSERT ON public.ali_reto_respuesta
  FOR EACH ROW
  EXECUTE FUNCTION public.ali_reto_guardar_respuesta();

CREATE OR REPLACE FUNCTION public.ali_reto_mandar(
  p_codigo TEXT,
  p_token TEXT,
  p_estado TEXT,
  p_indice INT,
  p_empezar BOOLEAN,
  p_mazo JSONB DEFAULT NULL,
  p_clave JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sala_id UUID;
BEGIN
  IF p_estado NOT IN ('lobby', 'pregunta', 'revelada', 'fin') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  UPDATE public.ali_reto_sala
  SET estado = p_estado,
      indice = p_indice,
      pregunta_empieza = CASE
        WHEN p_empezar THEN NOW()
        WHEN p_estado = 'lobby' THEN NULL
        ELSE pregunta_empieza
      END,
      mazo = COALESCE(p_mazo, mazo),
      clave = COALESCE(p_clave, clave)
  WHERE codigo = p_codigo AND anfitrion = p_token
  RETURNING id INTO sala_id;

  RETURN sala_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ali_reto_limpiar(p_codigo TEXT, p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sala UUID;
BEGIN
  SELECT id INTO sala
  FROM public.ali_reto_sala
  WHERE codigo = p_codigo AND anfitrion = p_token;

  IF sala IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.ali_reto_respuesta WHERE sala_id = sala;
  UPDATE public.ali_reto_jugador SET puntaje = 0 WHERE sala_id = sala;
  UPDATE public.ali_reto_sala
  SET estado = 'lobby', indice = 0, pregunta_empieza = NULL
  WHERE id = sala;
END;
$$;

CREATE OR REPLACE FUNCTION public.ali_reto_cerrar(p_codigo TEXT, p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ali_reto_sala
  WHERE codigo = p_codigo AND anfitrion = p_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.ali_reto_correcta(p_codigo TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  respuesta INT;
BEGIN
  SELECT (clave ->> indice)::INT INTO respuesta
  FROM public.ali_reto_sala
  WHERE codigo = p_codigo AND estado IN ('revelada', 'fin');
  RETURN respuesta;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ali_reto_mandar(TEXT, TEXT, TEXT, INT, BOOLEAN, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ali_reto_limpiar(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ali_reto_cerrar(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ali_reto_correcta(TEXT) TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_reto_sala;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_reto_jugador;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ali_reto_respuesta;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
