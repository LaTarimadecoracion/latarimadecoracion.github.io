// js/ui/user-profile-modal.js
// --- USER PROFILE MODAL (LAZY-LOADED) ---

(function() {
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
        // Punto 91: Lock scroll modal
        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            card.style.transform = 'scale(1)';
        });

        const closeModal = () => {
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
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
})();
