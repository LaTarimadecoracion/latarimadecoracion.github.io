// js/admin/importer/admin-ml-importer.js
// --- MÓDULO AUTÓNOMO DE IMPORTACIÓN DESDE MERCADO LIBRE ---
// Totalmente aislado e independiente de los demás módulos

(function() {
    'use strict';

    let currentImportData = null;
    let isProcessing = false;

    // Inicializar selector de categorías al cargar o abrir la pestaña
    window.populateMlTargetCategories = function() {
        const select = document.getElementById('ml-view-target-category');
        if (!select) return;

        const cats = window.sessionProducts || [];
        
        let html = '<option value="Borrador" selected>📝 Borrador (Oculto - Por defecto)</option>';
        cats.forEach(c => {
            // Evitar categorías virtuales tipo -todos y no duplicar Borrador
            if (c.id && !c.id.endsWith('-todos') && c.id !== 'Borrador') {
                html += `<option value="${c.id}">${c.name || c.id}</option>`;
            }
        });

        select.innerHTML = html;
    };

    // Cambio de pestañas en la vista dedicada
    window.switchMlViewTab = function(tab) {
        const btnUrl = document.getElementById('btn-ml-tab-url');
        const btnHtml = document.getElementById('btn-ml-tab-html');
        const btnManual = document.getElementById('btn-ml-tab-manual');

        const panelUrl = document.getElementById('ml-view-subpanel-url');
        const panelHtml = document.getElementById('ml-view-subpanel-html');
        const panelManual = document.getElementById('ml-view-subpanel-manual');

        const resetBtn = (btn) => {
            if (!btn) return;
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#475569';
        };

        resetBtn(btnUrl);
        resetBtn(btnHtml);
        resetBtn(btnManual);

        if (panelUrl) panelUrl.style.display = 'none';
        if (panelHtml) panelHtml.style.display = 'none';
        if (panelManual) panelManual.style.display = 'none';

        if (tab === 'url') {
            if (btnUrl) {
                btnUrl.classList.add('active');
                btnUrl.style.background = '#2D3277';
                btnUrl.style.color = '#FFFFFF';
            }
            if (panelUrl) panelUrl.style.display = 'flex';
        } else if (tab === 'html') {
            if (btnHtml) {
                btnHtml.classList.add('active');
                btnHtml.style.background = '#2563EB';
                btnHtml.style.color = '#FFFFFF';
            }
            if (panelHtml) panelHtml.style.display = 'flex';
        } else {
            if (btnManual) {
                btnManual.classList.add('active');
                btnManual.style.background = '#10B981';
                btnManual.style.color = '#FFFFFF';
            }
            if (panelManual) panelManual.style.display = 'flex';
        }
    };

    // Parser directo de Código Fuente HTML copiado desde el navegador
    window.parseHtmlSourceMl = function() {
        const rawHtml = document.getElementById('ml-view-input-html')?.value.trim() || '';
        if (!rawHtml) {
            setStatus('Por favor pegá el código fuente HTML de la página de Mercado Libre.', 'error');
            return;
        }

        // 1. Extraer Título
        let title = '';
        const titleMatch = rawHtml.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            title = titleMatch[1].replace(/\|.*$/i, '').replace(/Mercado Libre.*$/i, '').trim();
        }
        if (!title) {
            const h1Match = rawHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (h1Match) title = h1Match[1].trim();
        }

        // 2. Extraer Precio
        let price = 0;
        const priceMatch = rawHtml.match(/andes-money-amount__fraction[^>]*>([0-9.]+)</i) ||
                           rawHtml.match(/"price"\s*:\s*([0-9.]+)/i);
        if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/\./g, '')) || 0;
        }

        // 3. Extraer Imágenes de alta resolución
        const imgMatches = rawHtml.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^\s"'<>\)]+/gi) || [];
        const cleanPictures = [...new Set(imgMatches.map(u => u.replace(/-[A-Z]\.webp$/i, '-O.webp')))]
            .filter(u => !u.includes('frontend-assets') && !u.includes('ui-navigation'));

        // 4. Extraer Descripción
        let description = '';
        const descMatch = rawHtml.match(/class="ui-pdp-description__content"[^>]*>([\s\S]*?)<\/div>/i) ||
                          rawHtml.match(/class="ui-pdp-description"[^>]*>([\s\S]*?)<\/div>/i);
        if (descMatch) {
            description = descMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')
                .trim();
        }

        // 5. Detectar enlace original si está en el HTML
        let permalink = '';
        const canonicalMatch = rawHtml.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
        if (canonicalMatch) permalink = canonicalMatch[1];

        currentImportData = {
            title: title || 'Producto Mercado Libre',
            price: price,
            description: description,
            permalink: permalink,
            pictures: cleanPictures
        };

        updatePreviewUI(currentImportData);
        setStatus(`🎉 <b>¡Extracción 100% Completa!</b> Título: "${currentImportData.title}", Precio: $${price.toLocaleString('es-AR')}, ${cleanPictures.length} fotos detectadas en alta resolución.`, 'success');
    };

    // Mensajes de estado
    function setStatus(msg, type = 'info') {
        const box = document.getElementById('ml-view-status');
        if (!box) return;

        if (!msg) {
            box.style.display = 'none';
            return;
        }

        box.style.display = 'block';
        if (type === 'error') {
            box.style.background = '#FEF2F2';
            box.style.color = '#991B1B';
            box.style.border = '1px solid #FCA5A5';
        } else if (type === 'success') {
            box.style.background = '#F0FDF4';
            box.style.color = '#166534';
            box.style.border = '1px solid #86EFAC';
        } else {
            box.style.background = '#EFF6FF';
            box.style.color = '#1E40AF';
            box.style.border = '1px solid #BFDBFE';
        }
        box.innerHTML = msg;
    }

    // Escanear por URL o MLA
    window.fetchMlProductDataFromView = async function() {
        if (isProcessing) return;
        const inputUrl = document.getElementById('ml-view-input-url')?.value.trim();
        if (!inputUrl) {
            setStatus('Por favor ingresá un link o código de publicación.', 'error');
            return;
        }

        const btn = document.getElementById('btn-view-fetch-ml');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> <span>Leyendo...</span>`;
        }

        setStatus('Consultando publicación en Mercado Libre...', 'info');
        isProcessing = true;

        try {
            const res = await fetch('/api/scrape-ml-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: inputUrl })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'No se pudo obtener la publicación automáticamente.');
            }

            currentImportData = data.product;
            updatePreviewUI(currentImportData);
            if (data.isPartial) {
                setStatus(`ℹ️ <b>Datos reconocidos desde el enlace:</b> ${data.message}`, 'info');
            } else {
                setStatus('✅ ¡Publicación escaneada con éxito!', 'success');
            }
        } catch (err) {
            console.warn('[ML Importer]', err.message);
            setStatus(`⚠️ ${err.message}`, 'error');
        } finally {
            isProcessing = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 19px;">bolt</span> <span>Escanear</span>`;
            }
        }
    };

    // Analizar texto pegado
    window.parseManualMlTextFromView = function() {
        const rawText = document.getElementById('ml-view-input-text')?.value.trim() || '';
        const rawImages = document.getElementById('ml-view-input-images')?.value.trim() || '';
        const manualLink = document.getElementById('ml-view-input-link')?.value.trim() || '';

        if (!rawText && !manualLink && !rawImages) {
            setStatus('Por favor pegá el texto, fotos o link del producto.', 'error');
            return;
        }

        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        let titleCandidate = lines[0] || 'Producto Mercado Libre';

        // Detectar si la primera línea es tipo "Nuevo | +100 vendidos" y tomar la siguiente
        if (titleCandidate.toLowerCase().includes('vendido') || titleCandidate.toLowerCase().includes('nuevo |')) {
            titleCandidate = lines[1] || titleCandidate;
        }

        // Detectar precio tipo $ 50.000 o 50000
        const priceMatch = rawText.match(/\$\s*([0-9.]+)/) || rawText.match(/precio\s*:\s*([0-9.]+)/i);
        let extractedPrice = 0;
        if (priceMatch) {
            extractedPrice = parseFloat(priceMatch[1].replace(/\./g, '')) || 0;
        }

        // Extraer fotos desde el textarea de imágenes o del mismo texto
        let foundPictures = [];
        const combinedText = `${rawImages}\n${rawText}`;
        const imgUrls = combinedText.match(/https?:\/\/[^\s"'<>]+\.(webp|jpg|jpeg|png)(\?[^\s"'<>]*)?/gi) || [];
        const mlStaticUrls = combinedText.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^\s"'<>)]+/gi) || [];
        
        foundPictures = [...new Set([...imgUrls, ...mlStaticUrls])]
            .map(u => u.replace(/-[A-Z]\.webp$/i, '-O.webp'))
            .filter(Boolean);

        currentImportData = {
            title: titleCandidate,
            price: extractedPrice,
            description: rawText,
            permalink: manualLink,
            pictures: foundPictures
        };

        updatePreviewUI(currentImportData);
        setStatus(`✅ Datos analizados: Título reconocido, precio $${extractedPrice.toLocaleString('es-AR')} y ${foundPictures.length} foto(s) listas.`, 'success');
    };

    // Actualizar tarjeta de previsualización
    function updatePreviewUI(prod) {
        if (!prod) return;

        const card = document.getElementById('ml-view-preview-card');
        const badge = document.getElementById('ml-view-badge-status');
        const btnSave = document.getElementById('btn-ml-save-direct');
        const btnEditor = document.getElementById('btn-ml-open-in-editor');

        const imgEl = document.getElementById('ml-view-prev-img');
        const titleIn = document.getElementById('ml-view-prev-title-input');
        const priceIn = document.getElementById('ml-view-prev-price-input');
        const descIn = document.getElementById('ml-view-prev-desc');
        const countEl = document.getElementById('ml-view-prev-photos-count');
        const thumbsEl = document.getElementById('ml-view-prev-thumbnails');

        if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            card.style.border = '1.5px solid #86EFAC';
            card.style.display = 'block';
        }
        if (badge) {
            if (prod.isPartial) {
                badge.textContent = 'Datos Parciales (Completar)';
                badge.style.background = '#FEF3C7';
                badge.style.color = '#B45309';
            } else {
                badge.textContent = 'Listo para Guardar';
                badge.style.background = '#DCFCE7';
                badge.style.color = '#15803D';
            }
        }
        if (btnSave) btnSave.disabled = false;
        if (btnEditor) btnEditor.disabled = false;

        if (titleIn) titleIn.value = prod.title || '';
        if (priceIn) priceIn.value = prod.price || 0;
        if (descIn) descIn.value = prod.description || '';

        const photos = Array.isArray(prod.pictures) ? prod.pictures : [];
        if (countEl) {
            countEl.textContent = photos.length > 0 
                ? `${photos.length} fotos detectadas en alta resolución`
                : `0 fotos remotas (podés agregarlas en el editor)`;
        }

        if (imgEl) {
            imgEl.src = photos[0] || 'img/logo_provisional.png';
        }

        if (thumbsEl) {
            thumbsEl.innerHTML = '';
            photos.slice(0, 8).forEach(url => {
                const thumb = document.createElement('img');
                thumb.src = url;
                thumb.style.width = '42px';
                thumb.style.height = '42px';
                thumb.style.objectFit = 'cover';
                thumb.style.borderRadius = '6px';
                thumb.style.border = '1px solid #CBD5E1';
                thumbsEl.appendChild(thumb);
            });
        }
    }

    // Resetear formulario
    window.resetMlImporterView = function() {
        currentImportData = null;
        const htmlInput = document.getElementById('ml-view-input-html');
        const card = document.getElementById('ml-view-preview-card');
        const badge = document.getElementById('ml-view-badge-status');
        const btnSave = document.getElementById('btn-ml-save-direct');
        const btnEditor = document.getElementById('btn-ml-open-in-editor');

        if (htmlInput) htmlInput.value = '';
        if (card) {
            card.style.opacity = '0.6';
            card.style.pointerEvents = 'none';
            card.style.border = '1px dashed #CBD5E1';
        }
        if (badge) {
            badge.textContent = 'Esperando datos';
            badge.style.background = '#F1F5F9';
            badge.style.color = '#64748B';
        }
        if (btnSave) btnSave.disabled = true;
        if (btnEditor) btnEditor.disabled = true;
        setStatus('');
    };

    // Guardar directamente en la tienda
    window.saveMlProductDirectly = async function() {
        if (!currentImportData || isProcessing) return;

        const targetCatId = document.getElementById('ml-view-target-category')?.value;
        if (!targetCatId) {
            alert('Por favor elegí una categoría de destino.');
            return;
        }

        const titleVal = document.getElementById('ml-view-prev-title-input')?.value.trim() || currentImportData.title;
        const priceVal = parseFloat(document.getElementById('ml-view-prev-price-input')?.value) || currentImportData.price || 0;
        const descVal = document.getElementById('ml-view-prev-desc')?.value.trim() || currentImportData.description || '';

        const btnSave = document.getElementById('btn-ml-save-direct');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 20px;">sync</span> <span>Descargando fotos y guardando...</span>`;
        }
        isProcessing = true;
        setStatus('Procesando imágenes en WebP y guardando en la categoría...', 'info');

        try {
            // 1. Descargar y optimizar imágenes si vinieron
            let localImages = [];
            const photos = currentImportData.pictures || [];
            if (photos.length > 0) {
                const dlRes = await fetch('/api/download-remote-images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: titleVal,
                        images: photos
                    })
                });
                const dlData = await dlRes.json();
                if (dlData.success && Array.isArray(dlData.savedImages)) {
                    localImages = dlData.savedImages;
                }
            }

            const coverImage = localImages[0] || photos[0] || 'img/logo_provisional.png';

            // 2. Construir objeto de producto estándar
            const newProd = {
                id: String(Date.now()),
                title: titleVal,
                description: descVal,
                image: coverImage,
                order: 0,
                visible: true,
                primaryCatId: targetCatId,
                acabados_groups: [
                    {
                        acabado_name: 'Estándar',
                        cover_image: coverImage,
                        images_list: localImages.length > 0 ? localImages : photos,
                        medidas_variants: [
                            {
                                medida: 'Estándar',
                                price: priceVal,
                                cost_price: Math.round(priceVal * 0.5),
                                link: currentImportData.permalink || '',
                                linkLabel: currentImportData.permalink ? 'Ver en Mercado Libre' : '',
                                iconType: 'local_shipping',
                                stock: 5,
                                showPrice: true,
                                highlight: false,
                                default: true,
                                hidden: false
                            }
                        ]
                    }
                ]
            };

            // 3. Insertar en sessionProducts
            const catObj = (window.sessionProducts || []).find(c => c.id === targetCatId);
            if (catObj) {
                if (!catObj.products) catObj.products = [];
                catObj.products.unshift(newProd);
            }

            // También agregar a la categoría "todos" del rubro
            const rubro = catObj?.rubro || 'carpinteria';
            const todosCat = (window.sessionProducts || []).find(c => c.id === `${rubro}-todos`);
            if (todosCat) {
                if (!todosCat.products) todosCat.products = [];
                todosCat.products.unshift(newProd);
            }

            // 4. Guardar producto individual en el servidor
            let saved = false;
            try {
                const singleRes = await fetch('/api/save-product-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newProd)
                });
                if (singleRes.ok) {
                    const data = await singleRes.json();
                    if (data.success) saved = true;
                }
            } catch (e) {
                console.warn(e);
            }

            if (!saved && typeof window.saveProductsToServer === 'function') {
                await window.saveProductsToServer();
            }

            // 5. Respaldar en localStorage
            try {
                localStorage.setItem('sessionProducts', JSON.stringify(window.sessionProducts));
            } catch (e) {}

            setStatus(`🎉 ¡Producto <b>"${titleVal}"</b> importado y guardado con éxito en la categoría!`, 'success');
            if (typeof window.showToast === 'function') {
                window.showToast('✅ Producto importado correctamente.', 'success');
            }

            window.resetMlImporterView();
        } catch (err) {
            console.error(err);
            setStatus(`❌ Error al guardar producto: ${err.message}`, 'error');
        } finally {
            isProcessing = false;
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">save</span> <span>Guardar Directamente en la Web</span>`;
            }
        }
    };

    // Abrir en el editor tradicional para quien quiera editar antes
    window.sendMlProductToEditor = async function() {
        if (!currentImportData) return;

        const titleVal = document.getElementById('ml-view-prev-title-input')?.value.trim() || currentImportData.title;
        const priceVal = parseFloat(document.getElementById('ml-view-prev-price-input')?.value) || currentImportData.price || 0;
        const descVal = document.getElementById('ml-view-prev-desc')?.value.trim() || currentImportData.description || '';

        const targetCatId = document.getElementById('ml-view-target-category')?.value;
        let catIdx = 0;
        if (targetCatId && window.sessionProducts) {
            const foundIdx = window.sessionProducts.findIndex(c => c.id === targetCatId);
            if (foundIdx !== -1) catIdx = foundIdx;
        }

        // 1. Asegurar que el modal de producto esté disponible y se abra
        const prodModal = document.getElementById('admin-product-modal');
        if (typeof window.openProductForm === 'function') {
            window.openProductForm(catIdx, null);
        } else if (prodModal) {
            prodModal.style.display = 'flex';
        }

        // 2. Llenar los campos en el modal de producto
        setTimeout(() => {
            const inTitle = document.getElementById('admin-title');
            const inDesc = document.getElementById('admin-description');
            if (inTitle) inTitle.value = titleVal;
            if (inDesc) inDesc.value = descVal;

            if (typeof window.createAcabadoGroupUI === 'function') {
                const groupsContainer = document.getElementById('admin-acabados-groups');
                if (groupsContainer) groupsContainer.innerHTML = '';

                window.createAcabadoGroupUI({
                    acabado_name: 'Estándar',
                    cover_image: currentImportData.pictures?.[0] || '',
                    images_list: currentImportData.pictures || [],
                    medidas_variants: [
                        {
                            medida: 'Estándar',
                            price: priceVal,
                            cost_price: Math.round(priceVal * 0.5),
                            link: currentImportData.permalink || '',
                            linkLabel: currentImportData.permalink ? 'Ver en Mercado Libre' : '',
                            iconType: 'local_shipping',
                            stock: 5,
                            showPrice: true,
                            highlight: false,
                            default: true,
                            hidden: false
                        }
                    ]
                });
            }

            if (prodModal) {
                prodModal.style.display = 'flex';
                prodModal.scrollIntoView({ behavior: 'smooth' });
            }
        }, 120);
    };

})();
