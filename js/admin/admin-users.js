/* =============================================================================
   js/admin-users.js
   Módulo de Administración de Usuarios, Roles (RBAC) y Permisos para La Tarima 2.0
   ============================================================================= */

(function () {
    // Estado por defecto de usuarios de demostración local
    const defaultUsers = [
        {
            id: "usr_001",
            nombre: "Admin Principal",
            email: "admin@latarima.com",
            telefono: "+54 9 11 1234-5678",
            role: "superadmin",
            clientTier: "mayorista",
            status: "activo",
            createdAt: "2026-01-15T10:00:00Z",
            totalOrders: 12,
            totalSpent: 450000
        },
        {
            id: "usr_002",
            nombre: "Operador de Taller",
            email: "logistica@latarima.com",
            telefono: "+54 9 11 8765-4321",
            role: "colaborador",
            clientTier: "regular",
            status: "activo",
            createdAt: "2026-03-01T14:30:00Z",
            totalOrders: 0,
            totalSpent: 0
        },
        {
            id: "usr_003",
            nombre: "Distribuidora Maderas del Norte",
            email: "ventas@maderasnorte.com",
            telefono: "+54 9 11 5555-9999",
            role: "cliente",
            clientTier: "mayorista",
            status: "activo",
            createdAt: "2026-05-10T11:20:00Z",
            totalOrders: 8,
            totalSpent: 1250000
        },
        {
            id: "usr_004",
            nombre: "Carolina Gómez",
            email: "caro.gomez@gmail.com",
            telefono: "+54 9 11 4444-3333",
            role: "cliente",
            clientTier: "frecuente",
            status: "activo",
            createdAt: "2026-07-22T18:45:00Z",
            totalOrders: 3,
            totalSpent: 185000
        }
    ];

    function getUsers() {
        try {
            const stored = localStorage.getItem("latarima_admin_users");
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Error cargando usuarios locales:", e);
        }
        localStorage.setItem("latarima_admin_users", JSON.stringify(defaultUsers));
        return defaultUsers;
    }

    function saveUsers(users) {
        try {
            localStorage.setItem("latarima_admin_users", JSON.stringify(users));
        } catch (e) {
            console.error("Error guardando usuarios locales:", e);
        }
    }

    function renderAdminUsers() {
        const container = document.getElementById("admin-users-view");
        if (!container) return;

        const users = getUsers();

        const roleLabels = {
            superadmin: { label: "SuperAdmin", color: "#dc2626", bg: "#fef2f2", icon: "shield_person" },
            colaborador: { label: "Colaborador", color: "#2563eb", bg: "#eff6ff", icon: "precision_manufacturing" },
            cliente: { label: "Cliente", color: "#16a34a", bg: "#f0fdf4", icon: "person" }
        };

        const tierLabels = {
            regular: { label: "Nivel 1 (Regular)", badge: "#64748b" },
            frecuente: { label: "Nivel 2 (Frecuente)", badge: "#0284c7" },
            mayorista: { label: "Nivel 3 (Mayorista VIP)", badge: "#d97706" }
        };

        container.innerHTML = `
            <div class="admin-card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem; background: var(--admin-surface); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 class="admin-card-title" style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--admin-text-main); display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent);">group</span>
                            Gestión de Usuarios, Roles (RBAC) y Permisos Granulares
                        </h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--admin-text-muted);">
                            Administrá los 5 niveles de usuario, asigná roles operativos (SuperAdmin / Colaborador) y configurá la matriz de permisos para cada módulo.
                        </p>
                    </div>
                    <button type="button" id="btn-admin-add-user" class="btn-primary">
                        <span class="material-symbols-outlined">person_add</span> Nuevo Usuario
                    </button>
                </div>
            </div>

            <!-- Sub-pestañas: Lista de Usuarios vs Matriz de Permisos por Rol -->
            <div class="admin-sub-tabs-bar" style="margin-bottom: 1.25rem;">
                <button type="button" class="admin-sub-tab active" id="subtab-btn-users-list" onclick="window.switchUserSubtab('list')">
                    <span class="material-symbols-outlined" style="font-size: 18px;">list</span>
                    <span>Lista de Usuarios</span>
                </button>
                <button type="button" class="admin-sub-tab" id="subtab-btn-roles-permissions" onclick="window.switchUserSubtab('matrix')">
                    <span class="material-symbols-outlined" style="font-size: 18px;">key</span>
                    <span>Matriz de Permisos por Rol</span>
                </button>
            </div>

            <!-- PESTAÑA 1: LISTA DE USUARIOS -->
            <div id="users-subtab-list">
                <!-- Resumen de Métricas de Usuarios -->
                <div class="stats-grid" style="margin-bottom: 1.25rem;">
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(220, 38, 38, 0.1); color: #dc2626;">
                            <span class="material-symbols-outlined">shield_person</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Administradores</span>
                            <h3>${users.filter(u => u.role === 'superadmin').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                            <span class="material-symbols-outlined">badge</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Colaboradores</span>
                            <h3>${users.filter(u => u.role === 'colaborador').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(217, 119, 6, 0.1); color: #d97706;">
                            <span class="material-symbols-outlined">stars</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Clientes Mayoristas</span>
                            <h3>${users.filter(u => u.clientTier === 'mayorista').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(22, 163, 74, 0.1); color: #16a34a;">
                            <span class="material-symbols-outlined">group</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Total Usuarios</span>
                            <h3>${users.length}</h3>
                        </div>
                    </div>
                </div>

                <!-- Tabla de Usuarios registrados -->
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Usuario / Email</th>
                                <th>Teléfono WhatsApp</th>
                                <th style="text-align: center;">Rol del Sistema</th>
                                <th style="text-align: center;">Nivel de Cliente</th>
                                <th style="text-align: center;">Estado</th>
                                <th style="text-align: right;">Compras acumuladas</th>
                                <th style="text-align: center; width: 100px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => {
                                const rInfo = roleLabels[u.role] || roleLabels.cliente;
                                const tInfo = tierLabels[u.clientTier] || tierLabels.regular;
                                return `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 700; color: var(--admin-text-main); font-size: 0.9rem;">${u.nombre}</div>
                                            <div style="font-size: 0.76rem; color: var(--admin-text-muted);">${u.email}</div>
                                        </td>
                                        <td style="font-size: 0.85rem; font-weight: 600;">${u.telefono || '-'}</td>
                                        <td style="text-align: center;">
                                            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: ${rInfo.bg}; color: ${rInfo.color}; border: 1px solid ${rInfo.color}33;">
                                                <span class="material-symbols-outlined" style="font-size: 14px;">${rInfo.icon}</span>
                                                ${rInfo.label}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: ${tInfo.badge}; background: ${tInfo.badge}15; border: 1px solid ${tInfo.badge}33;">
                                                ${tInfo.label}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge" style="background: ${u.status === 'activo' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${u.status === 'activo' ? '#16a34a' : '#ef4444'}; border: 1px solid ${u.status === 'activo' ? '#16a34a33' : '#ef444433'}; padding: 3px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 700;">
                                                ${u.status === 'activo' ? 'Activo' : 'Suspendido'}
                                            </span>
                                        </td>
                                        <td style="text-align: right; font-size: 0.85rem; font-weight: 700;">
                                            $${(u.totalSpent || 0).toLocaleString()} <span style="font-size: 0.72rem; color: var(--admin-text-muted); font-weight: 500;">(${u.totalOrders || 0} ped.)</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <button type="button" class="admin-action-btn btn-edit-user" data-id="${u.id}" title="Editar Rol y Permisos">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                            </button>
                                            ${u.role !== 'superadmin' ? `
                                                <button type="button" class="admin-action-btn btn-delete-user" data-id="${u.id}" style="color: #ef4444;" title="Eliminar usuario">
                                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- PESTAÑA 2: MATRIZ DE PERMISOS POR ROL -->
            <div id="users-subtab-matrix" style="display: none;">
                <div class="admin-card" style="background: var(--admin-surface); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
                    <header class="admin-page-header" style="margin-bottom: 1rem;">
                        <h3 class="admin-header-title">
                            <span class="material-symbols-outlined">rule</span>
                            Matriz Granular de Permisos por Rol
                        </h3>
                    </header>
                    <p style="font-size: 0.82rem; color: var(--admin-text-muted); margin-bottom: 1rem;">
                        Configurá a qué secciones del Panel Admin tiene acceso cada rol. Los <strong>SuperAdmin</strong> poseen acceso 100% incondicional.
                    </p>

                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Módulo / Sección Admin</th>
                                    <th style="text-align: center; width: 140px;">SuperAdmin</th>
                                    <th style="text-align: center; width: 140px;">Colaborador</th>
                                    <th style="text-align: center; width: 140px;">Cliente (Tienda)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>📊 Dashboard & Métricas</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" checked style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>📦 Catálogo (Productos & Categorías)</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" checked style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>📝 Gestión de Pedidos & Logística</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" checked style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>🏭 Control de Stock & Escáner PC</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" checked style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>🏷️ Ofertas, Combos & Descuentos</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>💳 Métodos de Pago & Finanzas</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>🚚 Tarifas de Envío & Zonas</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>👥 Usuarios & Permisos</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                                <tr>
                                    <td><strong>⚙️ Ajustes del Negocio & Publicación</strong></td>
                                    <td style="text-align: center;"><input type="checkbox" checked disabled style="accent-color: #dc2626;"></td>
                                    <td style="text-align: center;"><input type="checkbox" style="accent-color: #2563eb;"></td>
                                    <td style="text-align: center;"><input type="checkbox" disabled style="accent-color: #94a3b8;"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                        <button type="button" onclick="alert('¡Matriz de permisos por rol guardada!')" class="btn-primary">
                            <span class="material-symbols-outlined">save</span> Guardar Matriz de Permisos
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Editor de Usuario -->
            <div id="admin-user-modal" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(4px); z-index: 99999; align-items: center; justify-content: center; padding: 1rem;">
                <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 1rem 1.25rem; background: var(--admin-bg-header); color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
                        <h3 id="admin-user-modal-title" style="margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent);">person</span>
                            Editar Usuario
                        </h3>
                        <button type="button" onclick="document.getElementById('admin-user-modal').style.display='none'" style="background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer;">&times;</button>
                    </div>
                    <form id="admin-user-form" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
                        <input type="hidden" id="user-edit-id">
                        <div class="form-group">
                            <label for="user-edit-nombre">Nombre Completo</label>
                            <input type="text" id="user-edit-nombre" class="premium-input" required>
                        </div>
                        <div class="form-group">
                            <label for="user-edit-email">Correo Electrónico (Email)</label>
                            <input type="email" id="user-edit-email" class="premium-input" required>
                        </div>
                        <div class="form-group">
                            <label for="user-edit-telefono">Teléfono WhatsApp</label>
                            <input type="text" id="user-edit-telefono" class="premium-input">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label for="user-edit-role">Rol en el Panel (RBAC)</label>
                                <select id="user-edit-role" class="premium-select">
                                    <option value="cliente">Cliente</option>
                                    <option value="colaborador">Colaborador (Taller/Envío)</option>
                                    <option value="superadmin">SuperAdmin (Acceso total)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="user-edit-tier">Nivel de Cliente</label>
                                <select id="user-edit-tier" class="premium-select">
                                    <option value="regular">Nivel 1 (Regular)</option>
                                    <option value="frecuente">Nivel 2 (Frecuente)</option>
                                    <option value="mayorista">Nivel 3 (Mayorista VIP)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="user-edit-status">Estado de la cuenta</label>
                            <select id="user-edit-status" class="premium-select">
                                <option value="activo">Activo</option>
                                <option value="suspendido">Suspendido</option>
                            </select>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 0.5rem;">
                            <button type="button" onclick="document.getElementById('admin-user-modal').style.display='none'" class="btn-outline">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById("btn-admin-add-user")?.addEventListener("click", () => {
            document.getElementById("admin-user-modal-title").textContent = "Nuevo Usuario";
            document.getElementById("user-edit-id").value = "";
            document.getElementById("user-edit-nombre").value = "";
            document.getElementById("user-edit-email").value = "";
            document.getElementById("user-edit-telefono").value = "";
            document.getElementById("user-edit-role").value = "cliente";
            document.getElementById("user-edit-tier").value = "regular";
            document.getElementById("user-edit-status").value = "activo";
            document.getElementById("admin-user-modal").style.display = "flex";
        });

        container.querySelectorAll(".btn-edit-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const u = getUsers().find(x => x.id === id);
                if (!u) return;
                document.getElementById("admin-user-modal-title").textContent = "Editar Usuario";
                document.getElementById("user-edit-id").value = u.id;
                document.getElementById("user-edit-nombre").value = u.nombre;
                document.getElementById("user-edit-email").value = u.email;
                document.getElementById("user-edit-telefono").value = u.telefono || "";
                document.getElementById("user-edit-role").value = u.role || "cliente";
                document.getElementById("user-edit-tier").value = u.clientTier || "regular";
                document.getElementById("user-edit-status").value = u.status || "activo";
                document.getElementById("admin-user-modal").style.display = "flex";
            });
        });

        container.querySelectorAll(".btn-delete-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                if (confirm("¿Estás seguro de eliminar este usuario?")) {
                    const filtered = getUsers().filter(x => x.id !== id);
                    saveUsers(filtered);
                    renderAdminUsers();
                }
            });
        });

        document.getElementById("admin-user-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("user-edit-id").value;
            const nombre = document.getElementById("user-edit-nombre").value.trim();
            const email = document.getElementById("user-edit-email").value.trim();
            const telefono = document.getElementById("user-edit-telefono").value.trim();
            const role = document.getElementById("user-edit-role").value;
            const clientTier = document.getElementById("user-edit-tier").value;
            const status = document.getElementById("user-edit-status").value;

            let users = getUsers();
            if (id) {
                const idx = users.findIndex(x => x.id === id);
                if (idx !== -1) {
                    users[idx] = { ...users[idx], nombre, email, telefono, role, clientTier, status };
                }
            } else {
                users.push({
                    id: "usr_" + Date.now(),
                    nombre,
                    email,
                    telefono,
                    role,
                    clientTier,
                    status,
                    createdAt: new Date().toISOString(),
                    totalOrders: 0,
                    totalSpent: 0
                });
            }
            saveUsers(users);
            document.getElementById("admin-user-modal").style.display = "none";
            renderAdminUsers();
        });
    }

    window.switchUserSubtab = function(tabKey) {
        const btnList = document.getElementById("subtab-btn-users-list");
        const btnMatrix = document.getElementById("subtab-btn-roles-permissions");
        const viewList = document.getElementById("users-subtab-list");
        const viewMatrix = document.getElementById("users-subtab-matrix");

        if (tabKey === 'matrix') {
            if (btnList) btnList.classList.remove('active');
            if (btnMatrix) btnMatrix.classList.add('active');
            if (viewList) viewList.style.display = 'none';
            if (viewMatrix) viewMatrix.style.display = 'block';
        } else {
            if (btnList) btnList.classList.add('active');
            if (btnMatrix) btnMatrix.classList.remove('active');
            if (viewList) viewList.style.display = 'block';
            if (viewMatrix) viewMatrix.style.display = 'none';
        }
    };

    window.renderAdminUsers = renderAdminUsers;
})();
