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

    /* Banderin oro */
    .lt-pennant.oro {
        background: linear-gradient(180deg, #FFE57F 0%, #FFD700 50%, #FFA000 100%);
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

    /* Copa de Campeones flotante y brillante */
    #lt-sol-mayo.lt-championship-cup {
        animation: lt-cup-float 3.5s ease-in-out infinite, lt-cup-glow 2s ease-in-out infinite alternate !important;
        transform: translateX(-50%) !important;
    }

    @keyframes lt-cup-float {
        0%, 100% { top: 6px; }
        50%      { top: 12px; }
    }
    @keyframes lt-cup-glow {
        from { filter: drop-shadow(0 2px 5px rgba(255, 215, 0, 0.4)); }
        to   { filter: drop-shadow(0 4px 15px rgba(255, 215, 0, 0.8)); }
    }

    @keyframes lt-gold-pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7);
        }
        70% {
            box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(212, 175, 55, 0);
        }
    }

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

    // Copa del Mundo SVG (para la skin final del mundial)
    const CHAMPION_CUP_SVG = `
    <svg id="lt-sol-mayo" class="lt-championship-cup" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(50,50) scale(0.95)">
        <!-- Base de la Copa -->
        <path d="M -16 35 L 16 35 L 13 28 L -13 28 Z" fill="#6D4C41" stroke="#4E342E" stroke-width="1.5" />
        <path d="M -20 42 L 20 42 L 17 35 L -17 35 Z" fill="#D4AF37" stroke="#AA820A" stroke-width="1.5" />
        <!-- Franja verde representativa del trofeo real -->
        <rect x="-15.5" y="36.5" width="31" height="2.2" fill="#2E7D32" />
        <rect x="-17" y="39" width="34" height="2.2" fill="#2E7D32" />
        <!-- Cuerpo principal del trofeo -->
        <path d="M -6 28 C -6 16, -14 10, -11 0 C -8 -10, -6 -20, 0 -22 C 6 -20, 8 -10, 11 0 C 14 10, 6 16, 6 28 Z" fill="#FFD700" stroke="#D4AF37" stroke-width="1.5" />
        <!-- Siluetas que sostienen el mundo -->
        <path d="M -8 11 C -12 6, -12 -5, -7 -10 C -5 -5, -4 6, -8 11 Z" fill="#D4AF37" />
        <path d="M 8 11 C 12 6, 12 -5, 7 -10 C 5 -5, 4 6, 8 11 Z" fill="#D4AF37" />
        <!-- El Mundo -->
        <circle cx="0" cy="-22" r="14" fill="#80DEEA" stroke="#00ACC1" stroke-width="1.5" />
        <path d="M -10 -22 C -6 -18, 6 -18, 10 -22 M -12 -25 C -5 -32, 5 -32, 12 -25" fill="none" stroke="#D4AF37" stroke-width="1.5" />
        <!-- Tres estrellas doradas flotantes arriba -->
        <path d="M -22 -35 L -20 -31 L -16 -31 L -19 -29 L -18 -25 L -22 -27 L -26 -25 L -25 -29 L -28 -31 L -24 -31 Z" fill="#FFD700" transform="scale(0.4) translate(-10, -10)" />
        <path d="M 0 -45 L 2 -41 L 6 -41 L 3 -39 L 4 -35 L 0 -37 L -4 -35 L -3 -39 L -6 -41 L -2 -41 Z" fill="#FFD700" transform="scale(0.5) translate(0, -15)" />
        <path d="M 22 -35 L 24 -31 L 28 -31 L 25 -29 L 26 -25 L 22 -27 L 18 -25 L 19 -29 L 16 -31 L 20 -31 Z" fill="#FFD700" transform="scale(0.4) translate(10, -10)" />
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

        const activeTheme = window.activeTheme || 'classic';

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            if (activeTheme === 'final-mundial') {
                const colors = ['celeste', 'blanco', 'oro'];
                p.className = `lt-pennant ${colors[i % 3]}`;
            } else {
                p.className = `lt-pennant ${i % 2 === 0 ? 'celeste' : 'blanco'}`;
            }
            row.appendChild(p);
        }
        garland.appendChild(row);

        // Sol de Mayo o Copa del Mundo
        if (activeTheme === 'final-mundial') {
            garland.insertAdjacentHTML('beforeend', CHAMPION_CUP_SVG);
        } else {
            garland.insertAdjacentHTML('beforeend', SOL_SVG);
        }

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

    let audioInstance = null;

    function buildSpeakerButton() {
        const existing = document.getElementById('lt-speaker-btn');
        if (existing) return;

        // Crear el botón flotante
        const btn = document.createElement('div');
        btn.id = 'lt-speaker-btn';
        
        const activeTheme = window.activeTheme || 'classic';
        if (activeTheme === 'final-mundial') {
            btn.style.cssText = `
                position: fixed;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FFD700, #D4AF37);
                color: #1A1A1A;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(212, 175, 55, 0.6);
                cursor: pointer;
                z-index: 9999;
                border: 2px solid #FFFFFF;
                transition: transform 0.2s ease, background 0.2s ease;
                animation: lt-gold-pulse 1.8s infinite;
            `;
        } else {
            btn.style.cssText = `
                position: fixed;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #4A90E2;
                color: #FFFFFF;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(74, 144, 226, 0.4);
                cursor: pointer;
                z-index: 9999;
                border: 2px solid #FFFFFF;
                transition: transform 0.2s ease, background 0.2s ease;
            `;
        }
        
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 24px;">volume_off</span>`;

        // Efecto hover y active
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.08)';
            if (window.activeTheme === 'final-mundial') {
                btn.style.background = 'linear-gradient(135deg, #FFE4B5, #E5A93B)';
            } else {
                btn.style.background = '#357ABD';
            }
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            if (window.activeTheme === 'final-mundial') {
                btn.style.background = 'linear-gradient(135deg, #FFD700, #D4AF37)';
            } else {
                btn.style.background = '#4A90E2';
            }
        });
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1.08)';
        });

        // Crear audio si no existe
        if (!audioInstance) {
            audioInstance = document.createElement('audio');
            audioInstance.id = 'lt-mundial-audio';
            audioInstance.loop = true;
            audioInstance.src = 'audio/muchachos.mp3';
        }

        // Toggle play/pause al hacer click
        btn.addEventListener('click', () => {
            if (audioInstance.paused) {
                audioInstance.play().then(() => {
                    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 24px;">volume_up</span>`;
                    if (window.activeTheme === 'final-mundial') {
                        btn.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.9)';
                    } else {
                        btn.style.boxShadow = '0 0 15px rgba(74, 144, 226, 0.7)';
                    }
                }).catch(err => {
                    console.error("No se pudo reproducir muchachos.mp3: ", err);
                    alert("Por favor, colocá un archivo 'muchachos.mp3' en la carpeta 'audio/' de la raíz del proyecto para escuchar el himno/tema.");
                });
            } else {
                audioInstance.pause();
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 24px;">volume_off</span>`;
                if (window.activeTheme === 'final-mundial') {
                    btn.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.6)';
                } else {
                    btn.style.boxShadow = '0 4px 14px rgba(74, 144, 226, 0.4)';
                }
            }
        });

        document.body.appendChild(btn);
    }

    function removeSpeakerButton() {
        const btn = document.getElementById('lt-speaker-btn');
        if (btn) btn.remove();
        if (audioInstance) {
            audioInstance.pause();
            audioInstance = null;
        }
    }

    // Actualizar la visibilidad de la guirnalda de forma reactiva según la temática activa
    window.updateGarlandVisibility = function() {
        const header = document.querySelector('.main-header-bar');
        if (!header) return;

        const activeTheme = window.activeTheme || 'classic';
        const garland = document.getElementById('lt-garland');

        if (activeTheme === 'mundial' || activeTheme === 'final-mundial') {
            buildGarland(header);
            buildSpeakerButton();
            
            // Si ya existe el botón, actualizar sus estilos para la nueva temática
            const btn = document.getElementById('lt-speaker-btn');
            if (btn) {
                const playing = audioInstance && !audioInstance.paused;
                if (activeTheme === 'final-mundial') {
                    btn.style.background = 'linear-gradient(135deg, #FFD700, #D4AF37)';
                    btn.style.color = '#1A1A1A';
                    btn.style.boxShadow = playing ? '0 0 20px rgba(255, 215, 0, 0.9)' : '0 4px 15px rgba(212, 175, 55, 0.6)';
                    btn.style.animation = 'lt-gold-pulse 1.8s infinite';
                } else {
                    btn.style.background = '#4A90E2';
                    btn.style.color = '#FFFFFF';
                    btn.style.boxShadow = playing ? '0 0 15px rgba(74, 144, 226, 0.7)' : '0 4px 14px rgba(74, 144, 226, 0.4)';
                    btn.style.animation = 'none';
                }
            }
        } else {
            if (garland) garland.remove();
            removeSpeakerButton();
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

        // Reconstruir si cambia el tamaño y estamos en la temática mundialista o final
        window.addEventListener('resize', () => {
            if (window.activeTheme === 'mundial' || window.activeTheme === 'final-mundial') {
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
