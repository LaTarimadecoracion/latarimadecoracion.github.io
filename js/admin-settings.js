// js/admin-settings.js
// --- MODULE: ADJUSTMENTS & SETTINGS ---

(function() {
    window.initSettingsAdmin = function() {
        populateSettingsForm();

        const btnSave = document.getElementById('admin-settings-save-btn');
        if (btnSave) {
            btnSave.addEventListener('click', saveSettings);
        }

        const logoInput = document.getElementById('admin-settings-logo-input');
        if (logoInput) {
            logoInput.addEventListener('change', uploadStoreLogo);
        }
    };

    function populateSettingsForm() {
        // Cargar Título e Identidad
        const homeConfig = window.appConfig && window.appConfig.home ? window.appConfig.home : {};
        const titleField = document.getElementById('admin-settings-title');
        const subtitleField = document.getElementById('admin-settings-subtitle');
        
        if (titleField) titleField.value = homeConfig.title || '';
        if (subtitleField) subtitleField.value = homeConfig.subtitle || '';

        // Cargar Redes Sociales
        const social = window.socialLinks || {};
        const instagramField = document.getElementById('admin-settings-instagram');
        const whatsappField = document.getElementById('admin-settings-whatsapp');
        const facebookField = document.getElementById('admin-settings-facebook');
        const youtubeField = document.getElementById('admin-settings-youtube');
        const tiktokField = document.getElementById('admin-settings-tiktok');
        const mercadolibreField = document.getElementById('admin-settings-mercadolibre');

        if (instagramField) instagramField.value = social.instagram || '';
        if (whatsappField) whatsappField.value = social.whatsapp || '';
        if (facebookField) facebookField.value = social.facebook || '';
        if (youtubeField) youtubeField.value = social.youtube || '';
        if (tiktokField) tiktokField.value = social.tiktok || '';
        if (mercadolibreField) mercadolibreField.value = social.mercadolibre || '';

        // Temática / Skin
        const themeSelect = document.getElementById('admin-settings-theme-select');
        if (themeSelect) {
            themeSelect.value = window.activeTheme || 'classic';
        }

        // Vacaciones
        const vacation = window.vacationConfig || {};
        const vacActive = document.getElementById('admin-settings-vacation-active');
        const vacStartEnd = document.getElementById('admin-settings-vacation-start-end');
        const vacDeliveries = document.getElementById('admin-settings-vacation-deliveries');
        const vacMessage = document.getElementById('admin-settings-vacation-message');

        if (vacActive) vacActive.checked = !!vacation.active;
        if (vacStartEnd) vacStartEnd.value = vacation.startDate || '';
        if (vacDeliveries) vacDeliveries.value = vacation.deliveriesDate || '';
        if (vacMessage) vacMessage.value = vacation.message || '';
    }

    async function saveSettings() {
        const btnSave = document.getElementById('admin-settings-save-btn');
        const originalText = btnSave.innerHTML;
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="material-symbols-outlined spin">autorenew</span> Guardando...';

        try {
            // Actualizar Título de Home
            if (!window.appConfig) window.appConfig = {};
            if (!window.appConfig.home) window.appConfig.home = {};
            window.appConfig.home.title = document.getElementById('admin-settings-title').value.trim();
            window.appConfig.home.subtitle = document.getElementById('admin-settings-subtitle').value.trim();

            // Actualizar Redes Sociales
            if (!window.socialLinks) window.socialLinks = {};
            window.socialLinks.instagram = document.getElementById('admin-settings-instagram').value.trim();
            window.socialLinks.whatsapp = document.getElementById('admin-settings-whatsapp').value.trim();
            window.socialLinks.facebook = document.getElementById('admin-settings-facebook').value.trim();
            window.socialLinks.youtube = document.getElementById('admin-settings-youtube').value.trim();
            window.socialLinks.tiktok = document.getElementById('admin-settings-tiktok').value.trim();
            window.socialLinks.mercadolibre = document.getElementById('admin-settings-mercadolibre').value.trim();

            // Tema activo
            const themeSelect = document.getElementById('admin-settings-theme-select');
            if (themeSelect) {
                window.activeTheme = themeSelect.value;
            }

            // Vacaciones
            if (!window.vacationConfig) window.vacationConfig = {};
            window.vacationConfig.active = document.getElementById('admin-settings-vacation-active').checked;
            window.vacationConfig.startDate = document.getElementById('admin-settings-vacation-start-end').value.trim();
            window.vacationConfig.deliveriesDate = document.getElementById('admin-settings-vacation-deliveries').value.trim();
            window.vacationConfig.message = document.getElementById('admin-settings-vacation-message').value.trim();

            // Sincronizar con el servidor y guardar en disco
            await window.syncSiteConfigWithServer();

            // Actualizar vista del cliente en tiempo real
            applyThemeInRealTime();

            // Mostrar notificación exitosa
            alert('¡Ajustes guardados correctamente!');
        } catch (error) {
            console.error('Error al guardar ajustes:', error);
            alert('Error al conectar con el servidor para guardar ajustes.');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
        }
    }

    function applyThemeInRealTime() {
        // Quitar clases previas
        document.body.className = document.body.className.replace(/\btheme-\S+/g, '');
        if (window.activeTheme && window.activeTheme !== 'classic') {
            document.body.classList.add('theme-' + window.activeTheme);
        }
    }

    async function uploadStoreLogo(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusLabel = document.getElementById('admin-settings-logo-status');
        if (statusLabel) statusLabel.textContent = 'Subiendo y optimizando...';

        const formData = new FormData();
        formData.append('image', file);
        formData.append('category', 'logos');
        formData.append('title', 'logo_provisional'); // Nombre clave para el logo

        try {
            const res = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                // Actualizar logotipos en pantalla
                const logoImg = document.getElementById('admin-settings-logo-preview');
                if (logoImg) logoImg.src = data.url + '?v=' + Date.now();

                // Cambiar el logo principal del sitio
                const siteLogo = document.querySelector('.header-logo img, .splash-logo');
                if (siteLogo) siteLogo.src = data.url + '?v=' + Date.now();

                if (statusLabel) statusLabel.textContent = '¡Logo subido con éxito!';
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            console.error('Error subiendo logo:', err);
            if (statusLabel) statusLabel.textContent = 'Error al subir logo.';
        }
    }

    window.initMaintenanceAdmin = function() {
        const optimizeBtn = document.getElementById('maintenance-optimize-images-btn');
        const statusMsg = document.getElementById('maintenance-optimize-status');
        if (!optimizeBtn) return;

        optimizeBtn.addEventListener('click', async () => {
            optimizeBtn.disabled = true;
            const originalBtnHtml = optimizeBtn.innerHTML;
            optimizeBtn.innerHTML = '<span class="material-symbols-outlined spin">autorenew</span> Optimizando...';
            
            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.background = '#EFF6FF';
                statusMsg.style.color = '#1E40AF';
                statusMsg.textContent = '⏳ Ejecutando optimización en el servidor (conversión a WebP y limpieza de huérfanos)...';
            }
            
            try {
                const res = await fetch('/api/maintenance/clean-and-convert', {
                    method: 'POST'
                });
                const data = await res.json();
                
                if (data.success) {
                    if (statusMsg) {
                        statusMsg.style.background = '#DCFCE7';
                        statusMsg.style.color = '#15803D';
                        statusMsg.textContent = `✅ Catálogo optimizado con éxito! Se procesaron imágenes correctamente.`;
                    }
                    alert('Catálogo optimizado correctamente.');
                } else {
                    throw new Error(data.message || 'Error en la optimización');
                }
            } catch (err) {
                console.error('Error optimizando catálogo:', err);
                if (statusMsg) {
                    statusMsg.style.background = '#FEE2E2';
                    statusMsg.style.color = '#B91C1C';
                    statusMsg.textContent = '⚠️ Error al optimizar catálogo. Consulta la consola de Node para más detalles.';
                }
                alert('Error al optimizar catálogo.');
            } finally {
                optimizeBtn.disabled = false;
                optimizeBtn.innerHTML = originalBtnHtml;
            }
        });
    };

    window.initPagesGroupingAdmin = function() {
        // Nombres legibles para el encabezado del panel editor
        const PAGE_NAMES = {
            home:       'Inicio',
            categories: 'Categorías (Explorar)',
            catalogo:   'Catálogo Completo',
            videos:     'Videos',
            nosotros:   'Nosotros',
            avisos:     'Avisos',
            search:     'Buscador',
            cart:       'Carrito de Compras',
            mayorista:  'Canal Mayorista'
        };

        const cards = document.querySelectorAll('.page-card');
        const editorLabel = document.getElementById('page-editor-label');
        const allSubviews = document.querySelectorAll('#page-editor-content .admin-subview');

        function selectPage(pageKey) {
            // Marcar tarjeta activa
            cards.forEach(c => c.classList.toggle('active', c.getAttribute('data-page') === pageKey));

            // Actualizar etiqueta del panel
            if (editorLabel) editorLabel.textContent = PAGE_NAMES[pageKey] || pageKey;

            // Mostrar subvista correcta
            allSubviews.forEach(sv => {
                sv.style.display = sv.id === `subview-page-${pageKey}` ? 'block' : 'none';
            });

            // Scroll suave al panel editor
            const panel = document.querySelector('.page-editor-panel');
            if (panel) {
                setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
            }
        }

        // Asignar listeners a las tarjetas
        cards.forEach(card => {
            card.addEventListener('click', () => {
                selectPage(card.getAttribute('data-page'));
            });
        });

        // Inicializar mostrando "Inicio"
        selectPage('home');
    };
})();

