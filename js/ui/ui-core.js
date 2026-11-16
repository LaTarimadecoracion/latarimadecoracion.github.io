
window.safeRender = function(fn, name) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error(`[Fault Tolerance] Error controlado en '${name}':`, error);
            return false;
        }
    };
};



    window.initAdminShortcut = function() {
        if (window.dynamicTitle) {
            window.dynamicTitle.style.cursor = 'pointer';
            window.dynamicTitle.addEventListener('click', () => {
                // Verificar estrictamente si la vista activa es "view-about"
                const aboutView = document.getElementById('view-about');
                if (aboutView && aboutView.classList.contains('active')) {
                    headerClickCount++;
                    if (headerClickTimer) clearTimeout(headerClickTimer);
                    
                    headerClickTimer = setTimeout(() => {
                        headerClickCount = 0;
                    }, 2500);

                    if (headerClickCount >= 5) {
                        if (window.navigateToView) window.navigateToView('view-admin');
                        headerClickCount = 0;
                        if (headerClickTimer) clearTimeout(headerClickTimer);
                        window.currentAdminPhase = 'categories';
                        if (window.renderAdminUX) window.renderAdminUX();
                    }
                } else {
                    headerClickCount = 0;
                }
            });
        }
    };


(function() {
    let isDown = false;
    let startX;
    let scrollLeft;
    let lastDragX = 0;
    let activeCarousel = null;
    let velocity = 0;
    let lastTime = 0;
    let lastX = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    const carouselSelector = '.carousel-categories, .carousel-gallery, .carousel-horizontal, .carousel-full, .product-detail-carousel, .filter-chips, .variant-buttons-container';

    try {
        const style = document.createElement('style');
        style.innerHTML = `
            ${carouselSelector} {
                cursor: grab !important;
                user-select: none !important;
                -webkit-user-drag: none !important;
            }
            .carousel-categories:active, .carousel-gallery:active, .carousel-horizontal:active, .carousel-full:active, .product-detail-carousel:active, .filter-chips:active, .variant-buttons-container:active {
                cursor: grabbing !important;
            }
            .carousel-categories *, .carousel-gallery *, .carousel-horizontal *, .carousel-full *, .product-detail-carousel *, .filter-chips *, .variant-buttons-container * {
                -webkit-user-drag: none !important;
                user-select: none !important;
            }
        `;
        document.head.appendChild(style);
    } catch (err) {
        console.error("❌ Error injecting drag styles:", err);
    }

    // Prevent native drag-and-drop of images and links inside the carousel
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest(carouselSelector)) {
            e.preventDefault();
        }
    }, true);

    document.addEventListener('mousedown', (e) => {
        const carousel = e.target.closest(carouselSelector);
        if (!carousel) return;

        isDown = true;
        activeCarousel = carousel;
        carousel.classList.add('grabbing');

        // Temporarily disable scroll snapping so programmatically setting scrollLeft is smooth
        carousel.style.setProperty('scroll-snap-type', 'none', 'important');
        carousel.style.setProperty('scroll-behavior', 'auto', 'important');

        startX = e.pageX;
        scrollLeft = carousel.scrollLeft;
        lastDragX = e.pageX;

        lastTime = Date.now();
        lastX = e.pageX;
        velocity = 0;
        
        clickStartX = e.clientX;
        clickStartY = e.clientY;
    }, true);

    const endDrag = () => {
        if (!isDown || !activeCarousel) return;
        isDown = false;
        activeCarousel.classList.remove('grabbing');

        const carousel = activeCarousel;
        activeCarousel = null;

        // Restore scroll behavior
        carousel.style.removeProperty('scroll-behavior');

        if (Math.abs(velocity) > 0.5) {
            let momentum = velocity * 15;
            const step = () => {
                if (isDown) return;
                carousel.scrollLeft -= momentum;
                momentum *= 0.92;
                if (Math.abs(momentum) > 0.5) {
                    requestAnimationFrame(step);
                } else {
                    if (carousel.classList.contains('product-detail-carousel')) { carousel.style.removeProperty('scroll-snap-type'); }
                }
            };
            requestAnimationFrame(step);
        } else {
            if (carousel.classList.contains('product-detail-carousel')) { carousel.style.removeProperty('scroll-snap-type'); }
        }
    };

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mouseleave', endDrag);

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !activeCarousel) return;

        e.preventDefault();

        const x = e.pageX;
        const deltaXDrag = x - lastDragX;
        lastDragX = x;

        // Apply relative drag scrolling to avoid resetting positions modified by infinite scroll prepend
        activeCarousel.scrollLeft = activeCarousel.scrollLeft - deltaXDrag * 1.5;

        const now = Date.now();
        const elapsed = now - lastTime;
        if (elapsed > 0) {
            const deltaX = e.pageX - lastX;
            velocity = deltaX / elapsed;
            lastTime = now;
            lastX = e.pageX;
        }
    });

    document.addEventListener('click', (e) => {
        const carousel = e.target.closest(carouselSelector);
        if (!carousel) return;

        const deltaX = Math.abs(e.clientX - clickStartX);
        const deltaY = Math.abs(e.clientY - clickStartY);
        if (deltaX > 10 || deltaY > 10) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
})();

// Global scroll forwarder for PC users
document.addEventListener('wheel', (e) => {
    const appContainer = document.getElementById('app-container');
    // If the scroll happened outside the app container (e.g. on the body dead space)
    if (appContainer && !appContainer.contains(e.target)) {
        appContainer.scrollTop += e.deltaY;
    }
}, { passive: true });
