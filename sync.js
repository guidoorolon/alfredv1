// =============================================================
// sync.js — Helper de sincronización cloud para Alfred Dashboard
//
// Cada página llama a initCloudSync({...}) una vez con su config:
//   appKey         — clave de esta página en app_state (ej. 'gym')
//   syncedKeys     — claves exactas de localStorage a sincronizar
//   syncedPrefixes — prefijos de claves a sincronizar (ej. 'goals:')
//   onApplied      — callback opcional tras aplicar estado remoto
//
// Requiere en el HTML (en este orden):
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="/api/config"></script>   (inyecta window.DASH_SUPABASE_URL/KEY)
//   <script src="sync.js" defer></script>
//
// Seguridad:
//   - Usa autenticación Supabase (JWT de sesión) en lugar de anon key.
//   - La tabla app_state tiene RLS: cada usuario solo accede a sus filas.
//   - La clave primaria es (user_id, key) — los datos son por usuario.
// =============================================================

(function () {
  'use strict';

  // Configuración de Supabase (preferir env vars via /api/config)
  const SUPABASE_URL = (typeof window !== 'undefined' && window.DASH_SUPABASE_URL) || '';
  const SUPABASE_KEY = (typeof window !== 'undefined' && window.DASH_SUPABASE_KEY) || '';

  // ---- Guardia: redirigir a login si no hay sesión ----
  // Se expone como window.requireAuth para que las páginas lo llamen.
  window.requireAuth = async function (redirUrl) {
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) return null;
    try {
      const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: { session } } = await supa.auth.getSession();
      if (!session) {
        const actual = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace('/login.html?redir=' + actual);
        return null;
      }
      return session;
    } catch (e) {
      console.warn('[Alfred sync] Error verificando sesión:', e);
      return null;
    }
  };

  // ---- Función principal ----
  window.initCloudSync = async function (config) {
    const appKey        = config && config.appKey;
    const syncedKeys    = (config && config.syncedKeys)    || [];
    const syncedPrefixes= (config && config.syncedPrefixes)|| [];
    const onApplied     = config && config.onApplied;

    if (!appKey) return;
    if (!window.supabase) return;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    if (SUPABASE_URL.startsWith('PASTE-') || SUPABASE_KEY.startsWith('PASTE-')) return;

    // Obtener sesión del usuario
    let supa = null;
    let userId = null;

    try {
      supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: { session } } = await supa.auth.getSession();
      if (!session) {
        // Sin sesión — no sincronizar (la página debería haber llamado requireAuth)
        console.warn('[Alfred sync] Sin sesión activa. Sync desactivado para:', appKey);
        return;
      }
      userId = session.user.id;
    } catch (e) {
      console.warn('[Alfred sync] No se pudo obtener sesión:', e);
      return;
    }

    let pushTimer     = null;
    let suppressSync  = false;
    let lastSyncedJson= null;

    // ---- Helpers de filtrado de claves ----
    function matches(k) {
      if (!k) return false;
      if (syncedKeys.indexOf(k) !== -1) return true;
      for (let i = 0; i < syncedPrefixes.length; i++) {
        if (k.indexOf(syncedPrefixes[i]) === 0) return true;
      }
      return false;
    }
    function listAllKeys() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (matches(k)) out.push(k);
      }
      return out;
    }
    function collect() {
      const out = {};
      for (const k of listAllKeys()) {
        const v = localStorage.getItem(k);
        if (v == null) continue;
        try { out[k] = JSON.parse(v); } catch (e) { out[k] = v; }
      }
      return out;
    }

    // ---- Interceptar localStorage para detectar cambios ----
    const origSet    = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (k, v) {
      origSet(k, v);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };
    localStorage.removeItem = function (k) {
      origRemove(k);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };

    // ---- Aplicar estado remoto al localStorage ----
    function applyRemote(remote) {
      if (!remote || typeof remote !== 'object') return false;
      suppressSync = true;
      let changed = false;
      try {
        for (const k of Object.keys(remote)) {
          if (!matches(k)) continue;
          const incoming = JSON.stringify(remote[k]);
          const local    = localStorage.getItem(k);
          if (local !== incoming) {
            try { origSet(k, incoming); changed = true; } catch (e) {}
          }
        }
        for (const k of listAllKeys()) {
          if (!(k in remote)) {
            try { origRemove(k); changed = true; } catch (e) {}
          }
        }
      } finally {
        suppressSync = false;
      }
      if (changed && typeof onApplied === 'function') {
        try { onApplied(); } catch (e) {}
      }
      return changed;
    }

    // ---- Push a Supabase (usando user_id en la PK compuesta) ----
    async function pushNow() {
      if (!supa || !userId) return;
      const state = collect();
      const json  = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        const { error } = await supa.from('app_state').upsert(
          {
            user_id:    userId,
            key:        appKey,
            data:       state,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,key' }
        );
        if (!error) lastSyncedJson = json;
      } catch (e) {}
    }
    function schedulePush() {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(pushNow, 250);
    }

    // ---- Flush síncrono al cerrar la página ----
    // Usa el token de sesión del usuario, no la anon key.
    function flushOnUnload() {
      const state = collect();
      const json  = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      if (!userId) return;
      try {
        // Obtenemos el token actual de forma síncrona desde el almacenamiento
        const sessionStr = localStorage.getItem('sb-' + new URL(SUPABASE_URL).hostname.split('.')[0] + '-auth-token');
        let accessToken = SUPABASE_KEY; // fallback: anon key (solo para escritura propia vía RLS)
        if (sessionStr) {
          try {
            const sess = JSON.parse(sessionStr);
            if (sess && sess.access_token) accessToken = sess.access_token;
          } catch (e) {}
        }

        fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=user_id%2Ckey', {
          method: 'POST',
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type':  'application/json',
            'Prefer':        'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id:    userId,
            key:        appKey,
            data:       state,
            updated_at: new Date().toISOString(),
          }),
          keepalive: true,
        }).catch(() => {});
        lastSyncedJson = json;
      } catch (e) {}
    }

    // ---- Inicialización: cargar estado remoto ----
    (async function init() {
      try {
        const { data, error } = await supa
          .from('app_state')
          .select('data')
          .eq('user_id', userId)
          .eq('key', appKey)
          .maybeSingle();

        if (!error && data && data.data && Object.keys(data.data).length > 0) {
          lastSyncedJson = JSON.stringify(data.data);
          applyRemote(data.data);
        } else if (Object.keys(collect()).length > 0) {
          schedulePush();
        }
      } catch (e) {}

      // Suscripción realtime — filtrar por user_id + key
      supa.channel('app_state_' + userId + '_' + appKey)
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'app_state',
          filter: 'user_id=eq.' + userId + '&key=eq.' + appKey,
        }, (payload) => {
          if (!payload.new || !payload.new.data) return;
          const incoming = JSON.stringify(payload.new.data);
          if (incoming === lastSyncedJson) return;
          lastSyncedJson = incoming;
          applyRemote(payload.new.data);
        })
        .subscribe();
    })();

    // ---- Event listeners ----
    window.addEventListener('beforeunload', flushOnUnload);
    window.addEventListener('pagehide',     flushOnUnload);
    window.addEventListener('storage', (e) => {
      if (e.key && matches(e.key)) schedulePush();
    });
  };

  // ---- Logout global ----
  window.alfredLogout = async function () {
    const supa = window.supabase
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null;
    if (supa) {
      await supa.auth.signOut().catch(() => {});
    }
    window.location.replace('/login.html');
  };

})();
