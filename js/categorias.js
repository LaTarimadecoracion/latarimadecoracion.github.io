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

    // Ordenar categorías según su orden configurado
    const sortedCategories = [...sourceData].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Obtener lista de rubros visibles para saber si filtramos
    const rubrosList = (window.siteConfig && window.siteConfig.rubros) || [{ id: 'carpinteria', name: 'Carpintería' }];
    const visibleRubros = rubrosList.filter(r => r.visible !== false);

    // Inyectar tarjeta especial de OFERTAS Y COMBOS al inicio
    const rawOffers = (window.sessionOffers && window.sessionOffers.length > 0) ? window.sessionOffers : (typeof offersData !== 'undefined' ? offersData : []);
    const activeOffersCount = rawOffers.filter(o => o.active !== false).length;
    const offersCard = document.createElement('div');
    offersCard.className = 'feed-card offer-category-tile';
    offersCard.style.cssText = `
        margin: 0; 
        position: relative;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        border: 2px solid #b38728;
        border-radius: 12px;
        overflow: hidden;
    `;
    offersCard.innerHTML = `
        <div class="feed-card-photo-container" style="background: linear-gradient(135deg, #1a1a1a, #2d2a26);">
            <div class="feed-card-img-wrapper" style="position:relative; opacity: 0.85;">
                <img src="img/logo_provisional.png" class="feed-card-img loaded" alt="Ofertas y Combos" loading="lazy">
            </div>
            <div class="stamp-badge pro-gold" style="position: absolute; top: 10px; left: 10px; z-index: 5;">
                🔥 OFERTA PRO GOLD
            </div>
            <div class="feed-card-gradient"></div>
            <div class="feed-card-info" style="bottom: 0; left: 0; right: 0; padding: 0.5rem; text-align: center; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);">
                <h3 class="feed-card-title" style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0; color: #fcf6ba; text-align: center; width: 100%;">
                    🏷️ OFERTA Y COMBOS
                </h3>
                <span style="font-size: 0.75rem; color: #e2b043; font-weight: 700;">${activeOffersCount > 0 ? `¡${activeOffersCount} combos disponibles!` : 'Promociones especiales'}</span>
            </div>
        </div>
    `;
    offersCard.addEventListener('click', () => {
        if (window.navigateToView) {
            window.navigateToView('view-offers');
        }
    });
    container.appendChild(offersCard);

    sortedCategories.forEach((cat, index) => {
        if (cat.visible === false) return;
        
        // Excluir la categoría virtual obligatoria
        if (cat.id.endsWith('-todos')) return;

        // Filtrar por rubro si hay más de uno disponible
        if (visibleRubros.length > 1) {
            const catRubro = cat.rubro || 'carpinteria';
            if (catRubro !== window.activeCategoriesRubro) return;
        }

        const catCard = document.createElement('div');
        catCard.className = 'feed-card';
        // Ajustamos márgenes para que la grilla los maneje limpios
        catCard.style.cssText = `
            margin: 0; 
            position: relative;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;

        const catCover = Array.isArray(cat.image) ? cat.image[0] : (cat.image || 'img/logo_provisional.png');
        
        catCard.innerHTML = `
            <div class="feed-card-photo-container">
                <div class="feed-card-img-wrapper" style="position:relative;">
                    <img src="${catCover}" class="feed-card-img lazy-img" alt="${cat.name}" loading="lazy" decoding="async" onload="this.classList.add('loaded')">
                </div>
                <div class="feed-card-gradient"></div>
                <div class="feed-card-info" style="bottom: 0; left: 0; right: 0; padding: 0.35rem 0.5rem; text-align: center;">
                    <h3 class="feed-card-title" style="font-size: 1.05rem; margin-bottom: 0; text-align: center; width: 100%;">${cat.name}</h3>
                </div>
            </div>
        `;

        // Navegación al tocar la categoría
        catCard.addEventListener('click', () => {
            if (window.navigateToCategoryFeed) {
                window.navigateToCategoryFeed(cat.id);
            } else {
                console.warn('[Categorias] navigateToCategoryFeed no está definido.');
            }
        });

        // Animación suave al pasar el mouse (para desktop)
        catCard.addEventListener('mouseenter', () => {
            catCard.style.transform = 'translateY(-3px)';
            catCard.style.boxShadow = '0 6px 15px rgba(0,0,0,0.08)';
            const img = catCard.querySelector('.feed-card-img');
            if(img) img.style.transform = 'scale(1.05)';
        });
        catCard.addEventListener('mouseleave', () => {
            catCard.style.transform = 'translateY(0)';
            catCard.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)';
            const img = catCard.querySelector('.feed-card-img');
            if(img) img.style.transform = 'scale(1)';
        });

        container.appendChild(catCard);
    });
};
