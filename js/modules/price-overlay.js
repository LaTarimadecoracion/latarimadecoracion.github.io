/**
 * =============================================================================
 * js/modules/price-overlay.js
 * Motor Híbrido de Precios en Vivo y Respaldo Offline (Price Delta Overlay)
 * La Tarima 2.0
 * =============================================================================
 */

(function (window) {
    'use strict';

    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
    const isLocal = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
    const API_BASE = isLocal ? '/api' : WORKER_URL;
    const STORAGE_KEY = 'latarima_prices_cache';
    const CACHE_TTL_MS = 45 * 1000; // 45 segundos para re-validar con el Edge

    let state = {
        updatedAt: 0,
        products: {},
        workshop: null,
        isLoaded: false,
        lastFetch: 0
    };

    /**
     * Carga inicial desde caché local (0ms de latencia)
     */
    function loadFromLocalCache() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.products === 'object') {
                    state.updatedAt = parsed.updatedAt || 0;
                    state.products = parsed.products || {};
                    state.workshop = parsed.workshop || null;
                    state.isLoaded = true;
                    applyWorkshopCosts(state.workshop);
                }
            }
        } catch (e) {
            console.warn('[PriceOverlay] Error leyendo caché local:', e);
        }
    }

    /**
     * Guarda en caché local
     */
    function saveToLocalCache() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                updatedAt: state.updatedAt,
                products: state.products,
                workshop: state.workshop,
                cachedAt: Date.now()
            }));
        } catch (e) {
            console.warn('[PriceOverlay] Error guardando caché local:', e);
        }
    }

    /**
     * Aplica costos de taller dinámicos a las configuraciones globales
     */
    function applyWorkshopCosts(workshopData) {
        if (!workshopData || typeof workshopData !== 'object') return;

        // 1. Cortes
        if (window.cortesConfig && workshopData.cortes) {
            if (workshopData.cortes.precio_m2_venta) {
                window.cortesConfig.precios = window.cortesConfig.precios || {};
                window.cortesConfig.precios.precio_m2_venta = Number(workshopData.cortes.precio_m2_venta);
            }
            if (workshopData.cortes.minimo_corte_taller) {
                window.cortesConfig.precios = window.cortesConfig.precios || {};
                window.cortesConfig.precios.minimo_corte_taller = Number(workshopData.cortes.minimo_corte_taller);
            }
        }

        // 2. Cajones
        if (window.cajonesConfig && workshopData.cajones) {
            if (workshopData.cajones.minimo_cajon) {
                window.cajonesConfig.taller = window.cajonesConfig.taller || {};
                window.cajonesConfig.taller.minimo_cajon = Number(workshopData.cajones.minimo_cajon);
            }
        }
    }

    /**
     * Aplica la delta de precios a un objeto de producto individual
     */
    function applyToProduct(product) {
        if (!product || !product.id) return product;
        const live = state.products[String(product.id)];
        if (!live) return product;

        // Actualizar precio base
        if (live.price !== undefined && live.price !== null) {
            product.price = Number(live.price);
        }
        if (live.cost_price !== undefined) {
            product.cost_price = Number(live.cost_price);
        }

        // Actualizar variantes de acabados y medidas
        if (live.variants && Array.isArray(product.acabados_groups)) {
            product.acabados_groups.forEach(g => {
                (g.medidas_variants || []).forEach(v => {
                    const vMedida = (v.medida || '').trim();
                    const vLive = live.variants[vMedida];
                    if (vLive) {
                        if (vLive.price !== undefined) v.price = Number(vLive.price);
                        if (vLive.cost_price !== undefined) v.cost_price = Number(vLive.cost_price);
                    }
                });
            });
        }

        return product;
    }

    /**
     * Aplica la delta en masa sobre el array del catálogo
     */
    function applyToCatalogList(catalogArray) {
        if (!Array.isArray(catalogArray) || !state.products) return catalogArray;
        catalogArray.forEach(p => {
            if (!p || !p.id) return;
            const live = state.products[String(p.id)];
            if (live && live.price !== undefined) {
                p.price = Number(live.price);
            }
        });
        return catalogArray;
    }

    /**
     * Consulta al Edge Worker de Cloudflare por actualizaciones
     */
    async function syncFromCloud(force = false) {
        const now = Date.now();
        if (!force && (now - state.lastFetch) < CACHE_TTL_MS) {
            return state;
        }

        try {
            state.lastFetch = now;
            const url = `${API_BASE}/precios-nube?v=${state.updatedAt || 0}`;
            const res = await fetch(url, { method: 'GET', mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (data && data.success) {
                const isNewer = Number(data.updatedAt) > Number(state.updatedAt);
                if (isNewer || force) {
                    state.updatedAt = data.updatedAt || Date.now();
                    state.products = data.products || {};
                    state.workshop = data.workshop || null;
                    state.isLoaded = true;

                    saveToLocalCache();
                    applyWorkshopCosts(state.workshop);

                    // Notificar reactivamente a toda la aplicación
                    try {
                        window.dispatchEvent(new CustomEvent('latarima:prices-updated', {
                            detail: {
                                updatedAt: state.updatedAt,
                                products: state.products,
                                workshop: state.workshop
                            }
                        }));
                    } catch (_) {}

                    console.log(`[PriceOverlay] ⚡ Precios sincronizados desde la nube (${Object.keys(state.products).length} productos actualizados)`);
                }
            }
        } catch (err) {
            console.warn('[PriceOverlay] Sincronización en segundo plano diferida:', err.message);
        }

        return state;
    }

    /**
     * Envía nuevos precios a la nube desde el panel de administración
     */
    async function pushPricesToCloud(productsDelta, workshopDelta, adminEmail) {
        try {
            const payload = {
                updatedBy: adminEmail || 'admin',
                products: productsDelta || {},
                workshop: workshopDelta || null
            };

            const url = `${API_BASE}/admin/precios-nube`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data && data.success) {
                // Actualizar estado local inmediatamente
                state.updatedAt = data.updatedAt || Date.now();
                state.products = { ...state.products, ...(productsDelta || {}) };
                if (workshopDelta) state.workshop = { ...(state.workshop || {}), ...workshopDelta };
                saveToLocalCache();

                window.dispatchEvent(new CustomEvent('latarima:prices-updated', {
                    detail: {
                        updatedAt: state.updatedAt,
                        products: state.products,
                        workshop: state.workshop
                    }
                }));

                return { ok: true, count: data.count, updatedAt: state.updatedAt };
            } else {
                return { ok: false, message: data.message || 'Error en respuesta del Worker' };
            }
        } catch (err) {
            console.error('[PriceOverlay] Error publicando precios en la nube:', err);
            return { ok: false, message: err.message };
        }
    }

    /**
     * Inicialización inmediata
     */
    function init() {
        loadFromLocalCache();
        // Sincronizar en segundo plano sin bloquear el renderizado
        setTimeout(() => {
            syncFromCloud().catch(() => {});
        }, 100);
    }

    // Auto-arranque
    init();

    window.PriceOverlay = {
        getState: () => state,
        applyToProduct,
        applyToCatalogList,
        syncFromCloud,
        pushPricesToCloud
    };

})(typeof window !== 'undefined' ? window : globalThis);
