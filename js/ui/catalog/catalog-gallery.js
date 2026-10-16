// js/ui/catalog/catalog-gallery.js
// --- GALERÍA DE IMÁGENES Y ACCIONES (FAVORITOS / COMPARTIR / OVERLAY) ---
// Extraído de ui-catalog.js como componente modular independiente.

(function() {
    'use strict';

    function renderProductGallery(context) {
        const {
            product,
            grupo,
            grupos,
            currentGroupIndex,
            categoryName,
            detailImgContainer,
            divMedida,
            divOpt,
            isProductInFavorites,
            updateFavState,
            onSelectGroup
        } = context;

        if (!detailImgContainer) return;

        const images = grupo.images_list && grupo.images_list.length > 0 ? grupo.images_list : [grupo.cover_image];
        let galleryHTML = `<div class="product-detail-carousel">`;
        images.forEach((imgUrl, index) => {
            if (!imgUrl) return;
            galleryHTML += `
                <div class="product-detail-slide">
                    <div class="product-gallery-img-wrapper" style="position:relative; width:100%; height:100%;">
                        <img src="${imgUrl}" class="product-detail-img lazy-img" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
                    </div>
                    <span class="slide-indicator">${index + 1} / ${images.length}</span>
                </div>
            `;
        });
        galleryHTML += `</div>`;
        
        // Inyectar el contenedor flotante de acciones (Instagram-Style)
        galleryHTML += `
            <div class="gallery-floating-actions" onclick="event.stopPropagation();">
                <button type="button" class="btn-gallery-action btn-gallery-fav" id="btn-gallery-fav-dynamic" title="Guardar en Favoritos">
                    <span class="material-symbols-outlined">favorite_border</span>
                </button>
                <button type="button" class="btn-gallery-action btn-gallery-share" id="btn-gallery-share-dynamic" title="Compartir Producto">
                    <span class="material-symbols-outlined">share</span>
                </button>
            </div>
        `;

        // Inyectar Botones de Acabado Semitransparentes sobre el pie de la imagen
        if (grupos.length > 1 || (grupos.length === 1 && grupos[0].acabado_name !== 'Único')) {
            const count = grupos.length;
            let btnWidthPct = '100%';
            if (count === 2) btnWidthPct = '50%';
            else if (count >= 3) btnWidthPct = `${(100 / count).toFixed(3)}%`;

            galleryHTML += `
                <div class="gallery-acabados-overlay" onclick="event.stopPropagation();">
                    ${grupos.map((g, i) => {
                        const imgUrl = g.cover_image || (g.images_list && g.images_list.length > 0 ? g.images_list[0] : null);
                        return `
                            <button type="button" class="gallery-acabado-btn ${i === currentGroupIndex ? 'active' : ''}" data-index="${i}" style="width: ${btnWidthPct} !important; min-width: ${btnWidthPct} !important; flex: 1 1 ${btnWidthPct} !important;" title="Ver acabado ${g.acabado_name}">
                                ${imgUrl ? `<img src="${imgUrl}" class="gallery-acabado-thumb" alt="${g.acabado_name}">` : ''}
                                <span class="gallery-acabado-label">${g.acabado_name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        detailImgContainer.innerHTML = galleryHTML;

        // Escuchar clics en la imagen de la galería para abrir Lightbox / Fullscreen estilo Mercado Libre
        const imgWrappers = detailImgContainer.querySelectorAll('.product-gallery-img-wrapper');
        imgWrappers.forEach((wrapper, idx) => {
            wrapper.style.cursor = 'zoom-in';
            wrapper.title = 'Hacé clic para ampliar en pantalla completa';
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.openProductLightbox) {
                    window.openProductLightbox(images, idx, product.title);
                }
            });
        });

        // Escuchar clics en los botones de acabado de la galería
        const acabadosOverlay = detailImgContainer.querySelector('.gallery-acabados-overlay');
        if (acabadosOverlay) {
            acabadosOverlay.addEventListener('click', (e) => {
                const btn = e.target.closest('.gallery-acabado-btn');
                if (!btn) return;
                
                acabadosOverlay.querySelectorAll('.gallery-acabado-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const targetIdx = parseInt(btn.dataset.index, 10);
                if (typeof onSelectGroup === 'function') {
                    onSelectGroup(targetIdx);
                }
            });
        }
        
        setupGalleryActions(context);
        setupGalleryAutoScroll(detailImgContainer, images);
    }

    function setupGalleryActions(context) {
        const {
            product,
            grupos,
            currentGroupIndex,
            categoryName,
            divMedida,
            divOpt,
            isProductInFavorites,
            updateFavState
        } = context;

        const btnFav = document.getElementById('btn-gallery-fav-dynamic');
        const btnShare = document.getElementById('btn-gallery-share-dynamic');
        if (!btnFav || !btnShare) return;

        if (updateFavState) updateFavState();

        // Clic en Favoritos
        btnFav.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.CarritoModule && window.CarritoModule.toggle) {
                const grupo = (grupos && grupos[currentGroupIndex]) ? grupos[currentGroupIndex] : {};
                const acabadoName = grupo.acabado_name || 'Único';
                const selMedida = divMedida ? divMedida.querySelector('select') : null;
                const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';

                const selOpt = divOpt ? divOpt.querySelector('select') : null;
                const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
                const optLabel = product.optional_variant?.label || '';

                const activeVariant = (grupo.medidas_variants || []).find(m => m.hidden !== true && (m.medida || '').trim() === medidaText);
                let itemPrice = (activeVariant && activeVariant.showPrice === true && activeVariant.price) ? activeVariant.price : null;

                const qtyValEl = document.getElementById('qty-value');
                let qtyVal = qtyValEl ? parseInt(qtyValEl.textContent || '1', 10) : 1;

                const customCutsList = window._activeCustomCutsList || [];
                if ((product.isCustomCutting === true || product.id === '69') && Array.isArray(customCutsList) && customCutsList.length > 0) {
                    const totalPieces = customCutsList.reduce((acc, c) => acc + (c.qty || 1), 0);
                    let netSubtotal = 0;
                    customCutsList.forEach(c => {
                        let cSub = c.subtotal || 0;
                        const rule = window.getBestDiscountRule ? window.getBestDiscountRule(product, c.qty || 1, activeVariant) : null;
                        if (rule) {
                            if (rule.discountPercent !== undefined && rule.discountPercent > 0) {
                                cSub = cSub * (1 - rule.discountPercent / 100);
                            } else if (rule.discountValue !== undefined && rule.discountValue > 0) {
                                const minU = rule.minQty !== undefined ? rule.minQty : rule.minUnits;
                                cSub = Math.max(0, cSub - (Math.floor((c.qty || 1) / minU) * rule.discountValue));
                            }
                        }
                        netSubtotal += cSub;
                    });
                    const cutsSummary = customCutsList.map(c => `${c.qty}x ${c.largo}x${c.ancho}cm (${c.material} ${c.espesor})`).join(' | ');
                    medidaText = `Despiece (${totalPieces} piezas: ${cutsSummary})`;
                    itemPrice = Math.round(netSubtotal / totalPieces);
                    qtyVal = totalPieces;
                }

                window.CarritoModule.toggle(product, acabadoName, categoryName, medidaText, optText, optLabel, itemPrice, qtyVal);
                
                if (isProductInFavorites && isProductInFavorites(product.id, acabadoName, medidaText, optText)) {
                    btnFav.classList.add('pulse-heart');
                    setTimeout(() => btnFav.classList.remove('pulse-heart'), 500);
                }
                
                if (updateFavState) updateFavState();
            }
        });

        // Clic en Compartir
        btnShare.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const grupo = grupos[currentGroupIndex];
            const acabadoName = grupo ? (grupo.acabado_name || 'Único') : 'Único';
            
            const selMedida = divMedida ? divMedida.querySelector('select') : null;
            const medidaText = (selMedida && selMedida.selectedIndex !== -1) ? selMedida.options[selMedida.selectedIndex]?.text || '' : '';
            
            const selOpt = divOpt ? divOpt.querySelector('select') : null;
            const optText = (selOpt && selOpt.selectedIndex !== -1) ? selOpt.options[selOpt.selectedIndex]?.text || '' : '';
            
            let selectedDetails = acabadoName;
            if (acabadoName === 'Único' && (medidaText || optText)) {
                selectedDetails = medidaText || optText;
            } else {
                if (medidaText) selectedDetails += ` - ${medidaText}`;
                if (optText) selectedDetails += ` - ${optText}`;
            }

            const shareUrl = window.getShortProductUrl
                ? window.getShortProductUrl(product.id, acabadoName !== 'Único' ? acabadoName : '', medidaText, optText)
                : window.location.href;
            
            const shareText = `Mira lo que encontré en La Tarima 😊\n*${product.title}* (${selectedDetails})`;
            
            const copyTextToClipboard = (textToCopy) => {
                const showToast = () => {
                    const toast = document.getElementById('admin-toast');
                    if (toast) {
                        toast.textContent = "🔗 ¡Enlace copiado al portapapeles!";
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 2000);
                    } else {
                        alert("¡Enlace copiado al portapapeles!");
                    }
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy)
                        .then(showToast)
                        .catch(err => {
                            console.warn('Navigator clipboard failed, trying fallback:', err);
                            fallbackCopy(textToCopy);
                        });
                } else {
                    fallbackCopy(textToCopy);
                }

                function fallbackCopy(text) {
                    try {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.top = "0";
                        textArea.style.left = "0";
                        textArea.style.width = "2em";
                        textArea.style.height = "2em";
                        textArea.style.padding = "0";
                        textArea.style.border = "none";
                        textArea.style.outline = "none";
                        textArea.style.boxShadow = "none";
                        textArea.style.background = "transparent";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const successful = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        if (successful) {
                            showToast();
                        } else {
                            alert("No se pudo copiar el enlace automáticamente. Por favor copialo manualmente.");
                        }
                    } catch (err) {
                        console.error('Fallback copy failed:', err);
                        alert("No se pudo copiar el enlace.");
                    }
                }
            };

            const fullMessage = `${shareText}\n${shareUrl}`;

            if (navigator.share) {
                navigator.share({
                    title: product.title,
                    text: fullMessage
                }).catch(err => {
                    console.log('Error sharing:', err);
                    copyTextToClipboard(fullMessage);
                });
            } else {
                copyTextToClipboard(fullMessage);
            }
        });
    }

    function setupGalleryAutoScroll(detailImgContainer, images) {
        const carousel = detailImgContainer.querySelector('.product-detail-carousel');
        if (carousel && images.length > 1) {
            if (window.productGalleryAutoScrollInterval) {
                clearInterval(window.productGalleryAutoScrollInterval);
            }
            
            window.productGalleryAutoScrollInterval = setInterval(() => {
                if (!document.body.contains(carousel) || !carousel.offsetParent) {
                    clearInterval(window.productGalleryAutoScrollInterval);
                    window.productGalleryAutoScrollInterval = null;
                    return;
                }
                
                const slideWidth = carousel.clientWidth;
                if (slideWidth === 0) return;
                
                const currentSlide = Math.round(carousel.scrollLeft / slideWidth);
                let nextSlide = currentSlide + 1;
                if (nextSlide >= images.length) {
                    nextSlide = 0;
                }
                
                carousel.scrollTo({
                    left: slideWidth * nextSlide,
                    behavior: 'smooth'
                });
            }, 3500);

            const stopAutoScroll = () => {
                if (window.productGalleryAutoScrollInterval) {
                    clearInterval(window.productGalleryAutoScrollInterval);
                    window.productGalleryAutoScrollInterval = null;
                }
            };
            const detailView = document.getElementById('view-product-detail');
            if (detailView) {
                detailView.addEventListener('touchstart', stopAutoScroll, { passive: true, once: true });
                detailView.addEventListener('mousedown', stopAutoScroll, { passive: true, once: true });
                detailView.addEventListener('wheel', stopAutoScroll, { passive: true, once: true });
            }
        }
    }

    window.renderProductGallery = renderProductGallery;
})();
