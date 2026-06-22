// js/videos.js

window.globalVideosUnmuted = false;

/**
 * Módulo para la vista de Videos Inmersivos.
 * Genera una grilla de miniaturas y un reproductor estilo TikTok a pantalla completa.
 */

window.renderVideosView = function() {
    const gridContainer = document.getElementById('videos-grid-container');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    // Extraer todos los productos que tengan un video definido
    let videoProducts = [];
    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) 
        ? sessionProducts 
        : (typeof productsData !== 'undefined' ? productsData : []);

    sourceData.forEach(cat => {
        if (cat.products) {
            cat.products.forEach(prod => {
                if (prod.video) {
                    videoProducts.push({ product: prod, catName: cat.name });
                }
            });
        }
    });

    if (videoProducts.length === 0) {
        gridContainer.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1; text-align: center;">Por el momento no hay videos disponibles.</p>';
        return;
    }

    // Dibujar Grilla de Miniaturas
    videoProducts.forEach((item, index) => {
        const prod = item.product;
        const card = document.createElement('div');
        card.className = 'video-thumbnail-card';

        const cover = Array.isArray(prod.image) ? prod.image[0] : (prod.image || 'img/logo_provisional.png');
        
        // Diseño de tarjeta vertical 9:16
        card.innerHTML = `
            <img src="${cover}" class="video-thumbnail-card-img lazy-img" alt="${prod.title}" loading="lazy" onload="this.classList.add('loaded')">
            
            <!-- Icono Play superpuesto en el centro -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: white; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));">play_circle</span>
            </div>
            
            <div class="video-thumbnail-gradient"></div>
            <div class="video-thumbnail-info">
                <h3 class="video-thumbnail-title">${prod.title}</h3>
            </div>
        `;

        // Al tocar miniatura, abrir modal en el índice correcto
        card.addEventListener('click', () => {
            openImmersiveVideo(videoProducts, index);
        });

        // Animación de Hover
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-3px)';
            card.style.boxShadow = '0 6px 15px rgba(0,0,0,0.08)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });

        gridContainer.appendChild(card);
    });
};

// Referencias del DOM
let tiktokModal = null;
let tiktokFeedContainer = null;
let tiktokCloseBtn = null;
let videoObserver = null;

// Abrir reproductor inmersivo
function openImmersiveVideo(videoList, startIndex) {
    tiktokModal = document.getElementById('tiktok-video-modal');
    tiktokFeedContainer = document.getElementById('tiktok-feed-container');
    tiktokCloseBtn = document.getElementById('tiktok-close-btn');

    if (!tiktokModal || !tiktokFeedContainer) return;

    // Limpiar contenedor previo
    tiktokFeedContainer.innerHTML = '';

    // Crear elementos de video
    videoList.forEach((item, i) => {
        const prod = item.product;
        const videoSrc = prod.video;
        
        const videoItem = document.createElement('div');
        videoItem.className = 'tiktok-video-item';
        videoItem.id = `tiktok-video-${i}`;

        // El poster será la imagen del producto
        const posterSrc = Array.isArray(prod.image) ? prod.image[0] : (prod.image || '');

        // Detectar si es YouTube
        const ytMatch = videoSrc.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : null;

        // Detectar si es TikTok
        const tkMatch = videoSrc.match(/(?:tiktok\.com\/.*\/video\/|tiktok\.com\/v\/)(\d+)/);
        const tkId = tkMatch ? tkMatch[1] : null;

        let mediaHTML = '';
        if (ytId) {
            // Reproductor iframe de YouTube
            mediaHTML = `
                <iframe 
                    class="tiktok-video-element yt-iframe"
                    data-src="https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=1&controls=0&rel=0&showinfo=0&loop=1&playlist=${ytId}&modestbranding=1&playsinline=1&mute=1" 
                    src=""
                    frameborder="0" 
                    allow="autoplay; encrypted-media" 
                    allowfullscreen
                    style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"
                ></iframe>
            `;
        } else if (tkId) {
            // Reproductor iframe de TikTok
            mediaHTML = `
                <iframe 
                    class="tiktok-video-element tk-iframe"
                    data-src="https://www.tiktok.com/embed/v2/${tkId}" 
                    src=""
                    frameborder="0" 
                    allow="encrypted-media;" 
                    allowfullscreen
                    style="width: 100%; height: 100%; object-fit: cover;"
                ></iframe>
            `;
        } else {
            mediaHTML = `
                <video 
                    src="${videoSrc}" 
                    poster="${posterSrc}"
                    loop 
                    ${window.globalVideosUnmuted ? '' : 'muted'}
                    playsinline 
                    preload="metadata"
                    class="tiktok-video-element mp4-video"
                ></video>
            `;
        }

        const catName = item.catName || "";
        const isFav = () => {
            try {
                const favs = JSON.parse(localStorage.getItem("cartItems") || "[]");
                return favs.some(f => f.id === prod.id);
            } catch (e) { return false; }
        };
        const heartIcon = isFav() ? "favorite" : "favorite_border";
        const heartClass = isFav() ? "is-fav" : "";

        videoItem.innerHTML = `
            ${mediaHTML}
            
            <span class="material-symbols-outlined tiktok-play-icon">play_arrow</span>
            <span class="material-symbols-outlined tiktok-mute-icon" style="position: absolute; top: 20px; right: 20px; font-size: 28px; color: rgba(255,255,255,0.8); z-index: 15; background: rgba(0,0,0,0.3); border-radius: 50%; padding: 6px; pointer-events: none; backdrop-filter: blur(2px); ${window.globalVideosUnmuted ? 'display: none;' : ''}">volume_off</span>

            <!-- Información Superior (Título) -->
            <div class="tiktok-ui-top">
                <div class="tiktok-product-title">${prod.title}</div>
            </div>



            <!-- Botones a la derecha -->
            <div class="tiktok-ui-right">
                <button class="tiktok-action-btn tk-fav-btn ${heartClass}" data-prod-id="${prod.id}" style="transition: transform 0.2s;">
                    <div class="tk-icon-bg" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin: 0 auto 2px auto; backdrop-filter: blur(2px); transition: background 0.2s;">
                        <span class="material-symbols-outlined tk-heart-icon" style="font-size: 22px; color: ${isFav() ? 'var(--primary-color, #c0510a)' : 'white'};">${heartIcon}</span>
                    </div>
                    <span class="label">Guardar</span>
                </button>
                <button class="tiktok-action-btn" onclick="shareProduct('${prod.title}', '${prod.id}')">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-bottom: 2px;" alt="WhatsApp">
                    <span class="label">Compartir</span>
                </button>
            </div>

            <!-- Información inferior (Botón central) -->
            <div class="tiktok-ui-bottom">
                <div class="tiktok-btn-product" id="btn-go-product-${i}">
                    Ver detalles del producto
                </div>
            </div>
        `;

        tiktokFeedContainer.appendChild(videoItem);

        // Fav logic
        const favBtn = videoItem.querySelector('.tk-fav-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar pausar el video
                if (window.CarritoModule && window.CarritoModule.toggle) {
                    window.CarritoModule.toggle(prod, '', catName, '', '', '');
                    
                    // Update icon
                    const isNowFav = isFav();
                    const iconEl = favBtn.querySelector('.tk-heart-icon');
                    if (isNowFav) {
                        favBtn.classList.add('is-fav');
                        favBtn.classList.add('pulse-heart');
                        if (iconEl) {
                            iconEl.textContent = 'favorite';
                            iconEl.style.color = 'var(--primary-color, #c0510a)';
                        }
                        setTimeout(() => favBtn.classList.remove('pulse-heart'), 500);
                    } else {
                        favBtn.classList.remove('is-fav');
                        if (iconEl) {
                            iconEl.textContent = 'favorite_border';
                            iconEl.style.color = 'white';
                        }
                    }
                    if (window.updateFavoritesBadge) window.updateFavoritesBadge();
                }
            });
        }

        // Click para pausar/reproducir
        const videoElement = videoItem.querySelector('video');
        const iframeElement = videoItem.querySelector('iframe');
        const playIcon = videoItem.querySelector('.tiktok-play-icon');
        const muteIcon = videoItem.querySelector('.tiktok-mute-icon');
        
        // Estado interno de reproducción para iframes
        let isPlaying = false;

        videoItem.addEventListener('click', (e) => {
            if (e.target.closest('.tiktok-ui-right') || e.target.closest('.tiktok-ui-bottom')) return;

            // Global unmute logic
            const applyGlobalUnmute = () => {
                if (!window.globalVideosUnmuted) {
                    window.globalVideosUnmuted = true;
                    // Unmute all loaded mp4s
                    document.querySelectorAll('.tiktok-video-element.mp4-video').forEach(v => {
                        v.muted = false;
                    });
                    // Unmute all loaded iframes
                    document.querySelectorAll('.tiktok-video-element.yt-iframe').forEach(ifr => {
                        ifr.dataset.unmuted = 'true';
                        if (ifr.contentWindow && ifr.getAttribute('src')) {
                            ifr.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
                            ifr.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
                        }
                    });
                    // Hide all mute icons
                    document.querySelectorAll('.tiktok-mute-icon').forEach(icon => {
                        icon.style.display = 'none';
                    });
                }
            };

            if (videoElement) {
                if (videoElement.muted) {
                    applyGlobalUnmute();
                }
                
                if (videoElement.paused) {
                    videoElement.play();
                    playIcon.style.display = 'none';
                } else {
                    videoElement.pause();
                    playIcon.style.display = 'block';
                }
            } else if (iframeElement) {
                if (iframeElement.classList.contains('tk-iframe')) {
                    // Para TikTok, el iframe intercepta sus propios clicks, no hacemos nada extra.
                    return;
                }
                if (!isPlaying) {
                    // Primer toque: si está muteado, desmutear a todos globalmente
                    if (!iframeElement.dataset.unmuted) {
                        applyGlobalUnmute();
                    }
                    
                    iframeElement.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                    playIcon.style.display = 'none';
                    isPlaying = true;
                } else {
                    iframeElement.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                    playIcon.style.display = 'block';
                    isPlaying = false;
                }
            }
        });

        // Botón "Ir al producto"
        const btnGoProduct = videoItem.querySelector(`#btn-go-product-${i}`);
        if (btnGoProduct) {
            btnGoProduct.addEventListener('click', () => {
                closeImmersiveVideo(); // Cerrar videos primero
                if (window.showProductDetail) {
                    window.showProductDetail(prod, item.catName);
                }
            });
        }
    });

    // Mostrar Modal
    tiktokModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Evitar scroll del body

    // Scroll inmediato al index seleccionado
    setTimeout(() => {
        const targetElement = document.getElementById(`tiktok-video-${startIndex}`);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'instant' });
        }
        setupIntersectionObserver();
    }, 50);

    // Cerrar modal
    tiktokCloseBtn.onclick = closeImmersiveVideo;
}

// Configurar el Intersection Observer para AutoPlay
function setupIntersectionObserver() {
    if (videoObserver) videoObserver.disconnect();

    const options = {
        root: tiktokFeedContainer,
        rootMargin: '0px',
        threshold: 0.6 // El video debe estar al menos al 60% visible para reproducirse
    };

    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            const iframe = entry.target.querySelector('iframe');
            const playIcon = entry.target.querySelector('.tiktok-play-icon');

            if (entry.isIntersecting) {
                if (video) {
                    video.play().catch(e => console.log('Autoplay prevent:', e));
                }
                if (iframe) {
                    if (!iframe.getAttribute('src')) {
                        let tSrc = iframe.getAttribute('data-src');
                        if (window.globalVideosUnmuted && iframe.classList.contains('yt-iframe')) {
                            tSrc = tSrc.replace('&mute=1', '&mute=0');
                            iframe.dataset.unmuted = 'true';
                        }
                        iframe.setAttribute('src', tSrc);
                    } else {
                        if (iframe.classList.contains('yt-iframe')) {
                            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                        } else if (iframe.classList.contains('tk-iframe')) {
                            // TikTok no tiene API simple, recargamos el src si estaba vacío
                        }
                    }
                }
                if (playIcon) playIcon.style.display = 'none';
            } else {
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
                if (iframe) {
                    if (iframe.getAttribute('src')) {
                        if (iframe.classList.contains('yt-iframe')) {
                            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                            iframe.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
                        } else if (iframe.classList.contains('tk-iframe')) {
                            // Para pausar TikTok vaciamos el src (detiene la reproducción)
                            iframe.setAttribute('src', '');
                        }
                    }
                }
            }
        });
    }, options);

    const videoItems = document.querySelectorAll('.tiktok-video-item');
    videoItems.forEach(item => videoObserver.observe(item));
}

// Función para cerrar modal
function closeImmersiveVideo() {
    if (tiktokModal) tiktokModal.style.display = 'none';
    document.body.style.overflow = '';
    if (tiktokFeedContainer) tiktokFeedContainer.innerHTML = ''; // Limpiar y detener videos
    if (videoObserver) videoObserver.disconnect();
}

// Compartir por WhatsApp global (Producto)
window.shareProduct = function(title, prodId) {
    const url = window.location.origin + window.location.pathname + '?prod=' + prodId;
    const text = '¡Mira este increíble producto que encontré: ' + title + '! ' + url;
    const whatsappUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    window.open(whatsappUrl, '_blank');
};
