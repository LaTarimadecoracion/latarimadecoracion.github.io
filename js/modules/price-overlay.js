/**
 * =============================================================================
 * js/modules/price-overlay.js
 * Motor Híbrido de Precios en Vivo y Respaldo Offline (Price Delta Overlay)
 * La Tarima 2.0
 * 
 * Soporta dos modos bidireccionales inteligentes:
 * 1. Online: Sincronización instantánea con Cloudflare Worker KV.
 * 2. Offline / Local-First: Si modificás precios en tu PC sin internet, se
 *    guardan localmente y en una cola de salida (Outbox). Al volver la
 *    conexión, tu PC actualiza a la nube (y no al revés).
 * =============================================================================
 */

(function (window) {
    'use strict';

    const WORKER_URL = 'https://super-shadow-4ad9.latarimadecoracion.workers.dev';
    const isLocal = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
    const API_BASE = isLocal ? '/api' : WORKER_URL;
    const STORAGE_KEY = 'latarima_prices_cache';
    const OUTBOX_KEY = 'latarima_pending_cloud_sync';
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
     * Obtiene la cola de cambios pendientes hechos sin conexión
     */
    function getPendingOutbox() {
        try {
            const raw = localStorage.getItem(OUTBOX_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Guarda cambios en la cola de salida para subir cuando haya internet
     */
    function savePendingOutbox(productsDelta, workshopDelta, adminEmail) {
        try {
            const current = getPendingOutbox() || { products: {}, workshop: null, adminEmail: 'admin', localModifiedAt: 0 };
            const mergedProducts = { ...(current.products || {}), ...(productsDelta || {}) };
            const mergedWorkshop = workshopDelta ? { ...(current.workshop || {}), ...workshopDelta } : current.workshop;

            localStorage.setItem(OUTBOX_KEY, JSON.stringify({
                products: mergedProducts,
                workshop: mergedWorkshop,
                adminEmail: adminEmail || current.adminEmail || 'admin',
                localModifiedAt: Date.now()
            }));
            console.log('[PriceOverlay] 📦 Cambios guardados en cola offline. Se sincronizarán al conectarse a internet.');
        } catch (e) {
            console.warn('[PriceOverlay] Error guardando cola offline:', e);
        }
    }

    /**
     * Limpia la cola offline tras sincronización exitosa
     */
    function clearPendingOutbox() {
        try {
            localStorage.removeItem(OUTBOX_KEY);
        } catch (_) {}
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
     * Vacía la cola de cambios pendientes hacia la nube en cuanto hay conexión
     */
    async function flushPendingOutbox() {
        const pending = getPendingOutbox();
        if (!pending || (!pending.products && !pending.workshop)) return false;

        console.log('[PriceOverlay] 🔄 Vaciando cola de salida offline hacia la nube...');
        const res = await pushPricesToCloud(pending.products, pending.workshop, pending.adminEmail, true);
        if (res && res.ok && !res.offlineQueued) {
            clearPendingOutbox();
            console.log('[PriceOverlay] ✅ Sincronización offline completada con éxito.');
            try {
                if (window.showAdminToast) {
                    window.showAdminToast('⚡ Conexión recuperada: Precios offline sincronizados con la nube');
                }
            } catch (_) {}
            return true;
        }
        return false;
    }

    /**
     * Consulta al Edge Worker de Cloudflare por actualizaciones
     */
    async function syncFromCloud(force = false) {
        // Si tenemos cambios locales pendientes que hicimos sin conexión,
        // primero enviamos nuestros cambios a la nube para que NO se sobreescriban al revés
        const pending = getPendingOutbox();
        if (pending) {
            const flushed = await flushPendingOutbox();
            if (flushed) return state;
        }

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
     * Si no hay conexión, los almacena en el Outbox y los enviará al reconectar
     */
    async function pushPricesToCloud(productsDelta, workshopDelta, adminEmail, isFlushing = false) {
        // 1. Siempre actualizar el estado local en la PC inmediatamente (0ms)
        const now = Date.now();
        state.updatedAt = now;
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

        // 2. Intentar enviar a la nube
        try {
            const payload = {
                updatedBy: adminEmail || 'admin',
                products: productsDelta || {},
                workshop: workshopDelta || null,
                timestamp: now
            };

            const url = `${API_BASE}/admin/precios-nube`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data && data.success) {
                if (!isFlushing) clearPendingOutbox();
                return { ok: true, count: data.count, updatedAt: state.updatedAt };
            } else {
                throw new Error(data.message || 'Error en respuesta del Worker');
            }
        } catch (err) {
            console.warn('[PriceOverlay] ⚠️ No se pudo conectar a la nube en este momento:', err.message);
            // Si falló el envío (offline o error de red), encolar en el Outbox local
            if (!isFlushing) {
                savePendingOutbox(productsDelta, workshopDelta, adminEmail);
            }
            return {
                ok: true,
                offlineQueued: true,
                message: 'Precios guardados localmente en tu PC. Se sincronizarán a la nube automáticamente al detectar conexión.'
            };
        }
    }

    /**
     * Inicialización inmediata
     */
    function init() {
        loadFromLocalCache();

        // Si hay conexión o vuelve la conexión a internet, procesar cola de cambios
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('online', () => {
                console.log('[PriceOverlay] 🌐 Conexión detectada: Sincronizando cambios locales con la nube...');
                flushPendingOutbox().catch(() => {});
            });
        }

        // Sincronizar en segundo plano sin bloquear el renderizado
        setTimeout(() => {
            syncFromCloud().catch(() => {});
        }, 150);
    }

    // Auto-arranque
    init();

    window.PriceOverlay = {
        getState: () => state,
        applyToProduct,
        applyToCatalogList,
        syncFromCloud,
        pushPricesToCloud,
        flushPendingOutbox,
        hasPendingOutbox: () => Boolean(getPendingOutbox())
    };

})(typeof window !== 'undefined' ? window : globalThis);
