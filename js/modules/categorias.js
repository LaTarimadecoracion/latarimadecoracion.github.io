// js/categorias.js

/**
 * Módulo para la vista de Categorías.
 * Dibuja una grilla con todas las categorías disponibles.
 */

window.activeCategoriesRubro = 'carpinteria';

window.renderCategoriesRubrosTabs = function() {
    const container = document.getElementById('categories-rubros-tabs-container');
    if (!container) return;

    const rubrosList = (window.siteConfig && window.siteConfig.rubros) || [
        { id: "carpinteria", name: "Carpintería" }
    ];

    const visibleRubros = rubrosList.filter(r => r.visible !== false);

    if (visibleRubros.length <= 1) {
        container.classList.add('single-rubro');
        container.innerHTML = '';
        if (visibleRubros.length === 1) {
            window.activeCategoriesRubro = visibleRubros[0].id;
        }
        return;
    } else {
        container.classList.remove('single-rubro');
    }

    container.innerHTML = '';
    visibleRubros.forEach(r => {
        const isActive = r.id === window.activeCategoriesRubro;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
        
        // Forzar ancho geométrico exacto por JS inline
        const pct = (100 / visibleRubros.length).toFixed(4);
        btn.style.width = pct + '%';
        btn.style.flex = `0 0 ${pct}%`;

        btn.innerHTML = r.name;
        btn.addEventListener('click', () => {
            window.activeCategoriesRubro = r.id;
            window.renderCategoriesRubrosTabs();
            window.renderCategoriesMenu();
        });
        container.appendChild(btn);
    });
};

window.renderCategoriesMenu = function() {
    // Dibujar primero las pestañas adaptativas
    window.renderCategoriesRubrosTabs();

    const container = document.getElementById('categories-menu-container');
    if (!container) return;

    // Limpiar contenedor
    container.innerHTML = '';

    // Obtener datos (priorizando la data de sesión enriquecida si existe)
    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) 
        ? sessionProducts 
        : (typeof productsData !== 'undefined' ? productsData : []);
    
    if (sourceData.length === 0) {
        container.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1; text-align: center;">No hay categorías disponibles.</p>';
        return;
    }

    // Ordenar categorías estrictamente en orden alfabético A-Z (independiente del editor admin)
    const sortedCategories = [...sourceData].sort((a, b) => {
        const nameA = (a.name || '').trim();
        const nameB = (b.name || '').trim();
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base', numeric: true });
    });

    // Obtener lista de rubros visibles para saber si filtramos
    const rubrosList = (window.siteConfig && window.siteConfig.rubros) || [{ id: 'carpinteria', name: 'Carpintería' }];
    const visibleRubros = rubrosList.filter(r => r.visible !== false);

    // Calcular ofertas y beneficios de envío activos para el rubro actual
    const currentRubro = (visibleRubros.length > 1 && window.activeCategoriesRubro) ? window.activeCategoriesRubro.toLowerCase() : 'carpinteria';
    const rawOffers = (window.sessionOffers && window.sessionOffers.length > 0) ? window.sessionOffers : (typeof offersData !== 'undefined' ? offersData : []);
    
    // Obtener mapa rápido de producto -> rubro
    const catRubroMap = {};
    sourceData.forEach(cat => {
        const r = (cat.rubro || 'carpinteria').toLowerCase();
        if (Array.isArray(cat.products)) {
            cat.products.forEach(p => { if (p && p.id) catRubroMap[p.id] = r; });
        }
    });

    const activeCombos = rawOffers.filter(o => {
        if (o.active === false) return false;
        if (o.hasTimer && o.expirationDate) {
            const expTime = new Date(o.expirationDate).getTime();
            if (!isNaN(expTime) && expTime <= Date.now()) return false;
        }
        if (visibleRubros.length > 1) {
            let offerRubro = 'carpinteria';
            if (Array.isArray(o.product_items) && o.product_items.length > 0) {
                for (const item of o.product_items) {
                    const id = item.id || item.productId;
                    if (id && catRubroMap[id]) {
                        offerRubro = catRubroMap[id];
                        break;
                    }
                }
            }
            if (offerRubro !== currentRubro) return false;
        }
        return true;
    });

    const freeShipItems = (typeof window.getFreeShippingProducts === 'function') ? window.getFreeShippingProducts() : [];
    const activeFreeShip = freeShipItems.filter(item => {
        if (!item || !item.product) return false;
        if (visibleRubros.length > 1) {
            const itemRubro = (catRubroMap[item.product.id] || item.product.rubro || 'carpinteria').toLowerCase();
            if (itemRubro !== currentRubro) return false;
        }
        return true;
    });

    const totalPromos = activeCombos.length + activeFreeShip.length;

    // Inyectar tarjeta especial de OFERTAS Y COMBOS si hay ofertas o productos con beneficios
    if (totalPromos > 0) {
        let promoSubtitle = 'Promociones especiales';
        if (activeCombos.length > 0 && activeFreeShip.length > 0) {
            promoSubtitle = `¡${activeCombos.length} combos y ${activeFreeShip.length} envíos bonificados!`;
        } else if (activeCombos.length > 0) {
            promoSubtitle = activeCombos.length === 1 ? '¡1 combo disponible!' : `¡${activeCombos.length} combos disponibles!`;
        } else if (activeFreeShip.length > 0) {
            promoSubtitle = activeFreeShip.length === 1 ? '¡1 producto con beneficio de envío!' : `¡${activeFreeShip.length} productos con envío bonificado!`;
        }

        const offersCard = document.createElement('div');
        offersCard.className = 'category-tile offer-category-tile';
        offersCard.style.border = '2px solid #b38728';
        offersCard.innerHTML = `
            <div class="category-tile-photo" style="background: linear-gradient(135deg, #1a1a1a, #2d2a26);">
                <img src="${window.getThumbUrl ? window.getThumbUrl('img/borrador/portada-imagen.webp') : 'img/borrador/portada-imagen.webp'}" class="category-tile-img loaded" alt="Ofertas y Combos" loading="lazy">
                <div class="stamp-badge pro-gold" style="position: absolute; top: 10px; left: 10px; z-index: 5;">
                    🔥 OFERTA PRO GOLD
                </div>
                <div class="category-tile-gradient"></div>
                <span class="category-tile-count-badge" style="background: rgba(179, 135, 40, 0.88); border-color: rgba(252, 246, 186, 0.5); color: #fff;">
                    <span class="material-symbols-outlined" style="font-size: 13px; color: #fcf6ba;">local_fire_department</span>
                    <span>${totalPromos} ${totalPromos === 1 ? 'promo' : 'promos'}</span>
                </span>
                <div class="category-tile-info">
                    <h3 class="category-tile-title" style="color: #fcf6ba !important;">🏷️ OFERTAS Y COMBOS</h3>
                </div>
            </div>
        `;
        offersCard.addEventListener('click', () => {
            if (window.navigateToView) window.navigateToView('view-offers');
        });
        container.appendChild(offersCard);
    }

    sortedCategories.forEach((cat, index) => {
        if (cat.visible === false) return;
        
        // Excluir la categoría virtual obligatoria
        if (cat.id.endsWith('-todos')) return;

        // Filtrar por rubro si hay más de uno disponible
        if (visibleRubros.length > 1) {
            const catRubro = cat.rubro || 'carpinteria';
            if (catRubro !== window.activeCategoriesRubro) return;
        }

        const prodsCount = (cat.products && Array.isArray(cat.products)) ? cat.products.filter(p => p.visible !== false).length : 0;
        const countText = prodsCount > 0 ? `${prodsCount} ${prodsCount === 1 ? 'modelo' : 'modelos'}` : '';

        const catCard = document.createElement('div');
        catCard.className = 'category-tile';
        const rawCatCover = Array.isArray(cat.image) ? cat.image[0] : (cat.image || 'img/logo_provisional.png');
        const catCover = window.getThumbUrl ? window.getThumbUrl(rawCatCover) : rawCatCover;

        catCard.innerHTML = `
            <div class="category-tile-photo">
                <img src="${catCover}" class="category-tile-img lazy-img" alt="${cat.name}" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="if(window.__imgFallback) window.__imgFallback(this); else { this.onerror=null; this.src='img/logo_provisional.png'; }">
                <div class="category-tile-gradient"></div>
                ${countText ? `<span class="category-tile-count-badge">
                    <span class="material-symbols-outlined" style="font-size: 13px; color: #f59e0b;">chair</span>
                    <span>${countText}</span>
                </span>` : ''}
                <div class="category-tile-info">
                    <h3 class="category-tile-title">${cat.name}</h3>
                </div>
            </div>
        `;

        catCard.addEventListener('click', () => {
            if (window.navigateToCategoryFeed) {
                window.navigateToCategoryFeed(cat.id);
            }
        });
        container.appendChild(catCard);
    });
};
