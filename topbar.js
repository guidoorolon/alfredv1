// =============================================================
// topbar.js — Barra de navegación Alfred Dashboard
//
// Inyecta automáticamente la topbar y bottombar en cualquier
// página que incluya:
//   <script src="topbar.js" defer></script>
//
// Requiere alfred.css cargado antes en el <head>.
// Funcionalidad:
//   - Logo Alfred + emblema murciélago
//   - Indicador de agua con botón +1 (funciona desde cualquier página)
//   - Botón de logout
//   - Navegación inferior con íconos y tab activo resaltado
//   - Menú hamburguesa en móvil para páginas con muchos tabs
//   - Intercepta modales para bloquear scroll del body
// =============================================================

(function () {
  'use strict';

  const TOPBAR_SUPABASE_URL = (window.DASH_SUPABASE_URL) || '';
  const TOPBAR_SUPABASE_KEY = (window.DASH_SUPABASE_KEY) || '';

  // ---- Tabs de navegación (página, href, ícono, etiqueta) ----
  const TABS = [
    { page: 'main',       href: 'index.html',      icon: '⚡', label: 'Misiones'      },
    { page: 'gym',        href: 'gym.html',         icon: '🏋', label: 'Entrenamiento' },
    { page: 'health',     href: 'health.html',      icon: '💊', label: 'Salud'         },
    { page: 'water',      href: 'po-water.html',    icon: '💧', label: 'Hidratación'   },
    { page: 'finance',    href: 'finance.html',     icon: '📊', label: 'Finanzas'      },
    { page: 'alfred',     href: 'alfred.html',      icon: '🦇', label: 'Alfred'        },
    { page: 'reflexion',  href: 'reflexion.html',   icon: '🌙', label: 'Reflexión'     },
  ];

  // ---- CSS de la topbar (complementa alfred.css) ----
  const css = `
/* === Pill de agua en la topbar === */
.tb-water-wrap {
  display: flex; align-items: stretch;
}
.tb-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  background: rgba(0, 212, 255, 0.06);
  border: 1px solid rgba(0, 212, 255, 0.14);
  border-right: none;
  border-radius: 4px 0 0 4px;
  text-decoration: none;
  color: var(--clr-text-1, #e8eef8);
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}
.tb-water-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #00d4ff; flex-shrink: 0;
  box-shadow: 0 0 6px rgba(0,212,255,0.6);
}
.tb-water-pill.warn .tb-water-dot { background: #f5c518; box-shadow: 0 0 6px rgba(245,197,24,0.6); }
.tb-water-pill.miss .tb-water-dot {
  background: #ff4466;
  box-shadow: 0 0 6px rgba(255,68,102,0.6);
  animation: tbMissPulse 1.6s ease-in-out infinite;
}
@keyframes tbMissPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,68,102,0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(255,68,102,0); }
}
.tb-water-add {
  width: 40px;
  border: 1px solid rgba(0, 212, 255, 0.14);
  background: linear-gradient(180deg, rgba(0,212,255,0.18), rgba(0,180,220,0.12));
  color: var(--clr-text-1, #e8eef8);
  font-size: 18px; font-weight: 700; line-height: 1;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.1s;
}
.tb-water-add:active { transform: scale(0.92); }
.tb-water-add.flash {
  background: linear-gradient(180deg, rgba(0,212,255,0.55), rgba(0,180,220,0.35));
}

/* === Botón ícono (logout, menú) === */
.tb-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 36px;
  border: 1px solid rgba(0,212,255,0.12);
  background: rgba(0,212,255,0.04);
  border-radius: 4px;
  color: var(--clr-text-2, #8899b8);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s;
  font-size: 16px;
  line-height: 1;
}
.tb-icon-btn:hover {
  background: rgba(0,212,255,0.10);
  border-color: rgba(0,212,255,0.32);
  color: var(--clr-cyan, #00d4ff);
}

/* === Tabs extra ocultos en móvil (hamburguesa) === */
.alfred-tab.extra { display: none; }
@media (max-width: 480px) {
  .alfred-tab.extra { display: none; }
}

/* === Estado de conexión (punto parpadeante) === */
.tb-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #00e5a0;
  box-shadow: 0 0 6px rgba(0,229,160,0.7);
  animation: tbStatusPulse 3s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .tb-status-dot { animation: none; }
}
@keyframes tbStatusPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

/* Bloqueo de scroll cuando hay modal abierto */
body.tb-modal-open {
  overflow: hidden;
  touch-action: none;
}
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg { padding: 0 !important; align-items: stretch !important; }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg,.po-modal-bg,.wt-overlay,.wt-viewer { overscroll-behavior: contain; }
`;

  // ---- HTML del topbar ----
  const topbarHtml = `
<header class="alfred-topbar" id="alfredTopbar" role="navigation" aria-label="Barra superior Alfred">

  <!-- Logo -->
  <a href="index.html" class="alfred-topbar-logo" aria-label="Alfred — Inicio">
    <svg width="28" height="18" viewBox="0 0 120 80" fill="none" aria-hidden="true" style="color:var(--clr-cyan,#00d4ff);filter:drop-shadow(0 0 6px rgba(0,212,255,0.5))">
      <path d="M60 72 C54 72 50 68 48 62 C44 54 44 46 46 38 C48 30 52 24 56 20 L60 16 L64 20 C68 24 72 30 74 38 C76 46 76 54 72 62 C70 68 66 72 60 72 Z" fill="currentColor"/>
      <path d="M74 38 C80 34 88 28 98 22 C108 16 116 14 118 18 C120 22 114 28 108 34 C102 38 96 40 92 46 C88 52 88 58 84 60 C80 62 76 58 74 50 C72 44 72 40 74 38 Z" fill="currentColor" opacity="0.9"/>
      <path d="M46 38 C40 34 32 28 22 22 C12 16 4 14 2 18 C0 22 6 28 12 34 C18 38 24 40 28 46 C32 52 32 58 36 60 C40 62 44 58 46 50 C48 44 48 40 46 38 Z" fill="currentColor" opacity="0.9"/>
      <path d="M54 16 L48 6 L52 14 Z" fill="currentColor" opacity="0.95"/>
      <path d="M66 16 L72 6 L68 14 Z" fill="currentColor" opacity="0.95"/>
    </svg>
    <span class="alfred-topbar-name">Alfred</span>
  </a>

  <!-- Acciones -->
  <div class="alfred-topbar-actions">

    <!-- Agua +1 -->
    <div class="tb-water-wrap">
      <a href="po-water.html" class="tb-water-pill" id="tbWater" aria-label="Progreso de hidratación">
        <span class="tb-water-dot"></span>
        <span id="tbWaterCount">0/0</span>
      </a>
      <button class="tb-water-add" id="tbWaterAdd" type="button" aria-label="Registrar una bebida">+</button>
    </div>

    <!-- Punto de estado de sync -->
    <div class="tb-status-dot" title="Sistema activo" aria-hidden="true"></div>

    <!-- Logout -->
    <button class="tb-icon-btn" id="tbLogout" type="button" aria-label="Cerrar sesión" title="Cerrar sesión">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  </div>
</header>
`;

  // ---- HTML del bottombar ----
  function buildBottombarHtml(activePage) {
    const tabs = TABS.map((t, i) => {
      const isActive = t.page === activePage;
      // En móvil mostramos los primeros 5; los demás se ocultan si no caben
      const extraClass = i >= 5 ? ' extra' : '';
      return `
      <a href="${t.href}" class="alfred-tab${isActive ? ' active' : ''}${extraClass}" data-page="${t.page}" aria-label="${t.label}${isActive ? ' (actual)' : ''}">
        <span class="alfred-tab-icon">${t.icon}</span>
        <span>${t.label}</span>
        <span class="alfred-tab-dot" aria-hidden="true"></span>
      </a>`;
    }).join('');

    return `
<nav class="alfred-bottombar" id="alfredBottombar" role="navigation" aria-label="Navegación principal">
  ${tabs}
</nav>
`;
  }

  // ---- Detectar página activa ----
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('gym.html'))        return 'gym';
    if (p.endsWith('health.html'))     return 'health';
    if (p.endsWith('po-water.html'))   return 'water';
    if (p.endsWith('finance.html'))    return 'finance';
    if (p.endsWith('alfred.html'))     return 'alfred';
    if (p.endsWith('reflexion.html'))  return 'reflexion';
    if (p.endsWith('caffeine.html'))   return 'caffeine';
    if (p.endsWith('avatar-lab.html')) return 'avatar';
    return 'main'; // index.html o /
  }

  // ---- Páginas con chrome propio (no inyectar) ----
  function esFinance() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function estaEmbebida() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function mostrarChrome() {
    return !esFinance() && !estaEmbebida();
  }

  // ---- Fecha activa (rollover 6am) ----
  function fechaActiva() {
    const now = new Date();
    const d   = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function fechaHoy() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ---- Leer progreso de agua del localStorage ----
  function progresoAgua() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { hecho: 0, total: 0 };

    const hoy   = fechaHoy();
    const hecho = (state.logs || {})[hoy] || 0;
    const p     = state.profile || { weightKg: 75 };
    const wKg   = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base  = wKg * 35;
    const ejercicio = (p.activityHrsPerWeek || 0) / 7 * 500;
    const cafeina   = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs      = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let ajuste = 0;
    if (p.sex === 'm') ajuste += 200;
    if ((p.age || 0) >= 50) ajuste += 100;
    const totalMl  = base + ejercicio + cafeina + subs + ajuste;
    let unitVol;
    if (state.unit === 'glass')       unitVol = state.glassMl || 250;
    else if (state.unit === 'oz')     unitVol = 30;
    else if (state.unit === 'ml')     unitVol = 1;
    else                              unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { hecho, total };
  }

  function clasificarAgua(hecho, total) {
    if (total === 0) return 'idle';
    if (hecho >= total) return 'good';
    if (hecho >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && hecho < total * 0.5) return 'miss';
    return 'warn';
  }

  function renderAgua() {
    const pillEl = document.getElementById('tbWater');
    if (!pillEl) return;
    const { hecho, total } = progresoAgua();
    const countEl = document.getElementById('tbWaterCount');
    if (countEl) countEl.textContent = total ? hecho + '/' + total : '0/0';

    pillEl.classList.remove('good', 'warn', 'miss');
    const estado = clasificarAgua(hecho, total);
    if (estado === 'warn' || estado === 'miss') pillEl.classList.add(estado);
  }

  // ---- Agua +1 (desde cualquier página) ----
  function estadoAguaDefecto() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  async function pushAguaSupabase(localWater) {
    // Solo sincronizar si NO estamos en la página de salud (ella ya lo hace)
    if (window.location.pathname.endsWith('health.html')) return;
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;

    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data: { session } } = await supa.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const { data } = await supa.from('app_state')
        .select('data')
        .eq('user_id', userId)
        .eq('key', 'health')
        .maybeSingle();

      const actual  = (data && data.data) || {};
      const merged  = Object.assign({}, actual, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { user_id: userId, key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );
    } catch (e) { /* Sin conexión — se sincronizará en la próxima visita */ }
  }

  function agregarAgua() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = estadoAguaDefecto();
    state.logs = state.logs || {};
    const k = fechaHoy();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    renderAgua();

    const btn = document.getElementById('tbWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }
    pushAguaSupabase(state);
  }

  // ---- Prevenir zoom en iOS ----
  function bloquearGestos() {
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });
    let ultimoToque = 0;
    document.addEventListener('touchend', (e) => {
      const ahora = Date.now();
      if (ahora - ultimoToque <= 300) e.preventDefault();
      ultimoToque = ahora;
    }, { passive: false });
  }

  // ---- Bloquear scroll cuando hay modal abierto ----
  function iniciarBloqueoModal() {
    const SELECTORES = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'];
    function hayAbierto() {
      for (const sel of SELECTORES) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('tb-modal-open', hayAbierto());
    }
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync();
  }

  // ---- Inyectar HTML y CSS ----
  function inyectarChrome() {
    if (document.getElementById('alfredTopbar') || document.getElementById('alfredBottombar')) return;
    if (!mostrarChrome()) return;

    const style = document.createElement('style');
    style.id = 'alfred-topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    // Topbar
    const topWrap = document.createElement('div');
    topWrap.innerHTML = topbarHtml.trim();
    document.body.insertBefore(topWrap.firstChild, document.body.firstChild);

    // Bottombar
    const activePage = currentPageKey();
    const botWrap = document.createElement('div');
    botWrap.innerHTML = buildBottombarHtml(activePage).trim();
    document.body.appendChild(botWrap.firstChild);

    document.body.classList.add('has-alfred-bottombar');
  }

  // ---- Boot ----
  function boot() {
    inyectarChrome();

    const btnAdd = document.getElementById('tbWaterAdd');
    if (btnAdd) btnAdd.addEventListener('click', (e) => { e.preventDefault(); agregarAgua(); });

    const btnLogout = document.getElementById('tbLogout');
    if (btnLogout) btnLogout.addEventListener('click', () => {
      if (typeof window.alfredLogout === 'function') {
        window.alfredLogout();
      } else {
        window.location.replace('/login.html');
      }
    });

    renderAgua();
    bloquearGestos();
    iniciarBloqueoModal();

    window.addEventListener('storage', renderAgua);
    window.addEventListener('focus', renderAgua);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAgua(); });
    setInterval(renderAgua, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

})();
