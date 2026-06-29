/**
 * La Tarima — Confetti Argentino
 * Confetis y cintas celeste & blanco flotando sutilmente en el fondo.
 * Canvas transparente, siempre por debajo del contenido.
 */

(function () {
    'use strict';

    // ── Paleta Patria ──────────────────────────────────────────────
    const COLORS = [
        'rgba(117, 179, 220, 0.75)',  // celeste bandera
        'rgba(117, 179, 220, 0.50)',  // celeste suave
        'rgba(80,  155, 210, 0.65)',  // celeste medio
        'rgba(255, 255, 255, 0.80)',  // blanco
        'rgba(255, 255, 255, 0.55)',  // blanco suave
        'rgba(200, 230, 250, 0.70)',  // celeste muy claro
    ];

    const PIECE_COUNT = 38; // cantidad de piezas simultáneas

    // ── Canvas setup ───────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'lt-confetti-canvas';
    canvas.style.cssText = [
        'position:fixed',
        'top:0', 'left:0',
        'width:100%', 'height:100%',
        'pointer-events:none',
        'z-index:99999',             // por encima de todo el contenido
        'overflow:hidden',
    ].join(';');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    // ── Resize ─────────────────────────────────────────────────────
    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Tipos de pieza ─────────────────────────────────────────────
    // 'rect'  → confeti cuadrado/rectangular
    // 'ribbon'→ cinta larga y delgada
    // 'circle'→ círculo pequeño (estrella del sol de mayo simplificada)
    const TYPES = ['rect', 'rect', 'ribbon', 'ribbon', 'circle'];

    // ── Clase Pieza ────────────────────────────────────────────────
    class Piece {
        constructor(initialY = null) {
            this.reset(initialY);
        }

        reset(initialY = null) {
            const W = canvas.width;
            const H = canvas.height;

            this.type  = TYPES[Math.floor(Math.random() * TYPES.length)];
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];

            // Posición inicial: aleatoria en X, arriba del viewport
            this.x = Math.random() * W;
            this.y = initialY !== null ? initialY : -20 - Math.random() * H;

            // Tamaño según tipo
            if (this.type === 'ribbon') {
                this.w = 3 + Math.random() * 3;
                this.h = 14 + Math.random() * 14;
            } else if (this.type === 'circle') {
                this.r = 3 + Math.random() * 4;
                this.w = this.r * 2;
                this.h = this.r * 2;
            } else {
                this.w = 6 + Math.random() * 6;
                this.h = 6 + Math.random() * 6;
            }

            // Velocidades muy suaves (flotando, no cayendo)
            this.vx   = (Math.random() - 0.5) * 0.5;   // deriva lateral mínima
            this.vy   =  0.35 + Math.random() * 0.55;   // caída muy lenta
            this.rot  = Math.random() * Math.PI * 2;
            this.vrot = (Math.random() - 0.5) * 0.025;  // rotación suave

            // Oscilación sinusoidal horizontal (efecto "vuelo")
            this.swingAmp   = 0.6 + Math.random() * 1.2;
            this.swingSpeed = 0.01 + Math.random() * 0.015;
            this.swingOffset= Math.random() * Math.PI * 2;

            this.opacity = 0.5 + Math.random() * 0.5;
            this.tick    = 0;
        }

        update() {
            this.tick++;
            // Movimiento sinusoidal en X
            this.x += this.vx + Math.sin(this.tick * this.swingSpeed + this.swingOffset) * this.swingAmp * 0.08;
            this.y += this.vy;
            this.rot += this.vrot;

            // Reciclar cuando sale por abajo
            if (this.y > canvas.height + 30) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle   = this.color;

            if (this.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.r, 0, Math.PI * 2);
                ctx.fill();

            } else if (this.type === 'ribbon') {
                // Cinta con curvatura (efecto ondulado)
                ctx.beginPath();
                ctx.moveTo(-this.w / 2, -this.h / 2);
                ctx.quadraticCurveTo(
                    this.w * 0.8, 0,
                    -this.w / 2, this.h / 2
                );
                ctx.quadraticCurveTo(
                    -this.w * 1.5, 0,
                    -this.w / 2, -this.h / 2
                );
                ctx.fill();

            } else {
                // Rectángulo con esquinas ligeramente redondeadas
                const rx = 1.5;
                const x  = -this.w / 2;
                const y  = -this.h / 2;
                ctx.beginPath();
                ctx.moveTo(x + rx, y);
                ctx.lineTo(x + this.w - rx, y);
                ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + rx);
                ctx.lineTo(x + this.w, y + this.h - rx);
                ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - rx, y + this.h);
                ctx.lineTo(x + rx, y + this.h);
                ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - rx);
                ctx.lineTo(x, y + rx);
                ctx.quadraticCurveTo(x, y, x + rx, y);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ── Inicializar piezas distribuidas en toda la pantalla ────────
    const pieces = Array.from({ length: PIECE_COUNT }, () => {
        const p = new Piece();
        // Distribución inicial en toda la altura para que no arranquen
        // todas desde arriba al mismo tiempo
        p.y = Math.random() * canvas.height;
        return p;
    });

    // ── Loop de animación ──────────────────────────────────────────
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(loop);
    }

    // ── Arrancar cuando el DOM esté listo ─────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loop);
    } else {
        loop();
    }

})();
