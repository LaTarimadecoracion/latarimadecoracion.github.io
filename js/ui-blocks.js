
    let currentInfoTarget = 'nosotros';


    let editingInfoIndex = null;


    const adminInfoModal = document.getElementById('admin-nosotros-modal');


    const inputInfoImage = document.getElementById('admin-nosotros-image');


    const infoImagePreview = document.getElementById('nosotros-image-preview');


    const btnCancelInfo = document.getElementById('btn-cancel-nosotros');


    const btnSaveInfoBlock = document.getElementById('btn-save-nosotros-block');



    function getSessionArray() {
        return currentInfoTarget === 'avisos' ? window.sessionAvisos : window.sessionNosotros;
    }



    function saveInfoToLocalStorage() {
        if(currentInfoTarget === 'avisos') {
            localStorage.setItem('sessionAvisosAutonomo', JSON.stringify(window.sessionAvisos));
        } else {
            localStorage.setItem('sessionNosotros', JSON.stringify(window.sessionNosotros));
        }
        if (window.syncSiteConfigWithServer) {
            window.syncSiteConfigWithServer();
        }
    }


    function normalizeAvisoString(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/^¡?nuevo\s+(ingreso|alquiler):\s*/i, "")
            .replace(/[^a-z0-9]/g, "");
    }

    function findProductForAviso(block) {
        if (!block) return null;
        
        let prodParam = null;
        let targetUrl = block.linkUrl || (block.links && block.links[0] ? block.links[0].url : '');
        if (targetUrl) {
            const match = targetUrl.match(/(?:prod|product|p|s)=([^&]+)/);
            if (match) prodParam = decodeURIComponent(match[1]).trim();
        }

        const normProdParam = normalizeAvisoString(prodParam);
        const normBlockTitle = normalizeAvisoString(block.title);

        // 1. Buscar en Productos
        if (window.sessionProducts && Array.isArray(window.sessionProducts)) {
            for (const cat of window.sessionProducts) {
                if (cat.products && Array.isArray(cat.products)) {
                    for (const p of cat.products) {
                        if (!p) continue;
                        const normPId = normalizeAvisoString(p.id);
                        const normPTitle = normalizeAvisoString(p.title);
                        const normPImg = normalizeAvisoString(p.image);

                        const isIdMatch = prodParam && (p.id === prodParam || normPId === normProdParam);
                        const isTitleMatch = normBlockTitle && (normPTitle === normBlockTitle || (normPTitle.length > 5 && normBlockTitle.includes(normPTitle)) || (normPTitle.length > 5 && normPTitle.includes(normBlockTitle)));
                        const isParamTitleMatch = normProdParam && (normPTitle === normProdParam || (normPTitle.length > 5 && normProdParam.includes(normPTitle)) || (normPTitle.length > 5 && normPTitle.includes(normProdParam)));
                        const isImgPathMatch = normProdParam && normProdParam.length > 4 && normPImg.includes(normProdParam);

                        if (isIdMatch || isTitleMatch || isParamTitleMatch || isImgPathMatch) {
                            return { type: 'product', product: p, catName: cat.name };
                        }
                    }
                }
            }
        }

        // 2. Buscar en Ofertas (Combos)
        if (window.sessionOffers && Array.isArray(window.sessionOffers)) {
            for (const o of window.sessionOffers) {
                if (!o) continue;
                const normOId = normalizeAvisoString(o.id);
                const normOTitle = normalizeAvisoString(o.title);

                const isIdMatch = prodParam && (o.id === prodParam || normOId === normProdParam);
                const isTitleMatch = normBlockTitle && (normOTitle === normBlockTitle || (normOTitle.length > 5 && normBlockTitle.includes(normOTitle)) || (normOTitle.length > 5 && normOTitle.includes(normBlockTitle)));

                if (isIdMatch || isTitleMatch) {
                    return { type: 'offer', offer: o };
                }
            }
        }

        // 3. Buscar en Alquileres
        if (window.sessionRentals && Array.isArray(window.sessionRentals)) {
            for (const r of window.sessionRentals) {
                if (!r) continue;
                const normRId = normalizeAvisoString(r.id);
                const normRTitle = normalizeAvisoString(r.title);

                const isIdMatch = prodParam && (r.id === prodParam || normRId === normProdParam);
                const isTitleMatch = normBlockTitle && (normRTitle === normBlockTitle || (normRTitle.length > 5 && normBlockTitle.includes(normRTitle)) || (normRTitle.length > 5 && normRTitle.includes(normBlockTitle)));

                if (isIdMatch || isTitleMatch) {
                    return { type: 'rental', product: r, catName: 'alquileres' };
                }
            }
        }

        return null;
    }

    window.renderInfoBlocksCliente = function(target) {
        const container = document.getElementById(target + '-blocks-container');
        if (!container) return;
        container.innerHTML = '';

        const sessionArr = target === 'avisos' ? window.sessionAvisos : window.sessionNosotros;

        if (sessionArr.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem 0;">No hay bloques de información cargados.</p>';
            return;
        }

        // Renderizado Minimalista Exclusivo para la sección de Avisos
        if (target === 'avisos') {
            sessionArr.forEach((block) => {
                const card = document.createElement('article');
                card.className = 'aviso-card-minimal';
                
                let cleanTitle = (block.title || '').replace(/^¡?Nuevo (Ingreso|Alquiler):\s*/i, '').trim();
                if (!cleanTitle) cleanTitle = block.title || 'Aviso';

                // Coordinación exacta con la base de datos de productos
                const matched = findProductForAviso(block);
                
                let displayImg = null;
                if (matched) {
                    const item = matched.product || matched.offer;
                    if (item) {
                        if (item.acabados_groups && item.acabados_groups.length > 0) {
                            for (const g of item.acabados_groups) {
                                if (g && !g.hidden) {
                                    displayImg = g.cover_image || (g.images_list && g.images_list[0]);
                                    if (displayImg) break;
                                }
                            }
                            if (!displayImg && item.acabados_groups[0]) {
                                displayImg = item.acabados_groups[0].cover_image || (item.acabados_groups[0].images_list && item.acabados_groups[0].images_list[0]);
                            }
                        }
                        if (!displayImg && item.image) {
                            displayImg = Array.isArray(item.image) ? item.image[0] : item.image;
                        }
                    }
                }
                if (!displayImg) {
                    displayImg = block.image || 'img/logo_provisional.png';
                }

                let mediaHtml = '';
                const mType = block.mediaType || (block.image ? 'image' : 'none');

                if (mType === 'image') {
                    mediaHtml = `
                    <div class="aviso-card-img-wrapper">
                        <span class="aviso-badge-nuevo">NUEVO INGRESO</span>
                        <img src="${displayImg}" alt="${cleanTitle}" class="aviso-card-img lazy-img loaded" style="opacity: 1;" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='img/logo_provisional.png'; this.classList.add('loaded');">
                    </div>`;
                } else if (mType === 'video' && block.videoUrl) {
                    const ytId = extractYouTubeId(block.videoUrl);
                    if (ytId) {
                        mediaHtml = `
                        <div class="aviso-card-img-wrapper">
                            <iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen loading="lazy" style="width:100%; height:100%; border:none;"></iframe>
                        </div>`;
                    }
                }

                card.innerHTML = `
                    ${mediaHtml}
                    <div class="aviso-card-content">
                        <h3 class="aviso-card-title">${cleanTitle}</h3>
                    </div>
                `;

                // Clic en la tarjeta abre la publicación correspondiente inmediatamente
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => {
                    if (matched) {
                        if (matched.type === 'product' && window.showProductDetail) {
                            return window.showProductDetail(matched.product, matched.catName);
                        }
                        if (matched.type === 'offer' && window.showOfferDetail) {
                            return window.showOfferDetail(matched.offer);
                        }
                        if (matched.type === 'rental' && window.showProductDetail) {
                            return window.showProductDetail(matched.product, 'alquileres');
                        }
                    }

                    // Fallback a URL externa si no se encontró en memoria local
                    let targetUrl = block.linkUrl || (block.links && block.links[0] ? block.links[0].url : '');
                    if (targetUrl) {
                        try {
                            const parsedUrl = new URL(targetUrl, window.location.href);
                            if (parsedUrl.host === window.location.host) {
                                const params = parsedUrl.searchParams;
                                const targetProd = params.get('prod') || params.get('product') || params.get('p') || params.get('s');
                                const targetCat = params.get('cat') || params.get('category');
                                const targetView = params.get('view');

                                if (targetProd) {
                                    const cleanProd = decodeURIComponent(targetProd).trim();
                                    if (window.findOfferById && window.showOfferDetail) {
                                        const foundOffer = window.findOfferById(cleanProd);
                                        if (foundOffer) return window.showOfferDetail(foundOffer);
                                    }
                                    if (window.findProductById && window.showProductDetail) {
                                        const found = window.findProductById(cleanProd);
                                        if (found) return window.showProductDetail(found.product, found.catName);
                                    }
                                }
                                if (targetCat && window.navigateToCategoryFeed) {
                                    return window.navigateToCategoryFeed(targetCat);
                                }
                                if (targetView && window.navigateToView) {
                                    return window.navigateToView(targetView);
                                }
                            }
                            window.open(targetUrl, '_blank');
                        } catch (err) {
                            window.location.href = targetUrl;
                        }
                    }
                });

                container.appendChild(card);
            });
            return;
        }

        sessionArr.forEach((block, idx) => {
            const blockSection = document.createElement('section');
            blockSection.className = 'nosotros-block'; // Reusamos CSS

            let mediaHtml = '';
            const mType = block.mediaType || (block.image ? 'image' : 'none');

            if (mType === 'image' && block.image) {
                mediaHtml = `
                <div class="block-image-wrapper" style="position:relative;">
                    <img src="${block.image}" alt="${block.title}" class="nosotros-img lazy-img" loading="lazy" onload="this.classList.add('loaded')">
                </div>`;
            } else if (mType === 'video' && block.videoUrl) {
                const ytId = extractYouTubeId(block.videoUrl);
                if (ytId) {
                    mediaHtml = `
                    <div class="block-video-wrapper">
                        <iframe
                            src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0"
                            allow="autoplay; encrypted-media"
                            allowfullscreen
                            loading="lazy"
                            title="${block.title}"
                        ></iframe>
                        <div class="block-video-shield"></div>
                    </div>`;
                }
            } else if (mType === 'map' && block.mapQuery) {
                const encodedQuery = encodeURIComponent(block.mapQuery);
                const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&output=embed&z=15`;
                const mapsOpenUrl = `https://maps.google.com/maps?q=${encodedQuery}`;
                mediaHtml = `
                <div class="block-map-wrapper">
                    <iframe src="${mapsEmbedUrl}" allowfullscreen loading="lazy" title="${block.mapQuery}"></iframe>
                    <a href="${mapsOpenUrl}" target="_blank" class="block-map-link" title="Abrir en Google Maps">
                        <span class="block-map-badge"><span class="material-symbols-outlined" style="font-size:1rem;">navigation</span> Cómo llegar</span>
                    </a>
                </div>`;
            }

            let linksToRender = block.links || [];
            if (linksToRender.length === 0 && block.linkUrl) {
                linksToRender = [{ url: block.linkUrl, text: block.linkText || 'Ver más', newTab: block.linkNewTab !== false }];
            }

            if (mType === 'link') {
                mediaHtml = '<div style="display:flex; flex-direction:column; gap:0.5rem;">' + linksToRender.map(l => {
                    const targetAttr = l.newTab !== false ? 'target="_blank" rel="noopener"' : '';
                    return `<a href="${l.url}" ${targetAttr} class="block-action-btn" style="width:100%; text-align:center;">${l.text || 'Ver más'}</a>`;
                }).join('') + '</div>';
            }

            const actionButtonHtml = (mType !== 'link' && linksToRender.length > 0)
                ? '<div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">' + linksToRender.map(l => {
                    const targetAttr = l.newTab !== false ? 'target="_blank" rel="noopener"' : '';
                    return `<a href="${l.url}" ${targetAttr} class="block-action-btn">${l.text || 'Ver más'}</a>`;
                  }).join('') + '</div>'
                : '';

            blockSection.innerHTML = `
                ${block.description || mType === 'link' ? '' : ''}
                ${mType !== 'link' ? `<h2>${block.title}</h2>` : ''}
                ${mediaHtml}
                ${block.description ? `<p>${block.description}</p>` : ''}
                ${actionButtonHtml}
            `;

            blockSection.querySelectorAll('.block-action-btn').forEach(btn => {
                const href = btn.getAttribute('href');
                if (!href) return;
                try {
                    const parsedUrl = new URL(href, window.location.href);
                    if (parsedUrl.host === window.location.host) {
                        const params = parsedUrl.searchParams;
                        const targetView = params.get('view');
                        const targetProd = params.get('prod') || params.get('product') || params.get('p');
                        const targetCat = params.get('cat') || params.get('category');
                        if (targetView || targetProd || targetCat) {
                            btn.addEventListener('click', (e) => {
                                e.preventDefault();
                                if (targetProd && window.findProductById && window.showProductDetail) {
                                    const found = window.findProductById(targetProd);
                                    if (found) {
                                        window.showProductDetail(found.product, found.catName);
                                    } else {
                                        if (targetView) {
                                            const viewIdMap = { 'nosotros': 'view-about', 'buscar': 'view-search', 'avisos': 'view-notifications', 'perfil': 'view-profile', 'alquileres': 'view-rentals', 'admin': 'view-admin', 'catalogo': 'view-catalogo', 'calcular': 'view-calculator', 'home': 'view-home', 'categorias': 'view-categories', 'carrito': 'view-cart', 'videos': 'view-videos' };
                                            const viewId = viewIdMap[targetView] || targetView;
                                            if (window.navigateToView) window.navigateToView(viewId);
                                        }
                                    }
                                } else if (targetView) {
                                    const viewIdMap = { 'nosotros': 'view-about', 'buscar': 'view-search', 'avisos': 'view-notifications', 'perfil': 'view-profile', 'alquileres': 'view-rentals', 'admin': 'view-admin', 'catalogo': 'view-catalogo', 'calcular': 'view-calculator', 'home': 'view-home', 'categorias': 'view-categories', 'carrito': 'view-cart', 'videos': 'view-videos' };
                                    const viewId = viewIdMap[targetView] || targetView;
                                    if (window.navigateToView) window.navigateToView(viewId);
                                } else if (targetCat) {
                                    if (window.navigateToCategoryFeed) window.navigateToCategoryFeed(targetCat);
                                }
                            });
                        }
                    }
                } catch (err) {}
            });

            container.appendChild(blockSection);
            if (target !== 'avisos' && idx < sessionArr.length - 1) {
                const hr = document.createElement('hr');
                hr.className = 'block-divider';
                container.appendChild(hr);
            }
        });
    };



    window.renderGlobalSocialLinks = function() {
        const linksMap = window.socialLinks || (window.siteConfig ? window.siteConfig.socialLinks : {}) || {};
        const defaultsMap = {
            instagram: 'https://www.instagram.com/latarimadecoracion/',
            tiktok: 'https://www.tiktok.com/@latarimadecoracion',
            facebook: 'https://www.facebook.com/latarimadecoracion',
            youtube: 'https://www.youtube.com/@latarimadecoracion',
            whatsapp: 'https://wa.me/5491167007723',
            mercadolibre: 'https://www.mercadolibre.com.ar'
        };
        const redes = ['instagram', 'tiktok', 'facebook', 'youtube', 'whatsapp', 'mercadolibre'];
        const template = document.getElementById('social-links-template');
        const containers = document.querySelectorAll('.social-links-container');
        if (template) {
            containers.forEach(container => {
                container.innerHTML = '';
                const clone = template.content.cloneNode(true);
                redes.forEach(red => {
                    const btn = clone.querySelector(`.social-link-${red}`);
                    if (btn) {
                        const targetUrl = (linksMap[red] && linksMap[red].trim() !== '') ? linksMap[red] : defaultsMap[red];
                        if (targetUrl) {
                            btn.setAttribute('href', targetUrl);
                            btn.style.display = 'inline-flex';
                        } else {
                            btn.style.display = 'none';
                        }
                    }
                });
                container.appendChild(clone);
            });
        }
    };


    window.renderAdminInfoList = function(target) {
        const listEl = document.getElementById('admin-' + target + '-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        
        const sessionArr = target === 'avisos' ? window.sessionAvisos : window.sessionNosotros;

        if (sessionArr.length === 0) {
            listEl.innerHTML = '<p class="text-muted" style="padding: 1rem 0;">No hay bloques cargados.</p>';
            return;
        }

        sessionArr.forEach((block, idx) => {
            const card = document.createElement('div');
            card.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: white; border-radius: var(--radius-md); border: 1.5px solid #E8ECF0; margin-bottom: 0.6rem; gap: 1rem; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease;`;

            let thumbHtml = '';
            const mType = block.mediaType || (block.image ? 'image' : 'none');
            if (mType === 'image' && block.image) {
                thumbHtml = `<img src="${block.image}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            } else if (mType === 'video' && block.videoUrl) {
                const ytId = extractYouTubeId(block.videoUrl);
                const tkId = window.extractTikTokId ? window.extractTikTokId(block.videoUrl) : null;
                const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'img/logo_provisional.png'; // TikTok doesn't have an easy thumb API, we'll use placeholder or we can use iframe directly, but since this is a thumbnail view, placeholder is fine.
                thumbHtml = `<img src="${ytThumb}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            } else if (mType === 'map' && block.mapQuery) {
                thumbHtml = `<div style="width: 44px; height: 44px; border-radius: 8px; background: #e0f2fe; border: 1px solid #bae6fd; display: flex; align-items: center; justify-content: center; color: #0284c7;"><span class="material-symbols-outlined" style="font-size: 22px;">map</span></div>`;
            } else {
                thumbHtml = `<img src="img/logo_provisional.png" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">`;
            }

            const isFirst = idx === 0;
            const isLast = idx === sessionArr.length - 1;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap: 0.8rem; overflow: hidden; flex: 1;">
                    ${thumbHtml}
                    <div style="overflow: hidden; flex: 1;">
                        <strong style="font-size:0.92rem; color:var(--text-main); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${block.title}</strong>
                        <p style="font-size:0.78rem; color:var(--text-muted); margin: 2px 0 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${block.description}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.35rem; flex-shrink:0;">
                    <button type="button" class="btn-edit-block action-btn edit" style="padding: 0.4rem;" title="Editar"><span class="material-symbols-outlined" style="font-size: 18px;">edit</span></button>
                    <button type="button" class="btn-up-block action-btn" style="padding: 0.4rem;" ${isFirst ? 'disabled' : ''} title="Subir"><span class="material-symbols-outlined" style="font-size: 18px; color: ${isFirst ? '#cbd5e1' : 'var(--primary-color)'}">arrow_upward</span></button>
                    <button type="button" class="btn-down-block action-btn" style="padding: 0.4rem;" ${isLast ? 'disabled' : ''} title="Bajar"><span class="material-symbols-outlined" style="font-size: 18px; color: ${isLast ? '#cbd5e1' : 'var(--primary-color)'}">arrow_downward</span></button>
                    <button type="button" class="btn-delete-block action-btn del" style="padding: 0.4rem;" title="Eliminar"><span class="material-symbols-outlined" style="font-size: 18px;">delete</span></button>
                </div>`;

            card.querySelector('.btn-edit-block').addEventListener('click', () => openInfoForm(target, idx));
            card.querySelector('.btn-up-block').addEventListener('click', () => moveInfoBlockUp(target, idx));
            card.querySelector('.btn-down-block').addEventListener('click', () => moveInfoBlockDown(target, idx));
            card.querySelector('.btn-delete-block').addEventListener('click', () => deleteInfoBlock(target, idx));

            listEl.appendChild(card);
        });
    };



    function moveInfoBlockUp(target, idx) {
        const arr = target === 'avisos' ? window.sessionAvisos : window.sessionNosotros;
        if (idx > 0) {
            [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
            currentInfoTarget = target;
            saveInfoToLocalStorage();
            renderAdminInfoList(target);
            renderInfoBlocksCliente(target);
        }
    }



    function moveInfoBlockDown(target, idx) {
        const arr = target === 'avisos' ? window.sessionAvisos : window.sessionNosotros;
        if (idx < arr.length - 1) {
            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            currentInfoTarget = target;
            saveInfoToLocalStorage();
            renderAdminInfoList(target);
            renderInfoBlocksCliente(target);
        }
    }



    function deleteInfoBlock(target, idx) {
        const arr = target === 'avisos' ? window.sessionAvisos : window.sessionNosotros;
        if (confirm(`¿Seguro que querés eliminar el bloque "${arr[idx].title}"?`)) {
            arr.splice(idx, 1);
            currentInfoTarget = target;
            saveInfoToLocalStorage();
            renderAdminInfoList(target);
            renderInfoBlocksCliente(target);
        }
    }



    window.openInfoForm = function(target, idx = null) {
        currentInfoTarget = target;
        editingInfoIndex = idx;
        
        const arr = getSessionArray();
        
        const titleInput       = document.getElementById('admin-nosotros-title');
        const descriptionInput = document.getElementById('admin-nosotros-description');
        const hiddenUrlInput   = document.getElementById('admin-nosotros-image-url');
        const videoUrlInput    = document.getElementById('admin-nosotros-video-url');
        const mapQueryInput    = document.getElementById('admin-nosotros-map-query');

        titleInput.value       = '';
        descriptionInput.value = '';
        hiddenUrlInput.value   = '';
        if (videoUrlInput) videoUrlInput.value = '';
        if (mapQueryInput) mapQueryInput.value = '';
        if (inputInfoImage) inputInfoImage.value = '';
        if (infoImagePreview) infoImagePreview.innerHTML = '';
        
        const videoPreview = document.getElementById('nosotros-video-preview');
        const mapPreview   = document.getElementById('nosotros-map-preview');
        if (videoPreview) { videoPreview.innerHTML = ''; videoPreview.style.display = 'none'; }
        if (mapPreview)   { mapPreview.innerHTML = '';   mapPreview.style.display = 'none'; }

        renderNosotrosLinksList([]);

        let mediaType = 'image';

        if (idx !== null) {
            const block = arr[idx];
            titleInput.value       = block.title;
            descriptionInput.value = block.description;
            mediaType = block.mediaType || 'image';
            renderNosotrosLinksList(block.links || (block.linkUrl ? [{ text: block.linkText || 'Ver más', url: block.linkUrl, newTab: block.linkNewTab !== false }] : []));

            if (mediaType === 'image') {
                hiddenUrlInput.value = block.image || '';
                if (block.image && infoImagePreview) {
                    infoImagePreview.innerHTML = `<img src="${block.image}" style="width:100%; border-radius:8px; border:1px solid #ddd;">`;
                }
            } else if (mediaType === 'video') {
                if (videoUrlInput) videoUrlInput.value = block.videoUrl || '';
                if (block.videoUrl && videoPreview) {
                    const ytId = extractYouTubeId(block.videoUrl);
                    if (ytId) {
                        videoPreview.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&mute=1&modestbranding=1&rel=0" allowfullscreen style="width:100%; height:160px; border:none; border-radius:8px;"></iframe>`;
                        videoPreview.style.display = 'block';
                    }
                }
            } else if (mediaType === 'map') {
                if (mapQueryInput) mapQueryInput.value = block.mapQuery || '';
                if (block.mapQuery && mapPreview) {
                    const enc = encodeURIComponent(block.mapQuery);
                    mapPreview.innerHTML = `<iframe src="https://maps.google.com/maps?q=${enc}&output=embed&z=15" style="width:100%; height:200px; border:none; border-radius:8px;"></iframe>`;
                    mapPreview.style.display = 'block';
                }
            }
            
            document.getElementById('admin-nosotros-form-title').textContent = `Editar Bloque (${target.toUpperCase()}): ${block.title}`;
        } else {
            document.getElementById('admin-nosotros-form-title').textContent = `➕ Agregar Nuevo Bloque en ${target.toUpperCase()}`;
        }

        switchMediaPanel(mediaType);

        if (adminInfoModal) {
            adminInfoModal.style.display = 'flex';
            adminInfoModal.scrollIntoView({ behavior: 'smooth' });
        }
    };



    if (inputInfoImage && infoImagePreview) {
        inputInfoImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (btnSaveInfoBlock) {
                btnSaveInfoBlock.disabled = true;
                btnSaveInfoBlock.textContent = '⏳ Procesando imagen...';
            }

            try {
                const { file: webpFile, dataUrl } = await convertImageToWebP(file);
                infoImagePreview.innerHTML = `
                    <img src="${dataUrl}" style="width:100%; border-radius:8px; border:1px solid #ddd;">
                    <small style="color: #27ae60; font-size: 0.75rem;">✅ Convertida a WebP</small>
                `;
                const uploadedPath = await uploadImageToServer(webpFile, currentInfoTarget, 'bloque');
                if (uploadedPath) {
                    document.getElementById('admin-nosotros-image-url').value = uploadedPath;
                }
            } catch (err) {
                console.error('Error convirtiendo imagen:', err);
                infoImagePreview.innerHTML = '<small style="color:red;">⚠️ Error procesando imagen.</small>';
            } finally {
                if (btnSaveInfoBlock) {
                    btnSaveInfoBlock.disabled = false;
                    btnSaveInfoBlock.textContent = 'Guardar Bloque';
                }
            }
        });
    }



    function switchMediaPanel(type) {
        const panels = { image: 'nosotros-panel-image', video: 'nosotros-panel-video', map: 'nosotros-panel-map', link: 'nosotros-panel-link' };
        Object.entries(panels).forEach(([key, id]) => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = (key === type) ? 'block' : 'none';
        });

        const titleGroup = document.getElementById('admin-nosotros-title')?.closest('.form-group');
        const descGroup  = document.getElementById('admin-nosotros-description')?.closest('.form-group');
        const isLink = type === 'link';
        if (titleGroup) titleGroup.style.display = isLink ? 'none' : '';
        if (descGroup)  descGroup.style.display  = isLink ? 'none' : '';
        
        const selector = document.getElementById('nosotros-media-type-selector');
        if (selector) {
            selector.querySelectorAll('.media-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
        }
    }



    const mediaTypeSelector = document.getElementById('nosotros-media-type-selector');



    const videoUrlInput = document.getElementById('admin-nosotros-video-url');



    const btnPreviewMap = document.getElementById('btn-preview-map');



    if (btnSaveInfoBlock) {
        btnSaveInfoBlock.addEventListener('click', async () => {
            const activeTypeBtn = document.querySelector('#nosotros-media-type-selector .media-type-btn.active');
            const mediaType = activeTypeBtn ? activeTypeBtn.dataset.type : 'image';

            const title       = document.getElementById('admin-nosotros-title').value.trim();
            const description = document.getElementById('admin-nosotros-description').value.trim();

            if (mediaType !== 'link' && (!title || !description)) {
                alert('Por favor completá los campos obligatorios (Título y Descripción).');
                return;
            }

            const linkRows = document.querySelectorAll('#nosotros-links-list .nosotros-link-row');
            const links = Array.from(linkRows).map(row => {
                const txt = row.querySelector('.link-text-input').value.trim();
                const url = row.querySelector('.link-url-input').value.trim();
                const newTab = row.querySelector('.link-newtab-input').checked;
                return { text: txt || (mediaType === 'link' ? 'Ver más' : ''), url, newTab };
            }).filter(l => l.url); // Solo guardamos los que tienen URL

            if (mediaType === 'link' && links.length === 0) {
                alert('Por favor agregá al menos un enlace con URL.');
                return;
            }
            const firstLink = links[0] || {};

            const newBlock = {
                title:       mediaType === 'link' ? (firstLink.text || 'Enlace') : title,
                description: mediaType === 'link' ? '' : description,
                mediaType,
                image:    mediaType === 'image' ? (document.getElementById('admin-nosotros-image-url').value || 'img/logo_provisional.png') : '',
                videoUrl: mediaType === 'video' ? (document.getElementById('admin-nosotros-video-url')?.value.trim() || '') : '',
                mapQuery: mediaType === 'map'   ? (document.getElementById('admin-nosotros-map-query')?.value.trim() || '') : '',
                links,
                // Retrocompatibilidad
                linkUrl: firstLink.url || '',
                linkText: firstLink.text || '',
                linkNewTab: firstLink.newTab !== false,
            };

            const arr = getSessionArray();
            if (editingInfoIndex !== null) {
                // Keep the old timestamp if it exists, otherwise it will just stay undefined (old blocks)
                if (arr[editingInfoIndex] && arr[editingInfoIndex].timestamp) {
                    newBlock.timestamp = arr[editingInfoIndex].timestamp;
                }
            } else {
                // If it's a new block (e.g., a new aviso), assign the current time
                newBlock.timestamp = Date.now();
            }

            if (mediaType === 'video' && !extractYouTubeId(newBlock.videoUrl)) {
                alert('Por favor ingresá una URL válida de YouTube.');
                return;
            }
            if (mediaType === 'map' && !newBlock.mapQuery) {
                alert('Por favor ingresá el nombre del lugar para el mapa.');
                return;
            }

            if (editingInfoIndex !== null) {
                arr[editingInfoIndex] = newBlock;
            } else {
                arr.push(newBlock);
            }

            saveInfoToLocalStorage();
            if (adminInfoModal) adminInfoModal.style.display = 'none';
            renderAdminInfoList(currentInfoTarget);
            renderInfoBlocksCliente(currentInfoTarget);
            alert(`✅ Bloque guardado exitosamente.`);
        });
    }



    function renderNosotrosLinksList(links = []) {
        const container = document.getElementById('nosotros-links-list');
        if (!container) return;
        container.innerHTML = '';
        links.forEach((link, i) => addNosotrosLinkRow(link.text || '', link.url || '', link.newTab !== false));
    }



    function addNosotrosLinkRow(text = '', url = '', newTab = true) {
        const container = document.getElementById('nosotros-links-list');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'nosotros-link-row';
        row.draggable = true;
        row.style.cssText = 'display:flex; flex-direction:column; gap:0.35rem; background:#fff; border:1.5px solid #E8ECF0; border-radius:10px; padding:0.75rem; cursor:grab; position:relative;';
        row.innerHTML = `
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <span class="material-symbols-outlined drag-handle" style="color:#aaa; font-size:20px; cursor:grab;">drag_indicator</span>
                <input type="text" class="link-text-input" placeholder="Nombre del enlace" value="${text}" style="flex:1; padding:0.45rem 0.7rem; border:1.5px solid #E8ECF0; border-radius:8px; font-size:0.85rem; font-family:var(--font-main);">
                <button type="button" class="btn-remove-link" title="Eliminar" style="background:none; border:none; cursor:pointer; color:#e53e3e; padding:0.3rem; flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:20px;">delete</span></button>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; padding-left:28px;">
                <input type="url" class="link-url-input" placeholder="URL" value="${url}" style="flex:1; padding:0.45rem 0.7rem; border:1.5px solid #E8ECF0; border-radius:8px; font-size:0.85rem; font-family:var(--font-main); box-sizing:border-box;">
            </div>
            <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.3rem; margin-left:28px; cursor:pointer; font-weight:500; font-size:0.8rem; color:var(--text-muted);">
                <input type="checkbox" class="link-newtab-input" style="width:14px; height:14px; accent-color:var(--primary-color); cursor:pointer;" ${newTab ? 'checked' : ''}>
                Abrir en nueva pestaña
            </label>
        `;
        row.querySelector('.btn-remove-link').addEventListener('click', () => row.remove());
        
        row.addEventListener('dragstart', (e) => {
            row.classList.add('dragging');
            row.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            row.style.opacity = '1';
        });
        
        container.appendChild(row);
    }



    const btnAddNosotrosLink = document.getElementById('btn-add-nosotros-link');
    if (btnAddNosotrosLink) {
        btnAddNosotrosLink.addEventListener('click', () => addNosotrosLinkRow());
    }

    const linksContainer = document.getElementById('nosotros-links-list');
    if (linksContainer) {
        linksContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingRow = document.querySelector('.nosotros-link-row.dragging');
            if (!draggingRow) return;
            const siblings = [...linksContainer.querySelectorAll('.nosotros-link-row:not(.dragging)')];
            let nextSibling = siblings.find(sibling => {
                return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
            });
            linksContainer.insertBefore(draggingRow, nextSibling);
        });
    }



    document.querySelectorAll('.btn-add-info-block, #btn-add-nosotros-block, #btn-add-avisos-block').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tgt = e.target.closest('button').dataset.target || 'nosotros';
            openInfoForm(tgt);
        });
    });



    if (btnCancelInfo) {
        btnCancelInfo.addEventListener('click', () => {
            if (adminInfoModal) adminInfoModal.style.display = 'none';
        });
    }


    window.renderAdminNosotrosList = () => { renderAdminInfoList('nosotros'); renderAdminInfoList('avisos'); };


    window.renderNosotrosBlocksCliente = () => { renderInfoBlocksCliente('nosotros'); renderInfoBlocksCliente('avisos'); };


if (window.renderGlobalSocialLinks) {
    window.renderGlobalSocialLinks();
}

document.addEventListener('DOMContentLoaded', () => {
    const mediaTypeSelector = document.getElementById('nosotros-media-type-selector');
    if (mediaTypeSelector) {
        mediaTypeSelector.addEventListener('click', (e) => {
            const btn = e.target.closest('.media-type-btn');
            if (!btn) return;
            if(window.switchMediaPanel) window.switchMediaPanel(btn.dataset.type);
        });
    }

    const videoUrlInput = document.getElementById('admin-nosotros-video-url');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', () => {
            if(!window.extractYouTubeId) return;
            const ytId = window.extractYouTubeId(videoUrlInput.value.trim());
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

    const btnPreviewMap = document.getElementById('btn-preview-map');
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

    const btnAddNosotrosLink = document.getElementById('btn-add-nosotros-link');
    if (btnAddNosotrosLink) {
        btnAddNosotrosLink.addEventListener('click', () => { if(window.addNosotrosLinkRow) window.addNosotrosLinkRow(); });
    }
    
    document.querySelectorAll('.btn-add-info-block, #btn-add-nosotros-block, #btn-add-avisos-block').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tgt = e.target.closest('button').dataset.target || 'nosotros';
            if(window.openInfoForm) window.openInfoForm(tgt);
        });
    });
});