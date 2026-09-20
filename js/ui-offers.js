// js/ui-offers.js
// --- FRONTEND OFFERS & COMBOS MODULE ---

(function() {
    let timerInterval = null;
    let selectedOfferForModal = null;

    window.getGlobalUserZipCode = function() {
        if (window.UserDataManager && typeof window.UserDataManager.getZipCode === 'function') {
            return window.UserDataManager.getZipCode();
        }
        return localStorage.getItem('user_offers_cp') || '';
    };

    window.offersValidatedCP = window.getGlobalUserZipCode();

    window.initOffersFrontend = function() {
        startOffersCountdownTimer();
        setupOffersCPValidator();
        window.renderOffersFrontend();

        const closeModalBtn = document.getElementById('btn-close-offer-detail-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                closeOfferDetailModal();
            });
        }

        const btnAddComboToCart = document.getElementById('btn-add-combo-to-cart');
        if (btnAddComboToCart) {
            btnAddComboToCart.addEventListener('click', () => {
                if (selectedOfferForModal) {
                    addOfferToCart(selectedOfferForModal);
                    closeOfferDetailModal();
                }
            });
        }

        window.addEventListener('latarima:cp-updated', (e) => {
            const updatedCp = (e && e.detail && e.detail.zipCode) ? e.detail.zipCode : window.getGlobalUserZipCode();
            if (updatedCp) {
                window.offersValidatedCP = updatedCp;
                localStorage.setItem('user_offers_cp', updatedCp);
                const cpInput = document.getElementById('offers-cp-input');
                if (cpInput) cpInput.value = updatedCp;
                updateOffersCPStatusDisplay();
                window.renderOffersFrontend();
            }
        });
    };

    window.openUserProfileModal = function() {
        const currentData = (window.UserDataManager && typeof window.UserDataManager.get === 'function')
            ? window.UserDataManager.get()
            : {};

        const overlay = document.createElement('div');
        overlay.id = 'user-profile-modal-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 0; opacity: 0; transition: opacity 0.25s ease-out; box-sizing: border-box; width: 100vw; height: 100vh; height: 100dvh;';

        const card = document.createElement('div');
        card.style.cssText = 'position: relative; width: 100vw; height: 100vh; height: 100dvh; max-width: 100vw; max-height: 100vh; max-height: 100dvh; border-radius: 0; padding: 1rem 1.25rem; background: #ffffff; box-shadow: none; border: none; font-family: var(--font-main); box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; justify-content: space-between; transform: scale(0.98); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); margin: 0; overflow: hidden;';

        card.innerHTML = `
            <!-- Botón X cerrado arriba a la derecha -->
            <button type="button" id="btn-close-user-profile" title="Cerrar" style="position: fixed; top: 0.85rem; right: 0.85rem; width: 30px; height: 30px; background: none; border: none; font-size: 26px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; z-index: 100000; padding: 0; transition: color 0.2s;" onmouseenter="this.style.color='#0f172a'" onmouseleave="this.style.color='#94a3b8'">&times;</button>

            <!-- Header Modal con Estilo Checkout COMPRAR YA -->
            <div style="width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; padding-right: 2rem; flex-shrink: 0; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <span class="material-symbols-outlined" style="color: #0f172a; font-size: 22px; background: #f1f5f9; padding: 6px; border-radius: 10px; flex-shrink: 0;">account_circle</span>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - PERFIL DE USUARIO</div>
                            <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">Mi Perfil de Entrega</h3>
                        </div>
                    </div>
                </div>
                <div style="height: 4px; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 4px; margin-top: 8px;"></div>
            </div>

            <!-- Contenido Principal Desplazable estilo COMPRAR YA -->
            <div style="flex: 1; overflow-y: auto; padding: 1rem 0; box-sizing: border-box; width: 100%; max-width: 650px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem;">
                
                <!-- 0. Avatar / Foto de Perfil -->
                <div style="position: relative; background: transparent; border: none; padding: 0.5rem 0 0 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <!-- Botón de Tacho de Basura para Limpiar Datos -->
                    <button type="button" id="btn-clear-user-profile" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #dc2626; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: none; padding: 0;" title="Borrar y limpiar todos mis datos">
                        <span class="material-symbols-outlined" style="font-size: 20px; opacity: 0.8;">delete</span>
                    </button>

                    <div style="position: relative;">
                        <div id="prof-avatar-preview" style="width: 76px; height: 76px; border-radius: 50%; background: #f0fdf4; border: 2.5px solid #16a34a; color: #16a34a; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.1); overflow: hidden; transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;">
                            ${(currentData.avatar && currentData.avatar.startsWith('data:image')) 
                                ? `<img src="${currentData.avatar}" style="width: 100%; height: 100%; object-fit: cover;">`
                                : `<span class="material-symbols-outlined" style="font-size: 2.5rem;">${currentData.avatar || 'face'}</span>`}
                        </div>
                        <label for="prof-avatar-file-input" style="position: absolute; bottom: -2px; right: -2px; background: #0f172a; color: #ffffff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);" title="Subir foto personalizada">
                            <span class="material-symbols-outlined" style="font-size: 15px;">photo_camera</span>
                        </label>
                        <input type="file" id="prof-avatar-file-input" accept="image/*" style="display: none;">
                    </div>

                    <div style="text-align: center;">
                        <div style="font-size: 0.8rem; font-weight: 800; color: #0f172a;">Foto o Avatar de Perfil</div>
                        <div style="font-size: 0.72rem; color: #64748b;">Elegí un ícono o subí tu propia foto</div>
                    </div>

                    <!-- Presets de 6 Íconos Vectoriales Limpios (Sin etiquetas de texto) -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 6px;">
                        ${[
                            { icon: 'face', bg: '#e0f2fe', color: '#0284c7', border: '#38bdf8' },
                            { icon: 'face_6', bg: '#dbeafe', color: '#2563eb', border: '#60a5fa' },
                            { icon: 'face_3', bg: '#fce7f3', color: '#db2777', border: '#f472b6' },
                            { icon: 'face_4', bg: '#fae8ff', color: '#c026d3', border: '#e879f9' },
                            { icon: 'diversity_3', bg: '#fef3c7', color: '#d97706', border: '#fbbf24' },
                            { icon: 'palette', bg: '#f3e8ff', color: '#9333ea', border: '#c084fc' }
                        ].map(item => {
                            const isSelected = currentData.avatar === item.icon;
                            return `
                            <button type="button" class="prof-avatar-preset-btn" data-icon="${item.icon}" data-bg="${item.bg}" data-color="${item.color}" data-border="${item.border}" style="background: ${item.bg}; border: 2.5px solid ${isSelected ? item.color : 'transparent'}; border-radius: 50%; width: 44px; height: 44px; min-width: 44px; min-height: 44px; aspect-ratio: 1 / 1; color: ${item.color}; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; display: flex; align-items: center; justify-content: center; box-shadow: ${isSelected ? `0 0 0 3px ${item.border}` : '0 3px 8px rgba(0,0,0,0.06)'}; padding: 0; outline: none;" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
                                <span class="material-symbols-outlined" style="font-size: 24px; line-height: 1;">${item.icon}</span>
                            </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 1. Datos de Contacto -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        👤 1. Datos de Contacto:
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Nombre y Apellido *
                            </label>
                            <input type="text" id="prof-name" value="${currentData.name || ''}" placeholder="Ej: María González" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Teléfono / WhatsApp *
                            </label>
                            <input type="tel" id="prof-phone" value="${currentData.phone || ''}" placeholder="Ej: 11 1234 5678" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                        <div style="grid-column: 1 / -1; width: 100%;">
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Correo Electrónico (Email):
                            </label>
                            <input type="email" id="prof-email" value="${currentData.email || ''}" placeholder="Ej: cliente@gmail.com" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>
                    </div>
                </div>

                <!-- 2. Ubicación y Código Postal para Beneficios -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        📍 2. Ubicación y Beneficios de Envío:
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Dirección de Entrega (Calle y Altura):
                            </label>
                            <input type="text" id="prof-address" value="${currentData.address || ''}" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Código Postal *
                                </label>
                                <input type="text" id="prof-zip" value="${currentData.zipCode || ''}" placeholder="Ej: 1712" maxlength="5" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.82rem; font-weight: 800; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Ciudad / Localidad:
                                </label>
                                <input type="text" id="prof-locality" value="${currentData.locality || ''}" placeholder="Ej: Castelar / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Provincia:
                                </label>
                                <input type="text" id="prof-province" value="${currentData.province || ''}" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                Indicaciones / Notas de Entrega (Opcional):
                            </label>
                            <input type="text" id="prof-delivery-notes" value="${currentData.deliveryNotes || ''}" placeholder="Ej: Timbre no funciona / Entregar en portería" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                        </div>

                        <!-- Feedback de Cobertura -->
                        <div id="prof-cp-feedback" style="font-size: 0.78rem; font-weight: 700; padding: 8px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: none; margin-top: 4px;"></div>
                    </div>
                </div>

                <!-- 3. Datos Fiscales y Facturación (Opcional) -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                            📄 3. Datos de Facturación / Factura A (Opcional):
                        </div>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #0f172a;">
                            <input type="checkbox" id="prof-factura-a-toggle" ${currentData.cuit ? 'checked' : ''} style="accent-color: #0f172a; cursor: pointer;">
                            <span>Datos para Factura</span>
                        </label>
                    </div>

                    <div id="prof-factura-a-menu" style="display: ${currentData.cuit ? 'flex' : 'none'}; flex-direction: column; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Razón Social / Empresa
                                </label>
                                <input type="text" id="prof-razon-social" value="${currentData.razonSocial || ''}" placeholder="Ej: La Tarima SRL" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    CUIT
                                </label>
                                <input type="text" id="prof-cuit" value="${currentData.cuit || ''}" placeholder="Ej: 30-12345678-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div style="grid-column: 1 / -1; width: 100%;">
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Dirección Fiscal
                                </label>
                                <input type="text" id="prof-dir-fiscal" value="${currentData.dirFiscal || currentData.fiscalAddress || ''}" placeholder="Av. Rivadavia 1234, Ciudad/Localidad, Provincia" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Footer con Botones estilo Checkout -->
            <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; max-width: 650px; margin: 0 auto;">
                <div id="prof-validation-error" style="display: none; background: #fef2f2; border: 1.5px solid #fca5a5; color: #991b1b; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.78rem; font-weight: 700; text-align: center;">
                    ⚠️ Por favor completá todos los campos obligatorios de Contacto y Ubicación antes de guardar.
                </div>
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; width: 100%;">
                    <button type="button" id="btn-save-user-profile" style="background: #16a34a; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.6rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3); transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">save</span>
                        <span>Guardar Mi Perfil</span>
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const closeModal = () => {
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.98)';
            setTimeout(() => overlay.remove(), 250);
        };

        card.querySelector('#btn-close-user-profile').onclick = closeModal;

        // Toggle desplegable de Factura A
        const facturaAToggle = card.querySelector('#prof-factura-a-toggle');
        const facturaAMenu = card.querySelector('#prof-factura-a-menu');
        if (facturaAToggle && facturaAMenu) {
            facturaAToggle.addEventListener('change', () => {
                facturaAMenu.style.display = facturaAToggle.checked ? 'flex' : 'none';
            });
        }

        // Lógica de Selección y Carga de Avatar / Foto de Perfil
        let selectedAvatar = currentData.avatar || 'face';
        const avatarPreview = card.querySelector('#prof-avatar-preview');
        const fileInput = card.querySelector('#prof-avatar-file-input');
        const presetBtns = card.querySelectorAll('.prof-avatar-preset-btn');

        const updateAvatarUI = (avatarVal) => {
            selectedAvatar = avatarVal;
            const activeBtn = Array.from(presetBtns).find(btn => btn.dataset.icon === avatarVal);
            const iconBg = activeBtn ? activeBtn.dataset.bg : '#f0fdf4';
            const iconColor = activeBtn ? activeBtn.dataset.color : '#16a34a';
            const iconBorder = activeBtn ? activeBtn.dataset.color : '#16a34a';

            if (avatarVal && avatarVal.startsWith('data:image')) {
                avatarPreview.style.background = '#ffffff';
                avatarPreview.style.borderColor = '#16a34a';
                avatarPreview.innerHTML = `<img src="${avatarVal}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarPreview.style.background = iconBg;
                avatarPreview.style.color = iconColor;
                avatarPreview.style.borderColor = iconBorder;
                avatarPreview.innerHTML = `<span class="material-symbols-outlined" style="font-size: 2.6rem;">${avatarVal || 'face'}</span>`;
            }

            presetBtns.forEach(btn => {
                const isSelected = btn.dataset.icon === avatarVal;
                const bColor = btn.dataset.color || '#16a34a';
                const bGlow = btn.dataset.border || 'rgba(22, 163, 74, 0.35)';
                btn.style.borderColor = isSelected ? bColor : 'transparent';
                btn.style.boxShadow = isSelected ? `0 0 0 3px ${bGlow}` : '0 3px 8px rgba(0,0,0,0.06)';
            });
        };

        presetBtns.forEach(btn => {
            btn.onclick = () => {
                updateAvatarUI(btn.dataset.icon);
            };
        });

        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        updateAvatarUI(evt.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        // Evento de Limpieza Total de Datos (Tacho de Basura)
        const clearBtn = card.querySelector('#btn-clear-user-profile');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('¿Querés borrar todos tus datos de perfil guardados?')) {
                    if (window.UserDataManager && typeof window.UserDataManager.clear === 'function') {
                        window.UserDataManager.clear();
                    }
                    
                    // Resetear inputs del modal
                    ['#prof-name', '#prof-phone', '#prof-email', '#prof-address', '#prof-zip', '#prof-locality', '#prof-province', '#prof-delivery-notes', '#prof-razon-social', '#prof-cuit', '#prof-dir-fiscal'].forEach(id => {
                        const input = card.querySelector(id);
                        if (input) {
                            input.value = '';
                            input.style.borderColor = '#cbd5e1';
                            input.style.boxShadow = 'none';
                        }
                    });

                    // Desmarcar Factura A
                    if (facturaAToggle) facturaAToggle.checked = false;
                    if (facturaAMenu) facturaAMenu.style.display = 'none';

                    // Ocultar banner de error
                    const errBanner = card.querySelector('#prof-validation-error');
                    if (errBanner) errBanner.style.display = 'none';

                    // Resetear avatar UI
                    updateAvatarUI('face');

                    // Actualizar vista del carrito si corresponde
                    if (typeof window.renderPerfilCarritoView === 'function') {
                        window.renderPerfilCarritoView();
                    }
                }
            };
        }

        // Auto evaluar CP en el modal al escribir
        const cpField = card.querySelector('#prof-zip');
        const feedbackEl = card.querySelector('#prof-cp-feedback');
        const localityField = card.querySelector('#prof-locality');
        const provinceField = card.querySelector('#prof-province');

        const evalCP = () => {
            const val = (cpField.value || '').trim();
            if (!val) {
                feedbackEl.style.display = 'none';
                return;
            }
            if (typeof window.lookupPostalCode === 'function') {
                const res = window.lookupPostalCode(val);
                feedbackEl.style.display = 'block';
                if (res && res.hasLocalMatch !== false) {
                    feedbackEl.innerHTML = `✅ Cobertura confirmada: <strong>${res.localidad} (${res.provincia})</strong>`;
                    feedbackEl.style.color = '#15803d';
                    feedbackEl.style.background = '#f0fdf4';
                    feedbackEl.style.borderColor = '#86efac';
                    if (res.localidad && localityField && !localityField.value) localityField.value = res.localidad;
                    if (res.provincia && provinceField && !provinceField.value) provinceField.value = res.provincia;
                } else {
                    feedbackEl.innerHTML = `📦 Envíos al interior vía Mercado Libre / Transporte`;
                    feedbackEl.style.color = '#b45309';
                    feedbackEl.style.background = '#fffbeb';
                    feedbackEl.style.borderColor = '#fcd34d';
                }
            }
        };
        cpField.oninput = () => {
            evalCP();
            cpField.style.borderColor = '#cbd5e1';
            cpField.style.boxShadow = 'none';
        };
        evalCP();

        ['#prof-name', '#prof-phone', '#prof-email', '#prof-address', '#prof-locality', '#prof-province'].forEach(id => {
            const inputEl = card.querySelector(id);
            if (inputEl) {
                inputEl.oninput = () => {
                    inputEl.style.borderColor = '#cbd5e1';
                    inputEl.style.boxShadow = 'none';
                };
            }
        });

        card.querySelector('#btn-save-user-profile').onclick = () => {
            const zipVal = (cpField.value || '').trim();
            const nameVal = (card.querySelector('#prof-name').value || '').trim();
            const phoneVal = (card.querySelector('#prof-phone').value || '').trim();
            const emailVal = (card.querySelector('#prof-email').value || '').trim();
            const addrVal = (card.querySelector('#prof-address').value || '').trim();
            const locVal = (localityField ? localityField.value : '').trim();
            const provVal = (provinceField ? provinceField.value : '').trim();
            const notesVal = (card.querySelector('#prof-delivery-notes').value || '').trim();

            const isFacturaA = card.querySelector('#prof-factura-a-toggle')?.checked || false;
            const razonVal = isFacturaA ? (card.querySelector('#prof-razon-social').value || '').trim() : '';
            const cuitVal = isFacturaA ? (card.querySelector('#prof-cuit').value || '').trim() : '';
            const dirFiscalVal = isFacturaA ? (card.querySelector('#prof-dir-fiscal').value || '').trim() : '';

            const errBanner = card.querySelector('#prof-validation-error');
            const requiredFields = [
                { id: '#prof-name', val: nameVal },
                { id: '#prof-phone', val: phoneVal },
                { id: '#prof-email', val: emailVal },
                { id: '#prof-address', val: addrVal },
                { id: '#prof-zip', val: zipVal },
                { id: '#prof-locality', val: locVal },
                { id: '#prof-province', val: provVal }
            ];

            let firstInvalidEl = null;
            let hasErrors = false;

            requiredFields.forEach(f => {
                const el = card.querySelector(f.id);
                if (el) {
                    if (!f.val) {
                        hasErrors = true;
                        el.style.borderColor = '#dc2626';
                        el.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.15)';
                        if (!firstInvalidEl) firstInvalidEl = el;
                    } else {
                        el.style.borderColor = '#cbd5e1';
                        el.style.boxShadow = 'none';
                    }
                }
            });

            if (hasErrors) {
                if (errBanner) errBanner.style.display = 'block';
                if (firstInvalidEl) {
                    firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalidEl.focus();
                }
                return;
            }

            if (errBanner) errBanner.style.display = 'none';

            if (window.UserDataManager && typeof window.UserDataManager.save === 'function') {
                window.UserDataManager.save({
                    avatar: selectedAvatar,
                    zipCode: zipVal,
                    name: nameVal,
                    phone: phoneVal,
                    email: emailVal,
                    address: addrVal,
                    locality: locVal,
                    province: provVal,
                    deliveryNotes: notesVal,
                    razonSocial: razonVal,
                    cuit: cuitVal,
                    dirFiscal: dirFiscalVal
                });
            }

            if (typeof window.renderPerfilCarritoView === 'function') {
                window.renderPerfilCarritoView();
            }

            closeModal();
        };
    };

    function setupOffersCPValidator() {
        const btnOpenModal = document.getElementById('btn-open-user-profile-modal');
        if (btnOpenModal) {
            btnOpenModal.onclick = () => {
                if (window.openUserProfileModal) window.openUserProfileModal();
            };
        }

        window.offersValidatedCP = window.getGlobalUserZipCode();
        updateOffersCPStatusDisplay();
    }

    function updateOffersCPStatusDisplay() {
        const statusText = document.getElementById('offers-cp-status-text');
        const titleText = document.getElementById('offers-cp-title');
        const iconBadge = document.getElementById('offers-cp-icon-badge');
        const btnProfileLabel = document.getElementById('btn-profile-label');
        const cpBar = document.getElementById('offers-cp-bar');

        if (!cpBar) return;

        const isComplete = window.UserDataManager && typeof window.UserDataManager.hasCompleteProfile === 'function'
            ? window.UserDataManager.hasCompleteProfile()
            : false;

        if (isComplete) {
            cpBar.style.display = 'none';
            return;
        }

        cpBar.style.display = 'flex';
        window.offersValidatedCP = window.getGlobalUserZipCode();

        if (!window.offersValidatedCP) {
            if (statusText) {
                statusText.innerHTML = '📍 Cargá tus datos para activar descuentos automáticos según tu ubicación.';
                statusText.style.color = '#ffffff';
            }
            if (btnProfileLabel) btnProfileLabel.textContent = '⚡ Cargar mis Datos';
            if (cpBar) {
                cpBar.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)';
                cpBar.style.borderColor = '#22c55e';
            }
            if (iconBadge) {
                iconBadge.style.background = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
                iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.5rem;">distance</span>';
            }
            return;
        }

        if (btnProfileLabel) btnProfileLabel.textContent = `Perfil (CP ${window.offersValidatedCP})`;

        if (typeof window.lookupPostalCode === 'function') {
            const res = window.lookupPostalCode(window.offersValidatedCP);
            if (res && res.hasLocalMatch !== false) {
                statusText.innerHTML = `🎉 <strong>¡Envío Gratis Confirmado para ${res.localidad}!</strong> (CP ${res.cp})`;
                statusText.style.color = '#14532d';
                if (cpBar) {
                    cpBar.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                    cpBar.style.borderColor = '#86efac';
                }
                if (iconBadge) {
                    iconBadge.style.background = '#16a34a';
                    iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.35rem;">verified</span>';
                }
            } else {
                statusText.innerHTML = `📦 <strong>Envíos al Interior (CP ${window.offersValidatedCP})</strong> vía Mercado Libre / Transporte.`;
                statusText.style.color = '#78350f';
                if (cpBar) {
                    cpBar.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                    cpBar.style.borderColor = '#fde047';
                }
                if (iconBadge) {
                    iconBadge.style.background = '#d97706';
                    iconBadge.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.35rem;">inventory_2</span>';
                }
            }
        } else {
            statusText.innerHTML = `CP ingresado: <strong>${window.offersValidatedCP}</strong>`;
        }
    }

    function startOffersCountdownTimer() {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            updateCountdownLabels();
        }, 1000);
    }

    function formatTimeRemaining(expirationDate) {
        if (!expirationDate) return null;
        const diff = new Date(expirationDate).getTime() - new Date().getTime();
        if (diff <= 0) return { expired: true, text: 'Expirada' };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n) => String(n).padStart(2, '0');
        const text = days > 0 
            ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
            : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        return { expired: false, text, days, hours, minutes, seconds };
    }

    function updateCountdownLabels() {
        document.querySelectorAll('[data-offer-expiration]').forEach(el => {
            const exp = el.getAttribute('data-offer-expiration');
            const res = formatTimeRemaining(exp);
            if (res) {
                if (res.expired) {
                    el.textContent = '⏳ Expirada';
                    el.classList.add('expired');
                } else {
                    el.textContent = `⏳ ${res.text}`;
                }
            }
        });
    }

    window.getFreeShippingProducts = function() {
        const sourceData = (typeof window.sessionProducts !== 'undefined' && window.sessionProducts.length > 0)
            ? window.sessionProducts
            : (typeof productsData !== 'undefined' ? productsData : []);

        const freeShipProducts = [];
        const seenIds = new Set();

        if (Array.isArray(sourceData)) {
            sourceData.forEach(cat => {
                if (cat && cat.visible === false) return;
                if (Array.isArray(cat.products)) {
                    cat.products.forEach(prod => {
                        if (!prod || prod.visible === false || seenIds.has(prod.id)) return;
                        
                        const shipConf = prod.shippingConfig || {};

                        // Modo 1: Envío gratis directo habilitado
                        const isDirectFree = !!(
                            shipConf.isFreeShipping === true ||
                            prod.isFreeShipping === true ||
                            prod.shippingType === 'free' ||
                            shipConf.isFree === true ||
                            (Array.isArray(prod.variants) && prod.variants.some(v => v.shippingConfig?.isFreeShipping || v.isFreeShipping))
                        );

                        // Modo 2: Envío gratis por logística o flete según cantidad de unidades
                        let minUnits = parseInt(shipConf.logisticaFreeMinUnits) || parseInt(shipConf.fleteFreeMinUnits) || parseInt(prod.logisticaFreeMinUnits) || parseInt(prod.fleteFreeMinUnits) || 0;

                        if (!minUnits && Array.isArray(prod.variants)) {
                            for (const v of prod.variants) {
                                const vMin = parseInt(v.shippingConfig?.logisticaFreeMinUnits) || parseInt(v.shippingConfig?.fleteFreeMinUnits) || parseInt(v.logisticaFreeMinUnits) || parseInt(v.fleteFreeMinUnits) || 0;
                                if (vMin > 0) {
                                    minUnits = vMin;
                                    break;
                                }
                            }
                        }

                        const isQuantityFree = minUnits > 0;

                        if (isDirectFree || isQuantityFree) {
                            seenIds.add(prod.id);
                            freeShipProducts.push({
                                product: prod,
                                catName: cat.name || '',
                                isDirectFree: isDirectFree,
                                minUnits: minUnits
                            });
                        }
                    });
                }
            });
        }

        return freeShipProducts;
    };

    window.extractProductLivePrice = function(product, acabadoName = '', medidaName = '') {
        if (!product) return 0;

        // 1. Precios directos
        let pVal = parseFloat(product.price || product.precio || product.base_price || product.price_base) || 0;
        if (pVal > 0 && !acabadoName && !medidaName) return pVal;

        // 2. Buscar en acabados_groups
        if (Array.isArray(product.acabados_groups) && product.acabados_groups.length > 0) {
            let group = null;
            if (acabadoName) {
                group = product.acabados_groups.find(g => (g.acabado_name || '').trim().toLowerCase() === acabadoName.trim().toLowerCase());
            }
            if (!group) group = product.acabados_groups[0];

            if (group && Array.isArray(group.medidas_variants) && group.medidas_variants.length > 0) {
                let variant = null;
                if (medidaName) {
                    variant = group.medidas_variants.find(m => (m.medida || m.name || '').trim().toLowerCase() === medidaName.trim().toLowerCase());
                }
                if (!variant) variant = group.medidas_variants.find(m => m.default) || group.medidas_variants[0];

                if (variant) {
                    const vPrice = parseFloat(variant.price || variant.precio || variant.cost_price) || 0;
                    if (vPrice > 0) return vPrice;
                }
            }
        }

        // 3. Buscar en variants array plano
        if (Array.isArray(product.variants) && product.variants.length > 0) {
            let variant = null;
            if (medidaName || acabadoName) {
                variant = product.variants.find(v => 
                    (v.medida || v.name || '').trim().toLowerCase() === (medidaName || acabadoName).trim().toLowerCase()
                );
            }
            if (!variant) variant = product.variants[0];
            if (variant) {
                const vPrice = parseFloat(variant.price || variant.precio || variant.cost_price) || 0;
                if (vPrice > 0) return vPrice;
            }
        }

        return pVal;
    }

    window.syncOfferLivePrices = function(offer) {
        if (!offer || !offer.product_items || !Array.isArray(offer.product_items) || offer.product_items.length === 0) {
            return offer;
        }

        let liveSubtotal = 0;

        offer.product_items.forEach(item => {
            const prodId = item.id || item.productId;
            if (!prodId) return;

            let liveProduct = null;
            if (typeof window.findProductById === 'function') {
                const res = window.findProductById(prodId);
                if (res) liveProduct = res.product;
            }

            if (!liveProduct && typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts)) {
                for (const cat of window.sessionProducts) {
                    if (Array.isArray(cat.products)) {
                        const found = cat.products.find(p => p.id === prodId);
                        if (found) { liveProduct = found; break; }
                    }
                }
            }

            if (liveProduct) {
                const liveUnitPrice = extractProductLivePrice(liveProduct, item.acabado || item.variant, item.medida);
                if (liveUnitPrice > 0) {
                    item.unitPrice = liveUnitPrice;
                    item.price = liveUnitPrice;
                }

                // Sincronizar imagen si cambió en el catálogo
                const liveCover = Array.isArray(liveProduct.image) ? liveProduct.image[0] : liveProduct.image;
                if (liveCover) {
                    item.image = liveCover;
                }
            }

            const itemQty = parseInt(item.quantity, 10) || 1;
            const itemPrice = item.unitPrice || item.price || 0;
            liveSubtotal += itemPrice * itemQty;
        });

        if (liveSubtotal > 0) {
            const oldSubtotal = offer.subtotalPrice || liveSubtotal;
            const oldOfferPrice = offer.offerPrice || liveSubtotal;

            offer.subtotalPrice = liveSubtotal;

            if (offer.discountPercent && Number(offer.discountPercent) > 0) {
                offer.offerPrice = Math.round(liveSubtotal * (1 - Number(offer.discountPercent) / 100));
            } else if (oldSubtotal > 0 && oldOfferPrice < oldSubtotal) {
                const ratio = oldOfferPrice / oldSubtotal;
                offer.offerPrice = Math.round(liveSubtotal * ratio);
                offer.discountPercent = Math.round((1 - ratio) * 100);
            } else {
                offer.offerPrice = liveSubtotal;
            }
        }

        return offer;
    };

    window.createFreeShippingProductCardElement = function(item) {
        let { product, catName, isDirectFree, minUnits } = item;
        
        // Sincronizar producto vivo desde el catálogo
        if (typeof window.findProductById === 'function' && product && product.id) {
            const liveRes = window.findProductById(product.id);
            if (liveRes && liveRes.product) product = liveRes.product;
        }

        const card = document.createElement('div');
        card.className = 'offer-feed-card category-card';
        card.style.cssText = 'position: relative; cursor: pointer; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid rgba(212, 175, 55, 0.25); display: flex; flex-direction: column; justify-content: space-between;';

        const productCover = Array.isArray(product.image) ? product.image[0] : (product.image || 'img/logo_provisional.png');
        const priceVal = extractProductLivePrice(product);
        const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(priceVal || 0);

        // Evaluar si el CP validado en la sección Ofertas califica para envío gratis local
        let cpQualified = null; // null = no verificado aun
        if (window.offersValidatedCP && typeof window.lookupPostalCode === 'function') {
            const cpRes = window.lookupPostalCode(window.offersValidatedCP);
            cpQualified = (cpRes && cpRes.hasLocalMatch !== false);
        }

        let shipBadgeHTML = '';
        if (cpQualified === true) {
            // CP Validado y coincide con ruta de envío gratis local
            const shipBadgeText = isDirectFree 
                ? '🎉 ENVÍO GRATIS EN TU ZONA' 
                : `🎉 ENVÍO GRATIS (Mín. ${minUnits} U.)`;
            
            shipBadgeHTML = `
                <div style="position: absolute; top: 8px; left: 8px; z-index: 5; background: #16a34a; color: #ffffff; font-weight: 800; font-size: 0.68rem; padding: 3px 8px; border-radius: 20px; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.4); display: flex; align-items: center; gap: 4px;">
                    ${shipBadgeText}
                </div>
            `;
        }
        // Si no hay datos de CP cargados o no coincide con envío gratis local, NO se muestra ningún cartel.

        const cardSubdesc = product.subtitle || product.description || 'Producto destacado con beneficio de envío.';

        card.innerHTML = `
            <div class="offer-photo-wrapper" style="position: relative; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; background: #1a1a1a;">
                <img src="${productCover}" class="category-card-img loaded" alt="${product.title}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="offer-gradient-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);"></div>

                ${shipBadgeHTML}
            </div>

            <div style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
                <div>
                    <h3 style="margin: 0 0 0.35rem 0; font-size: 1.1rem; font-weight: 800; color: var(--text-main); line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${product.title}</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.82rem; color: var(--text-muted); line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35;">${cardSubdesc}</p>
                </div>

                <div style="background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; padding: 0.6rem 0.8rem;">
                    <div style="display: flex; align-items: baseline; justify-content: flex-end; gap: 6px;">
                        <span style="font-size: 1.25rem; font-weight: 900; color: #dc2626;">${formattedPrice}</span>
                    </div>

                    <div style="margin-top: 2px; font-size: 0.78rem; color: #16a34a; font-weight: 800; text-align: right;">
                        ⚡ Precio Promocional
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            if (window.showProductDetail) window.showProductDetail(product, catName);
        });

        return card;
    };

    window.activeOffersRubro = 'todas';

    window.renderOffersRubrosTabs = function(activeOffers, uniqueFreeShipItems) {
        const tabsContainer = document.getElementById('offers-rubros-tabs-container');
        if (!tabsContainer) return;

        // Obtener lista oficial de rubros del sitio
        let rubrosList = [];
        try {
            if (window.parent && window.parent.siteConfig && window.parent.siteConfig.rubros) {
                rubrosList = window.parent.siteConfig.rubros;
            } else if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        } catch (e) {
            if (window.siteConfig && window.siteConfig.rubros) {
                rubrosList = window.siteConfig.rubros;
            }
        }

        if (!Array.isArray(rubrosList) || rubrosList.length === 0) {
            rubrosList = [{ id: 'carpinteria', name: 'Carpintería' }];
        }

        const visibleRubros = rubrosList.filter(r => r.visible !== false);

        if (visibleRubros.length <= 1) {
            tabsContainer.classList.add('single-rubro');
            tabsContainer.innerHTML = '';
            tabsContainer.style.display = 'none';
            if (visibleRubros.length === 1) {
                window.activeOffersRubro = visibleRubros[0].id;
            }
            return;
        } else {
            tabsContainer.classList.remove('single-rubro');
            tabsContainer.style.display = 'flex';
        }

        // Construir arreglo de pestañas directamente con los rubros visibles (sin pestaña TODAS)
        const allTabs = [...visibleRubros];

        // Asegurar que activeOffersRubro coincida con un rubro visible existente
        const activeStillVisible = allTabs.some(r => r.id === window.activeOffersRubro);
        if (!activeStillVisible && allTabs.length > 0) {
            window.activeOffersRubro = allTabs[0].id;
        }

        tabsContainer.innerHTML = '';
        allTabs.forEach(r => {
            const isActive = r.id === window.activeOffersRubro;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isActive ? 'rubros-tab active' : 'rubros-tab';
            
            // Forzar ancho geométrico exacto por JS inline como en categorias / catalogo / buscador
            const pct = (100 / allTabs.length).toFixed(4);
            btn.style.width = pct + '%';
            btn.style.flex = `0 0 ${pct}%`;

            btn.innerHTML = r.name;
            btn.addEventListener('click', () => {
                if (window.activeOffersRubro !== r.id) {
                    window.activeOffersRubro = r.id;
                    window.renderOffersRubrosTabs(activeOffers, uniqueFreeShipItems);
                    window.renderOffersFrontend();
                }
            });
            tabsContainer.appendChild(btn);
        });
    };

    window.renderOffersFrontend = function() {
        if (typeof setupOffersCPValidator === 'function') {
            setupOffersCPValidator();
        }
        if (typeof updateOffersCPStatusDisplay === 'function') {
            updateOffersCPStatusDisplay();
        }

        const container = document.getElementById('offers-grid-container');
        if (!container) return;

        const allOffers = (window.sessionOffers && window.sessionOffers.length > 0)
            ? window.sessionOffers
            : (typeof offersData !== 'undefined' ? offersData : []);

        const activeOffers = allOffers.filter(o => {
            if (o.active === false) return false;
            if (o.hasTimer && o.expirationDate) {
                const expTime = new Date(o.expirationDate).getTime();
                if (!isNaN(expTime) && expTime <= Date.now()) return false;
            }
            return true;
        });

        // Sincronizar precios de las ofertas con los productos vivos del catálogo
        activeOffers.forEach(o => {
            if (window.syncOfferLivePrices) window.syncOfferLivePrices(o);
        });

        // Obtener productos con Envío Gratis activo (Modo 1 y Modo 2)
        const freeShipItems = window.getFreeShippingProducts ? window.getFreeShippingProducts() : [];

        // Prevenir duplicación si una oferta ya contiene ese producto
        const offerProductIds = new Set();
        activeOffers.forEach(o => {
            if (Array.isArray(o.product_items)) {
                o.product_items.forEach(pi => { if (pi.id) offerProductIds.add(pi.id); });
            }
        });

        const uniqueFreeShipItems = freeShipItems.filter(item => !offerProductIds.has(item.product.id));

        // Renderizar barra de pestañas de rubros dinámicas
        if (window.renderOffersRubrosTabs) {
            window.renderOffersRubrosTabs(activeOffers, uniqueFreeShipItems);
        }

        // Auxiliar para resolver el id del rubro del producto/categoría
        const getRubroIdForProduct = (prodId, catObj) => {
            let categoryRubro = null;
            if (prodId && typeof window.findProductById === 'function') {
                const res = window.findProductById(prodId);
                if (res && res.category) {
                    categoryRubro = res.category.rubro || res.category.rubroId || null;
                }
            }
            if (!categoryRubro && typeof window.sessionProducts !== 'undefined' && Array.isArray(window.sessionProducts)) {
                for (const cat of window.sessionProducts) {
                    if (Array.isArray(cat.products) && cat.products.some(p => p.id === prodId)) {
                        categoryRubro = cat.rubro || cat.rubroId || null;
                        break;
                    }
                }
            }
            if (!categoryRubro && catObj) {
                categoryRubro = catObj.rubro || catObj.rubroId || null;
            }

            // Default a 'carpinteria' si no se especifica rubro en la categoría
            return categoryRubro ? String(categoryRubro).trim().toLowerCase() : 'carpinteria';
        };

        const currentRubro = (window.activeOffersRubro && window.activeOffersRubro !== 'todas')
            ? window.activeOffersRubro
            : (window.siteConfig && Array.isArray(window.siteConfig.rubros) && window.siteConfig.rubros.length > 0 ? window.siteConfig.rubros[0].id : 'carpinteria');

        const filteredOffers = activeOffers.filter(offer => {
            if (currentRubro === 'todas' || currentRubro === 'todos') return true;
            let r = offer.rubro || offer.rubroId;
            if (!r && Array.isArray(offer.product_items) && offer.product_items.length > 0) {
                for (const item of offer.product_items) {
                    r = getRubroIdForProduct(item.id || item.productId);
                    if (r) break;
                }
            }
            const offerRubroId = r ? String(r).trim().toLowerCase() : 'carpinteria';
            return offerRubroId === currentRubro;
        });

        const filteredFreeShipItems = uniqueFreeShipItems.filter(item => {
            if (currentRubro === 'todas' || currentRubro === 'todos') return true;
            const itemRubroId = getRubroIdForProduct(item.product?.id, item.product?.category);
            return itemRubroId === currentRubro;
        });

        if (filteredOffers.length === 0 && filteredFreeShipItems.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size: 56px; opacity: 0.4;">local_offer</span>
                    <h3 style="margin: 0.5rem 0 0.25rem; font-weight: 700; color: var(--text-main);">No hay ofertas vigentes en este rubro</h3>
                    <p style="font-size: 0.9rem;">Probá seleccionar otra pestaña o volvé a consultar más tarde.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        // 1. Renderizar ofertas / combos principales filtrados
        filteredOffers.forEach(offer => {
            const card = createOfferCardElement(offer);
            container.appendChild(card);
        });

        // 2. Renderizar productos con Envío Gratis filtrados
        filteredFreeShipItems.forEach(item => {
            const card = window.createFreeShippingProductCardElement(item);
            container.appendChild(card);
        });

        updateCountdownLabels();
    };

    window.createOfferCardElement = function(offer, isCarousel = false) {
        if (window.syncOfferLivePrices) window.syncOfferLivePrices(offer);
        const stampLabels = {
            'pro-gold': '⭐ PRO GOLD',
            'oportunidad': '🏆 OPORTUNIDAD ÚNICA',
            'relampago': '⚡ RELÁMPAGO',
            'combo': '🎁 COMBO EXCLUSIVO',
            'envio-gratis': '🚚 ENVÍO GRATIS'
        };
        const stampText = stampLabels[offer.stampStyle] || '🔥 OFERTA';

        // Cover picture logic: custom or 2x2 collage
        let coverHTML = '';
        if (offer.customCoverImage) {
            coverHTML = `<img src="${offer.customCoverImage}" class="category-card-img loaded" alt="${offer.title}" loading="lazy">`;
        } else if (offer.product_items && offer.product_items.length >= 2) {
            const items = offer.product_items.slice(0, 4);
            const gridCols = items.length === 2 ? 'grid-template-columns: 1fr 1fr;' : 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
            let mosaicHTML = `<div style="display: grid; ${gridCols} width: 100%; height: 100%; gap: 2px; background: #1a1a1a;">`;
            items.forEach(item => {
                mosaicHTML += `<img src="${item.image || 'img/logo_provisional.png'}" style="width: 100%; height: 100%; object-fit: cover;">`;
            });
            mosaicHTML += `</div>`;
            coverHTML = mosaicHTML;
        } else {
            const defaultImg = (offer.product_items && offer.product_items[0]) ? offer.product_items[0].image : 'img/logo_provisional.png';
            coverHTML = `<img src="${defaultImg}" class="category-card-img loaded" alt="${offer.title}" loading="lazy">`;
        }

        const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.subtotalPrice || 0);
        const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(offer.offerPrice || 0);
        const savings = Math.max(0, (offer.subtotalPrice || 0) - (offer.offerPrice || 0));
        const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(savings);

        if (isCarousel) {
            const card = document.createElement('div');
            card.className = 'category-card offer-carousel-card';
            card.style.cssText = 'position: relative; cursor: pointer; border-radius: var(--radius-md); overflow: hidden;';

            card.innerHTML = `
                <div class="category-card-img-wrapper" style="position: relative;">
                    ${coverHTML}
                </div>

                <!-- Animated Stamp Badge -->
                <div class="stamp-badge ${offer.stampStyle || 'pro-gold'}" style="position: absolute; top: 8px; left: 8px; z-index: 5; font-size: 0.65rem; padding: 0.2rem 0.5rem;">
                    ${stampText}
                </div>

                <!-- Discount Badge -->
                ${offer.discountPercent ? `
                    <div style="position: absolute; top: 8px; right: 8px; z-index: 5; background: #dc2626; color: white; font-weight: 900; font-size: 0.7rem; padding: 2px 7px; border-radius: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                        -${offer.discountPercent}% OFF
                    </div>
                ` : ''}

                <!-- Real-time Countdown Timer Badge -->
                ${offer.hasTimer && offer.expirationDate ? `
                    <div class="offer-countdown-pill" data-offer-expiration="${offer.expirationDate}" style="position: absolute; top: 34px; left: 8px; z-index: 5; background: rgba(0, 0, 0, 0.82); color: #fbbf24; font-weight: 800; font-size: 0.68rem; padding: 2px 7px; border-radius: 12px; font-family: monospace;">
                        ⏳ Cargando...
                    </div>
                ` : ''}

                <!-- Overlay Layer containing Title & Price on top of Image -->
                <div class="category-overlay" style="display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; text-align: left; padding: 0.5rem 0.75rem; background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);">
                    <div style="font-size: 0.92rem; font-weight: 800; color: #ffffff; width: 100%; line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">
                        ${offer.title}
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 2px;">
                        <span style="font-size: 0.72rem; text-decoration: line-through; color: rgba(255,255,255,0.75);">${formattedSubtotal}</span>
                        <span style="font-size: 1.05rem; font-weight: 900; color: #fef08a;">${formattedOfferPrice}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                showOfferDetailModal(offer);
            });

            return card;
        }

        const card = document.createElement('div');
        card.className = 'offer-feed-card';
        card.style.cssText = 'position: relative; cursor: pointer; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid rgba(212, 175, 55, 0.25);';

        card.innerHTML = `
            <div class="offer-photo-wrapper" style="position: relative; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; background: #1a1a1a;">
                ${coverHTML}
                <div class="offer-gradient-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);"></div>

                <!-- Animated Stamp Badge -->
                <div class="stamp-badge ${offer.stampStyle || 'pro-gold'}" style="position: absolute; top: 10px; left: 10px; z-index: 5;">
                    ${stampText}
                </div>

                <!-- Discount Badge -->
                ${offer.discountPercent ? `
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 5; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; font-weight: 900; font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; box-shadow: 0 4px 12px rgba(220,38,38,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        -${offer.discountPercent}% OFF
                    </div>
                ` : ''}

                <!-- Real-time Countdown Timer Badge -->
                ${offer.hasTimer && offer.expirationDate ? `
                    <div class="offer-countdown-pill" data-offer-expiration="${offer.expirationDate}" style="position: absolute; bottom: 10px; left: 10px; z-index: 5; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px); color: #fbbf24; font-weight: 800; font-size: 0.75rem; padding: 4px 10px; border-radius: 30px; border: 1px solid rgba(251, 191, 36, 0.4); font-family: monospace;">
                        ⏳ Cargando...
                    </div>
                ` : ''}
            </div>

            <div style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 0.35rem 0; font-size: 1.1rem; font-weight: 800; color: var(--text-main); line-clamp: 1; -webkit-line-clamp: 1; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${offer.title}</h3>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.82rem; color: var(--text-muted); line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35;">${offer.description || 'Combo exclusivo por tiempo limitado.'}</p>
                </div>

                <div style="background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; padding: 0.6rem 0.8rem;">
                    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 6px;">
                        <span style="font-size: 0.8rem; text-decoration: line-through; color: #9ca3af; font-weight: 600;">${formattedSubtotal}</span>
                        <span style="font-size: 1.25rem; font-weight: 900; color: #dc2626;">${formattedOfferPrice}</span>
                    </div>

                    ${savings > 0 ? `
                        <div style="margin-top: 2px; font-size: 0.78rem; color: #16a34a; font-weight: 800; text-align: right;">
                            💰 Ahorrás ${formattedSavings}
                        </div>
                    ` : ''}
                </div>

                ${offer.shippingType === 'free' ? `
                    <div style="margin-top: 0.5rem; font-size: 0.78rem; color: #2563eb; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">local_shipping</span> Envío GRATIS Incluido
                    </div>
                ` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            openOfferDetailView(offer);
        });

        return card;
    };

    function showOfferInfoModal(type, targetOffer) {
        const existing = document.getElementById('offer-info-modal-overlay');
        if (existing) existing.remove();

        const offer = targetOffer || selectedOfferForModal;
        const payConf = offer?.paymentConfig || {};
        const isTrans = payConf.transferEnabled !== false;
        const isLink = payConf.linkEnabled !== false;
        const isCredit = payConf.creditEnabled !== false;

        let dynamicPaymentsHtml = '';
        if (isTrans) {
            dynamicPaymentsHtml += `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#166534; display:block; margin-bottom:2px;">🏦 Transferencia Bancaria Directa</strong>
                    <span style="font-size:0.8rem; color:#15803d;">Aboná por CBU / ALIAS manteniendo el precio de oferta bonificado sin aumentos.</span>
                </div>`;
        }
        if (isLink) {
            dynamicPaymentsHtml += `
                <div style="background:#f0f9ff; border:1px solid #bae6fd; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#0369a1; display:block; margin-bottom:2px;">🔗 Link de Pago / Débito</strong>
                    <span style="font-size:0.8rem; color:#0284c7;">Cobro directo con Mercado Pago, tarjetas de débito y dinero en cuenta.</span>
                </div>`;
        }
        if (isCredit) {
            dynamicPaymentsHtml += `
                <div style="background:#fffdf0; border:1px solid #fde68a; padding:10px 12px; border-radius:12px;">
                    <strong style="color:#b45309; display:block; margin-bottom:2px;">💳 Tarjeta de Crédito</strong>
                    <span style="font-size:0.8rem; color:#b45309;">Financiación en cuotas fijas con tarjeta de crédito.</span>
                </div>`;
        }
        if (!isTrans && !isLink && !isCredit) {
            dynamicPaymentsHtml = `
                <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px 12px; border-radius:12px; color:#dc2626; font-size:0.82rem;">
                    ⚠️ Medios de pago en revisión para este combo. Coordinar por WhatsApp.
                </div>`;
        }

        const modalData = {
            payments: {
                title: '💳 Medios de Pago Habilitados para este Combo',
                icon: 'payments',
                color: '#16a34a',
                html: `
                    <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem; color:#334155; line-height:1.4;">
                        <div style="background:#fff7ed; border:1.5px solid #f59e0b; padding:10px 12px; border-radius:12px;">
                            <strong style="color:#92400e; display:block; margin-bottom:2px;">📌 Venta Directa de Fábrica</strong>
                            Precios promocionales directos del taller sin intermediarios.
                        </div>
                        ${dynamicPaymentsHtml}
                    </div>
                `
            },
            shipping: {
                title: '🚚 Envíos y Retiro por el Taller',
                icon: 'local_shipping',
                color: '#2563eb',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:#334155; line-height:1.5;">
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:12px;">
                            <strong style="color:#1e40af; display:block; margin-bottom:4px;">🏪 Retiro Gratis por el Taller</strong>
                            Podés retirar tu combo sin costo por nuestro taller céntrico en <strong>Hurlingham</strong>, Buenos Aires (cerca de Av. Vergara y Av. Jauretche).
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px;">
                            <strong style="color:#0f172a; display:block; margin-bottom:4px;">🚚 Envíos a Domicilio (CABA y Gran BA)</strong>
                            Fletes puerta a puerta coordinando día y rango horario. Consultanos tu localidad para cotizar la tarifa más baja.
                        </div>
                        <div style="background:#fef2f2; border:1px solid #fecaca; padding:12px; border-radius:12px;">
                            <strong style="color:#991b1b; display:block; margin-bottom:4px;">📦 Envíos al Interior del País</strong>
                            Despachamos tu combo protegido con embalaje reforzado mediante Expreso / Transporte a tu elección a cualquier punto de Argentina.
                        </div>
                    </div>
                `
            },
            warranty: {
                title: '⭐ Calidad, Fabricación & Garantía',
                icon: 'verified',
                color: '#8b5cf6',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px; font-size:0.88rem; color:#334155; line-height:1.5;">
                        <div style="background:#f5f3ff; border:1px solid #ddd6fe; padding:12px; border-radius:12px;">
                            <strong style="color:#5b21b6; display:block; margin-bottom:4px;">🌲 100% Madera Maciza Seleccionada</strong>
                            Trabajamos con maderas de primera calidad tratadas y lijadas a mano para asegurar una superficie suave, resistente y segura.
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px;">
                            <strong style="color:#0f172a; display:block; margin-bottom:4px;">🛠️ Tiempos de Fabricación</strong>
                            Fabricación artesanal cuidando cada terminación. Si el combo se encuentra disponible en stock de taller, la entrega es inmediata.
                        </div>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;">
                            <strong style="color:#166534; display:block; margin-bottom:4px;">🛡️ Garantía Directa de Fábrica</strong>
                            Todos nuestros combos y productos cuentan con respaldo y garantía directa del taller La Tarima.
                        </div>
                    </div>
                `
            }
        };

        const data = modalData[type] || modalData.payments;

        const overlay = document.createElement('div');
        overlay.id = 'offer-info-modal-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 10005; display: flex; align-items: center; justify-content: center; padding: 1rem;';

        const card = document.createElement('div');
        card.style.cssText = 'background: white; border-radius: 20px; max-width: 480px; width: 100%; padding: 1.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; animation: modalPop 0.2s ease-out;';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined" style="color: ${data.color}; font-size: 24px;">${data.icon}</span>
                    <span>${data.title}</span>
                </h3>
                <button type="button" id="btn-close-info-modal" style="background: rgba(0,0,0,0.05); border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 1rem; cursor: pointer; color: #64748b;">✕</button>
            </div>
            ${data.html}
            <button type="button" id="btn-ack-info-modal" class="btn-primary giant-btn" style="width: 100%; justify-content: center; margin-top: 1.25rem; font-size: 0.92rem; padding: 0.75rem;">
                <span>Entendido</span>
            </button>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        const closeFn = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
        card.querySelector('#btn-close-info-modal')?.addEventListener('click', closeFn);
        card.querySelector('#btn-ack-info-modal')?.addEventListener('click', closeFn);
    }

    window.showOfferInfoModal = showOfferInfoModal;
    window.showItemInfoModal = showOfferInfoModal;

    function openOfferDetailView(offer) {
        if (!offer) return;
        if (window.syncOfferLivePrices) window.syncOfferLivePrices(offer);
        selectedOfferForModal = offer;
        let offerPackQty = 1;

        const view = document.getElementById('view-offer-detail');
        if (!view) {
            showOfferDetailModal(offer);
            return;
        }

        // Fill Page Title & Description
        const titleEl = document.getElementById('offer-detail-page-title');
        if (titleEl) titleEl.textContent = offer.title;

        const descEl = document.getElementById('offer-detail-page-desc');
        if (descEl) descEl.textContent = offer.subtitle || offer.description || '¡Súper combo de productos con precio bonificado y ahorro directo!';

        const mainDescEl = document.getElementById('offer-detail-main-description');
        if (mainDescEl) mainDescEl.textContent = offer.description || offer.title || 'Combo de productos de madera maciza seleccionados con precio de oferta especial.';

        // Stock tag
        const stockEl = document.getElementById('offer-detail-stock-tag');
        if (stockEl) {
            if (offer.stockLimit) {
                stockEl.textContent = `⚡ Quedan ${offer.stockLimit} combos`;
                stockEl.style.display = 'inline-block';
            } else {
                stockEl.style.display = 'none';
            }
        }

        // Hero Cover (Custom Image or 2x2 Mosaic)
        const coverContainer = document.getElementById('offer-detail-cover-container');
        if (coverContainer) {
            coverContainer.innerHTML = '';
            
            // Build stamp text & badge
            const stamps = {
                'pro-gold': '⭐ PRO GOLD',
                'oportunidad': '🏆 OPORTUNIDAD ÚNICA',
                'relampago': '⚡ RELÁMPAGO',
                'combo': '🎁 COMBO EXCLUSIVO',
                'envio-gratis': '🚚 ENVÍO GRATIS'
            };
            const stampText = stamps[offer.stampStyle] || '🔥 OFERTA';

            // Build cover background or mosaic
            if (offer.customCoverImage) {
                coverContainer.innerHTML = `<img src="${offer.customCoverImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else if (offer.product_items && offer.product_items.length > 0) {
                if (offer.product_items.length === 1) {
                    coverContainer.innerHTML = `<img src="${offer.product_items[0].image || 'img/logo_provisional.png'}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else if (offer.product_items.length === 2) {
                    coverContainer.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; width: 100%; height: 100%;">
                            <img src="${offer.product_items[0].image}" style="width: 100%; height: 100%; object-fit: cover;">
                            <img src="${offer.product_items[1].image}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    `;
                } else {
                    const imgs = offer.product_items.slice(0, 4).map(i => i.image);
                    coverContainer.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 100%; height: 100%;">
                            ${imgs.map(img => `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">`).join('')}
                        </div>
                    `;
                }
            }

            // Overlay Stamp
            const stampEl = document.createElement('div');
            stampEl.className = `stamp-badge ${offer.stampStyle || 'pro-gold'}`;
            stampEl.style.cssText = 'position: absolute; top: 14px; left: 14px; z-index: 5; font-size: 0.82rem; padding: 6px 14px;';
            stampEl.textContent = stampText;
            coverContainer.appendChild(stampEl);

            // Overlay Discount Tag
            if (offer.discountPercent) {
                const discEl = document.createElement('div');
                discEl.style.cssText = 'position: absolute; top: 14px; right: 14px; z-index: 5; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; font-weight: 900; font-size: 0.85rem; padding: 5px 12px; border-radius: 20px; box-shadow: 0 4px 12px rgba(220,38,38,0.4); text-transform: uppercase;';
                discEl.textContent = `-${offer.discountPercent}% OFF`;
                coverContainer.appendChild(discEl);
            }

            // Overlay Countdown Timer
            if (offer.hasTimer && offer.expirationDate) {
                const timerPill = document.createElement('div');
                timerPill.className = 'offer-countdown-pill';
                timerPill.setAttribute('data-offer-expiration', offer.expirationDate);
                timerPill.style.cssText = 'position: absolute; bottom: 14px; left: 14px; z-index: 5; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); color: #fbbf24; font-weight: 800; font-size: 0.8rem; padding: 6px 14px; border-radius: 30px; border: 1.5px solid rgba(251, 191, 36, 0.5); font-family: monospace;';
                timerPill.textContent = '⏳ Cargando...';
                coverContainer.appendChild(timerPill);
            }

            // Overlay Share Button (Bottom Right over photo - Contenedor Circular Perfectos)
            const shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.id = 'btn-share-offer-detail';
            shareBtn.title = 'Compartir Oferta';
            shareBtn.style.cssText = 'position: absolute; bottom: 14px; right: 14px; z-index: 5; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); border: 1.5px solid rgba(255, 255, 255, 0.4); color: white; width: 44px; height: 44px; min-width: 44px; min-height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.4); box-sizing: border-box; padding: 0;';
            shareBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">share</span>`;
            shareBtn.onclick = (e) => {
                e.preventDefault();
                const shareUrl = (window.TarimaShortener && window.TarimaShortener.getShortOfferUrl)
                    ? window.TarimaShortener.getShortOfferUrl(offer.id)
                    : `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?s=${offer.id}`;
                const shareText = `¡Mirá este combo imperdible *${offer.title}* con ${offer.discountPercent || ''}% OFF en La Tarima! 🔥`;
                if (navigator.share) {
                    navigator.share({ title: offer.title, text: shareText, url: shareUrl }).catch(() => {});
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                    alert('🔗 ¡Enlace corto de la oferta copiado al portapapeles!');
                }
            };
            coverContainer.appendChild(shareBtn);
        }

        // Clarification Modals Listeners
        document.getElementById('btn-offer-modal-payments')?.addEventListener('click', () => showOfferInfoModal('payments'));
        document.getElementById('btn-offer-modal-shipping')?.addEventListener('click', () => showOfferInfoModal('shipping'));
        document.getElementById('btn-offer-modal-warranty')?.addEventListener('click', () => showOfferInfoModal('warranty'));

        // Price Info Tooltip Listeners (Hover & Click for Mobile)
        const priceInfoTrigger = document.getElementById('offer-price-info-trigger');
        const priceInfoTooltip = document.getElementById('offer-price-info-tooltip');
        if (priceInfoTrigger && priceInfoTooltip) {
            priceInfoTrigger.onmouseenter = () => { priceInfoTooltip.style.display = 'block'; };
            priceInfoTrigger.onmouseleave = () => { priceInfoTooltip.style.display = 'none'; };
            priceInfoTrigger.onclick = (e) => {
                e.stopPropagation();
                priceInfoTooltip.style.display = (priceInfoTooltip.style.display === 'block') ? 'none' : 'block';
            };
            document.addEventListener('click', () => { if (priceInfoTooltip) priceInfoTooltip.style.display = 'none'; });
        }

        // Favorite Toggle Button Setup
        const favBtn = document.getElementById('btn-offer-fav-dynamic');
        if (favBtn) {
            const checkFav = () => {
                try {
                    const data = localStorage.getItem('cartItems');
                    if (data) {
                        const arr = JSON.parse(data);
                        return arr.some(i => i.id === offer.id);
                    }
                } catch(e) {}
                return false;
            };
            const updateFavUI = () => {
                if (checkFav()) {
                    favBtn.style.color = '#dc2626';
                    favBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">favorite</span>`;
                } else {
                    favBtn.style.color = 'var(--text-main)';
                    favBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 20px;">favorite_border</span>`;
                }
            };
            updateFavUI();
            favBtn.onclick = (e) => {
                e.preventDefault();
                addOfferToCart(offer, offerPackQty);
                updateFavUI();
            };
        }

        // Dynamic Prices & Quantity Multiplier & Proportional Item Prices
        const qtyValEl = document.getElementById('offer-detail-qty-val');
        const origPriceEl = document.getElementById('offer-detail-original-price');
        const finalPriceEl = document.getElementById('offer-detail-final-price');
        const savingsBanner = document.getElementById('offer-detail-savings-banner');
        const itemsList = document.getElementById('offer-detail-items-list');

        const specCountEl = document.getElementById('offer-detail-spec-count');

        const renderPricesAndItems = () => {
            if (qtyValEl) qtyValEl.textContent = offerPackQty;

            const totalSubtotal = (offer.subtotalPrice || 0) * offerPackQty;
            const totalOfferPrice = (offer.offerPrice || 0) * offerPackQty;
            const totalSavings = Math.max(0, totalSubtotal - totalOfferPrice);

            const formattedSubtotal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalSubtotal);
            const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalOfferPrice);
            const formattedSavings = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalSavings);

            if (origPriceEl) origPriceEl.textContent = formattedSubtotal;
            if (finalPriceEl) finalPriceEl.textContent = formattedOfferPrice;

            // Actualizar contador en Ficha Técnica del Combo
            if (specCountEl) {
                const totalItemCount = (offer.product_items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0) * offerPackQty;
                specCountEl.textContent = `${totalItemCount} producto${totalItemCount !== 1 ? 's' : ''} incluido${totalItemCount !== 1 ? 's' : ''}`;
            }

            if (savingsBanner) {
                if (totalSavings > 0) {
                    savingsBanner.innerHTML = `🎉 ¡Estás ahorrando <b>${formattedSavings}</b> (${offer.discountPercent || Math.round((totalSavings / totalSubtotal) * 100)}% OFF) al llevar este combo en lugar de los productos por separado!`;
                    savingsBanner.style.display = 'block';
                    savingsBanner.style.background = 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
                    savingsBanner.style.border = '1.5px solid #86efac';
                    savingsBanner.style.color = '#15803d';
                    savingsBanner.style.boxShadow = '0 4px 12px rgba(22, 101, 52, 0.08)';
                    savingsBanner.style.padding = '0.75rem';
                    savingsBanner.style.lineHeight = '1.4';
                } else {
                    savingsBanner.style.display = 'none';
                }
            }

            // Render List of included items with proportional discount prices
            if (itemsList) {
                itemsList.innerHTML = '';
                if (offer.product_items && offer.product_items.length > 0) {
                    const discountFactor = (offer.subtotalPrice && offer.subtotalPrice > 0) ? (offer.offerPrice / offer.subtotalPrice) : 1;
                    const discountPercent = offer.discountPercent || Math.round((1 - discountFactor) * 100);

                    offer.product_items.forEach(item => {
                        const card = document.createElement('div');
                        card.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 0.75rem 1rem; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);';
                        
                        const baseItemQty = parseInt(item.quantity, 10) || 1;
                        const totalItemQty = baseItemQty * offerPackQty;
                        const unitPrice = item.unitPrice || 0;
                        const originalTotalPrice = unitPrice * totalItemQty;
                        const proportionalTotalPrice = originalTotalPrice * discountFactor;

                        const formattedOrig = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(originalTotalPrice);
                        const formattedProp = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(proportionalTotalPrice);

                        card.innerHTML = `
                            <img src="${item.image || 'img/logo_provisional.png'}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 8px; border: 1.5px solid #e2e8f0; flex-shrink: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    ${totalItemQty > 1 ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 900; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px;">x${totalItemQty}</span>` : ''}
                                    <span>${item.title}</span>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                                    ${item.acabado ? `Acabado: <b>${item.acabado}</b>` : ''} ${item.medida ? `| Medida: <b>${item.medida}</b>` : ''}
                                </div>
                            </div>
                            <div style="text-align: right; line-height: 1.25; flex-shrink: 0;">
                                ${discountFactor < 1 ? `
                                    <div style="font-size: 0.78rem; text-decoration: line-through; color: #94a3b8; font-weight: 700; margin-bottom: 1px;">${formattedOrig}</div>
                                    <div style="font-size: 0.98rem; font-weight: 900; color: #166534;">${formattedProp}</div>
                                    ${discountPercent > 0 ? `<div style="font-size: 0.68rem; color: #16a34a; font-weight: 800;">(${discountPercent}% OFF)</div>` : ''}
                                ` : `
                                    <div style="font-size: 0.95rem; font-weight: 800; color: #334155;">${formattedOrig}</div>
                                `}
                            </div>
                        `;
                        itemsList.appendChild(card);
                    });
                }
            }
        };

        renderPricesAndItems();

        // Quantity controls listeners
        const btnMinus = document.getElementById('btn-offer-qty-minus');
        const btnPlus = document.getElementById('btn-offer-qty-plus');
        if (btnMinus) {
            btnMinus.onclick = (e) => {
                e.preventDefault();
                if (offerPackQty > 1) {
                    offerPackQty--;
                    renderPricesAndItems();
                }
            };
        }
        if (btnPlus) {
            btnPlus.onclick = (e) => {
                e.preventDefault();
                offerPackQty++;
                renderPricesAndItems();
            };
        }

        // Setup Cart Button
        const cartBtn = document.getElementById('btn-add-offer-to-cart');
        if (cartBtn) {
            cartBtn.onclick = (e) => {
                e.preventDefault();
                addOfferToCart(offer, offerPackQty);
            };
        }

        // Setup LO QUIERO / COMPRAR YA Button (Pago Directo Modal)
        const buyNowBtn = document.getElementById('btn-buy-now-offer');
        if (buyNowBtn) {
            buyNowBtn.onclick = (e) => {
                e.preventDefault();
                showOfferPaymentModal(offer, offerPackQty);
            };
        }

        // Setup WhatsApp Pre-Qualification Delivery Modal
        const waBtn = document.getElementById('btn-whatsapp-offer');
        if (waBtn) {
            waBtn.onclick = (e) => {
                e.preventDefault();
                showOfferDeliveryModal(offer, offerPackQty);
            };
        }

        // Setup Share Button
        const shareBtn = document.getElementById('btn-share-offer-detail');
        if (shareBtn) {
            shareBtn.onclick = (e) => {
                e.preventDefault();
                const shareUrl = (window.TarimaShortener && window.TarimaShortener.getShortOfferUrl)
                    ? window.TarimaShortener.getShortOfferUrl(offer.id)
                    : `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}?s=${offer.id}`;
                const shareText = `¡Mirá este combo imperdible *${offer.title}* con ${offer.discountPercent || ''}% OFF en La Tarima! 🔥`;
                if (navigator.share) {
                    navigator.share({ title: offer.title, text: shareText, url: shareUrl }).catch(() => {});
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                    alert('🔗 ¡Enlace corto de la oferta copiado al portapapeles!');
                }
            };
        }

        // Render Related Combos Carousel
        renderRelatedOffers(offer.id);

        // Actualizar la URL del navegador con el shortcode super corto de la oferta (ej: ?s=O.1)
        if (window.TarimaShortener && window.TarimaShortener.encodeOfferShortCode) {
            const offerCode = window.TarimaShortener.encodeOfferShortCode(offer.id);
            const currentParams = new URLSearchParams(window.location.search);
            if (currentParams.get('s') !== offerCode && currentParams.get('oferta') !== offer.id) {
                const cleanUrl = window.location.pathname.replace(/\/index\.html$/, '/') + `?s=${offerCode}`;
                window.history.pushState({ viewId: 'view-offer-detail', offerId: offer.id, shortCode: offerCode }, document.title, cleanUrl);
            }
        }

        // Navigate to the view
        if (window.navigateToView) {
            window.navigateToView('view-offer-detail', { offer });
        }
        updateCountdownLabels();
    }

    function showOfferDeliveryModal(offer, packQty = 1) {
        const existing = document.getElementById('delivery-modal-overlay');
        if (existing) existing.remove();

        const phone = '5491167007723';
        const formattedOfferPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format((offer.offerPrice || 0) * packQty);
        const itemsText = (offer.product_items || []).map(i => `- ${i.quantity || 1}x ${i.title} (${i.acabado || 'Estándar'})`).join('\n');

        const buildOfferWA = (tipoEntrega = '', shippingData = {}) => {
            let parts = [
                `• Combo: *${offer.title}*`,
                `• Cantidad Packs: ${packQty}`,
                `• Precio Total: *${formattedOfferPrice}*`,
                `\nProductos Incluidos:\n${itemsText}`
            ];

            if (tipoEntrega === 'pickup') {
                parts.push('\n• Entrega: 🏪 Retiro por el taller (Hurlingham)');
            } else if (tipoEntrega === 'shipping') {
                parts.push('\n• Entrega: 🚚 Necesito envío a domicilio');
                if (shippingData.localidad) parts.push(`• Destino/CP: ${shippingData.localidad}`);
                if (shippingData.direccion) parts.push(`• Dirección: ${shippingData.direccion}`);
            }

            return `¡Hola La Tarima! 👋 Me interesa comprar este combo:\n\n${parts.join('\n')}\n\n¿Me podrías brindar más información para coordinar?`;
        };

        const overlay = document.createElement('div');
        overlay.id = 'delivery-modal-overlay';
        overlay.className = 'delivery-modal-overlay';

        const sheet = document.createElement('div');
        sheet.className = 'delivery-modal-sheet';
        sheet.style.position = 'relative';
        sheet.innerHTML = `
            <button class="delivery-modal-back-arrow" id="dopt-back-arrow" title="Volver" style="display:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="delivery-modal-close-x" id="dopt-close-x" title="Cerrar">&times;</button>
            <div class="delivery-modal-handle"></div>
            <p class="delivery-modal-eyebrow">Antes de continuar</p>
            <h3 class="delivery-modal-title">¿Cómo querés recibir tu combo?</h3>
            <p class="delivery-modal-subtitle">Elegí la modalidad para coordinar tu compra por WhatsApp</p>
            
            <div class="delivery-modal-options">
                <button class="delivery-opt-btn delivery-opt-pickup" id="dopt-pickup">
                    <span class="delivery-opt-icon">🏪</span>
                    <span class="delivery-opt-label">Retirar por el taller</span>
                    <span class="delivery-opt-desc">Hurlingham, Buenos Aires (Efectivo / Transferencia)</span>
                </button>
                <button class="delivery-opt-btn delivery-opt-shipping" id="dopt-shipping">
                    <span class="delivery-opt-icon">🚚</span>
                    <span class="delivery-opt-label">Necesito envío</span>
                    <span class="delivery-opt-desc">Te cotizamos el envío a domicilio por WhatsApp</span>
                </button>
            </div>

            <!-- Formulario de Envío -->
            <div id="delivery-shipping-form" style="display:none; width:100%; flex-direction:column; gap:10px; margin-top:12px; text-align:left;">
                <p style="font-size:0.82rem; color:#64748B; margin:0 0 2px 0;">📍 Datos para cotizar el envío <span style="color:#94A3B8;">(opcionales)</span>:</p>
                <input type="text" id="ship-loc" placeholder="Localidad o Código Postal (ej: Ramos Mejía / 1704)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                <input type="text" id="ship-dir" placeholder="Dirección de entrega (ej: Av. de Mayo 123)" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:0.88rem; box-sizing:border-box;">
                <button id="btn-submit-shipping-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; margin-top:4px; font-size:0.92rem;">
                    <span>Enviar consulta por WhatsApp 💬</span>
                </button>
            </div>

            <!-- Panel de Retiro en Taller -->
            <div id="delivery-pickup-info" style="display:none; width:100%; flex-direction:column; gap:12px; margin-top:10px; text-align:left;">
                <div style="background:#FFF8F5; border:1.5px solid rgba(160,113,91,0.25); padding:14px; border-radius:14px; font-size:0.85rem; color:#2D3748; line-height:1.5;">
                    <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                        <span>💡 Aclaración sobre el precio:</span>
                    </p>
                    <p style="margin:0 0 12px 0;">El precio del combo promocional se congela y mantiene pagando en <strong>efectivo o transferencia</strong>.</p>
                    
                    <p style="margin:0 0 6px 0; font-weight:700; color:#A0715B; display:flex; align-items:center; gap:6px;">
                        <span>📍 Ubicación del taller:</span>
                    </p>
                    <p style="margin:0;">Hurlingham, Buenos Aires, Argentina<br><span style="color:#718096; font-size:0.8rem;">(Zona céntrica: cerca de Av. Vergara y Av. Jauretche)</span></p>
                </div>

                <button id="btn-submit-pickup-wa" class="btn-primary giant-btn" style="width:100%; justify-content:center; font-size:0.92rem;">
                    <span>Continuar a WhatsApp 💬</span>
                </button>
            </div>
        `;

        overlay.appendChild(sheet);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('open'));

        const closeModal = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        };

        const resetToInitialView = () => {
            const pickupInfo = document.getElementById('delivery-pickup-info');
            const shippingForm = document.getElementById('delivery-shipping-form');
            const optionsContainer = sheet.querySelector('.delivery-modal-options');
            const backArrow = document.getElementById('dopt-back-arrow');

            if (pickupInfo) pickupInfo.style.display = 'none';
            if (shippingForm) shippingForm.style.display = 'none';
            if (optionsContainer) optionsContainer.style.display = 'flex';
            if (backArrow) backArrow.style.display = 'none';
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
        document.getElementById('dopt-close-x')?.addEventListener('click', closeModal);
        document.getElementById('dopt-back-arrow')?.addEventListener('click', resetToInitialView);

        document.getElementById('dopt-pickup')?.addEventListener('click', () => {
            sheet.querySelector('.delivery-modal-options').style.display = 'none';
            document.getElementById('delivery-pickup-info').style.display = 'flex';
            document.getElementById('dopt-back-arrow').style.display = 'flex';
        });

        document.getElementById('dopt-shipping')?.addEventListener('click', () => {
            sheet.querySelector('.delivery-modal-options').style.display = 'none';
            document.getElementById('delivery-shipping-form').style.display = 'flex';
            document.getElementById('dopt-back-arrow').style.display = 'flex';
        });

        document.getElementById('btn-submit-pickup-wa')?.addEventListener('click', () => {
            const waMsg = buildOfferWA('pickup');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
            closeModal();
        });

        document.getElementById('btn-submit-shipping-wa')?.addEventListener('click', () => {
            const loc = document.getElementById('ship-loc')?.value || '';
            const dir = document.getElementById('ship-dir')?.value || '';
            const waMsg = buildOfferWA('shipping', { localidad: loc, direccion: dir });
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
            closeModal();
        });
    }

    function showOfferPaymentModal(offerInput, packQty = 1, productContext = null) {
        window._checkoutSelectedQty = packQty;
        const existing = document.getElementById('offer-payment-modal-overlay');
        if (existing) existing.remove();

        const isProductItem = !!productContext || (offerInput && offerInput.acabados_groups);
        let freshItem = offerInput;

        if (isProductItem) {
            // Producto individual
            const prodId = offerInput?.id || productContext?.product?.id;
            let freshProds = window.sessionProducts;
            if (!freshProds || freshProds.length === 0) {
                try {
                    const stored = localStorage.getItem('sessionProductsAutonomo') || localStorage.getItem('sessionProducts');
                    if (stored) freshProds = JSON.parse(stored);
                } catch(e) {}
            }
            if (freshProds) {
                for (const cat of freshProds) {
                    const found = (cat.products || []).find(p => String(p.id) === String(prodId));
                    if (found) { freshItem = found; break; }
                }
            }
        } else {
            // Oferta / Combo
            let freshOffers = window.sessionOffers;
            if (!freshOffers || freshOffers.length === 0) {
                try {
                    const stored = localStorage.getItem('sessionOffersAutonomo') || localStorage.getItem('sessionOffers');
                    if (stored) freshOffers = JSON.parse(stored);
                } catch(e) {}
            }
            freshItem = (freshOffers || []).find(o => String(o.id) === String(offerInput?.id)) || offerInput;
        }

        const offer = freshItem;
        const phone = '5491167007723';

        // Calcular precio base del item (oferta u opción de producto)
        let basePrice = 0;
        let itemDisplayName = offer.title || 'Producto';

        if (isProductItem) {
            const grupoName = productContext?.grupo?.acabado_name || '';
            const medidaName = productContext?.medida || '';
            const opcionName = productContext?.opcion || '';
            const variantPrice = productContext?.price !== undefined ? productContext.price : (parseFloat(offer.price) || 0);
            basePrice = variantPrice;
            const extraDetails = [];
            if (grupoName && grupoName !== 'Único') extraDetails.push(`Acabado: ${grupoName}`);
            if (medidaName) extraDetails.push(`Medida: ${medidaName}`);
            if (opcionName) extraDetails.push(`${productContext?.opcionLabel || 'Opción'}: ${opcionName}`);
            if (extraDetails.length > 0) {
                itemDisplayName = `${offer.title} (${extraDetails.join(' · ')})`;
            }
        } else {
            basePrice = offer.offerPrice || 0;
        }

        const totalOfferVal = (basePrice || 0) * packQty;
        const formatCurr = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(val);
        const formattedOfferPrice = formatCurr(totalOfferVal);
        
        const payConf = window.sessionPaymentConfig || (localStorage.getItem('sessionPaymentConfig') ? JSON.parse(localStorage.getItem('sessionPaymentConfig')) : null) || {};
        const transferConf = payConf.transfer || {};
        
        const alias = transferConf.alias || 'VENUS.PULMON.METRO';
        const cbu = transferConf.cbu || '0720048988000002273736';
        const bank = transferConf.bank || 'Banco Santander';
        const titular = transferConf.titular || 'Yonatan Lucas Orellana';
        const cuit = transferConf.cuit || '20-35281538-2';

        const overlay = document.createElement('div');
        overlay.id = 'offer-payment-modal-overlay';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 0; opacity: 0; transition: opacity 0.25s ease-out; box-sizing: border-box; width: 100vw; height: 100vh; height: 100dvh;';

        const card = document.createElement('div');
        card.style.cssText = 'position: relative; width: 100vw; height: 100vh; height: 100dvh; max-width: 100vw; max-height: 100vh; max-height: 100dvh; border-radius: 0; padding: 1rem 1.25rem; background: #ffffff; box-shadow: none; border: none; font-family: var(--font-main); box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; justify-content: space-between; transform: scale(0.98); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); margin: 0; overflow: hidden;';
        
        card.innerHTML = `
            <!-- Botón X cerrado bien arriba a la derecha -->
            <button type="button" id="pay-modal-close-x" title="Cerrar" style="position: fixed; top: 0.85rem; right: 0.85rem; width: 30px; height: 30px; background: none; border: none; font-size: 26px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; z-index: 100000; padding: 0; transition: color 0.2s;" onmouseenter="this.style.color='#0f172a'" onmouseleave="this.style.color='#94a3b8'">&times;</button>

            <!-- Header Modal con Barra de Pasos -->
            <div style="width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; padding-right: 2rem; flex-shrink: 0; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <span class="material-symbols-outlined" style="color: #0f172a; font-size: 22px; background: #f1f5f9; padding: 6px; border-radius: 10px; flex-shrink: 0;">shopping_bag</span>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.8px; text-transform: uppercase;">LA TARIMA - CHECKOUT</div>
                            <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="checkout-step-title">1. Entrega y Contacto</h3>
                        </div>
                    </div>
                </div>

                <!-- Stepper Visual (3 Pasos) -->
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; margin: 0 auto;">
                    <div id="step-indicator-1" style="flex: 1; height: 6px; background: #0f172a; border-radius: 4px; transition: background 0.3s;"></div>
                    <div id="step-indicator-2" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; transition: background 0.3s;"></div>
                    <div id="step-indicator-3" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 4px; transition: background 0.3s;"></div>
                </div>
            </div>

            <!-- Contenido Principal Desplazable -->
            <div style="flex: 1; overflow-y: auto; padding: 1rem 0; box-sizing: border-box; width: 100%; max-width: 650px; margin: 0 auto;">
                
                <!-- ==================== PASO 1: ENTREGA Y CONTACTO ==================== -->
                <div id="checkout-step-1-content" style="display: flex; flex-direction: column; gap: 1rem;">
                    
                    <!-- 1. Datos de Contacto del Cliente -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            👤 1. Datos de Contacto para el Pedido:
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Nombre y Apellido *
                                </label>
                                <input type="text" id="pay-client-name" placeholder="Ej: María González" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Teléfono / WhatsApp *
                                </label>
                                <input type="tel" id="pay-client-phone" placeholder="Ej: 11 1234 5678" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.82rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>
                        </div>
                    </div>

                    <!-- 2. Forma de Entrega Preferida -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            🚚 2. Forma de Entrega Preferida:
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                                <input type="radio" name="pay-delivery-mode" id="pay-mode-pickup" value="pickup" checked style="accent-color: #0f172a; cursor: pointer;">
                                <span>🏬 Retiro por Taller / Local (Hurlingham)</span>
                            </label>

                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 10px;">
                                <input type="radio" name="pay-delivery-mode" id="pay-mode-shipping" value="shipping" style="accent-color: #0f172a; cursor: pointer;">
                                <span>🚚 Envío a Domicilio / Flete / Expreso</span>
                            </label>
                        </div>

                        <!-- Menú Desplegable de Datos de Envío -->
                        <div id="pay-shipping-expand-menu" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                            <div>
                                <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                    Dirección (Calle y Altura):
                                </label>
                                <input type="text" id="pay-ship-dir" placeholder="Ej: Av. Corrientes 1234, 4to B" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
                                <div>
                                    <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                        Código Postal:
                                    </label>
                                    <input type="text" id="pay-ship-cp" placeholder="Ej: 1712" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                        Ciudad / Localidad:
                                    </label>
                                    <input type="text" id="pay-ship-ciudad" placeholder="Ej: Castelar / CABA" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.68rem; font-weight: 800; color: #475569; margin-bottom: 2px; text-transform: uppercase;">
                                        Provincia:
                                    </label>
                                    <input type="text" id="pay-ship-provincia" placeholder="Ej: Buenos Aires" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.45rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                </div>
                            </div>

                            <!-- Resultado lookup CP + selector método de envío (Ocupa el 100% del ancho debajo de los campos) -->
                            <div id="pay-ship-lookup-result" style="display:none; margin-top:10px; width:100%; box-sizing:border-box;"></div>
                        </div>
                    </div>
                </div>

                <!-- ==================== PASO 2: PAGO Y FACTURACIÓN ==================== -->
                <div id="checkout-step-2-content" style="display: none; flex-direction: column; gap: 1rem;">
                    
                    <!-- 3. Monto Total a Abonar Unificado con Necesito Factura A -->
                    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 1rem 1.1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative;">
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">💰 3. Monto Total a Abonar</div>
                                <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemDisplayName} ${packQty > 1 ? `(x${packQty})` : ''}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; position: relative;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <div id="pay-modal-display-price" style="font-size: 1.6rem; font-weight: 900; color: #059669; font-family: var(--font-main); letter-spacing: -0.5px;">
                                        ${formattedOfferPrice}
                                    </div>
                                    <button type="button" id="btn-pay-info-tooltip" title="Información sobre el precio" style="background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0284c7; border-radius: 50%;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">help_outline</span>
                                    </button>
                                </div>

                                <div id="pay-modal-tax-badge" style="display: none; font-size: 0.62rem; font-weight: 800; color: #1e40af; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 2px 6px; margin-top: 2px;">
                                    +21% IVA + IIBB PBA
                                </div>

                                <!-- Tooltip Popover Flotante -->
                                <div id="pay-info-tooltip-popover" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 6px; background: #0f172a; color: #ffffff; padding: 0.75rem 0.9rem; border-radius: 12px; font-size: 0.75rem; width: 250px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 100; line-height: 1.4; text-align: left;">
                                    <div style="font-weight: 800; margin-bottom: 4px; color: #38bdf8;">ℹ️ Precio Transferencia Directa</div>
                                    Monto de contado/transferencia directa consumidor final sin IVA adicional ni comisiones intermedias.
                                </div>
                            </div>
                        </div>

                        <!-- Desglose de Producto + Envío si aplica -->
                        <div id="pay-modal-breakdown-box" style="display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.78rem; flex-direction: column; gap: 4px;">
                            <div style="display: flex; justify-content: space-between; color: #475569;">
                                <span>Subtotal Combo:</span>
                                <span style="font-weight: 700; color: #0f172a;" id="breakdown-prod-val">${formattedOfferPrice}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; color: #0284c7;" id="breakdown-ship-row">
                                <span id="breakdown-ship-label">🚚 Envío:</span>
                                <span style="font-weight: 700;" id="breakdown-ship-val"></span>
                            </div>
                        </div>

                        <!-- Factura A integrada dentro de la tarjeta de monto -->
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 800; color: #0f172a; margin: 0;">
                                <input type="checkbox" id="chk-factura-a" style="width: 18px; height: 18px; accent-color: #0f172a; cursor: pointer;">
                                <span>Necesito Factura A (Responsable Inscripto)</span>
                            </label>

                            <div id="factura-a-expand-menu" style="display: none; flex-direction: column; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                                <div style="font-size: 0.73rem; color: #475569; line-height: 1.35; background: #ffffff; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                    ⚠️ Adiciona <strong>+21% de IVA</strong> + <strong>3.5% de Ingresos Brutos PBA</strong>.
                                </div>

                                <div id="factura-a-breakdown" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: #334155;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #64748b; font-weight: 600;">Base Producto:</span>
                                        <span id="factura-base-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                                    </div>
                                    <div id="factura-ship-row" style="display: none; justify-content: space-between; align-items: center;">
                                        <span style="color: #0284c7; font-weight: 600;" id="factura-ship-label">Envío:</span>
                                        <span id="factura-ship-val" style="font-weight: 700; color: #0284c7; font-family: monospace;"></span>
                                    </div>
                                    <div id="factura-subtotal-row" style="display: none; justify-content: space-between; align-items: center; border-top: 1px dotted #cbd5e1; padding-top: 4px;">
                                        <span style="color: #0f172a; font-weight: 700;">Base Imponible Total:</span>
                                        <span id="factura-subtotal-val" style="font-weight: 800; color: #0f172a; font-family: monospace;"></span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #64748b; font-weight: 600;">IVA (21%):</span>
                                        <span id="factura-iva-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="color: #64748b; font-weight: 600;">IIBB PBA (3.5%):</span>
                                        <span id="factura-iibb-val" style="font-weight: 700; color: #0f172a; font-family: monospace;"></span>
                                    </div>
                                    <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center; font-weight: 800;">
                                        <span style="color: #0f172a; font-size: 0.82rem;">Total Facturado:</span>
                                        <span id="factura-total-val" style="color: #059669; font-size: 0.9rem; font-weight: 900; font-family: var(--font-main);"></span>
                                    </div>
                                </div>

                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 4px;">
                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            Razón Social / Empresa:
                                        </label>
                                        <input type="text" id="factura-razon-social" placeholder="Ej: La Tarima SRL" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            CUIT:
                                        </label>
                                        <input type="text" id="factura-cuit" placeholder="Ej: 30-12345678-9" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>

                                    <div style="grid-column: 1 / -1; width: 100%;">
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: #475569; margin-bottom: 3px; text-transform: uppercase;">
                                            Dirección Fiscal:
                                        </label>
                                        <input type="text" id="factura-direccion-fiscal" placeholder="Av. Rivadavia 1234, Ciudad/localidad, Provincia" style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #0f172a; font-family: inherit; outline: none;">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Elección de Medio de Pago Preferido -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                            💳 4. Elegí tu Medio de Pago Preferido:
                        </div>

                        <!-- 3 Botones ultra limpios (Icono + Título) -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;" id="pay-methods-grid-container">
                            <button type="button" class="pay-method-btn" data-pay-val="transfer" id="btn-pay-choice-transfer" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #16a34a;">account_balance</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Transferencia</div>
                            </button>

                            <button type="button" class="pay-method-btn" data-pay-val="link" id="btn-pay-choice-link" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #0284c7;">link</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Link / Débito</div>
                            </button>

                            <button type="button" class="pay-method-btn" data-pay-val="credit" id="btn-pay-choice-credit" style="background: #f8fafc; color: #334155; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.75rem 0.4rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; text-align: center; transition: all 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: #d97706;">credit_card</span>
                                <div style="font-size: 0.78rem; font-weight: 800; line-height: 1.2;">Tarjeta Crédito</div>
                            </button>
                        </div>

                        <!-- Panel 1: Transferencia Directa -->
                        <div id="pay-panel-transfer" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.78rem; color: #166534; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-weight: 800; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; color: #16a34a;">verified</span>
                                    <span>Pago por Transferencia Bancaria Directa</span>
                                </div>
                                <span style="font-weight: 800; color: #15803d; background: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; border: 1px solid #86efac;">Sin Recargo (0% Costo Adicional)</span>
                            </div>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; width: 100%; box-sizing: border-box; margin-top: 4px;">
                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                                    <div style="width: 100%;">
                                        <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">ALIAS (SANTANDER / MP)</div>
                                        <div style="font-size: 1.1rem; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 2px; letter-spacing: 0.5px; word-break: break-all;">${alias}</div>
                                    </div>
                                    <button type="button" id="btn-copy-alias" style="background: #0f172a; color: #ffffff; border: none; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; box-shadow: 0 2px 6px rgba(15,23,42,0.12); margin: 0 auto;">
                                        <span class="material-symbols-outlined" id="copy-alias-icon" style="font-size: 15px;">content_copy</span>
                                        <span id="copy-alias-lbl">Copiar Alias</span>
                                    </button>
                                </div>

                                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; text-align: center; align-items: center; justify-content: space-between;">
                                    <div style="width: 100%;">
                                        <div style="font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">CBU / CVU</div>
                                        <div style="font-size: 0.9rem; font-weight: 800; color: #0f172a; font-family: monospace; margin-top: 2px; word-break: break-all; letter-spacing: 0.5px;">${cbu}</div>
                                    </div>
                                    <button type="button" id="btn-copy-cbu" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; max-width: 150px; box-sizing: border-box; margin: 0 auto;">
                                        <span class="material-symbols-outlined" id="copy-cbu-icon" style="font-size: 15px;">content_copy</span>
                                        <span id="copy-cbu-lbl">Copiar CBU</span>
                                    </button>
                                </div>
                            </div>

                            <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.85rem 1rem; width: 100%; box-sizing: border-box; font-size: 0.8rem; color: #334155; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 8px; text-align: center;">
                                <div>Titular: <strong style="color: #0f172a;">${titular}</strong></div>
                                <div>CUIT/CUIL: <strong style="color: #0f172a;">${cuit}</strong></div>
                                <div>Banco: <strong style="color: #0f172a;">${bank}</strong></div>
                            </div>
                        </div>

                        <!-- Panel 2: Link de Pago / Débito -->
                        <div id="pay-panel-link" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; padding: 1rem; text-align: center; margin-top: 10px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-size: 0.9rem; font-weight: 800; color: #0369a1; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined">link</span> Link de Pago Directo (Mercado Pago / Débito)
                                </div>
                                <span style="font-size: 0.68rem; font-weight: 800; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 6px;">⚠️ NO DISPONIBLE AUTOMÁTICO</span>
                            </div>

                            <div style="font-size: 0.75rem; color: #0369a1; background: #ffffff; border: 1px solid #e0f2fe; padding: 6px 10px; border-radius: 8px; font-weight: 700; text-align: left;">
                                💡 <strong>Costo adicional:</strong> Sujeto a comisión de plataforma Mercado Pago (+6% a 8% aprox. según acreditación).
                            </div>
                        </div>

                        <!-- Panel 3: Tarjeta de Crédito (Cuotas) -->
                        <div id="pay-panel-credit" style="display: none; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; background: #fffdf0; border: 1.5px solid #fde68a; border-radius: 12px; padding: 1rem; text-align: center; margin-top: 10px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                                <div style="font-size: 0.9rem; font-weight: 800; color: #b45309; display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined">credit_card</span> Pago en Cuotas con Tarjeta de Crédito
                                </div>
                                <span style="font-size: 0.68rem; font-weight: 800; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 6px;">⚠️ NO DISPONIBLE AUTOMÁTICO</span>
                            </div>

                            <div style="font-size: 0.75rem; color: #b45309; background: #ffffff; border: 1px solid #fef3c7; padding: 6px 10px; border-radius: 8px; font-weight: 700; text-align: left;">
                                💡 <strong>Costo adicional:</strong> Aplica recargo de financiación en cuotas fijas según tu tarjeta y banco.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ==================== PASO 3: ACLARACIONES Y ENVÍO ==================== -->
                <div id="checkout-step-3-content" style="display: none; flex-direction: column; gap: 1rem;">
                    
                    <!-- 5. Aclaraciones del Pedido (Opcional) -->
                    <div style="width: 100%; box-sizing: border-box;">
                        <label for="pay-modal-notes" style="display: block; font-size: 0.75rem; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px;">
                            ✏️ 5. Aclaraciones del pedido (Opcional):
                        </label>
                        <textarea id="pay-modal-notes" rows="4" placeholder="Ej: Transfirió mi pareja Juan Pérez, o aclaro horario de retiro..." style="width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.75rem 0.85rem; font-size: 0.85rem; color: #0f172a; font-family: inherit; resize: none; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='#0284c7'" onblur="this.style.borderColor='#cbd5e1'"></textarea>
                    </div>

                    <!-- 6. Aviso de Paso Final -->
                    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.82rem; color: #166534; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 22px; color: #15803d; flex-shrink: 0;">add_a_photo</span>
                        <span><strong>Aviso de paso final:</strong> Al abrir WhatsApp, recordá adjuntar la foto o comprobante de pago.</span>
                    </div>
                </div>

            </div>

            <!-- Footer con Botones de Navegación (Volver / Siguiente / Enviar WhatsApp) -->
            <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 0.75rem; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px; max-width: 650px; margin: 0 auto;">
                <button type="button" id="btn-checkout-prev" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 12px; padding: 0.8rem 1.2rem; font-weight: 800; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                    <span>Volver atrás</span>
                </button>

                <button type="button" id="btn-checkout-next" style="background: #0f172a; color: #ffffff; border: none; border-radius: 12px; padding: 0.8rem 1.5rem; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(15,23,42,0.18); transition: all 0.2s;">
                    <span>Siguiente</span>
                    <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
                </button>

                <button type="button" id="btn-submit-receipt-wa" style="display: none; background: #25d366; color: #ffffff; border: none; border-radius: 12px; padding: 0.85rem 1.4rem; font-weight: 900; font-size: 0.92rem; cursor: pointer; flex-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,211,102,0.3); transition: all 0.2s;">
                    <span class="material-symbols-outlined" style="font-size: 20px;">chat</span>
                    <span>Enviar por WhatsApp</span>
                </button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        function saveUserDataToStorage() {
            try {
                const cpVal = document.getElementById('pay-ship-cp')?.value || '';
                const data = {
                    name: document.getElementById('pay-client-name')?.value || '',
                    phone: document.getElementById('pay-client-phone')?.value || '',
                    deliveryMode: document.getElementById('pay-mode-shipping')?.checked ? 'shipping' : 'pickup',
                    dir: document.getElementById('pay-ship-dir')?.value || '',
                    cp: cpVal,
                    ciudad: document.getElementById('pay-ship-ciudad')?.value || '',
                    provincia: document.getElementById('pay-ship-provincia')?.value || '',
                    razonSocial: document.getElementById('factura-razon-social')?.value || '',
                    cuit: document.getElementById('factura-cuit')?.value || '',
                    dirFiscal: document.getElementById('factura-direccion-fiscal')?.value || ''
                };
                localStorage.setItem('latarima_checkout_user_data', JSON.stringify(data));

                // Sincronizar también en la clave global userData si se ingresó un CP
                if (cpVal.trim()) {
                    let mainUserData = {};
                    try {
                        const rawMain = localStorage.getItem('userData');
                        if (rawMain) mainUserData = JSON.parse(rawMain);
                    } catch(err) {}
                    mainUserData.zipCode = cpVal.trim();
                    localStorage.setItem('userData', JSON.stringify(mainUserData));
                }
            } catch (e) {}
        }

        const closeModal = () => {
            window.removeEventListener('keydown', handleKeyDown);
            saveUserDataToStorage();
            window.dispatchEvent(new CustomEvent('latarima:cp-updated'));
            overlay.style.opacity = '0';
            card.style.transform = 'scale(0.92)';
            setTimeout(() => overlay.remove(), 250);
        };

        document.getElementById('pay-modal-close-x')?.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // LÓGICA DE CONTROL DE PASOS (WIZARD 1 -> 2 -> 3)
        let currentStep = 1;

        const titleElem = document.getElementById('checkout-step-title');
        const step1Content = document.getElementById('checkout-step-1-content');
        const step2Content = document.getElementById('checkout-step-2-content');
        const step3Content = document.getElementById('checkout-step-3-content');

        const stepInd1 = document.getElementById('step-indicator-1');
        const stepInd2 = document.getElementById('step-indicator-2');
        const stepInd3 = document.getElementById('step-indicator-3');

        const btnPrev = document.getElementById('btn-checkout-prev');
        const btnNext = document.getElementById('btn-checkout-next');
        const btnWa = document.getElementById('btn-submit-receipt-wa');

        const updateWizardView = () => {
            // Ocultar todos los contenidos de paso
            if (step1Content) step1Content.style.display = 'none';
            if (step2Content) step2Content.style.display = 'none';
            if (step3Content) step3Content.style.display = 'none';

            // Resetear indicadores
            if (stepInd1) stepInd1.style.background = '#e2e8f0';
            if (stepInd2) stepInd2.style.background = '#e2e8f0';
            if (stepInd3) stepInd3.style.background = '#e2e8f0';

            if (currentStep === 1) {
                if (titleElem) titleElem.textContent = '1. Entrega y Contacto';
                if (step1Content) step1Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#0f172a';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'flex';
                if (btnWa) btnWa.style.display = 'none';
            } else if (currentStep === 2) {
                if (titleElem) titleElem.textContent = '2. Monto y Medio de Pago';
                if (step2Content) step2Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#059669';
                if (stepInd2) stepInd2.style.background = '#0f172a';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'flex';
                if (btnWa) btnWa.style.display = 'none';
            } else if (currentStep === 3) {
                if (titleElem) titleElem.textContent = '3. Aclaraciones y Finalizar';
                if (step3Content) step3Content.style.display = 'flex';
                if (stepInd1) stepInd1.style.background = '#059669';
                if (stepInd2) stepInd2.style.background = '#059669';
                if (stepInd3) stepInd3.style.background = '#25d366';

                if (btnPrev) {
                    btnPrev.style.visibility = 'visible';
                    btnPrev.querySelector('span:not(.material-symbols-outlined)').textContent = 'Volver atrás';
                    btnPrev.querySelector('.material-symbols-outlined').textContent = 'arrow_back';
                }
                if (btnNext) btnNext.style.display = 'none';
                if (btnWa) btnWa.style.display = 'flex';
            }
        };

        function validateStep1() {
            let isValid = true;
            let firstInvalidInput = null;

            const fieldsToValidate = [
                { id: 'pay-client-name', name: 'Nombre y Apellido' },
                { id: 'pay-client-phone', name: 'Teléfono / WhatsApp' }
            ];

            const isShipping = document.getElementById('pay-mode-shipping')?.checked;
            if (isShipping) {
                fieldsToValidate.push({ id: 'pay-ship-dir', name: 'Dirección' });
                fieldsToValidate.push({ id: 'pay-ship-cp', name: 'Código Postal' });
            }

            fieldsToValidate.forEach(item => {
                const input = document.getElementById(item.id);
                if (!input) return;
                const val = input.value.trim();
                if (!val) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                    input.style.background = '#fef2f2';
                    if (!firstInvalidInput) firstInvalidInput = input;

                    const clearError = () => {
                        input.style.borderColor = '#cbd5e1';
                        input.style.background = '#ffffff';
                        input.removeEventListener('input', clearError);
                    };
                    input.addEventListener('input', clearError);
                } else {
                    input.style.borderColor = '#cbd5e1';
                    input.style.background = '#ffffff';
                }
            });

            if (!isValid && firstInvalidInput) {
                firstInvalidInput.focus();
            }

            return isValid;
        }

        btnNext?.addEventListener('click', () => {
            if (currentStep === 1) {
                if (!validateStep1()) return;
            }
            if (currentStep < 3) {
                currentStep++;
                updateWizardView();
            }
        });

        btnPrev?.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizardView();
            } else {
                closeModal();
            }
        });

        // Evento cambio de Medio de Pago Preferido (Botones 3 en 1 fila)
        const payButtons = card.querySelectorAll('.pay-method-btn');
        const panelTransfer = document.getElementById('pay-panel-transfer');
        const panelLink = document.getElementById('pay-panel-link');
        const panelCredit = document.getElementById('pay-panel-credit');

        const offerPayConf = offer.paymentConfig || {};
        const isTransferEnabled = offerPayConf.transferEnabled !== false;
        const isLinkEnabled = offerPayConf.linkEnabled !== false;
        const isCreditEnabled = offerPayConf.creditEnabled !== false;

        payButtons.forEach(btn => {
            const val = btn.getAttribute('data-pay-val');
            if (val === 'transfer' && !isTransferEnabled) btn.style.display = 'none';
            if (val === 'link' && !isLinkEnabled) btn.style.display = 'none';
            if (val === 'credit' && !isCreditEnabled) btn.style.display = 'none';

            btn.addEventListener('click', (e) => {
                e.preventDefault();

                payButtons.forEach(b => {
                    b.style.background = '#f8fafc';
                    b.style.color = '#334155';
                    b.style.borderColor = '#cbd5e1';
                    b.style.boxShadow = 'none';
                });

                btn.style.background = '#0f172a';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#0f172a';
                btn.style.boxShadow = '0 4px 10px rgba(15,23,42,0.15)';

                if (panelTransfer) panelTransfer.style.display = val === 'transfer' ? 'flex' : 'none';
                if (panelLink) panelLink.style.display = val === 'link' ? 'flex' : 'none';
                if (panelCredit) panelCredit.style.display = val === 'credit' ? 'flex' : 'none';
            });
        });

        // Preseleccionar el primer medio de pago que esté habilitado
        const visiblePayBtns = Array.from(payButtons).filter(b => b.style.display !== 'none');
        if (visiblePayBtns.length > 0) {
            visiblePayBtns[0].click();
        }

        // Evento Icono de Interrogación (Tooltip de Información en Hover & Click)
        const tooltipBtn = document.getElementById('btn-pay-info-tooltip');
        const tooltipPopover = document.getElementById('pay-info-tooltip-popover');
        if (tooltipBtn && tooltipPopover) {
            tooltipBtn.addEventListener('mouseenter', () => { tooltipPopover.style.display = 'block'; });
            tooltipBtn.addEventListener('mouseleave', () => { tooltipPopover.style.display = 'none'; });
            tooltipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltipPopover.style.display = tooltipPopover.style.display === 'block' ? 'none' : 'block';
            });
        }

        // Evento Checkbox Factura A (Expande Menú, Recalcula e incluye Razón Social y CUIT)
        const chkFacturaA = document.getElementById('chk-factura-a');
        const expandMenu = document.getElementById('factura-a-expand-menu');
        const priceDisplay = document.getElementById('pay-modal-display-price');
        const taxBadge = document.getElementById('pay-modal-tax-badge');

        chkFacturaA?.addEventListener('change', () => {
            updateTotalDisplay();
            if (chkFacturaA.checked) {
                if (taxBadge) taxBadge.style.display = 'block';
                if (tooltipBtn) tooltipBtn.style.display = 'none';
                if (tooltipPopover) tooltipPopover.style.display = 'none';
                if (expandMenu) expandMenu.style.display = 'flex';
            } else {
                if (taxBadge) taxBadge.style.display = 'none';
                if (tooltipBtn) tooltipBtn.style.display = 'inline-flex';
                if (expandMenu) expandMenu.style.display = 'none';
            }
        });

        // Evento Selección de Forma de Entrega (Retiro vs Envío)
        const radioPickup = document.getElementById('pay-mode-pickup');
        const radioShipping = document.getElementById('pay-mode-shipping');
        const shippingExpandMenu = document.getElementById('pay-shipping-expand-menu');

        const handleDeliveryToggle = () => {
            if (radioShipping && radioShipping.checked) {
                if (shippingExpandMenu) shippingExpandMenu.style.display = 'flex';
            } else {
                if (shippingExpandMenu) shippingExpandMenu.style.display = 'none';
            }
        };

        radioPickup?.addEventListener('change', handleDeliveryToggle);
        radioShipping?.addEventListener('change', handleDeliveryToggle);

        // LÓGICA: lookup de CP + mostrar tarifas de envío según shippingConfig de la oferta / producto
        window._checkoutSelectedShipCost = 0;
        window._checkoutSelectedShipLabel = '';
        let shipConf = (productContext && productContext.product && productContext.product.shippingConfig) || (offer && offer.shippingConfig);
        if (!shipConf || (!shipConf.logisticaEnabled && !shipConf.fleteEnabled && !shipConf.otroEnabled && !shipConf.isFreeShipping)) {
            shipConf = {
                logisticaEnabled: true,
                logisticaCost: 0,
                fleteEnabled: true,
                fleteCost: 0,
                otroEnabled: false,
                isFreeShipping: false
            };
        }

        function renderShipOptions(cpRes) {
            const container = document.getElementById('pay-ship-lookup-result');
            if (!container) return;

            // Helper para renderizar los botones de plataformas externas (Mercado Libre, Tienda Nube, etc.)
            const renderExternalPlatformsHtml = () => {
                let externalLinks = [];

                if (isProductItem) {
                    const grupo = productContext?.grupo || (offer.acabados_groups && offer.acabados_groups[0]) || {};
                    const medida = (productContext?.medida || '').trim();
                    let relevantVariants = (grupo.medidas_variants || []).filter(m => m.hidden !== true && m.link && m.link.trim());
                    if (medida) {
                        const exact = relevantVariants.filter(m => (m.medida || '').trim() === medida);
                        if (exact.length > 0) relevantVariants = exact;
                    }
                    relevantVariants.forEach(v => {
                        if (v.link && v.link.trim()) {
                            externalLinks.push({ link: v.link.trim(), label: v.linkLabel, legend: v.legend });
                        }
                    });
                }

                if (externalLinks.length === 0) {
                    const fallbackLink = (offer && (offer.link || offer.mercadolibre_link || offer.mlLink)) || (productContext?.product && (productContext.product.link || productContext.product.mercadolibre_link));
                    if (fallbackLink && String(fallbackLink).trim()) {
                        externalLinks.push({ link: String(fallbackLink).trim() });
                    }
                }

                if (externalLinks.length === 0) return '';

                let out = `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1.5px dashed #cbd5e1; display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                            <span>🌐 ¿Preferís comprar por otra plataforma con envío?</span>
                        </div>
                `;

                externalLinks.forEach(v => {
                    const url = v.link.trim();
                    const urlLower = url.toLowerCase();
                    let platformName = "Mercado Libre";
                    let platformIcon = "shopping_bag";
                    let platformBg = "#fff059";
                    let platformColor = "#2d3277";
                    let platformBorder = "#e5d836";
                    let desc = "Compralo con Mercado Envíos a todo el país y cuotas";

                    if (urlLower.includes('tiendanube.com') || urlLower.includes('mitiendanube.com')) {
                        platformName = "Tienda Nube";
                        platformIcon = "storefront";
                        platformBg = "#2c3b87";
                        platformColor = "#ffffff";
                        platformBorder = "#1e2968";
                        desc = "Compralo directamente desde nuestra Tienda Nube oficial";
                    } else if (!urlLower.includes('mercadolibre.com') && !urlLower.includes('mercadolibre.com.ar') && !urlLower.includes('ml.com') && !urlLower.includes('mpago.')) {
                        platformName = v.label || "Plataforma Externa";
                        platformIcon = "open_in_new";
                        platformBg = "#f1f5f9";
                        platformColor = "#0f172a";
                        platformBorder = "#cbd5e1";
                        desc = v.legend || "Compralo a través de este enlace externo";
                    }

                    out += `
                        <a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: ${platformBg}; color: ${platformColor}; border: 1.5px solid ${platformBorder}; border-radius: 12px; padding: 10px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                <span class="material-symbols-outlined" style="font-size: 22px; flex-shrink: 0;">${platformIcon}</span>
                                <div style="min-width: 0;">
                                    <div style="font-size: 0.82rem; font-weight: 800; line-height: 1.2;">Comprar por ${platformName}</div>
                                    <div style="font-size: 0.68rem; opacity: 0.85; margin-top: 2px; line-height: 1.2;">${desc}</div>
                                </div>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 20px; flex-shrink: 0;">arrow_forward</span>
                        </a>
                    `;
                });

                out += `</div>`;
                return out;
            };

            if (!cpRes) {
                container.style.display = 'block';
                const extHtml = renderExternalPlatformsHtml();
                container.innerHTML = `
                    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:6px 10px;font-size:0.75rem;color:#854d0e;">
                        ⚠️ Ingresá tu Código Postal arriba para cotizar la logística directa o flete particular.
                    </div>
                    ${extHtml}
                `;
                return;
            }

            // Si envío gratis
            if (shipConf.isFreeShipping) {
                container.style.display = 'block';
                container.innerHTML = '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;font-size:0.78rem;font-weight:800;color:#15803d;">🎉 ¡Envío Gratis incluido!</div>';
                window._checkoutSelectedShipCost = 0;
                window._checkoutSelectedShipLabel = 'Envío Gratis';
                updateShipLine();
                updateTotalDisplay();
                return;
            }

            const options = [];

            // Solo incluir Logística si está activa para el CP y la variante activa no tiene deshabilitada la logística Flex
            let isVariantLogisticaDisabled = false;
            if (isProductItem) {
                const activeGrupo = productContext?.grupo || (offer?.acabados_groups && offer.acabados_groups[0]) || {};
                const activeMedidaStr = (productContext?.medida || '').trim();
                const variantMatch = (activeGrupo.medidas_variants || []).find(m => (m.medida || '').trim() === activeMedidaStr) || (activeGrupo.medidas_variants || [])[0];
                if (variantMatch) {
                    if (variantMatch.logisticaEnabled === false || variantMatch.noFlex === true || variantMatch.disableFlex === true) {
                        isVariantLogisticaDisabled = true;
                    }
                }
            }

            if (!isVariantLogisticaDisabled && shipConf.logisticaEnabled && cpRes.logistica && cpRes.logistica.active !== false) {
                const manualCost = parseFloat(shipConf.logisticaCost) || 0;
                const sysCost = cpRes.logistica.cost || 0;
                const baseCost = manualCost > 0 ? manualCost : sysCost;

                const qty = window._checkoutSelectedQty || productContext?.quantity || packQty || 1;
                const freeMin = parseInt(shipConf.logisticaFreeMinUnits) || 0;
                const maxUnits = parseInt(shipConf.logisticaMaxUnits) || 0;

                let isFreeByQty = (freeMin > 0 && qty >= freeMin);
                let packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                let cost = isFreeByQty ? 0 : (baseCost * packages);

                let zoneName = cpRes.logistica.zoneName || 'Zona';
                let detailText = zoneName;
                if (isFreeByQty) {
                    detailText += ` · 🎉 ¡Envío GRATIS por compra de ${freeMin}+ uds!`;
                } else if (packages > 1) {
                    detailText += ` · ${packages} bultos ($${baseCost.toLocaleString('es-AR')} c/u - Máx. ${maxUnits} ud/paquete)`;
                }

                options.push({
                    key: 'logistica',
                    label: isFreeByQty ? '📦 Logística (¡Envío GRATIS por volumen!)' : '📦 Logística (Courier)',
                    cleanLabel: 'Logística',
                    detail: detailText,
                    cost,
                    packages,
                    isFreeByQty,
                    active: true
                });
            }

            // Solo incluir Flete si está activo para el CP
            if (shipConf.fleteEnabled && cpRes.flete && cpRes.flete.active !== false) {
                const manualCost = parseFloat(shipConf.fleteCost) || 0;
                const sysCost = cpRes.flete.cost || 0;
                const baseCost = manualCost > 0 ? manualCost : sysCost;

                const qty = window._checkoutSelectedQty || productContext?.quantity || packQty || 1;
                const freeMin = parseInt(shipConf.fleteFreeMinUnits) || 0;
                const maxUnits = parseInt(shipConf.fleteMaxUnits) || 0;

                let isFreeByQty = (freeMin > 0 && qty >= freeMin);
                let packages = maxUnits > 0 ? Math.ceil(qty / maxUnits) : 1;
                let cost = isFreeByQty ? 0 : (baseCost * packages);

                let zoneName = cpRes.flete.zoneName || 'Zona';
                let detailText = zoneName;
                if (isFreeByQty) {
                    detailText += ` · 🎉 ¡Flete GRATIS por compra de ${freeMin}+ uds!`;
                } else if (packages > 1) {
                    detailText += ` · ${packages} fletes ($${baseCost.toLocaleString('es-AR')} c/u - Máx. ${maxUnits} ud/flete)`;
                }

                options.push({
                    key: 'flete',
                    label: isFreeByQty ? '🚛 Flete Particular (¡Flete GRATIS por volumen!)' : '🚛 Flete Particular',
                    cleanLabel: 'Flete Particular',
                    detail: detailText,
                    cost,
                    packages,
                    isFreeByQty,
                    active: true
                });
            }

            if (shipConf.otroEnabled) {
                const cost = parseFloat(shipConf.otroCost) || 0;
                const label = shipConf.otroLabel || 'A convenir';
                options.push({ key: 'otro', label: '🚚 ' + label, cleanLabel: label, detail: 'Acordar con vendedor', cost, active: true });
            }

            // Si no hay opciones directas activas
            if (options.length === 0) {
                container.style.display = 'block';
                const extHtml = renderExternalPlatformsHtml();
                if (extHtml) {
                    container.innerHTML = extHtml;
                } else {
                    container.innerHTML = '<div style="background:#fff7ed;border:1px solid #ffedd5;border-radius:8px;padding:8px 12px;font-size:0.75rem;color:#c0510a;font-weight:700;">💬 Te cotizamos el envío particular o por expreso directamente por WhatsApp al enviar tu consulta.</div>';
                }
                window._checkoutSelectedShipCost = 0;
                window._checkoutSelectedShipLabel = 'A convenir';
                updateShipLine();
                updateTotalDisplay();
                return;
            }

            // Cabecera con ciudad detectada
            let html = '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;margin-bottom:6px;">';
            html += '<div style="font-size:0.68rem;font-weight:800;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">📍 Ubicación detectada</div>';
            html += '<div style="font-size:0.85rem;font-weight:800;color:#0f172a;">' + cpRes.localidad + ', ' + cpRes.provincia + ' (CP ' + cpRes.cp + ')</div>';
            html += '</div>';

            // Opciones de envío como radio buttons
            html += '<div style="font-size:0.68rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:5px;">Elegí el método de envío:</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px;" id="ship-options-list">';

            options.forEach((opt, idx) => {
                const costLabel = opt.cost > 0 ? formatCurr(opt.cost) : 'Cotizar por WA';
                html += `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 12px;cursor:pointer;" data-cost="${opt.cost}" data-label="${opt.cleanLabel}">
                    <span style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:700;color:#0f172a;">
                        <input type="radio" name="ship-method-choice" value="${opt.key}" ${idx === 0 ? 'checked' : ''} style="accent-color:#0f172a;cursor:pointer;">
                        <span>${opt.label}<br><span style="font-size:0.68rem;font-weight:600;color:#64748b;">${opt.detail}</span></span>
                    </span>
                    <span style="font-size:0.88rem;font-weight:900;color:${opt.cost > 0 ? '#0284c7' : '#64748b'};white-space:nowrap;">${costLabel}</span>
                </label>`;
            });

            html += '</div>';

            // Si el producto tiene enlaces externos (Mercado Libre, Tienda Nube, etc.), ofrecerlos como alternativas de compra directa
            html += renderExternalPlatformsHtml();

            container.innerHTML = html;
            container.style.display = 'block';

            // Preseleccionar primera opción
            if (options.length > 0 && options[0].active) {
                window._checkoutSelectedShipCost = options[0].cost;
                window._checkoutSelectedShipLabel = options[0].cleanLabel;
                updateShipLine();
                updateTotalDisplay();
            }

            // Evento cambio de radio
            container.querySelectorAll('input[name="ship-method-choice"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const lbl = radio.closest('label');
                    window._checkoutSelectedShipCost = parseFloat(lbl.dataset.cost) || 0;
                    window._checkoutSelectedShipLabel = lbl.dataset.label || '';
                    // Highlight selected
                    container.querySelectorAll('label').forEach(l => { l.style.borderColor = '#e2e8f0'; l.style.background = '#f8fafc'; });
                    lbl.style.borderColor = '#0284c7';
                    lbl.style.background = '#f0f9ff';
                    updateShipLine();
                    updateTotalDisplay();
                });
                // Highlight initial
                if (radio.checked) {
                    const lbl = radio.closest('label');
                    lbl.style.borderColor = '#0284c7';
                    lbl.style.background = '#f0f9ff';
                }
            });
        }

        function updateShipLine() {
            // Desglose de envío gestionado limpiamente en pay-modal-breakdown-box
        }

        function updateTotalDisplay() {
            const isShipping = document.getElementById('pay-mode-shipping')?.checked;
            const isFacturaA = document.getElementById('chk-factura-a')?.checked;
            const shipCost = isShipping ? (window._checkoutSelectedShipCost || 0) : 0;
            const shipLabel = window._checkoutSelectedShipLabel || '';

            const baseWithShip = totalOfferVal + shipCost;
            const ivaVal = baseWithShip * 0.21;
            const iibbVal = baseWithShip * 0.035;
            const totalFactA = baseWithShip * 1.245;

            const finalTotal = isFacturaA ? totalFactA : baseWithShip;

            const priceDisplay = document.getElementById('pay-modal-display-price');
            if (priceDisplay) priceDisplay.textContent = formatCurr(finalTotal);

            // Actualizar desglose en tarjeta 3 (Monto Total a Abonar)
            const breakdownBox = document.getElementById('pay-modal-breakdown-box');
            const shipRow = document.getElementById('breakdown-ship-row');
            const shipLbl = document.getElementById('breakdown-ship-label');
            const shipVal = document.getElementById('breakdown-ship-val');

            if (breakdownBox) {
                if (isShipping && (shipCost > 0 || shipLabel)) {
                    breakdownBox.style.display = 'flex';
                    if (shipRow) {
                        shipRow.style.display = 'flex';
                        if (shipLbl) shipLbl.textContent = '🚚 Envío (' + shipLabel + '):';
                        if (shipVal) shipVal.textContent = shipCost > 0 ? formatCurr(shipCost) : 'Gratis / A cotizar';
                    }
                } else {
                    breakdownBox.style.display = 'none';
                }
            }

            // Actualizar desglose Factura A
            const expandMenu = document.getElementById('factura-a-expand-menu');
            if (isFacturaA && expandMenu) {
                const factBase = document.getElementById('factura-base-val');
                const factShipRow = document.getElementById('factura-ship-row');
                const factShipLbl = document.getElementById('factura-ship-label');
                const factShipVal = document.getElementById('factura-ship-val');
                const factSubRow = document.getElementById('factura-subtotal-row');
                const factSubVal = document.getElementById('factura-subtotal-val');

                if (factBase) factBase.textContent = formatCurr(totalOfferVal);

                if (isShipping && shipCost > 0) {
                    if (factShipRow) factShipRow.style.display = 'flex';
                    if (factShipLbl) factShipLbl.textContent = 'Envío (' + shipLabel + '):';
                    if (factShipVal) factShipVal.textContent = formatCurr(shipCost);

                    if (factSubRow) factSubRow.style.display = 'flex';
                    if (factSubVal) factSubVal.textContent = formatCurr(baseWithShip);
                } else {
                    if (factShipRow) factShipRow.style.display = 'none';
                    if (factSubRow) factSubRow.style.display = 'none';
                }

                const ivaElem = document.getElementById('factura-iva-val');
                const iibbElem = document.getElementById('factura-iibb-val');
                const totElem = document.getElementById('factura-total-val');

                if (ivaElem) ivaElem.textContent = formatCurr(ivaVal);
                if (iibbElem) iibbElem.textContent = formatCurr(iibbVal);
                if (totElem) totElem.textContent = formatCurr(totalFactA);
            }
        }

        // Listener en campo CP con debounce
        const cpInput = document.getElementById('pay-ship-cp');
        const ciudadInput = document.getElementById('pay-ship-ciudad');
        const provInput = document.getElementById('pay-ship-provincia');

        let cpLookupTimer = null;
        cpInput?.addEventListener('input', () => {
            clearTimeout(cpLookupTimer);
            cpLookupTimer = setTimeout(() => {
                const query = cpInput.value.trim();
                if (!query || query.length < 3) {
                    const c = document.getElementById('pay-ship-lookup-result');
                    if (c) c.style.display = 'none';
                    return;
                }
                const res = window.lookupPostalCode ? window.lookupPostalCode(query) : null;
                if (res) {
                    if (ciudadInput && !ciudadInput.value) ciudadInput.value = res.localidad;
                    if (provInput && !provInput.value) provInput.value = res.provincia;
                    
                    // Sincronizar en localStorage de la app para que todas las vistas se actualicen automáticamente
                    try {
                        let userData = {};
                        const saved = localStorage.getItem('userData');
                        if (saved) userData = JSON.parse(saved);
                        userData.zipCode = query;
                        localStorage.setItem('userData', JSON.stringify(userData));
                        window.dispatchEvent(new CustomEvent('latarima:cp-updated', { detail: { zipCode: query } }));
                    } catch(e) {}
                }
                renderShipOptions(res);
            }, 500);
        });

        // Limpiar estado de envío cuando se vuelve a Retiro
        radioPickup?.addEventListener('change', () => {
            window._checkoutSelectedShipCost = 0;
            window._checkoutSelectedShipLabel = '';
            updateShipLine();
            updateTotalDisplay();
        });
        radioShipping?.addEventListener('change', () => {
            const query = cpInput?.value.trim();
            const res = (query && query.length >= 3 && window.lookupPostalCode) ? window.lookupPostalCode(query) : null;
            renderShipOptions(res);
            updateShipLine();
            updateTotalDisplay();
        });

        function restoreUserDataFromStorage() {
            try {
                const raw = localStorage.getItem('latarima_checkout_user_data');
                if (!raw) return;
                const data = JSON.parse(raw);
                if (data.name && document.getElementById('pay-client-name')) document.getElementById('pay-client-name').value = data.name;
                if (data.phone && document.getElementById('pay-client-phone')) document.getElementById('pay-client-phone').value = data.phone;
                if (data.dir && document.getElementById('pay-ship-dir')) document.getElementById('pay-ship-dir').value = data.dir;
                if (data.cp && document.getElementById('pay-ship-cp')) document.getElementById('pay-ship-cp').value = data.cp;
                if (data.ciudad && document.getElementById('pay-ship-ciudad')) document.getElementById('pay-ship-ciudad').value = data.ciudad;
                if (data.provincia && document.getElementById('pay-ship-provincia')) document.getElementById('pay-ship-provincia').value = data.provincia;
                if (data.razonSocial && document.getElementById('factura-razon-social')) document.getElementById('factura-razon-social').value = data.razonSocial;
                if (data.cuit && document.getElementById('factura-cuit')) document.getElementById('factura-cuit').value = data.cuit;
                if (data.dirFiscal && document.getElementById('factura-direccion-fiscal')) document.getElementById('factura-direccion-fiscal').value = data.dirFiscal;

                if (data.deliveryMode === 'shipping' || (data.cp && data.cp.length >= 3)) {
                    const rShip = document.getElementById('pay-mode-shipping');
                    if (rShip) rShip.checked = true;
                    const shipMenu = document.getElementById('pay-shipping-expand-menu');
                    if (shipMenu) shipMenu.style.display = 'flex';
                    if (data.cp && data.cp.length >= 3) {
                        const res = window.lookupPostalCode ? window.lookupPostalCode(data.cp) : null;
                        renderShipOptions(res);
                        updateShipLine();
                        updateTotalDisplay();
                    }
                }
            } catch (e) {}
        }

        const fieldsToAutoSave = [
            'pay-client-name', 'pay-client-phone', 'pay-ship-dir',
            'pay-ship-cp', 'pay-ship-ciudad', 'pay-ship-provincia',
            'factura-razon-social', 'factura-cuit', 'factura-direccion-fiscal'
        ];
        fieldsToAutoSave.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', saveUserDataToStorage);
                el.addEventListener('change', saveUserDataToStorage);
            }
        });
        document.getElementById('pay-mode-pickup')?.addEventListener('change', saveUserDataToStorage);
        document.getElementById('pay-mode-shipping')?.addEventListener('change', saveUserDataToStorage);

        restoreUserDataFromStorage();

        // Eventos de botones "Copiar" con Micro-Interacción Verde Esmeralda (Opción 4)
        const handleCopyEffect = (btnId, lblId, iconId, textToCopy, defaultLabel) => {
            const btn = document.getElementById(btnId);
            const lbl = document.getElementById(lblId);
            const icon = document.getElementById(iconId);

            if (navigator.clipboard && btn && lbl) {
                navigator.clipboard.writeText(textToCopy);
                
                btn.style.background = '#059669';
                btn.style.color = '#ffffff';
                btn.style.borderColor = '#059669';
                btn.style.transform = 'scale(1.06)';
                lbl.textContent = '✓ Copiado';
                if (icon) icon.textContent = 'check_circle';

                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 150);

                setTimeout(() => {
                    btn.style.background = btnId === 'btn-copy-alias' ? '#0f172a' : '#f1f5f9';
                    btn.style.color = btnId === 'btn-copy-alias' ? '#ffffff' : '#0f172a';
                    btn.style.borderColor = btnId === 'btn-copy-alias' ? 'transparent' : '#cbd5e1';
                    lbl.textContent = defaultLabel;
                    if (icon) icon.textContent = 'content_copy';
                }, 2000);
            }
        };

        document.getElementById('btn-copy-alias')?.addEventListener('click', () => handleCopyEffect('btn-copy-alias', 'copy-alias-lbl', 'copy-alias-icon', alias, 'Copiar'));
        document.getElementById('btn-copy-cbu')?.addEventListener('click', () => handleCopyEffect('btn-copy-cbu', 'copy-cbu-lbl', 'copy-cbu-icon', cbu, 'Copiar'));

        // Evento Enviar Comprobante por WhatsApp (Formato Sobrio en Lista sin Iconos)
        document.getElementById('btn-submit-receipt-wa')?.addEventListener('click', () => {
            const isFacturaA = chkFacturaA?.checked || false;
            const isShipping = radioShipping?.checked || false;
            const userNotes = document.getElementById('pay-modal-notes')?.value.trim() || '';
            
            const shipCostVal = window._checkoutSelectedShipCost || 0;
            let finalPriceVal = totalOfferVal + shipCostVal;
            if (isFacturaA) {
                finalPriceVal = (totalOfferVal + shipCostVal) * 1.245;
            }
            const finalPriceFormatted = formatCurr(finalPriceVal);

            let msgLines = [];
            msgLines.push("Hola La Tarima. Adjunto el comprobante de pago de mi pedido.");
            msgLines.push("");
            msgLines.push("Detalle de compra:");
            msgLines.push(`- ${isProductItem ? 'Producto' : 'Combo'}: ${itemDisplayName} ${packQty > 1 ? `(Pack x${packQty})` : ''}`);
            msgLines.push(`- Monto abonado: ${finalPriceFormatted}`);
            if (isFacturaA) {
                msgLines.push("- Comprobante solicitado: Factura A (Responsable Inscripto)");
            }

            if (isFacturaA) {
                const razon = document.getElementById('factura-razon-social')?.value.trim() || 'No especificada';
                const cuitEmp = document.getElementById('factura-cuit')?.value.trim() || 'No especificado';
                const dirFiscal = document.getElementById('factura-direccion-fiscal')?.value.trim() || 'No especificada';
                
                msgLines.push("");
                msgLines.push("Datos de facturacion:");
                msgLines.push(`- Razon Social: ${razon}`);
                msgLines.push(`- CUIT: ${cuitEmp}`);
                msgLines.push(`- Direccion Fiscal: ${dirFiscal}`);
            }

            msgLines.push("");
            msgLines.push("Datos de entrega:");
            if (isShipping) {
                const dir = document.getElementById('pay-ship-dir')?.value.trim() || 'No especificada';
                const cp = document.getElementById('pay-ship-cp')?.value.trim() || 'No especificado';
                const ciudad = document.getElementById('pay-ship-ciudad')?.value.trim() || 'No especificada';
                const prov = document.getElementById('pay-ship-provincia')?.value.trim() || 'No especificada';
                
                msgLines.push("- Metodo: Envio a domicilio / flete");
                msgLines.push(`- Envio: ${window._checkoutSelectedShipLabel || 'A confirmar'} — ${window._checkoutSelectedShipCost > 0 ? formatCurr(window._checkoutSelectedShipCost) : 'A cotizar'}`);
                msgLines.push(`- Direccion: ${dir}`);
                msgLines.push(`- CP: ${cp}`);
                msgLines.push(`- Localidad: ${ciudad}`);
                msgLines.push(`- Provincia: ${prov}`);
            } else {
                msgLines.push("- Metodo: Retiro por taller / local (Hurlingham)");
            }

            const clientName = document.getElementById('pay-client-name')?.value.trim();
            const clientPhone = document.getElementById('pay-client-phone')?.value.trim();
            if (clientName || clientPhone) {
                msgLines.push("");
                msgLines.push("Datos de contacto:");
                if (clientName) msgLines.push(`- Nombre: ${clientName}`);
                if (clientPhone) msgLines.push(`- Telefono: ${clientPhone}`);
            }

            if (userNotes) {
                msgLines.push("");
                msgLines.push("Aclaraciones:");
                msgLines.push(`- ${userNotes}`);
            }

            const waText = msgLines.join("\n");
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`, '_blank');
            closeModal();
        });
    }

    function renderRelatedOffers(currentOfferId) {
        const container = document.getElementById('offer-detail-related-list');
        if (!container) return;

        container.innerHTML = '';
        const otherOffers = (window.sessionOffers || []).filter(o => o.active !== false && o.id !== currentOfferId);

        if (otherOffers.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; color:#94a3b8; font-style:italic; text-align:center; width:100%;">No hay otras ofertas activas por el momento.</p>';
            return;
        }

        // Mostrar exactamente 3 publicaciones y hacer que ocupen el 33% del ancho cada una
        const displayOffers = otherOffers.slice(0, 3);
        displayOffers.forEach(o => {
            const card = createOfferCardElement(o, true);
            card.style.flex = '0 0 calc((100% - 12px) / 3)';
            card.style.width = 'calc((100% - 12px) / 3)';
            card.style.minWidth = 'calc((100% - 12px) / 3)';
            card.style.boxSizing = 'border-box';
            container.appendChild(card);
        });
    }

    window.openOfferDetailView = openOfferDetailView;
    window.showOfferPaymentModal = showOfferPaymentModal;
    window.showProductPaymentModal = function(product, grupo, medida, price, qty = 1, opcion = '', opcionLabel = '') {
        showOfferPaymentModal(product, qty, { grupo, medida, price, opcion, opcionLabel });
    };

    function showOfferDetailModal(offer) {
        openOfferDetailView(offer);
    }

    function closeOfferDetailModal() {
        const modal = document.getElementById('offer-detail-modal');
        if (modal) modal.style.display = 'none';
        selectedOfferForModal = null;
    }

    function addOfferToCart(offer, qty = 1) {
        try {
            const carritoModule = (window.parent && window.parent.CarritoModule) || window.CarritoModule;
            if (carritoModule && typeof carritoModule.toggle === 'function') {
                const comboTitle = `COMBO: ${offer.title}`;
                const comboSub = (offer.product_items || []).map(i => i.title).join(' + ');

                carritoModule.toggle(
                    { id: offer.id, title: comboTitle, image: offer.customCoverImage || (offer.product_items && offer.product_items[0] ? offer.product_items[0].image : 'img/logo_provisional.png') },
                    'Combo Especial',
                    'OFERTAS',
                    comboSub,
                    '',
                    '',
                    offer.offerPrice * qty
                );

                if (window.updateFavoritesBadge) window.updateFavoritesBadge();
            }
        } catch (e) {
            console.error('Error al agregar combo al carrito:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.initOffersFrontend();
    });
})();
