# Guía de Configuración — Alfred Dashboard

Esta guía detalla los pasos para levantar el proyecto desde cero, configurar Supabase, establecer las variables de entorno en Vercel y asegurar tus datos.

## 1. Configuración de Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. Ve a la sección **SQL Editor** y abre una **New Query**.
3. Pega todo el contenido del archivo `supabase/schema.sql` y ejecútalo.
   - *Nota de migración*: Si ya tenías datos de una versión anterior del dashboard, asegúrate de reemplazar `'TU-USER-UUID-AQUI'` en la sección de migración (Bloque C) con el UUID de tu usuario (que puedes ver en Authentication -> Users) ANTES de ejecutar las políticas RLS.
4. Este script creará:
   - Las tablas `app_state` y `reflections`.
   - Las políticas RLS (Row Level Security) para que solo tú veas tus datos.
   - El bucket de Storage `progress-photos` con políticas de seguridad por carpeta.

## 2. Variables de Entorno en Vercel

En el panel de tu proyecto en Vercel, ve a **Settings > Environment Variables** y añade las siguientes claves:

- `SUPABASE_URL`: La URL de tu proyecto de Supabase (ej. `https://xxx.supabase.co`).
- `SUPABASE_ANON_KEY`: La clave pública/anon de Supabase.
- `ANTHROPIC_API_KEY`: Tu clave de la API de Anthropic (para Claude).
- `OPENAI_API_KEY`: Tu clave de la API de OpenAI (para Whisper / transcripción de voz).
- `ALFRED_MODEL`: (Opcional) El modelo de Claude a utilizar, por defecto `claude-opus-4-5` o el que prefieras usar de Anthropic.

*Importante: `SUPABASE_URL` y `SUPABASE_ANON_KEY` son leídos tanto por las funciones de `/api` (backend) como expuestos al frontend a través de `/api/config.js` para inicializar el cliente de Supabase.*

## 3. Integración con WHOOP (Opcional)

Si utilizas WHOOP y quieres ver tus datos de recuperación:
1. Registra una aplicación en el portal de desarrolladores de WHOOP.
2. Añade las siguientes variables a Vercel:
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WHOOP_REDIRECT_URI` (ej. `https://tu-dominio.vercel.app/api/whoop-callback`)
3. En la página de Salud (`health.html`), usa el botón de conectar.

## 4. Pruebas Locales (Vercel CLI)

Si deseas probar el dashboard localmente, necesitas instalar Vercel CLI, ya que los endpoints `/api` requieren el entorno serverless:

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

El servidor local se ejecutará típicamente en `http://localhost:3000`.

## 5. Fase 2: RAG de Mentores (Futuro)

Cuando decidas implementar la base de conocimientos con mentores:
1. Activa la extensión `vector` en Supabase (Database -> Extensions).
2. Descomenta el **Bloque E** en `supabase/schema.sql` y ejecútalo para crear las tablas vectoriales.
3. Actualiza `/api/alfred.js` para generar embeddings de las preguntas y buscar en los chunks.
