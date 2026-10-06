// =============================================================================
// fab-draggable.js — Lógica de arrastre del botón flotante (FAB) de Seguimiento
// Extraído de index.html (era un bloque <script> inline antes del cierre del </body>)
// =============================================================================

// ── Draggable Tracking FAB ──
window.addEventListener('load', function() {
    const fab = document.getElementById('btn-tracking-fab');
    if (!fab) return;

    const STORAGE_KEY = 'trackingFabPos';
    const BOTTOM_CLEARANCE = 96;

    // Restaurar posición guardada
    const savedPos = (function() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; }
    })();
    if (savedPos) {
        fab.style.bottom = savedPos.bottom + 'px';
        fab.style.right  = savedPos.right  + 'px';
        fab.style.top    = '';
        fab.style.left   = '';
    }

    var isDragging  = false;
    var didMove     = false;
    var lastWasTouch = false; // para ignorar mousedown sintetico post-touch
    var startX, startY, origRight, origBottom;

    function getEdgeDistances() {
        var rect = fab.getBoundingClientRect();
        return {
            right:  window.innerWidth  - rect.right,
            bottom: window.innerHeight - rect.bottom
        };
    }

    function beginDrag(cx, cy) {
        isDragging = true;
        didMove    = false;
        startX  = cx;
        startY  = cy;
        var d = getEdgeDistances();
        origRight  = d.right;
        origBottom = d.bottom;
        fab.classList.add('dragging');
    }

    function moveDrag(cx, cy) {
        if (!isDragging) return;
        var dx = startX - cx;
        var dy = startY - cy;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) didMove = true;
        if (!didMove) return;

        var newRight  = origRight  + dx;
        var newBottom = origBottom + dy;

        newRight  = Math.max(4, Math.min(window.innerWidth  - fab.offsetWidth  - 4, newRight));
        newBottom = Math.max(BOTTOM_CLEARANCE, Math.min(window.innerHeight - fab.offsetHeight - 8, newBottom));

        fab.style.right  = newRight  + 'px';
        fab.style.bottom = newBottom + 'px';
        fab.style.top    = '';
        fab.style.left   = '';
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        fab.classList.remove('dragging');

        if (!didMove) {
            if (window.openTrackingSheet) window.openTrackingSheet();
            return;
        }

        // Snap al borde horizontal más cercano
        var currentRight = parseFloat(fab.style.right) || 0;
        var snapRight    = currentRight < (window.innerWidth / 2 - fab.offsetWidth / 2);
        fab.style.right  = (snapRight ? window.innerWidth - fab.offsetWidth - 20 : 20) + 'px';

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                right:  parseFloat(fab.style.right),
                bottom: parseFloat(fab.style.bottom)
            }));
        } catch(e) {}
    }

    // ── Touch (non-passive para poder llamar preventDefault) ──
    fab.addEventListener('touchstart', function(e) {
        lastWasTouch = true;
        e.preventDefault(); // evita que el browser genere mousedown/click sintetico
        var t = e.touches[0];
        beginDrag(t.clientX, t.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        var t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchend', function() {
        endDrag();
        // Reset flag despues de un tick para no bloquear mousedown legítimo
        setTimeout(function() { lastWasTouch = false; }, 400);
    });

    // ── Mouse (ignorar si vino de touch) ──
    fab.addEventListener('mousedown', function(e) {
        if (lastWasTouch) return;
        e.preventDefault();
        beginDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY); });
    document.addEventListener('mouseup',   function()  { endDrag(); });
});
