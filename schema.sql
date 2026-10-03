-- ================================================================
-- ALFRED Dashboard — Schema SQL idempotente
-- Ejecutar en Supabase SQL Editor → New Query → Run
--
-- ORDEN DE EJECUCIÓN (IMPORTANTE):
--   1. Ejecutar BLOQUE A (crear extensiones y tablas)
--   2. Ejecutar BLOQUE B (políticas RLS)
--   3. Ejecutar BLOQUE C (migración de datos existentes)
--      ANTES de cambiar las políticas — ver instrucciones
--   4. Ejecutar BLOQUE D (Storage bucket)
--   5. Opcional: BLOQUE E (RAG Fase 2, comentado)
--
-- ⚠ PRECAUCIÓN: El bloque C debe ejecutarse CON TU USER ID.
--   Obtén tu user_id así:
--     SELECT id FROM auth.users WHERE email = 'tu@email.com';
--   Y reemplaza 'TU-USER-UUID-AQUI' en el bloque C.
-- ================================================================

-- ================================================================
-- BLOQUE A: Extensiones y tablas
-- ================================================================

-- Extensión uuid (ya activa en Supabase, pero por si acaso)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Tabla: app_state (sync de estado de cada página)
-- Clave primaria compuesta: user_id + key
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_state (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON public.app_state(user_id);

-- Realtime para sync instantáneo
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state;

-- ------------------------------------------------------------
-- Tabla: reflections (historial de reflexiones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reflections (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  texto           text,                    -- texto escrito o transcripción de audio
  transcripcion   text,                    -- transcripción si fue audio (Whisper)
  resumen         text,                    -- resumen generado por Alfred
  mood_tags       text[]      DEFAULT '{}', -- etiquetas de estado de ánimo
  fuente          text        DEFAULT 'texto' -- 'texto' | 'voz' | 'audio'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reflections_user_id   ON public.reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_created_at ON public.reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_user_date
  ON public.reflections(user_id, created_at DESC);

-- Búsqueda de texto en reflexiones
CREATE INDEX IF NOT EXISTS idx_reflections_texto_search
  ON public.reflections USING gin(to_tsvector('spanish', coalesce(texto, '') || ' ' || coalesce(resumen, '')));

-- Realtime para reflexiones
ALTER PUBLICATION supabase_realtime ADD TABLE public.reflections;

-- ================================================================
-- BLOQUE B: Row Level Security (RLS)
-- Cada usuario solo puede leer y modificar SUS propios datos.
-- ================================================================

-- --- app_state ---
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas abiertas (si existen)
DROP POLICY IF EXISTS "anon full access app_state" ON public.app_state;
DROP POLICY IF EXISTS "app_state_user_select"     ON public.app_state;
DROP POLICY IF EXISTS "app_state_user_insert"     ON public.app_state;
DROP POLICY IF EXISTS "app_state_user_update"     ON public.app_state;
DROP POLICY IF EXISTS "app_state_user_delete"     ON public.app_state;

-- SELECT: solo tus filas
CREATE POLICY "app_state_user_select"
  ON public.app_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: solo con tu user_id
CREATE POLICY "app_state_user_insert"
  ON public.app_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo tus filas
CREATE POLICY "app_state_user_update"
  ON public.app_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: solo tus filas
CREATE POLICY "app_state_user_delete"
  ON public.app_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- --- reflections ---
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reflections_user_select" ON public.reflections;
DROP POLICY IF EXISTS "reflections_user_insert" ON public.reflections;
DROP POLICY IF EXISTS "reflections_user_update" ON public.reflections;
DROP POLICY IF EXISTS "reflections_user_delete" ON public.reflections;

CREATE POLICY "reflections_user_select"
  ON public.reflections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "reflections_user_insert"
  ON public.reflections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reflections_user_update"
  ON public.reflections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reflections_user_delete"
  ON public.reflections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ================================================================
-- BLOQUE C: Migración de datos existentes
--
-- ⚠ INSTRUCCIONES:
--   1. Obtén tu user_id con:
--        SELECT id FROM auth.users WHERE email = 'tu@email.com';
--   2. Reemplaza 'TU-USER-UUID-AQUI' con ese UUID.
--   3. Ejecuta este bloque ANTES de agregar las políticas RLS
--      (o temporalmente agrega una política permisiva, migra, y luego
--       quita la política permisiva).
--
-- Este script lee las filas existentes en app_state (que tienen
-- solo 'key' como PK) y las asigna a tu usuario.
-- ================================================================

-- Agregar columna user_id si la tabla vieja no la tenía
-- (solo necesario si la tabla ya existía sin user_id)
DO $$
BEGIN
  -- Si la tabla vieja tenía 'key' como única PK, migrar:
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_state'
    AND column_name = 'user_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Actualizar filas sin user_id asignando el usuario principal
    -- NOTA: Reemplaza el UUID de abajo con el tuyo
    UPDATE public.app_state
    SET user_id = 'TU-USER-UUID-AQUI'::uuid
    WHERE user_id IS NULL;

    RAISE NOTICE 'Migración completada: datos asignados al usuario.';
  ELSE
    RAISE NOTICE 'La tabla ya tiene user_id o es nueva — no se requiere migración.';
  END IF;
END $$;

-- ================================================================
-- BLOQUE D: Storage bucket para fotos de progreso
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Eliminar políticas abiertas antiguas
DROP POLICY IF EXISTS "anon manage progress-photos" ON storage.objects;
DROP POLICY IF EXISTS "user_manage_own_photos"      ON storage.objects;

-- Solo cada usuario puede gestionar SU carpeta: {user_id}/...
CREATE POLICY "user_manage_own_photos"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================================================================
-- BLOQUE E: RAG / Fase 2 — COMENTADO, no implementado aún
-- Descomentar cuando se quiera implementar RAG con mentores.
-- Requiere la extensión pgvector.
-- ================================================================

/*
-- Activar pgvector (ir a Supabase → Extensions → vector)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla: mentores
CREATE TABLE IF NOT EXISTS public.mentors (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  descripcion text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Tabla: documentos de conocimiento
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id   uuid        NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo      text        NOT NULL,
  contenido   text,
  fuente_url  text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Tabla: chunks de embeddings
-- Los embeddings se calculan externamente (ej. text-embedding-3-small de OpenAI)
-- y se insertan aquí. La dimensión 1536 corresponde a ese modelo.
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     uuid        NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_texto     text        NOT NULL,
  embedding       vector(1536),            -- embedding del chunk
  posicion        integer,                 -- orden dentro del documento
  creado_en       timestamptz NOT NULL DEFAULT now()
);

-- Índice vectorial para búsqueda semántica rápida (IVFFLAT)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON public.knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS para mentors
ALTER TABLE public.mentors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentors_user_all"     ON public.mentors           FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "docs_user_all"        ON public.knowledge_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunks_user_all"      ON public.knowledge_chunks  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Función de búsqueda semántica (para /api/alfred.js en Fase 2)
-- CREATE OR REPLACE FUNCTION buscar_chunks(query_embedding vector(1536), p_user_id uuid, match_count int DEFAULT 5)
-- RETURNS TABLE(chunk_texto text, similitud float)
-- LANGUAGE sql STABLE AS $$
--   SELECT chunk_texto, 1 - (embedding <=> query_embedding) AS similitud
--   FROM public.knowledge_chunks
--   WHERE user_id = p_user_id
--   ORDER BY embedding <=> query_embedding
--   LIMIT match_count;
-- $$;

-- NOTA para /api/alfred.js (Fase 2):
-- Al recibir una pregunta del usuario:
-- 1. Generar embedding de la pregunta con OpenAI embeddings API.
-- 2. Llamar a buscar_chunks(embedding, user_id, 5).
-- 3. Incluir los chunks más relevantes en el system prompt de Claude.
-- 4. Esto permite que Alfred responda con el conocimiento de los mentores.
*/
