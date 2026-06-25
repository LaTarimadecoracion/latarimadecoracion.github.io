

    function renderRentals() {
        const resultsContainer = document.getElementById('rentals-results-container');
        const emptyState = document.getElementById('rentals-empty-state');
        const searchInput = document.getElementById('rentals-search-input');
        if (!resultsContainer) return;

        const sourceRentals = typeof sessionRentals !== 'undefined' ? sessionRentals : [];

        // Setup real-time search input listener once
        if (searchInput && !searchInput.dataset.listenerAttached) {
            searchInput.dataset.listenerAttached = 'true';
            searchInput.addEventListener('input', () => {
                filterAndRenderRentals();
            });
        }

        function filterAndRenderRentals() {
            const query = searchInput ? searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
            resultsContainer.innerHTML = '';

            const filtered = sourceRentals.filter(rental => {
                if (rental.visible === false) return false;
                const title = (rental.title || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const description = (rental.description || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return !query || title.includes(query) || description.includes(query);
            });

            if (filtered.length === 0) {
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }
            if (emptyState) emptyState.style.display = 'none';

            filtered.forEach(rental => {
                const card = document.createElement('div');
                card.className = 'feed-card';

                const coverImage = rental.image || 'img/logo_provisional.png';
                const priceLabel = rental.price || 'Consultar';

                card.innerHTML = `
                    <div class="feed-card-photo-container">
                        <div class="feed-card-img-wrapper" style="position:relative;">
                            <img src="${coverImage}" class="feed-card-img lazy-img" alt="${rental.title}" loading="lazy" onload="this.classList.add('loaded')">
                        </div>
                        <span style="position: absolute; top: 12px; right: 12px; z-index: 5; background: #5E35B1; color: white; border: none; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; font-size: 0.68rem; padding: 0.25rem 0.65rem; border-radius: 50px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">Alquiler</span>
                        <div class="feed-card-gradient"></div>
                        <div class="feed-card-info">
                            <span class="feed-card-cat">${priceLabel}</span>
                            <h3 class="feed-card-title">${rental.title}</h3>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    if (window.showProductDetail) {
                        window.showProductDetail(rental, 'Alquileres');
                    } else {
                        showRentalDetail(rental);
                    }
                });

                resultsContainer.appendChild(card);
            });
        }

        // Initial render
        filterAndRenderRentals();
    }



    function showRentalDetail(rental) {
        const modal = document.getElementById('rental-detail-modal');
        if (!modal) return;

        document.getElementById('rental-detail-image').src = rental.image || 'img/logo_provisional.png';
        document.getElementById('rental-detail-title').textContent = rental.title;
        document.getElementById('rental-detail-price').textContent = rental.price || 'Consultar';
        document.getElementById('rental-detail-description').textContent = rental.description || '';

        // Prefilled WhatsApp message
        const whatsappBtn = document.getElementById('btn-rent-whatsapp');
        const phone = '5491167007723';
        const message = encodeURIComponent(`Hola! Quisiera consultar para alquilar el producto: *${rental.title}* (${rental.price || 'Consultar'}). ¿Está disponible?`);
        whatsappBtn.href = `https://wa.me/${phone}?text=${message}`;

        // GA4 tracking
        if (typeof gtag === 'function') {
            gtag('event', 'contact', {
                method: 'WhatsApp',
                event_category: 'Engagement',
                event_label: 'Consultar WhatsApp Alquiler',
                item_id: rental.id,
                item_name: rental.title,
                item_category: 'Alquileres'
            });
        }

        modal.style.display = 'flex';
    }



    async function saveRentalsToServer() {
        try {
            const response = await fetch('/api/save-rentals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionRentals)
            });
            const data = await response.json();
            if (!data.success) {
                alert('Hubo un error al guardar los alquileres en el servidor: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo conectar con el servidor local para guardar alquileres.');
        }
    }


window.renderRentals = safeRender(renderRentals, 'renderRentals');


window.showRentalDetail = safeRender(showRentalDetail, 'showRentalDetail');


window.saveRentalsToServer = saveRentalsToServer;

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('rental-detail-modal');
    const closeBtn = document.getElementById('btn-close-rental-detail');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
});