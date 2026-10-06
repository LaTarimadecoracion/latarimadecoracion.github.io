// =============================================================================
// splash.js — Generación dinámica del engranaje sierra del Splash Screen
// Extraído de index.html (era un bloque <script> inline después del #splash-screen)
// =============================================================================

(function() {
    const svg = document.getElementById('saw-blade-svg');
    if (!svg) return;
    const teeth = 30;
    const cx = 50, cy = 50;
    const rOuter = 49;
    const rInner = 37;
    const step = (2 * Math.PI) / teeth;
    let pathData = '';
    
    for (let i = 0; i < teeth; i++) {
        const thetaTip = i * step;
        const thetaGullet = (i - 0.25) * step;
        const thetaNextGullet = (i + 0.75) * step;
        const thetaControl = (i + 0.4) * step;
        
        // Puntas
        const xt = cx + rOuter * Math.cos(thetaTip);
        const yt = cy + rOuter * Math.sin(thetaTip);
        
        // Gargantas
        const xg = cx + rInner * Math.cos(thetaGullet);
        const yg = cy + rInner * Math.sin(thetaGullet);
        
        // Siguiente garganta
        const xng = cx + rInner * Math.cos(thetaNextGullet);
        const yng = cy + rInner * Math.sin(thetaNextGullet);
        
        // Punto de control para curvar la espalda del diente
        const xc = cx + rOuter * Math.cos(thetaControl);
        const yc = cy + rOuter * Math.sin(thetaControl);
        
        if (i === 0) {
            pathData += `M ${xg} ${yg}`;
        }
        // Cara de corte recta (de la garganta a la punta)
        pathData += ` L ${xt} ${yt}`;
        // Espalda curva (de la punta a la siguiente garganta con curva Bézier)
        pathData += ` Q ${xc} ${yc} ${xng} ${yng}`;
    }
    pathData += ' Z';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
})();
