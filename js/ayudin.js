// js/ayudin.js
// --- LOGIC FOR AYUDIN HELP CENTER ---

document.addEventListener('DOMContentLoaded', () => {
    const rubrosTabsContainer = document.getElementById('ayudin-rubros-tabs');
    const gridContainer = document.getElementById('ayudin-grid-container');
    const emptyState = document.getElementById('ayudin-empty-state');
    
    // Modal elements
    const detailModal = document.getElementById('ayudin-detail-modal');
    const modalTitle = document.getElementById('modal-detail-title');
    const modalRubroBadge = document.getElementById('modal-rubro-badge');
    const modalContent = document.getElementById('modal-detail-content');
    const btnCloseModal = document.getElementById('btn-close-ayudin-modal');

    let activeRubro = 'carpinteria';

    // 1. Renderizar pestañas de rubros
    function renderRubrosTabs() {
        if (!rubrosTabsContainer) return;
        
        const rubros = window.ayudinRubros || [];
        if (rubros.length === 0) return;

        rubrosTabsContainer.innerHTML = '';
        rubros.forEach(r => {
            const isActive = r.id === activeRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto equitativo
            const pct = (100 / rubros.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                activeRubro = r.id;
                renderRubrosTabs();
                renderGrid();
            });
            rubrosTabsContainer.appendChild(btn);
        });
    }

    // 2. Renderizar la grilla de aplicaciones
    function renderGrid() {
        if (!gridContainer) return;

        gridContainer.innerHTML = '';

        const data = window.ayudinData || [];
        const filtered = data.filter(item => item.rubro === activeRubro);

        // Actualizar título e icono de la sección
        const activeRubroObj = (window.ayudinRubros || []).find(r => r.id === activeRubro);
        if (activeRubroObj) {
            const titleTextEl = document.getElementById('section-title-text');
            const iconEl = document.getElementById('section-icon');
            if (titleTextEl) titleTextEl.textContent = `Ayudas de ${activeRubroObj.name}`;
            if (iconEl) iconEl.textContent = activeRubroObj.icon || 'handyman';
        }

        if (filtered.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'ayudin-card';

            const actionLabel = item.actionUrl ? 'Abrir herramienta' : 'Ver guía completa';
            const actionIcon = item.actionUrl ? 'open_in_new' : 'visibility';
            const displayIcon = item.icon || 'extension';

            card.innerHTML = `
                <div class="ayudin-card-media">
                    <div class="ayudin-card-icon-badge">
                        <span class="material-symbols-outlined">${displayIcon}</span>
                    </div>
                    <img src="${item.image}" class="ayudin-card-img lazy-img" alt="${item.title}" loading="lazy" onload="this.classList.add('loaded')">
                </div>
                <div class="ayudin-card-content">
                    <div>
                        <h3 class="ayudin-card-title">${item.title}</h3>
                        <p class="ayudin-card-desc">${item.description}</p>
                    </div>
                    <div class="ayudin-card-footer">
                        <span class="ayudin-action-label">
                            <span class="material-symbols-outlined" style="font-size: 18px;">${actionIcon}</span>
                            <span>${actionLabel}</span>
                        </span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                if (item.actionUrl) {
                    const url = item.actionUrl;
                    
                    // 1. Calculadora de Altura Ideal
                    if (url.includes('calcular')) {
                        try {
                            if (window.parent && typeof window.parent.navigateToView === 'function') {
                                window.parent.navigateToView('view-calculator');
                                return;
                            }
                        } catch(e) {}
                        window.top.location.href = '../?view=calcular';
                        return;
                    }

                    // 2. Optimizador de corte
                    if (url.includes('corte')) {
                        try {
                            return window.top.location.href = '../apps/corte.html';
                        } catch (e) {
                            return window.location.href = '../apps/corte.html';
                        }
                    }

                    // 3. Editor de fotos masivo
                    if (url.includes('editor')) {
                        try {
                            return window.top.location.href = '../apps/editor-fotos.html';
                        } catch (e) {
                            return window.location.href = '../apps/editor-fotos.html';
                        }
                    }

                    // 4. Visualizador de barandas 3D
                    if (url.includes('visualizador')) {
                        try {
                            window.top.location.href = '../apps/visualizador.html';
                            return;
                        } catch(e) {}
                        window.location.href = 'visualizador.html';
                        return;
                    }

                    // Cualquier otra URL
                    try {
                        window.top.location.href = url.startsWith('../') ? url : '../' + url;
                    } catch(e) {
                        window.location.href = url;
                    }
                } else {
                    openDetailModal(item);
                }
            });

            gridContainer.appendChild(card);
        });
    }

    // 3. Abrir modal de detalles
    function openDetailModal(item) {
        if (!detailModal) return;

        const activeRubroObj = (window.ayudinRubros || []).find(r => r.id === item.rubro);
        
        if (modalTitle) modalTitle.textContent = item.title;
        if (modalRubroBadge && activeRubroObj) {
            modalRubroBadge.textContent = activeRubroObj.name;
        }
        if (modalContent) {
            modalContent.innerHTML = item.content || '<p class="text-muted">No hay información cargada.</p>';
        }

        detailModal.style.display = 'flex';
        detailModal.style.opacity = '0';
        setTimeout(() => {
            detailModal.style.opacity = '1';
            detailModal.style.transition = 'opacity 0.3s ease';
        }, 10);

        // Bloquear scroll de la página de fondo
        document.body.style.overflow = 'hidden';
    }

    // 4. Cerrar modal
    function closeDetailModal() {
        if (!detailModal) return;

        detailModal.style.opacity = '0';
        setTimeout(() => {
            detailModal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    // Configurar listeners de cierre del modal
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeDetailModal);
    }

    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDetailModal();
            }
        });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailModal && detailModal.style.display === 'flex') {
            closeDetailModal();
        }
    });

    // Carga inicial
    renderRubrosTabs();
    renderGrid();
});
