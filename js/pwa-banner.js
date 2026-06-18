/**
 * La Tarima — PWA Install Banner
 * Muestra un cartelito invitando a instalar la app.
 * Se cierra con la X (izquierda) o al instalar.
 * Si se descarta, vuelve a aparecer luego de 24 horas.
 */

(function () {
    'use strict';

    const STORAGE_KEY  = 'lt_pwa_dismissed_at';
    const COOLDOWN_MS  = 24 * 60 * 60 * 1000; // 24 horas

    let deferredPrompt = null;

    // ─── Inyectar estilos ───────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #lt-pwa-banner {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(120px);
            z-index: 99999;
            width: min(92vw, 420px);
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            border: 1px solid rgba(180, 140, 90, 0.22);
            border-radius: 20px;
            box-shadow:
                0 8px 32px rgba(0, 0, 0, 0.12),
                0 2px 8px rgba(0, 0, 0, 0.06);
            /* padding izquierdo extra para dejarle lugar a la X */
            padding: 18px 18px 18px 42px;
            display: flex;
            align-items: center;
            gap: 14px;
            transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
                        opacity  0.45s ease;
            opacity: 0;
            font-family: 'Outfit', sans-serif;
        }

        #lt-pwa-banner.lt-pwa-visible {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }

        #lt-pwa-banner.lt-pwa-hiding {
            transform: translateX(-50%) translateY(140px);
            opacity: 0;
        }

        #lt-pwa-icon {
            flex-shrink: 0;
            width: 52px;
            height: 52px;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,0.12);
            background: #f5ede0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #lt-pwa-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #lt-pwa-text {
            flex: 1;
            min-width: 0;
        }

        #lt-pwa-text strong {
            display: block;
            font-size: 0.95rem;
            font-weight: 700;
            color: #2d2117;
            line-height: 1.3;
            margin-bottom: 3px;
        }

        #lt-pwa-text span {
            display: block;
            font-size: 0.78rem;
            color: #7a6550;
            line-height: 1.4;
        }

        #lt-pwa-install-btn {
            flex-shrink: 0;
            margin-top: 10px;
            padding: 7px 16px;
            border-radius: 50px;
            border: none;
            background: linear-gradient(135deg, #c9973a 0%, #a0722a 100%);
            color: #fff;
            font-family: 'Outfit', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            letter-spacing: 0.3px;
            box-shadow: 0 3px 10px rgba(160, 114, 42, 0.35);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            white-space: nowrap;
        }

        #lt-pwa-install-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 16px rgba(160, 114, 42, 0.45);
        }

        #lt-pwa-install-btn:active {
            transform: scale(0.97);
        }

        /* Botón en columna debajo del texto en pantallas pequeñas */
        #lt-pwa-content {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0;
            flex: 1;
            min-width: 0;
        }

        /* X a la IZQUIERDA, pequeña y discreta */
        #lt-pwa-close {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: none;
            background: rgba(0,0,0,0.05);
            color: #bba888;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, color 0.2s ease;
            padding: 0;
        }

        #lt-pwa-close:hover {
            background: rgba(0,0,0,0.11);
            color: #7a6550;
        }

        @media (prefers-color-scheme: dark) {
            #lt-pwa-banner {
                background: rgba(30, 22, 14, 0.92);
                border-color: rgba(180, 140, 90, 0.25);
                box-shadow:
                    0 8px 32px rgba(0, 0, 0, 0.45),
                    0 2px 8px rgba(0, 0, 0, 0.25);
            }
            #lt-pwa-text strong { color: #f0e4d0; }
            #lt-pwa-text span   { color: #b09878; }
            #lt-pwa-close       { background: rgba(255,255,255,0.07); color: #806850; }
            #lt-pwa-close:hover { background: rgba(255,255,255,0.14); color: #c0aa90; }
        }
    `;
    document.head.appendChild(style);

    // SVG de X universal (sin emoji)
    const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    // ─── Crear HTML del banner ──────────────────────────────────────────────────
    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'lt-pwa-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Instalar La Tarima como app');
        banner.innerHTML = `
            <button id="lt-pwa-close" aria-label="Cerrar">${ICON_CLOSE}</button>
            <div id="lt-pwa-icon">
                <img src="img/icon-192.png" alt="La Tarima" loading="lazy">
            </div>
            <div id="lt-pwa-content">
                <div id="lt-pwa-text">
                    <strong>¡Instala La Tarima!</strong>
                    <span>Guardanos en tu celu o PC y siempre vas a tener a mano todos nuestros productos y novedades.</span>
                </div>
                <button id="lt-pwa-install-btn" aria-label="Instalar aplicación">Instalar gratis</button>
            </div>
        `;
        document.body.appendChild(banner);
        return banner;
    }

    // ─── Mostrar / Ocultar ──────────────────────────────────────────────────────
    function showBanner(banner) {
        // Forzar reflow antes de añadir la clase visible
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                banner.classList.add('lt-pwa-visible');
            });
        });
    }

    function hideBanner(banner, dismiss = true) {
        banner.classList.add('lt-pwa-hiding');
        banner.classList.remove('lt-pwa-visible');
        if (dismiss) {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
        setTimeout(() => banner.remove(), 500);
    }

    // ─── ¿Hay que mostrar el banner? ────────────────────────────────────────────
    function shouldShow() {
        // No mostrar si ya está instalado (standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) return false;
        if (window.navigator.standalone === true) return false;

        const dismissed = localStorage.getItem(STORAGE_KEY);
        if (!dismissed) return true;

        const elapsed = Date.now() - parseInt(dismissed, 10);
        return elapsed >= COOLDOWN_MS;
    }

    // ─── Inicializar ─────────────────────────────────────────────────────────────
    function init() {
        if (!shouldShow()) return;

        const banner     = createBanner();
        const installBtn = document.getElementById('lt-pwa-install-btn');
        const closeBtn   = document.getElementById('lt-pwa-close');

        // Mostrar con un pequeño delay para que la animación sea notada
        setTimeout(() => showBanner(banner), 1200);

        // Botón instalar
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Navegadores con soporte nativo (Chrome, Edge, Android, etc.)
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                hideBanner(banner, outcome !== 'accepted');
            } else {
                // iOS / Safari: mostrar instrucciones
                showIosHint(banner);
            }
        });

        // Botón cerrar (X)
        closeBtn.addEventListener('click', () => hideBanner(banner, true));
    }

    // ─── Capturar el evento beforeinstallprompt ──────────────────────────────────
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // ─── Si ya se instaló, ocultar el banner ────────────────────────────────────
    window.addEventListener('appinstalled', () => {
        const banner = document.getElementById('lt-pwa-banner');
        if (banner) hideBanner(banner, false);
        localStorage.removeItem(STORAGE_KEY);
    });

    // ─── Sugerencia para iOS (no soporta beforeinstallprompt) ───────────────────
    function showIosHint(banner) {
        const content = document.getElementById('lt-pwa-content');
        if (!content) return;

        const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const msg   = isIos
            ? 'En Safari: toca <strong>Compartir</strong> y luego <strong>"Agregar a inicio"</strong>.'
            : 'Usa Chrome o Edge y busca el icono de instalacion en la barra de direcciones.';

        content.innerHTML = `
            <div id="lt-pwa-text" style="font-size:0.82rem; color: #5a4530; line-height:1.5;">
                ${msg}
            </div>
        `;
        setTimeout(() => hideBanner(banner, true), 6000);
    }

    // ─── Arrancar cuando el DOM esté listo ──────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
