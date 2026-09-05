// js/admin-pc-stock.js
// --- ADMIN PC STOCK CONTROL & BARCODE SCANNER MODULE ---

(function() {
    window.adminPcScanMode = 'pos'; // Modes: 'pos', 'count', 'cart', 'audit'
    window.adminPcAudioEnabled = true;
    window.adminPcScanHistory = [];
    window.adminPcLastMatch = null;
    window.adminPcAuditCounts = {}; // Key: `${prod.id}__g${gIdx}_m${mIdx}` or `${prod.id}__g${gIdx}`
    window.adminPcAuditFilter = 'all'; // 'all', 'diff', 'missing'
    window.adminPcCountLog = []; // { key, title, img, stockBefore, stockAfter, ts }

    // Web Audio API Synthesizer para Feedback de Escaneo
    window.playAdminPcBeep = function(type) {
        if (!window.adminPcAudioEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                gain.gain.setValueAtTime(0.18, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.14, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
                osc.start();
                osc.stop(ctx.currentTime + 0.16);
            }
        } catch(e) {}
    };

    window.toggleAdminPcAudio = function() {
        window.adminPcAudioEnabled = !window.adminPcAudioEnabled;
        const icon = document.getElementById('icon-pc-audio');
        const btn = document.getElementById('btn-toggle-pc-audio');
        if (icon) icon.textContent = window.adminPcAudioEnabled ? 'volume_up' : 'volume_off';
        if (btn) btn.title = window.adminPcAudioEnabled ? 'Sonido Activado (Click para Silenciar)' : 'Sonido Desactivado (Click para Activar)';
    };

    window.toggleAdminPcFullscreen = function() {
        const elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    };

    window.setAdminPcScanMode = function(mode) {
        window.adminPcScanMode = mode;
        ['pos', 'sell', 'count', 'cart', 'audit', 'history'].forEach(m => {
            const btn = document.getElementById(`btn-pc-mode-${m}`);
            if (btn) {
                if (m === mode) {
                    btn.classList.add('active');
                    btn.style.background = '#0f172a';
                    btn.style.color = '#ffffff';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = '#475569';
                }
            }
        });

        const auditContainer = document.getElementById('admin-pc-audit-container');
        if (auditContainer) {
            auditContainer.style.display = (mode === 'audit') ? 'block' : 'none';
            if (mode === 'audit') window.renderAdminPcAuditPanel();
        }

        const cartPanel = document.getElementById('admin-pc-cart-panel');
        if (cartPanel) {
            cartPanel.style.display = (mode === 'cart') ? 'block' : 'none';
            if (mode === 'cart') window.renderAdminPcCartPanel();
        }

        const countPanel = document.getElementById('admin-pc-count-panel');
        if (countPanel) {
            countPanel.style.display = (mode === 'count') ? 'block' : 'none';
            if (mode === 'count') window.renderAdminPcCountPanel();
        }

        const historyPanel = document.getElementById('admin-pc-history-panel');
        if (historyPanel) {
            historyPanel.style.display = (mode === 'history') ? 'block' : 'none';
            if (mode === 'history') window.renderAdminPcHistoryPanel();
        }

        window.showAdminPcModePlaceholder(mode);
        window.focusAdminPcScannerInput();
    };

    // --- SISTEMA DE HISTORIAL PERSISTENTE ---
    window.getAdminPcServerHistory = function() {
        try {
            return JSON.parse(localStorage.getItem('admin_pc_stock_events_log') || '[]');
        } catch(e) {
            return [];
        }
    };

    window.logAdminPcMovement = function(entry) {
        // entry: { type: 'sell'|'count'|'cart'|'audit', title, img, stockBefore, stockAfter, changeStr }
        try {
            const list = window.getAdminPcServerHistory();
            const record = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2,4),
                timestamp: Date.now(),
                dateStr: new Date().toLocaleDateString('es-AR'),
                timeStr: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                type: entry.type || 'action',
                title: entry.title,
                img: entry.img || 'img/logo_provisional.png',
                stockBefore: entry.stockBefore !== undefined ? entry.stockBefore : '-',
                stockAfter: entry.stockAfter !== undefined ? entry.stockAfter : '-',
                changeStr: entry.changeStr || ''
            };
            list.unshift(record);
            // Mantener últimos 300 eventos persistentes
            if (list.length > 300) list.pop();
            localStorage.setItem('admin_pc_stock_events_log', JSON.stringify(list));

            // Si el panel de historial está abierto, refrescar
            if (window.adminPcScanMode === 'history') {
                window.renderAdminPcHistoryPanel();
            }
        } catch(e) {
            console.error("Error guardando movimiento en historial:", e);
        }
    };

    window.clearAdminPcServerHistory = function() {
        if (confirm("¿Estás seguro de vaciar todo el historial de movimientos guardado en el servidor?")) {
            localStorage.removeItem('admin_pc_stock_events_log');
            window.renderAdminPcHistoryPanel();
        }
    };

    window.renderAdminPcHistoryPanel = function() {
        const itemsEl = document.getElementById('admin-pc-history-items');
        const summaryEl = document.getElementById('admin-pc-history-summary');
        if (!itemsEl) return;

        const history = window.getAdminPcServerHistory();

        if (summaryEl) {
            summaryEl.textContent = history.length > 0 ? `${history.length} movimiento${history.length !== 1 ? 's' : ''} registrado${history.length !== 1 ? 's' : ''}` : '';
        }

        if (history.length === 0) {
            itemsEl.innerHTML = `
                <div style="text-align:center;padding:2.5rem 1rem;color:var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size:2.8rem;color:#475569;opacity:0.4;">history_edu</span>
                    <p style="margin:0.5rem 0 0;font-size:0.88rem;font-weight:600;">Aún no hay historial de movimientos.</p>
                    <p style="margin:4px 0 0;font-size:0.78rem;">Cada venta, incremento de stock o reposición se registrará aquí con fecha y hora.</p>
                </div>`;
            return;
        }

        const typeBadges = {
            sell: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', label: '🏷️ VENTA -1', icon: 'remove_circle' },
            count: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: '➕ CONTEO +1', icon: 'add_circle' },
            cart: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: '🛒 FALTANTE', icon: 'shopping_cart' },
            audit: { bg: '#f3e8ff', border: '#d8b4fe', color: '#6b21a8', label: '📋 AUDITORÍA', icon: 'fact_check' }
        };

        itemsEl.innerHTML = history.map(item => {
            const badge = typeBadges[item.type] || { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', label: 'REGISTRO', icon: 'info' };
            return `
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 0.85rem;background:${badge.bg};border:1px solid ${badge.border};">
                    <img src="${item.img}" alt="" style="width:42px;height:42px;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-weight:800;font-size:0.86rem;color:#0f172a;">${item.title}</span>
                            <span style="font-size:0.7rem;font-weight:800;color:${badge.color};background:#fff;padding:2px 7px;border:1px solid ${badge.border};">${badge.label}</span>
                        </div>
                        <div style="font-size:0.75rem;color:#475569;margin-top:3px;display:flex;align-items:center;gap:10px;">
                            <span>🕒 <b>${item.dateStr}</b> a las <b>${item.timeStr} hs</b></span>
                            ${item.stockBefore !== '-' ? `<span>Stock: <b>${item.stockBefore}</b> → <b style="color:#0f172a;">${item.stockAfter}</b></span>` : ''}
                        </div>
                    </div>
                    <div style="flex-shrink:0;font-size:0.85rem;font-weight:800;color:${badge.color};">
                        ${item.changeStr}
                    </div>
                </div>`;
        }).join('');
    };


    window.renderAdminPcCountPanel = function() {
        const itemsEl = document.getElementById('admin-pc-count-items');
        const summaryEl = document.getElementById('admin-pc-count-summary');
        if (!itemsEl) return;

        const log = window.adminPcCountLog || [];

        if (summaryEl) {
            const totalUnits = log.reduce((s, e) => s + e.units, 0);
            summaryEl.textContent = log.length > 0
                ? `${log.length} producto${log.length !== 1 ? 's' : ''} · +${totalUnits} unidades`
                : '';
        }

        if (log.length === 0) {
            itemsEl.innerHTML = `
                <div style="text-align:center;padding:2rem 1rem;color:var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size:2.5rem;color:#2563eb;opacity:0.4;">add_circle</span>
                    <p style="margin:0.5rem 0 0;font-size:0.88rem;font-weight:600;">Aún no se escaneó nada.</p>
                    <p style="margin:4px 0 0;font-size:0.78rem;">Cada escaneo suma +1 al stock y aparece aquí.</p>
                </div>`;
            return;
        }

        itemsEl.innerHTML = log.map(e => {
            const hora = new Date(e.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;background:#eff6ff;border:1px solid #bfdbfe;">
                    <img src="${e.img}" alt="" style="width:40px;height:40px;object-fit:cover;border:1px solid #bfdbfe;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.85rem;color:#0f172a;">${e.title}</div>
                        <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">
                            Stock: <span style="font-weight:700;color:#64748b;">${e.stockBefore}</span>
                            → <span style="font-weight:800;color:#2563eb;">${e.stockAfter}</span>
                            &nbsp;·&nbsp; <span style="color:#6b7280;">${hora}</span>
                        </div>
                    </div>
                    <div style="flex-shrink:0;text-align:center;">
                        <div style="font-size:1.3rem;font-weight:900;color:#2563eb;">+${e.units}</div>
                        <div style="font-size:0.68rem;font-weight:600;color:#93c5fd;">escaneado${e.units !== 1 ? 's' : ''}</div>
                    </div>
                </div>`;
        }).join('');
    };

    window.renderAdminPcCartPanel = function() {
        const itemsEl = document.getElementById('admin-pc-cart-items');
        const summaryEl = document.getElementById('admin-pc-cart-summary');
        if (!itemsEl) return;

        const cartObj = (window.adminStockLists && window.adminStockLists.length > 0)
            ? window.adminStockLists[0]
            : (window.adminStockCart || {});
        const keys = Object.keys(cartObj);

        if (summaryEl) {
            summaryEl.textContent = keys.length > 0 ? `${keys.length} producto${keys.length !== 1 ? 's' : ''}` : '';
        }

        if (keys.length === 0) {
            itemsEl.innerHTML = `
                <div style="text-align:center;padding:2rem 1rem;color:var(--admin-text-muted);">
                    <span class="material-symbols-outlined" style="font-size:2.5rem;color:#d97706;opacity:0.4;">shopping_cart</span>
                    <p style="margin:0.5rem 0 0;font-size:0.88rem;font-weight:600;">La lista está vacía.</p>
                    <p style="margin:4px 0 0;font-size:0.78rem;">Escaneá los productos que falta reponer.</p>
                </div>`;
            return;
        }

        let html = '';
        let totalQty = 0;

        keys.forEach(id => {
            const item = cartObj[id];
            const needed = parseInt(item.qtyNeeded) || 1;
            const acquired = parseInt(item.qtyAcquired) || 0;
            const isChecked = Boolean(item.checked);
            const isDone = isChecked || (acquired >= needed && needed > 0);
            totalQty += needed;

            // Obtener el stock actual del producto en el catálogo si existe
            let currentStockText = '';
            if (window.findAdminPcProductByCode) {
                const match = window.findAdminPcProductByCode(item.id.split('__')[0]);
                if (match && match.product) {
                    const st = match.isVariant 
                        ? window.getAdminMeasureStock(match.product, match.finishGroup, match.mIdx)
                        : window.getAdminFinishGroupStock(match.product, match.finishGroup);
                    currentStockText = `<span style="font-size:0.73rem;font-weight:700;color:#475569;background:#f1f5f9;padding:2px 6px;border-radius:3px;border:1px solid #cbd5e1;margin-left:6px;">Stock actual: ${st} u.</span>`;
                }
            }

            html += `
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0.75rem;
                    background:${isDone ? '#f0fdf4' : (acquired > 0 ? '#fffbeb' : '#fff')};
                    border:1px solid ${isDone ? '#86efac' : (acquired > 0 ? '#fcd34d' : '#e2e8f0')};">
                    <input type="checkbox" ${isChecked ? 'checked' : ''}
                        onchange="window.toggleAdminStockCartItemCheck('${item.id}');window.renderAdminPcCartPanel();"
                        style="width:18px;height:18px;cursor:pointer;accent-color:#16a34a;flex-shrink:0;">
                    <img src="${item.img}" alt="" style="width:40px;height:40px;object-fit:cover;border:1px solid #e2e8f0;flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                            <span style="font-weight:700;font-size:0.85rem;color:#0f172a;${isDone ? 'text-decoration:line-through;opacity:0.6;' : ''}">${item.title}</span>
                            ${currentStockText}
                        </div>
                        <div style="margin-top:2px;">
                            ${isDone ? '<span style="font-size:0.72rem;font-weight:700;color:#16a34a;">✓ Listo</span>' :
                              acquired > 0 ? `<span style="font-size:0.72rem;font-weight:700;color:#d97706;">Conseguido: ${acquired}/${needed}</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                        <span style="font-size:0.72rem;font-weight:700;color:#64748b;">Comprar:</span>
                        <input type="number" min="1" value="${needed}"
                            onchange="window.updateAdminStockCartItemQty('${item.id}',this.value);window.renderAdminPcCartPanel();"
                            style="width:46px;padding:3px 4px;text-align:center;font-weight:700;font-size:0.82rem;border:1px solid #cbd5e1;background:#f8fafc;border-radius:0;">
                    </div>
                    <span class="material-symbols-outlined"
                        onclick="window.removeFromAdminStockCart('${item.id}');window.renderAdminPcCartPanel();"
                        style="font-size:20px;color:#dc2626;cursor:pointer;flex-shrink:0;" title="Quitar">delete</span>
                </div>`;
        });

        if (summaryEl) summaryEl.textContent = `${keys.length} producto${keys.length !== 1 ? 's' : ''} · ${totalQty} unidades`;
        itemsEl.innerHTML = html;
    };

    window.showAdminPcModePlaceholder = function(mode) {
        const container = document.getElementById('admin-pc-product-card-container');
        if (!container) return;

        const info = {
            pos: {
                icon: 'barcode_reader',
                color: '#0f172a',
                title: 'Modo Ficha POS',
                desc: 'Escaneá un producto para ver su ficha completa: stock por variante, precio de venta y costo. Ideal para consultas rápidas en mostrador.'
            },
            sell: {
                icon: 'point_of_sale',
                color: '#16a34a',
                title: 'Modo Venta — descuenta stock',
                desc: 'Cada escaneo resta 1 unidad del stock en tiempo real. Usalo mientras Cecilia atiende al cliente con la pistola lectora.'
            },
            count: {
                icon: 'add_circle',
                color: '#2563eb',
                title: 'Modo Conteo — suma stock',
                desc: 'Cada escaneo suma 1 unidad al stock. Perfecto para cargar mercadería nueva o corregir diferencias de inventario.'
            },
            cart: {
                icon: 'shopping_cart',
                color: '#d97706',
                title: 'Modo Faltantes — lista de compra',
                desc: 'Escaneá los productos que necesitás reponer. Se arma una lista de pedido que podés generar como nota de compra.'
            },
            audit: {
                icon: 'fact_check',
                color: '#7c3aed',
                title: 'Modo Auditoría',
                desc: 'Conteo físico vs. stock del sistema. Escaneá todo lo que tenés en el depósito y al finalizar sincronizá las diferencias.'
            },
            history: {
                icon: 'history_edu',
                color: '#475569',
                title: 'Historial de Movimientos',
                desc: 'Consulta la bitácora completa de eventos guardados: ventas, ingresos de stock, reposiciones y cambios con fecha y hora.'
            }
        };

        const m = info[mode] || info.pos;
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:1rem;padding:2rem;text-align:center;">
                <span class="material-symbols-outlined" style="font-size:3.5rem;color:${m.color};opacity:0.85;">${m.icon}</span>
                <div>
                    <h3 style="margin:0 0 6px 0;font-size:1.1rem;font-weight:800;color:#0f172a;">${m.title}</h3>
                    <p style="margin:0;font-size:0.88rem;color:#64748b;max-width:340px;line-height:1.55;">${m.desc}</p>
                </div>
                <div style="margin-top:0.5rem;padding:8px 16px;background:#f1f5f9;border:1px dashed #cbd5e1;font-size:0.8rem;color:#94a3b8;font-weight:600;">
                    ↑ Escaneá o escribí un código arriba
                </div>
            </div>`;
    };


    window.focusAdminPcScannerInput = function() {
        setTimeout(() => {
            const input = document.getElementById('admin-pc-scanner-input');
            if (input && document.activeElement !== input && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
                input.focus();
            }
        }, 80);
    };

    window.findAdminPcProductByCode = function(inputCode) {
        const query = (inputCode || '').trim();
        if (!query) return null;
        const catalog = window.sessionProducts || window.productsData || [];

        for (const cat of catalog) {
            if (!cat.products || !Array.isArray(cat.products)) continue;
            for (const p of cat.products) {
                const acabados = (p.acabados_groups && p.acabados_groups.length > 0)
                    ? p.acabados_groups
                    : [{ acabado_name: 'Estándar', cover_image: p.image, medidas_variants: [{ medida: 'Única', price: p.price || 0, cost_price: 0, stock: p.stock !== undefined ? p.stock : 1 }] }];

                for (let gIdx = 0; gIdx < acabados.length; gIdx++) {
                    const g = acabados[gIdx];
                    const acabName = g.acabado_name || 'Estándar';
                    const measures = (g.medidas_variants && g.medidas_variants.length > 0) ? g.medidas_variants : [];

                    if (measures.length > 0) {
                        for (let mIdx = 0; mIdx < measures.length; mIdx++) {
                            const m = measures[mIdx];
                            const shortCode = window.TarimaShortener ? window.TarimaShortener.encodeShortCode(p.id, acabName, m.medida, '', false) : '';
                            const shortCodeDots = window.TarimaShortener ? window.TarimaShortener.encodeShortCode(p.id, acabName, m.medida, '', true) : '';

                            if (query.toLowerCase() === shortCode.toLowerCase() || query.toLowerCase() === shortCodeDots.toLowerCase() || query.toLowerCase() === String(p.id).toLowerCase()) {
                                return { prod: p, gIdx: gIdx, mIdx: mIdx, finishGroup: g, measureVariant: m, matchType: 'variant', shortCode: shortCode || p.id };
                            }
                        }
                    }

                    const finishShortCode = window.TarimaShortener ? window.TarimaShortener.encodeShortCode(p.id, acabName, '', '', false) : '';
                    const finishShortCodeDots = window.TarimaShortener ? window.TarimaShortener.encodeShortCode(p.id, acabName, '', '', true) : '';

                    if (query.toLowerCase() === finishShortCode.toLowerCase() || query.toLowerCase() === finishShortCodeDots.toLowerCase() || query.toLowerCase() === String(p.id).toLowerCase()) {
                        return { prod: p, gIdx: gIdx, mIdx: 0, finishGroup: g, measureVariant: measures[0] || null, matchType: 'finish', shortCode: finishShortCode || p.id };
                    }
                }
            }
        }
        return null;
    };

    window.processAdminPcScan = function() {
        const input = document.getElementById('admin-pc-scanner-input');
        if (!input) return;
        const code = (input.value || '').trim();
        if (!code) return;

        const match = window.findAdminPcProductByCode(code);

        if (match) {
            window.adminPcLastMatch = match;
            window.playAdminPcBeep('success');

            const prod = match.prod;
            const gIdx = match.gIdx;
            const mIdx = match.mIdx;
            const isVariant = match.matchType === 'variant' && match.measureVariant;

            // Ejecutar acción según el Modo Activo
            if (window.adminPcScanMode === 'sell') {
                const currentStock = isVariant 
                    ? window.getAdminMeasureStock(prod, match.finishGroup, mIdx)
                    : window.getAdminFinishGroupStock(prod, match.finishGroup);

                const newStock = Math.max(0, currentStock - 1);

                if (isVariant) {
                    window.updateAdminStockVariantQty(prod.id, gIdx, mIdx, newStock);
                } else {
                    window.updateAdminStockFinishGroupQty(prod.id, gIdx, newStock);
                }

                const itemTitle = isVariant 
                    ? `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'}) - ${match.measureVariant.medida}`
                    : `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'})`;
                window.logAdminPcMovement({
                    type: 'sell',
                    title: itemTitle,
                    img: match.finishGroup.cover_image || prod.image,
                    stockBefore: currentStock,
                    stockAfter: newStock,
                    changeStr: '-1 u.'
                });

                if (typeof window.showAdminToast === 'function') {
                    if (currentStock <= 0) {
                        window.showAdminToast(`⚠️ Venta registrada en ${prod.title} (¡Stock en 0!)`);
                    } else {
                        window.showAdminToast(`🏷️ Venta: Stock de ${prod.title} descontado a ${newStock}`);
                    }
                }
            } else if (window.adminPcScanMode === 'count') {
                const currentStock = isVariant
                    ? window.getAdminMeasureStock(prod, match.finishGroup, mIdx)
                    : window.getAdminFinishGroupStock(prod, match.finishGroup);

                if (isVariant) {
                    window.updateAdminStockVariantQty(prod.id, gIdx, mIdx, currentStock + 1);
                } else {
                    window.updateAdminStockFinishGroupQty(prod.id, gIdx, currentStock + 1);
                }

                const countTitle = isVariant
                    ? `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'}) - ${match.measureVariant.medida}`
                    : `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'})`;
                const countKey = isVariant ? `${prod.id}__g${gIdx}_m${mIdx}` : `${prod.id}__g${gIdx}`;
                const existingEntry = window.adminPcCountLog.find(e => e.key === countKey);
                if (existingEntry) {
                    existingEntry.stockAfter = currentStock + 1;
                    existingEntry.units += 1;
                    existingEntry.ts = Date.now();
                } else {
                    window.adminPcCountLog.unshift({
                        key: countKey,
                        title: countTitle,
                        img: match.finishGroup.cover_image || prod.image || 'img/logo_provisional.png',
                        stockBefore: currentStock,
                        stockAfter: currentStock + 1,
                        units: 1,
                        ts: Date.now()
                    });
                }
                window.renderAdminPcCountPanel();

                window.logAdminPcMovement({
                    type: 'count',
                    title: countTitle,
                    img: match.finishGroup.cover_image || prod.image,
                    stockBefore: currentStock,
                    stockAfter: currentStock + 1,
                    changeStr: '+1 u.'
                });

                if (typeof window.showAdminToast === 'function') {
                    window.showAdminToast(`➕ Stock de ${prod.title} incrementado a ${currentStock + 1}`);
                }
            } else if (window.adminPcScanMode === 'cart') {
                const title = isVariant 
                    ? `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'}) - ${match.measureVariant.medida}`
                    : `${prod.title} (${match.finishGroup.acabado_name || 'Estándar'})`;
                const img = match.finishGroup.cover_image || prod.image || 'img/logo_provisional.png';
                const cost = isVariant ? (parseFloat(match.measureVariant.cost_price) || 0) : (parseFloat(match.finishGroup.cost) || 0);
                const cartKey = isVariant ? `${prod.id}__g${gIdx}_m${mIdx}` : `${prod.id}__g${gIdx}`;
                
                window.addToAdminStockCart(cartKey, title, img, cost);
                window.renderAdminPcCartPanel();

                window.logAdminPcMovement({
                    type: 'cart',
                    title: title,
                    img: img,
                    stockBefore: '-',
                    stockAfter: '-',
                    changeStr: 'Agregado a lista'
                });

                if (typeof window.showAdminToast === 'function') {
                    window.showAdminToast(`🛒 Agregado a lista de faltantes`);
                }
            } else if (window.adminPcScanMode === 'audit') {
                const auditKey = isVariant ? `${prod.id}__g${gIdx}_m${mIdx}` : `${prod.id}__g${gIdx}`;
                const expectedStock = isVariant
                    ? window.getAdminMeasureStock(prod, match.finishGroup, mIdx)
                    : window.getAdminFinishGroupStock(prod, match.finishGroup);

                if (!window.adminPcAuditCounts[auditKey]) {
                    window.adminPcAuditCounts[auditKey] = {
                        match: match,
                        key: auditKey,
                        countPhysical: 0,
                        expectedStock: expectedStock
                    };
                }
                window.adminPcAuditCounts[auditKey].countPhysical += 1;

                if (typeof window.showAdminToast === 'function') {
                    window.showAdminToast(`📋 Auditoría: +1 en ${prod.title} (Contados: ${window.adminPcAuditCounts[auditKey].countPhysical} / Esperado: ${expectedStock})`);
                }
                window.renderAdminPcAuditPanel();
            }

            // Registrar en Historial de la Sesión
            const acabName = match.finishGroup ? match.finishGroup.acabado_name : 'Estándar';
            const medName = (isVariant && match.measureVariant) ? match.measureVariant.medida : '';
            const fullLabel = medName ? `${prod.title} (${acabName} - ${medName})` : (acabName !== 'Estándar' ? `${prod.title} (${acabName})` : prod.title);

            window.adminPcScanHistory.unshift({
                time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                code: match.shortCode,
                label: fullLabel,
                img: match.finishGroup.cover_image || prod.image || 'img/logo_provisional.png',
                mode: window.adminPcScanMode
            });

            window.renderAdminPcProductCard(match);
            window.renderAdminPcScanHistory();
        } else {
            window.playAdminPcBeep('error');
            window.renderAdminPcErrorCard(code);
        }

        input.value = '';
        window.focusAdminPcScannerInput();
    };

    window.renderAdminPcProductCard = function(match) {
        const container = document.getElementById('admin-pc-product-card-container');
        if (!container || !match) return;

        const prod = match.prod;
        const g = match.finishGroup;
        const m = match.measureVariant;
        const isVariant = match.matchType === 'variant' && m;
        const img = g.cover_image || prod.image || 'img/logo_provisional.png';
        const acabName = g.acabado_name || 'Estándar';
        const medName = isVariant && m ? m.medida : '';

        const currentStock = isVariant
            ? window.getAdminMeasureStock(prod, g, match.mIdx)
            : window.getAdminFinishGroupStock(prod, g);

        const currentCost = isVariant
            ? (parseFloat(m.cost_price) || 0)
            : (parseFloat(g.cost_price || prod.cost_price) || 0);

        const currentPrice = isVariant
            ? (parseFloat(m.price) || 0)
            : (parseFloat(g.price || prod.price) || 0);

        const formattedCost = currentCost ? '$' + Number(currentCost).toLocaleString('es-AR') : '-';
        const formattedPrice = currentPrice ? '$' + Number(currentPrice).toLocaleString('es-AR') : '-';

        container.style.justifyContent = 'flex-start';
        container.style.textAlign = 'left';
        container.style.alignItems = 'stretch';

        container.innerHTML = `
            <div style="display: flex; gap: 1.25rem; align-items: start; width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.25rem; margin-bottom: 1.25rem;">
                <img src="${img}" alt="Foto" style="width: 105px; height: 105px; border-radius: 10px; object-fit: cover; border: 1px solid #e2e8f0; flex-shrink: 0;" onerror="this.src='img/logo_provisional.png'">
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                        <span style="font-family: monospace; font-size: 0.85rem; font-weight: 800; color: #0f172a; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 6px;">Código: ${match.shortCode}</span>
                        <span style="font-size: 0.75rem; font-weight: 700; color: #166534; background: #f0fdf4; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px;">✔ Encontrado</span>
                    </div>
                    <h2 style="margin: 8px 0 4px 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; line-height: 1.25;">${prod.title}</h2>
                    <div style="display: flex; gap: 8px; font-size: 0.82rem; color: #64748b; font-weight: 600; flex-wrap: wrap;">
                        <span>Acabado: <strong style="color: #0f172a;">${acabName}</strong></span>
                        ${medName ? `<span>| Medida: <strong style="color: #0f172a;">${medName}</strong></span>` : ''}
                    </div>
                </div>
            </div>

            <!-- Panel de Controles de Stock & Métricas POS Minimalista -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; width: 100%;">
                <!-- Control de Stock Gigante -->
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <span style="font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Stock Disponible:</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button type="button" onclick="window.adjustAdminPcStock(${currentStock - 1})" style="width: 42px; height: 42px; border-radius: 8px; border: 1px solid #cbd5e1; background: #FFF; font-size: 1.3rem; font-weight: 800; color: #dc2626; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;" title="Restar 1 unidad">-</button>
                        <input type="number" id="admin-pc-direct-stock-input" value="${currentStock}" min="0" onchange="window.adjustAdminPcStock(this.value)" style="width: 70px; height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1.3rem; font-weight: 800; text-align: center; color: #0f172a; background: #FFF;" onkeydown="if(event.key==='Enter') this.blur();">
                        <button type="button" onclick="window.adjustAdminPcStock(${currentStock + 1})" style="width: 42px; height: 42px; border-radius: 8px; border: 1px solid #0f172a; background: #0f172a; font-size: 1.3rem; font-weight: 800; color: #FFF; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;" title="Sumar 1 unidad">+</button>
                    </div>
                </div>

                <!-- Ficha de Costo y Venta -->
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                        <span style="color: #64748b; font-weight: 600;">Costo Proveedor:</span>
                        <strong style="color: #0f172a; font-weight: 800; font-size: 0.92rem;">${formattedCost}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                        <span style="color: #64748b; font-weight: 600;">Precio de Venta:</span>
                        <strong style="color: #0f172a; font-weight: 900; font-size: 1.05rem;">${formattedPrice}</strong>
                    </div>
                    <button type="button" onclick="window.openAdminStockPhotoModal('${prod.id}')" class="pc-control-btn" style="margin-top: 4px; justify-content: center; width: 100%;">✏️ Editar Fotos / Precios</button>
                </div>
            </div>
        `;
    };

    window.adjustAdminPcStock = function(newVal) {
        if (!window.adminPcLastMatch) return;
        const match = window.adminPcLastMatch;
        const qty = Math.max(0, parseInt(newVal) || 0);

        if (match.matchType === 'variant' && match.measureVariant) {
            window.updateAdminStockVariantQty(match.prod.id, match.gIdx, match.mIdx, qty);
        } else {
            window.updateAdminStockFinishGroupQty(match.prod.id, match.gIdx, qty);
        }

        // Refrescar tarjeta local con el nuevo stock
        window.renderAdminPcProductCard(match);
        window.focusAdminPcScannerInput();
    };

    window.renderAdminPcErrorCard = function(code) {
        const container = document.getElementById('admin-pc-product-card-container');
        if (!container) return;

        container.style.justifyContent = 'center';
        container.style.textAlign = 'center';
        container.style.alignItems = 'center';

        container.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--admin-danger); margin-bottom: 0.5rem;">error_med</span>
            <h3 style="margin: 0; font-size: 1.2rem; color: var(--admin-danger); font-weight: 800;">Código No Encontrado</h3>
            <p style="margin: 6px 0 1rem 0; font-size: 0.88rem; color: var(--admin-text-muted); max-width: 380px;">No se encontró ningún producto con el código <strong style="color: var(--admin-text-main); font-family: monospace;">"${code}"</strong> en el catálogo activo.</p>
            <button type="button" onclick="window.focusAdminPcScannerInput()" class="btn-outline" style="padding: 0.4rem 1rem; font-size: 0.82rem; font-weight: 700;">Reintentar Escaneo</button>
        `;
    };

    window.renderAdminPcScanHistory = function() {
        const container = document.getElementById('admin-pc-scan-history-list');
        if (!container) return;

        if (window.adminPcScanHistory.length === 0) {
            container.innerHTML = '<div style="font-size: 0.78rem; color: var(--admin-text-subtle); text-align: center; padding: 1.5rem 0; font-style: italic;">Sin escaneos recientes en esta sesión.</div>';
            return;
        }

        container.innerHTML = window.adminPcScanHistory.slice(0, 15).map(item => `
            <div style="display: flex; align-items: center; gap: 8px; background: var(--admin-surface-hover); padding: 6px 8px; border-radius: 8px; border: 1px solid var(--admin-border-color); font-size: 0.78rem;">
                <img src="${item.img}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover; border: 1px solid var(--admin-border-color);" onerror="this.src='img/logo_provisional.png'">
                <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                    <span style="font-weight: 700; color: var(--admin-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.label}</span>
                    <span style="font-family: monospace; font-size: 0.7rem; color: var(--admin-accent); font-weight: 800;">Cod: ${item.code}</span>
                </div>
                <span style="font-size: 0.68rem; color: var(--admin-text-subtle); font-weight: 600;">${item.time}</span>
            </div>
        `).join('');
    };

    window.clearAdminPcScanHistory = function() {
        window.adminPcScanHistory = [];
        window.renderAdminPcScanHistory();
    };

    // --- FUNCIONES DE AUDITORÍA DE INVENTARIO FÍSICO ---
    window.setAdminPcAuditFilter = function(filter) {
        window.adminPcAuditFilter = filter;
        ['all', 'diff', 'missing'].forEach(f => {
            const btn = document.getElementById(`audit-filter-${f}`);
            if (btn) {
                if (f === filter) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
        window.renderAdminPcAuditPanel();
    };

    window.renderAdminPcAuditPanel = function() {
        const tbody = document.getElementById('admin-pc-audit-table-body');
        const statTotalEl = document.getElementById('audit-stat-total');
        const statOkEl = document.getElementById('audit-stat-ok');
        const statMissingEl = document.getElementById('audit-stat-missing');
        const statExtraEl = document.getElementById('audit-stat-extra');
        if (!tbody) return;

        const items = Object.values(window.adminPcAuditCounts || {});

        let totalPhysical = 0;
        let okCount = 0;
        let missingCount = 0;
        let extraCount = 0;

        items.forEach(item => {
            totalPhysical += item.countPhysical;
            const diff = item.countPhysical - item.expectedStock;
            if (diff === 0) okCount++;
            else if (diff < 0) missingCount++;
            else extraCount++;
        });

        if (statTotalEl) statTotalEl.textContent = totalPhysical;
        if (statOkEl) statOkEl.textContent = okCount;
        if (statMissingEl) statMissingEl.textContent = missingCount;
        if (statExtraEl) statExtraEl.textContent = extraCount;

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--admin-text-subtle); font-style: italic;">
                        No hay registros de auditoría aún. Cambia al modo <strong>📋 Auditoría</strong> y comienza a escanear productos.
                    </td>
                </tr>
            `;
            return;
        }

        const filteredItems = items.filter(item => {
            const diff = item.countPhysical - item.expectedStock;
            if (window.adminPcAuditFilter === 'diff') return diff !== 0;
            if (window.adminPcAuditFilter === 'missing') return diff < 0;
            return true;
        });

        if (filteredItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--admin-text-subtle); font-style: italic;">
                        Sin resultados para el filtro seleccionado.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredItems.map(item => {
            const match = item.match;
            const prod = match.prod;
            const g = match.finishGroup;
            const m = match.measureVariant;
            const isVariant = match.matchType === 'variant' && m;
            const img = g.cover_image || prod.image || 'img/logo_provisional.png';
            const acabName = g.acabado_name || 'Estándar';
            const medName = isVariant && m ? m.medida : '';
            const fullTitle = medName ? `${prod.title} (${acabName} - ${medName})` : `${prod.title} (${acabName})`;

            const diff = item.countPhysical - item.expectedStock;
            let badgeHtml = '';
            let diffStr = (diff > 0 ? '+' : '') + diff;

            if (diff === 0) {
                badgeHtml = '<span style="background: #f0fdf4; color: #166534; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.72rem;">✔ OK</span>';
            } else if (diff < 0) {
                badgeHtml = '<span style="background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.72rem;">🔴 Faltante</span>';
            } else {
                badgeHtml = '<span style="background: #fefce8; color: #854d0e; border: 1px solid #fde047; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.72rem;">🟡 Sobrante</span>';
            }

            return `
                <tr>
                    <td style="text-align: center;"><img src="${img}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--admin-border-color);" onerror="this.src='img/logo_provisional.png'"></td>
                    <td>
                        <div style="font-weight: 800; color: var(--admin-text-main); font-size: 0.85rem;">${fullTitle}</div>
                    </td>
                    <td style="text-align: center;"><span style="font-family: monospace; font-weight: 800; color: var(--admin-accent); font-size: 0.82rem;">${match.shortCode}</span></td>
                    <td style="text-align: center;"><strong style="font-size: 0.9rem;">${item.expectedStock}</strong></td>
                    <td style="text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <button type="button" onclick="window.adjustAdminPcAuditItemCount('${item.key}', -1)" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; width: 22px; height: 22px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
                            <strong style="font-size: 0.95rem; min-width: 24px; text-align: center;">${item.countPhysical}</strong>
                            <button type="button" onclick="window.adjustAdminPcAuditItemCount('${item.key}', 1)" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; width: 22px; height: 22px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                        </div>
                    </td>
                    <td style="text-align: center;"><strong style="font-size: 0.9rem; color: ${diff < 0 ? '#dc2626' : (diff > 0 ? '#ca8a04' : '#15803d')};">${diffStr}</strong></td>
                    <td style="text-align: center;">${badgeHtml}</td>
                </tr>
            `;
        }).join('');
    };

    window.adjustAdminPcAuditItemCount = function(key, delta) {
        if (!window.adminPcAuditCounts[key]) return;
        window.adminPcAuditCounts[key].countPhysical = Math.max(0, window.adminPcAuditCounts[key].countPhysical + delta);
        window.renderAdminPcAuditPanel();
        window.focusAdminPcScannerInput();
    };

    window.applyAdminPcAuditToStock = function() {
        const items = Object.values(window.adminPcAuditCounts || {});
        if (items.length === 0) {
            alert('No hay items en la sesión de auditoría para sincronizar.');
            return;
        }

        if (!confirm(`¿Estás seguro de actualizar el stock real de los ${items.length} productos/variantes auditados para coincidir con el recuento físico?`)) {
            return;
        }

        let updatedCount = 0;
        items.forEach(item => {
            const match = item.match;
            const isVariant = match.matchType === 'variant' && match.measureVariant;
            if (isVariant) {
                window.updateAdminStockVariantQty(match.prod.id, match.gIdx, match.mIdx, item.countPhysical);
            } else {
                window.updateAdminStockFinishGroupQty(match.prod.id, match.gIdx, item.countPhysical);
            }
            item.expectedStock = item.countPhysical;
            updatedCount++;
        });

        if (typeof window.showAdminToast === 'function') {
            window.showAdminToast(`✅ ¡Stock real sincronizado con auditoría para ${updatedCount} productos!`);
        } else {
            alert(`Stock real sincronizado exitosamente para ${updatedCount} ítems.`);
        }

        window.renderAdminPcAuditPanel();
        window.focusAdminPcScannerInput();
    };

    window.exportAdminPcAuditCSV = function() {
        const items = Object.values(window.adminPcAuditCounts || {});
        if (items.length === 0) {
            alert('No hay registros de auditoría para exportar.');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,Codigo,Producto,Acabado,Medida,Esperado_Sistema,Fisico_Contado,Diferencia,Estado\n';
        items.forEach(item => {
            const match = item.match;
            const prod = match.prod;
            const g = match.finishGroup;
            const m = match.measureVariant;
            const isVariant = match.matchType === 'variant' && m;
            const acabName = g.acabado_name || 'Estándar';
            const medName = isVariant && m ? m.medida : 'Única';
            const diff = item.countPhysical - item.expectedStock;
            const state = diff === 0 ? 'OK' : (diff < 0 ? 'FALTANTE' : 'SOBRANTE');

            const titleEscaped = `"${(prod.title || '').replace(/"/g, '""')}"`;
            const acabEscaped = `"${acabName.replace(/"/g, '""')}"`;
            const medEscaped = `"${medName.replace(/"/g, '""')}"`;

            csvContent += `${match.shortCode},${titleEscaped},${acabEscaped},${medEscaped},${item.expectedStock},${item.countPhysical},${diff},${state}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `auditoria_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.resetAdminPcAuditSession = function() {
        if (Object.keys(window.adminPcAuditCounts || {}).length === 0) return;
        if (confirm('¿Deseas reiniciar la sesión de auditoría actual y borrar todos los conteos físicos registrados?')) {
            window.adminPcAuditCounts = {};
            window.renderAdminPcAuditPanel();
            window.focusAdminPcScannerInput();
        }
    };

    // --- CÁMARA DE CELULAR / LAPTOP PARA ESCANEO ---
    window.adminCameraScannerInstance = null;

    window.openAdminCameraScannerModal = function() {
        const modal = document.getElementById('admin-camera-scanner-modal');
        const feedback = document.getElementById('admin-camera-scan-feedback');
        if (!modal) return;

        modal.style.display = 'flex';
        if (feedback) feedback.textContent = 'Iniciando cámara...';

        if (typeof Html5Qrcode !== 'function') {
            if (feedback) feedback.textContent = '❌ Error: Librería Html5Qrcode no disponible.';
            return;
        }

        try {
            if (window.adminCameraScannerInstance) {
                window.adminCameraScannerInstance.stop().catch(() => {}).finally(() => {
                    window.startAdminCameraScannerInstance();
                });
            } else {
                window.startAdminCameraScannerInstance();
            }
        } catch(e) {
            console.error("Error iniciando escáner de cámara:", e);
            if (feedback) feedback.textContent = '❌ No se pudo acceder a la cámara.';
        }
    };

    window.startAdminCameraScannerInstance = function() {
        const feedback = document.getElementById('admin-camera-scan-feedback');
        window.adminCameraScannerInstance = new Html5Qrcode("admin-camera-reader-viewport");

        const config = {
            fps: 15,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.333
        };

        window.adminCameraScannerInstance.start(
            { facingMode: "environment" }, // Priorizar cámara trasera del celular
            config,
            (decodedText, decodedResult) => {
                // Código escaneado con éxito
                if (feedback) feedback.textContent = `✅ Escaneado: ${decodedText}`;
                
                const input = document.getElementById('admin-pc-scanner-input');
                if (input) {
                    input.value = decodedText;
                }
                
                // Procesar el escaneo
                window.processAdminPcScan();

                // Reproducir beep corto
                window.playAdminPcBeep('success');

                // Pausa breve para evitar lecturas múltiples seguidas del mismo código
                window.adminCameraScannerInstance.pause(true);
                setTimeout(() => {
                    try { window.adminCameraScannerInstance.resume(); } catch(e) {}
                    if (feedback) feedback.textContent = 'Apuntá a otro código...';
                }, 1200);
            },
            (errorMessage) => {
                // Error de lectura continuo (normal mientras busca)
            }
        ).then(() => {
            if (feedback) feedback.textContent = '📷 Cámara activa. Apuntá al código de barras o QR.';
        }).catch(err => {
            console.error("Error al iniciar cámara trasera:", err);
            // Intentar con cualquier cámara disponible si falla 'environment'
            window.adminCameraScannerInstance.start(
                { facingMode: "user" },
                config,
                (decodedText) => {
                    const input = document.getElementById('admin-pc-scanner-input');
                    if (input) input.value = decodedText;
                    window.processAdminPcScan();
                    window.playAdminPcBeep('success');
                }
            ).catch(err2 => {
                if (feedback) feedback.textContent = '❌ Permiso de cámara denegado o sin cámara.';
            });
        });
    };

    window.closeAdminCameraScannerModal = function() {
        const modal = document.getElementById('admin-camera-scanner-modal');
        if (modal) modal.style.display = 'none';

        if (window.adminCameraScannerInstance) {
            try {
                window.adminCameraScannerInstance.stop().then(() => {
                    window.adminCameraScannerInstance.clear();
                    window.adminCameraScannerInstance = null;
                }).catch(() => {
                    window.adminCameraScannerInstance = null;
                });
            } catch(e) {
                window.adminCameraScannerInstance = null;
            }
        }
        window.focusAdminPcScannerInput();
    };

    // --- SISTEMA DE ESCÁNER REMOTO (VINCULACIÓN POR QR DE CELULAR) ---
    window.adminRemoteChannel = null;

    window.openAdminRemotePairingModal = function() {
        const modal = document.getElementById('admin-remote-pairing-modal');
        const qrContainer = document.getElementById('admin-remote-qr-container');
        if (!modal) return;

        // Generar URL HTTPS para la aplicación de escáner dedicada en el celular
        const remoteUrl = "https://latarimadecoracion.github.io/apps/scanner.html";

        if (qrContainer) {
            qrContainer.innerHTML = '';
            if (typeof QRCode === 'function') {
                try {
                    new QRCode(qrContainer, {
                        text: remoteUrl,
                        width: 160,
                        height: 160,
                        colorDark: "#0f172a",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } catch(e) {
                    qrContainer.innerHTML = '<span style="font-size:0.75rem;color:#dc2626;">Error cargando QR</span>';
                }
            } else {
                qrContainer.innerHTML = `<a href="${remoteUrl}" target="_blank" style="font-size:0.75rem;word-break:break-all;">${remoteUrl}</a>`;
            }
        }

        window.initAdminRemoteChannel();
        modal.style.display = 'flex';
    };

    window.closeAdminRemotePairingModal = function() {
        const modal = document.getElementById('admin-remote-pairing-modal');
        if (modal) modal.style.display = 'none';
        window.focusAdminPcScannerInput();
    };

    window.initAdminRemoteChannel = function() {
        if (window.adminRemoteChannelInitialized) return;
        window.adminRemoteChannelInitialized = true;

        // 1. Intentar usar BroadcastChannel para comunicación local entre ventanas/pestañas
        if ('BroadcastChannel' in window) {
            try {
                window.adminRemoteChannel = new BroadcastChannel('tarima_remote_scanner');
                window.adminRemoteChannel.onmessage = function(ev) {
                    if (ev.data && ev.data.code) {
                        window.processRemoteScanCode(ev.data.code);
                    }
                };
            } catch(e) {}
        }

        // 2. Fallback de localStorage (Cross-tab / Cross-device si comparten sesión)
        window.addEventListener('storage', function(e) {
            if (e.key === 'tarima_remote_scan_signal' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data && data.code && (Date.now() - data.ts) < 5000) {
                        window.processRemoteScanCode(data.code);
                    }
                } catch(err) {}
            }
        });
    };

    window.processRemoteScanCode = function(code) {
        const input = document.getElementById('admin-pc-scanner-input');
        if (input) {
            input.value = code;
        }
        window.processAdminPcScan();
        window.playAdminPcBeep('success');

        const statusEl = document.getElementById('admin-remote-pairing-status');
        if (statusEl) {
            statusEl.textContent = `⚡ Escaneado desde celular: ${code}`;
            statusEl.style.background = '#dcfce7';
            statusEl.style.color = '#15803d';
            setTimeout(() => {
                statusEl.textContent = '🟢 Esperando escaneos del celular...';
                statusEl.style.background = '#f0fdf4';
                statusEl.style.color = '#16a34a';
            }, 2500);
        }
    };

    window.initAdminPcStockModule = function() {
        const input = document.getElementById('admin-pc-scanner-input');
        if (input) {
            input.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.processAdminPcScan();
                }
            };
        }

        // Event delegation para mantener el foco en la caja del escáner en la vista PC
        const view = document.getElementById('admin-pc-stock-view');
        if (view) {
            view.onclick = function(e) {
                const target = e.target;
                if (target && target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && target.tagName !== 'SELECT' && target.tagName !== 'A') {
                    window.focusAdminPcScannerInput();
                }
            };
        }

        window.initAdminRemoteChannel();
        window.showAdminPcModePlaceholder(window.adminPcScanMode || 'pos');
        window.focusAdminPcScannerInput();
    };
})();

