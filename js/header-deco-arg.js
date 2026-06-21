/**
 * La Tarima — Guirnalda Argentina (HTML/CSS version)
 * Banderines triangulares celeste & blanco colgados sobre el header.
 * Sin canvas: todo con divs, clip-path y animaciones CSS.
 */

(function () {
    'use strict';

    // ── Estilos ────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `

    /* ── Contenedor de la guirnalda ── */
    #lt-garland {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    }

    /* ── Cuerda ── */
    #lt-garland-cord {
        position: absolute;
        top: 0;
        left: -1%;
        width: 102%;
        height: 0;
        /* Simulamos la cuerda con box-shadow */
        border-top: 1.5px solid rgba(100, 75, 40, 0.30);
    }

    /* ── Fila de banderines ── */
    .lt-bunting-row {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-around;
        align-items: flex-start;
        padding: 0 4px;
        box-sizing: border-box;
    }

    /* ── Cada banderín (triángulo) ── */
    .lt-pennant {
        width: 22px;
        height: 30px;
        clip-path: polygon(0 0, 100% 0, 50% 100%);
        flex-shrink: 0;
        transform-origin: top center;
        animation: lt-pennant-sway 3s ease-in-out infinite;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.13));
    }

    /* Banderin celeste */
    .lt-pennant.celeste {
        background: linear-gradient(180deg, #5aa8d8 0%, #75B3DC 40%, #a8d4f0 100%);
    }

    /* Banderin blanco */
    .lt-pennant.blanco {
        background: linear-gradient(180deg, #e8f4fc 0%, #ffffff 50%, #ddeef8 100%);
    }

    /* Animación suave de balanceo — cada banderín con delay distinto */
    @keyframes lt-pennant-sway {
        0%   { transform: rotate(-4deg); }
        50%  { transform: rotate( 4deg); }
        100% { transform: rotate(-4deg); }
    }

    /* Offsets de animación por posición */
    .lt-pennant:nth-child(2n)   { animation-delay: -0.5s; animation-duration: 2.8s; }
    .lt-pennant:nth-child(3n)   { animation-delay: -1.2s; animation-duration: 3.3s; }
    .lt-pennant:nth-child(4n)   { animation-delay: -0.8s; animation-duration: 2.6s; }
    .lt-pennant:nth-child(5n)   { animation-delay: -1.8s; animation-duration: 3.1s; }
    .lt-pennant:nth-child(6n)   { animation-delay: -0.3s; animation-duration: 2.9s; }

    /* ── Sol de Mayo SVG centrado ── */
    #lt-sol-mayo {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 54px;
        height: 54px;
        animation: lt-sol-spin 20s linear infinite;
        filter: drop-shadow(0 2px 5px rgba(200,140,0,0.50));
        z-index: 3;
    }

    @keyframes lt-sol-spin {
        from { transform: translateX(-50%) rotate(0deg);   }
        to   { transform: translateX(-50%) rotate(360deg); }
    }

    /* ── Cintas laterales ── */
    .lt-ribbon-wrap {
        position: absolute;
        top: 0;
        height: 100%;
        display: flex;
        gap: 3px;
        align-items: flex-start;
    }

    .lt-ribbon-wrap.left  { left:  6px; }
    .lt-ribbon-wrap.right { right: 6px; }

    .lt-ribbon {
        width: 5px;
        height: 72%;
        border-radius: 0 0 3px 3px;
        opacity: 0.75;
        animation: lt-ribbon-wave 3.5s ease-in-out infinite;
        transform-origin: top center;
    }

    .lt-ribbon.c { background: linear-gradient(180deg, #5aa8d8, #a8d4f0); }
    .lt-ribbon.w { background: linear-gradient(180deg, #cce6f8, #ffffff); }

    @keyframes lt-ribbon-wave {
        0%   { transform: skewX(-5deg) scaleY(1.00); }
        50%  { transform: skewX( 8deg) scaleY(0.96); }
        100% { transform: skewX(-5deg) scaleY(1.00); }
    }

    .lt-ribbon-wrap.right .lt-ribbon {
        animation-direction: reverse;
    }

    .lt-ribbon:nth-child(2) { animation-delay: -1s; }
    .lt-ribbon:nth-child(3) { animation-delay: -2s; }

    `;
    document.head.appendChild(style);

    // ── Sol de Mayo SVG (inline) ────────────────────────────────────
    // Basado en el diseño real de la bandera argentina
    const SOL_SVG = `
    <svg id="lt-sol-mayo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(50,50)">
        <!-- 32 rayos alternos -->
        ${Array.from({length:32}, (_,i) => {
            const angle = (i / 32) * 360;
            const isStraight = i % 2 === 0;
            return `<line
                x1="0" y1="${isStraight ? 20 : 21}"
                x2="0" y2="${isStraight ? 42 : 36}"
                stroke="#F6B40E" stroke-width="${isStraight ? 4 : 2.5}"
                stroke-linecap="${isStraight ? 'square' : 'round'}"
                transform="rotate(${angle})"
            />`;
        }).join('')}
        <!-- Cara principal -->
        <circle r="20" fill="#F6B40E" stroke="#D4910A" stroke-width="1.5"/>
        <!-- Ojos -->
        <ellipse cx="-6" cy="-4" rx="2.5" ry="3" fill="#8B5E04"/>
        <ellipse cx=" 6" cy="-4" rx="2.5" ry="3" fill="#8B5E04"/>
        <!-- Nariz -->
        <circle cx="0" cy="2" r="1.5" fill="#8B5E04"/>
        <!-- Boca -->
        <path d="M -7 7 Q 0 13 7 7" stroke="#8B5E04" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Cejas -->
        <path d="M -9 -8 Q -6 -11 -3 -8" stroke="#8B5E04" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M  3 -8 Q  6 -11  9 -8" stroke="#8B5E04" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </g>
    </svg>`;

    // ── Construir la guirnalda ──────────────────────────────────────
    function buildGarland(header) {
        // Limpiar anterior si existe
        const prev = document.getElementById('lt-garland');
        if (prev) prev.remove();

        const garland = document.createElement('div');
        garland.id    = 'lt-garland';

        // Cuerda
        const cord = document.createElement('div');
        cord.id = 'lt-garland-cord';
        garland.appendChild(cord);

        // Fila de banderines
        const row = document.createElement('div');
        row.className = 'lt-bunting-row';

        // ¿Cuántos banderines caben?
        const headerW  = header.offsetWidth || window.innerWidth;
        const pennantW = 22 + 6; // ancho + gap aprox
        const count    = Math.max(8, Math.floor(headerW / pennantW));

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = `lt-pennant ${i % 2 === 0 ? 'celeste' : 'blanco'}`;
            row.appendChild(p);
        }
        garland.appendChild(row);

        // Sol de Mayo
        garland.insertAdjacentHTML('beforeend', SOL_SVG);

        // Cintas laterales izquierda
        const leftRibbons = document.createElement('div');
        leftRibbons.className = 'lt-ribbon-wrap left';
        leftRibbons.innerHTML = `
            <div class="lt-ribbon c"></div>
            <div class="lt-ribbon w"></div>
            <div class="lt-ribbon c"></div>
        `;
        garland.appendChild(leftRibbons);

        // Cintas laterales derecha
        const rightRibbons = document.createElement('div');
        rightRibbons.className = 'lt-ribbon-wrap right';
        rightRibbons.innerHTML = `
            <div class="lt-ribbon c"></div>
            <div class="lt-ribbon w"></div>
            <div class="lt-ribbon c"></div>
        `;
        garland.appendChild(rightRibbons);

        // Insertar en el header
        header.prepend(garland);
    }

    // Actualizar la visibilidad de la guirnalda de forma reactiva según la temática activa
    window.updateGarlandVisibility = function() {
        const header = document.querySelector('.main-header-bar');
        if (!header) return;

        const activeTheme = window.activeTheme || 'classic';
        const garland = document.getElementById('lt-garland');

        if (activeTheme === 'mundial') {
            buildGarland(header);
        } else {
            if (garland) garland.remove();
        }
    };

    // ── Init ───────────────────────────────────────────────────────
    function init() {
        const header = document.querySelector('.main-header-bar');
        if (!header) return;

        header.style.position = 'relative';

        // Quitar canvas anterior si existía
        const oldCanvas = document.getElementById('lt-header-deco');
        if (oldCanvas) oldCanvas.remove();

        // Aplicar según el tema activo inicial
        window.updateGarlandVisibility();

        // Reconstruir si cambia el tamaño y estamos en la temática mundialista
        window.addEventListener('resize', () => {
            if (window.activeTheme === 'mundial') {
                buildGarland(header);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
