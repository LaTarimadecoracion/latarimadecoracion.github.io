/**
 * La Tarima — Confetti Argentino
 * Confetis y cintas celeste & blanco flotando sutilmente en el fondo.
 * Canvas transparente, siempre por debajo del contenido.
 * Optimizado para 0% uso de CPU cuando no está activo.
 */

(function () {
    'use strict';

    // Verificar preferencia de movimiento reducido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

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
    const TYPES = ['rect', 'rect', 'ribbon', 'ribbon', 'circle'];

    let canvas = null;
    let ctx = null;
    let pieces = [];
    let isRunning = false;
    let animationFrameId = null;

    function isFestiveTheme() {
        const theme = window.siteConfig ? window.siteConfig.activeTheme : (window.activeTheme || 'classic');
        return theme === 'mundial' || theme === 'final-mundial';
    }

    function initCanvas() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.id = 'lt-confetti-canvas';
        canvas.style.cssText = [
            'position:fixed',
            'top:0', 'left:0',
            'width:100%', 'height:100%',
            'pointer-events:none',
            'z-index:99999',
            'overflow:hidden',
        ].join(';');
        document.body.prepend(canvas);
        ctx = canvas.getContext('2d');

        function resize() {
            if (!canvas) return;
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        pieces = Array.from({ length: PIECE_COUNT }, () => {
            const p = new Piece();
            p.y = Math.random() * (canvas ? canvas.height : window.innerHeight);
            return p;
        });
    }

    // ── Clase Pieza ────────────────────────────────────────────────
    class Piece {
        constructor(initialY = null) {
            this.reset(initialY);
        }

        reset(initialY = null) {
            const W = canvas ? canvas.width : window.innerWidth;
            const H = canvas ? canvas.height : window.innerHeight;

            const theme = window.siteConfig ? window.siteConfig.activeTheme : (window.activeTheme || 'classic');
            let currentColors = COLORS;
            let currentTypes = TYPES;

            if (theme === 'final-mundial') {
                currentColors = [
                    'rgba(117, 179, 220, 0.85)',
                    'rgba(255, 255, 255, 0.90)',
                    'rgba(255, 215, 0, 0.85)',
                    'rgba(212, 175, 55, 0.85)',
                    'rgba(255, 223, 0, 0.75)',
                    'rgba(176, 224, 230, 0.70)'
                ];
                currentTypes = ['rect', 'ribbon', 'circle', 'star', 'star'];
            }

            this.type  = currentTypes[Math.floor(Math.random() * currentTypes.length)];
            this.color = currentColors[Math.floor(Math.random() * currentColors.length)];

            this.x     = Math.random() * W;
            this.y     = initialY !== null ? initialY : -10;

            this.w     = this.type === 'ribbon' ? (4 + Math.random() * 3) : (8 + Math.random() * 8);
            this.h     = this.type === 'ribbon' ? (14 + Math.random() * 10) : (8 + Math.random() * 8);
            this.r     = Math.random() * 360;

            this.vx    = (Math.random() - 0.5) * 1.2;
            this.vy    = 0.6 + Math.random() * 1.2;
            this.vr    = (Math.random() - 0.5) * 2.5;

            this.sway  = Math.random() * Math.PI * 2;
            this.swaySpeed = 0.02 + Math.random() * 0.03;

            this.opacity = 0.6 + Math.random() * 0.4;
        }

        update() {
            const H = canvas ? canvas.height : window.innerHeight;
            this.sway += this.swaySpeed;
            this.x += this.vx + Math.sin(this.sway) * 0.6;
            this.y += this.vy;
            this.r += this.vr;

            if (this.y > H + 20) {
                this.reset();
            }
        }

        draw() {
            if (!ctx) return;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.r * Math.PI) / 180);
            ctx.fillStyle = this.color;

            if (this.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'star') {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * (this.w / 2),
                               Math.sin((18 + i * 72) * Math.PI / 180) * (this.w / 2));
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.w / 4),
                               Math.sin((54 + i * 72) * Math.PI / 180) * (this.w / 4));
                }
                ctx.closePath();
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

    // ── Loop de animación Optimizado ─────────────────────────────────
    function loop() {
        if (!isFestiveTheme()) {
            stopConfetti();
            return;
        }

        initCanvas();
        if (canvas) canvas.style.display = 'block';
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => { p.update(); p.draw(); });

        animationFrameId = requestAnimationFrame(loop);
    }

    function startConfetti() {
        if (isRunning) return;
        if (!isFestiveTheme()) return;
        isRunning = true;
        loop();
    }

    function stopConfetti() {
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (canvas) {
            canvas.style.display = 'none';
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    window.checkConfettiStatus = function() {
        if (isFestiveTheme()) {
            startConfetti();
        } else {
            stopConfetti();
        }
    };

    // ── Arrancar cuando el DOM esté listo ─────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.checkConfettiStatus());
    } else {
        window.checkConfettiStatus();
    }

})();
