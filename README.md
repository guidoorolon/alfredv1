# ALFRED — Asistente Personal & Dashboard

Alfred es un centro de control personal y asistente IA (inspirado en la Batcomputadora) diseñado para registrar entrenamientos, finanzas, hábitos, tareas y reflexiones. 

Es un dashboard "estático" basado en páginas HTML/JS individuales que comparten un sistema de diseño (`assets/alfred.css`), sincronizando su estado con Supabase Auth & Database (`sync.js`), y servido a través de Vercel (incluyendo funciones serverless para interacción con IA).

## Características principales

- **Estética Batcomputadora**: Fondo oscuro con acentos cian/azul, UI holográfica con esquinas biseladas (HUD), tipografía técnica y emblema original.
- **Sistema multi-página sin build steps**: Archivos HTML limpios, sin frameworks pesados. Abres el HTML y funciona.
- **Auth de Supabase**: Login seguro (Email, Contraseña, Magic Link) que protege todas las páginas mediante el helper `window.requireAuth()`.
- **Sync en tiempo real**: `sync.js` parcha `localStorage` y hace upserts a la tabla `app_state` de Supabase usando el `user_id` y RLS para máxima privacidad.
- **Módulos integrados**: 
  - Misiones (Tareas y Metas)
  - Entrenamiento (Sobrecarga progresiva, rutinas, fotos de progreso)
  - Salud (Stack de suplementos, integración con WHOOP)
  - Hidratación (Cálculo fisiológico de requerimiento de agua)
  - Finanzas (Patrimonio, ingresos y gastos)
  - Cafeína (Control de dosis y tiempo)
- **Alfred (IA)**: Tu mayordomo personal. Función serverless (`/api/alfred.js`) que usa Claude (Anthropic) para darte resúmenes rápidos y consejos sin comprometer tu API key en el cliente.
- **Reflexión**: Espacio para volcar pensamientos por texto o voz (mediante grabación de audio y OpenAI Whisper en `/api/transcribe.js`).

## RAG y Mentores (Fase 2)
El esquema de Supabase (`supabase/schema.sql`) incluye la preparación comentada para usar `pgvector` y almacenar conocimiento de mentores. En el futuro, `/api/alfred.js` podrá buscar en esta base de conocimientos vectorial para responder dudas con la voz y el conocimiento de figuras clave.

## Estructura del Proyecto

```text
/
├── index.html           # Inicio (Bento grid "Bienvenido, German")
├── login.html           # Pantalla de acceso y registro
├── alfred.html          # Interfaz de chat con el asistente
├── reflexion.html       # Diario de reflexiones con soporte de voz
├── main.html            # Módulo: Misiones / Tareas
├── gym.html             # Módulo: Entrenamiento
├── health.html          # Módulo: Salud y Suplementos
├── po-water.html        # Módulo: Hidratación
├── finance.html         # Módulo: Finanzas
├── caffeine.html        # Módulo: Cafeína
├── avatar-lab.html      # Módulo: Fotos de progreso
│
├── sync.js              # Lógica de sincronización con Supabase (Auth + DB)
├── topbar.js            # Barra de navegación principal (inyectada en todas las páginas)
│
├── assets/
│   ├── alfred.css       # Design System de la Batcomputadora
│   └── bat-emblem.svg   # Emblema SVG
│
├── supabase/
│   └── schema.sql       # Script idempotente (Tablas, RLS, Storage y migración)
│
└── api/                 # Funciones Serverless de Vercel
    ├── config.js        # Expone SUPABASE_URL al frontend de forma segura
    ├── alfred.js        # Proxy a la API de Anthropic (Claude)
    ├── transcribe.js    # Transcripción de audio (OpenAI Whisper)
    └── whoop-*.js       # Endpoints para la integración con WHOOP
```

## Despliegue

Este proyecto está configurado para desplegarse instantáneamente en **Vercel**. Simplemente conecta tu repositorio. No hay comando de build; Vercel servirá los archivos HTML directamente y ejecutará la carpeta `/api` como funciones serverless Node.js.

Para ver las instrucciones completas de instalación, configuración de variables de entorno y base de datos, consulta el archivo [SETUP.md](./SETUP.md).
