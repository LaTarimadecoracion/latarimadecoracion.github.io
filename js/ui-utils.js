

    
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