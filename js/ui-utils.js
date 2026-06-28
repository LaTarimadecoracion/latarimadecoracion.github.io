

    
    function extractTikTokId(url) {
        if (!url) return null;
        const regex = /(?:tiktok\.com\/.*\/video\/|tiktok\.com\/v\/)(\d+)/;
        const match = url.match(regex);
        if (match) return match[1];
        return null;
    }

    function extractYouTubeId(url) {
        if (!url) return null;
        const patterns = [ /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/, /youtube\.com\/shorts\/([\w-]{11})/ ];
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    }


    function convertImageToWebP(file, quality = 0.80) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Intentar exportar como WebP; si el browser no soporta, caer en JPEG
                    const webpDataUrl = canvas.toDataURL('image/webp', quality);
                    const isWebP = webpDataUrl.startsWith('data:image/webp');
                    const finalDataUrl = isWebP ? webpDataUrl : canvas.toDataURL('image/jpeg', quality);

                    // Convertir data URL a Blob
                    const arr = finalDataUrl.split(',');
                    const mime = arr[0].match(/:(.*?);/)[1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) u8arr[n] = bstr.charCodeAt(n);
                    const ext = isWebP ? 'webp' : 'jpg';
                    const blob = new Blob([u8arr], { type: mime });
                    const convertedFile = new File([blob], `imagen.${ext}`, { type: mime });
                    resolve({ file: convertedFile, dataUrl: finalDataUrl });
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }



    async function uploadImageToServer(file, categoryName, productTitle) {
        const formData = new FormData();
        // REGLA DE ORO: Primero inyectamos todos los textos
        if (categoryName) {
            formData.append('category', categoryName.trim());
        }
        if (productTitle) {
            formData.append('title', productTitle.trim());
        }
        // Al final agregamos la imagen (ya convertida a WebP antes de llegar acá)
        formData.append('image', file);
        
        try {
            const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) return data.imagePath;
            throw new Error(data.message);
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            return null;
        }
    }



    async function editCategoryInServer(id, oldName, newName, currentImageUrl, file) {
        const formData = new FormData();
        formData.append('id', id);
        formData.append('oldName', oldName);
        formData.append('newName', newName);
        if (currentImageUrl) formData.append('currentImageUrl', currentImageUrl);
        if (file) formData.append('image', file);
        
        try {
            const response = await fetch('/api/categories/edit', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) return data;
            throw new Error(data.message);
        } catch (error) {
            console.error('Error editando categoría:', error);
            return null;
        }
    }

    // --- MEJORAS UX/UI (Propuestas 5 y 9) ---

    // Habilitar arrastre por mouse para scroll horizontal
    window.enableDragToScroll = function(slider) {
        if (!slider) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        slider.style.cursor = 'grab';

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.style.cursor = 'grabbing';
            slider.style.scrollBehavior = 'auto'; // Disable transition during drag
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = 'grab';
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = 'grab';
            slider.style.scrollBehavior = ''; // Reset transition
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5; // Multiplicador de velocidad
            slider.scrollLeft = scrollLeft - walk;
        });
    };

    // Visor de fotos a pantalla completa (Lightbox)
    window.openLightbox = function(imgUrl) {
        if (!imgUrl) return;
        
        let overlay = document.getElementById('lightbox-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lightbox-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.95);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;
            
            overlay.innerHTML = `
                <button id="btn-close-lightbox" style="position: absolute; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.1); border: none; color: white; cursor: pointer; z-index: 100000; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: background 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 26px;">close</span>
                </button>
                <img id="lightbox-img" src="" style="max-width: 92%; max-height: 85%; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
            `;
            
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.closest('#btn-close-lightbox') || e.target.id === 'lightbox-img') {
                    window.closeLightbox();
                }
            });
            
            // Hover states
            const btnClose = overlay.querySelector('#btn-close-lightbox');
            btnClose.addEventListener('mouseenter', () => btnClose.style.background = 'rgba(255,255,255,0.2)');
            btnClose.addEventListener('mouseleave', () => btnClose.style.background = 'rgba(255,255,255,0.1)');
        }
        
        const img = overlay.querySelector('#lightbox-img');
        img.src = imgUrl;
        overlay.style.display = 'flex';
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            img.style.transform = 'scale(1)';
        }, 10);
    };

    window.closeLightbox = function() {
        const overlay = document.getElementById('lightbox-overlay');
        if (overlay) {
            const img = overlay.querySelector('#lightbox-img');
            img.style.transform = 'scale(0.95)';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    };