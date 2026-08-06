
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('rental-detail-modal');
        const closeBtn = document.getElementById('btn-close-rental-detail');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });


    function renderAvisosCliente() {
        const notifContainer = document.getElementById('notification-list-container');
        if (!notifContainer) return;

        notifContainer.innerHTML = '';

        // Renderizar componentes del stack de Avisos vía el motor unificado
        const avisosStack = contentRegistry.avisos;
        if (avisosStack && avisosStack.length > 0) {
            avisosStack.forEach(comp => {
                if (comp.type === 'banner' && comp.image) {
                    const banner = document.createElement('div');
                    banner.className = 'promo-banner';
                    banner.style.cssText = `
                        position: relative;
                        width: 100%;
                        height: 140px;
                        background-image: url('${comp.image}');
                        background-size: cover;
                        background-position: center;
                        border-radius: var(--radius-md);
                        margin-bottom: 1rem;
                        cursor: ${comp.link ? 'pointer' : 'default'};
                        overflow: hidden;
                        box-shadow: var(--shadow-sm);
                    `;
                    if (comp.link) {
                        banner.addEventListener('click', () => { window.open(comp.link, '_blank'); });
                    }
                    notifContainer.appendChild(banner);

                } else if (comp.type === 'product' && comp.productId) {
                    const res = findProductById(comp.productId);
                    if (res) {
                        const { product, catName } = res;
                        const card = document.createElement('div');
                        card.className = 'notification-item unread';
                        card.style.cssText = `
                            cursor: pointer;
                            display: flex;
                            gap: 12px;
                            margin-bottom: 1rem;
                            border: 1.5px solid #ffeedb;
                            background: #fffdf9;
                            padding: 1rem;
                            border-radius: var(--radius-md);
                            box-shadow: var(--shadow-sm);
                        `;
                        const productCover = Array.isArray(product.image) ? product.image[0] : product.image;
                        card.innerHTML = `
                            <div style="width: 50px; height: 50px; border-radius: 8px; background-image: url('${productCover}'); background-size: cover; background-position: center; border: 1px solid #ffeedb; flex-shrink: 0;"></div>
                            <div style="flex:1;">
                                <h4 style="color: #c0510a; font-size: 0.95rem; margin-bottom: 2px; font-weight: 700; display:flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">campaign</span>
                                    ${comp.badge || 'Aviso Especial'}
                                </h4>
                                <strong style="font-size:0.9rem; color:var(--text-main);">${product.title}</strong>
                                <p style="font-size:0.8rem; color:var(--text-muted); margin-top: 2px; line-height: 1.4;">${product.description.substring(0, 85)}...</p>
                            </div>
                        `;
                        card.addEventListener('click', () => {
                            showProductDetail(product, catName);
                        });
                        notifContainer.appendChild(card);
                    }

                } else if (comp.type === 'video' && comp.url) {
                    const ytId = extractYouTubeId(comp.url);
                    if (ytId) {
                        const wrapper = document.createElement('div');
                        wrapper.style.cssText = `
                            position: relative;
                            width: 100%;
                            height: 160px;
                            border-radius: var(--radius-md);
                            overflow: hidden;
                            margin-bottom: 1rem;
                            box-shadow: var(--shadow-sm);
                        `;
                        wrapper.innerHTML = `
                            <iframe
                                src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0"
                                allow="autoplay; encrypted-media"
                                allowfullscreen
                                style="width: 100%; height: 100%; border: none;"
                            ></iframe>
                            <div style="position: absolute; top:0; left:0; width:100%; height:100%; background:transparent; z-index:10;"></div>
                        `;
                        notifContainer.appendChild(wrapper);
                    }
                }
            });
        }

        // Incorporar las notificaciones estáticas tradicionales
        const defaultNoticesHTML = `
            <div class="notification-item unread">
                <div class="notif-icon"><span class="material-symbols-outlined">celebration</span></div>
                <div class="notif-text">
                    <h4>¡Nuevo Lanzamiento!</h4>
                    <p>Ya están disponibles los podios reforzados en preventa exclusiva.</p>
                    <span class="notif-time">Hace 2 horas</span>
                </div>
            </div>
            <div class="notification-item">
                <div class="notif-icon"><span class="material-symbols-outlined">local_shipping</span></div>
                <div class="notif-text">
                    <h4>Envíos gratis</h4>
                    <p>Esta semana tenemos envíos gratis en CABA y GBA para compras superiores a $50.000.</p>
                    <span class="notif-time">Hace 2 días</span>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = defaultNoticesHTML;
        while (tempDiv.firstChild) {
            notifContainer.appendChild(tempDiv.firstChild);
        }
    }


    const carouselCategories = document.getElementById('carousel-categories');


    const homeProductList = document.getElementById('home-product-list');


    const viewHome = document.getElementById('view-home');


    const viewDetail = document.getElementById('view-product-detail');


    
    const detailTitle = document.getElementById('detail-title');


    const detailCategory = document.getElementById('detail-category');
    if (detailCategory) {
        detailCategory.addEventListener('click', (e) => {
            const catId = detailCategory.dataset.categoryId;
            if (catId && window.navigateToCategoryFeed) {
                e.stopPropagation();
                window.navigateToCategoryFeed(catId);
            }
        });
    }

    document.addEventListener('click', (e) => {
        const catBadge = e.target.closest('.feed-card-cat');
        if (catBadge) {
            const catId = catBadge.dataset.categoryId;
            if (catId && window.navigateToCategoryFeed) {
                e.stopPropagation();
                e.preventDefault();
                window.navigateToCategoryFeed(catId);
            }
        }
    }, true);


    const detailDescription = document.getElementById('detail-description');


    const btnBuyShipping = document.getElementById('btn-buy-shipping');


    const btnBuyPickup = document.getElementById('btn-buy-pickup');



    const detailVariantsContainer = document.getElementById('detail-variants-container');


    const detailVariants = document.getElementById('detail-variants');


    const viewAdmin = document.getElementById('view-admin');


    const btnCloseAdmin = document.getElementById('btn-close-admin');


    let headerClickCount = 0;


    let headerClickTimer = null;



    if (btnCloseAdmin) {
        btnCloseAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            // Limpiar historial al salir de admin para evitar comportamientos extraños
            navigationHistory = [];
            navigateToView('view-home');
            renderHome(); // Re-render in case changes were made
        });
    }



    const btnCloseAdminHeader = document.getElementById('btn-close-admin-header');


    if (btnCloseAdminHeader) {
        btnCloseAdminHeader.addEventListener('click', (e) => {
            e.preventDefault();
            navigationHistory = [];
            navigateToView('view-home');
            renderHome();
        });
    }





    if (mediaTypeSelector) {
        mediaTypeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.media-type-btn');
            if (!btn) return;
            switchMediaPanel(btn.dataset.type);
        });
    }


    if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', () => {
            const ytId = extractYouTubeId(videoUrlInput.value.trim());
            const preview = document.getElementById('nosotros-video-preview');
            if (!preview) return;
            if (ytId) {
                preview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:160px; border:none; border-radius:8px;"></iframe>`;
                preview.style.display = 'block';
            } else {
                preview.innerHTML = '<small style="color:red;">⚠️ URL de YouTube no válida.</small>';
                preview.style.display = 'block';
            }
        });
    }


    if (btnPreviewMap) {
        btnPreviewMap.addEventListener('click', () => {
            const query = document.getElementById('admin-nosotros-map-query')?.value.trim();
            const preview = document.getElementById('nosotros-map-preview');
            if (!preview || !query) return;
            const enc = encodeURIComponent(query);
            preview.innerHTML = `<iframe src="https://maps.google.com/maps?q=${enc}&output=embed&z=15" style="width:100%; height:220px; border:none; border-radius:8px;"></iframe>`;
            preview.style.display = 'block';
        });
    }


    if (btnAddNosotrosLink) {
        btnAddNosotrosLink.addEventListener('click', () => addNosotrosLinkRow());
    }