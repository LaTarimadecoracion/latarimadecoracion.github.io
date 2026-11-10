/* =============================================================================
   js/admin-users.js
   Módulo de Administración de Usuarios, Roles (RBAC) y Permisos para La Tarima 2.0
   Separación limpia entre Equipo Administrativo y Clientes de la Tienda
   ============================================================================= */

(function () {
    // Estado por defecto de usuarios de demostración local
    const defaultUsers = [
        {
            id: "usr_superadmin_01",
            nombre: "Yonatan Orellana",
            email: "yonatanorellana1990@gmail.com",
            telefono: "+54 9 11 6700-7723",
            role: "superadmin",
            clientTier: "mayorista",
            status: "activo",
            createdAt: "2026-01-01T00:00:00Z",
            totalOrders: 0,
            totalSpent: 0
        },
        {
            id: "usr_superadmin_02",
            nombre: "Admin Principal",
            email: "admin@latarima.com",
            telefono: "+54 9 11 6700-7723",
            role: "superadmin",
            clientTier: "mayorista",
            status: "activo",
            createdAt: "2026-01-15T10:00:00Z",
            totalOrders: 12,
            totalSpent: 450000
        },
        {
            id: "usr_colab_01",
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
            id: "usr_cli_01",
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
            id: "usr_cli_02",
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
        if (window.AdminAuth && typeof window.AdminAuth.getUsers === 'function') {
            return window.AdminAuth.getUsers();
        }
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
        if (window.AdminAuth && typeof window.AdminAuth.saveUsers === 'function') {
            return window.AdminAuth.saveUsers(users);
        }
        try {
            localStorage.setItem("latarima_admin_users", JSON.stringify(users));
        } catch (e) {
            console.error("Error guardando usuarios locales:", e);
        }
    }

    let activeSubtab = 'team'; // 'team' | 'clients' | 'matrix'

    function renderAdminUsers() {
        const container = document.getElementById("admin-users-view");
        if (!container) return;

        const users = getUsers();
        const teamUsers = users.filter(u => u.role === 'superadmin' || u.role === 'colaborador');
        const clientUsers = users.filter(u => u.role === 'cliente' || (!u.role || (u.role !== 'superadmin' && u.role !== 'colaborador')));

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
            <!-- Encabezado Principal -->
            <div class="admin-card" style="padding: 1.15rem 1.35rem; margin-bottom: 1.25rem; background: var(--admin-surface); border: 1px solid var(--admin-border-color); border-radius: var(--admin-radius-md);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 class="admin-card-title" style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--admin-text-main); display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: var(--admin-accent);">group</span>
                            Gestión de Cuentas, Roles y Permisos (RBAC)
                        </h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: var(--admin-text-muted);">
                            Control segmentado: gestioná las cuentas con acceso al Panel de Control en una lista y los clientes de la tienda en otra.
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" id="btn-admin-add-team" class="btn-primary" style="background: #dc2626; border-color: #b91c1c;">
                            <span class="material-symbols-outlined">shield_person</span> + Miembro de Equipo
                        </button>
                        <button type="button" id="btn-admin-add-client" class="btn-secondary">
                            <span class="material-symbols-outlined">person_add</span> + Registrar Cliente
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sub-pestañas: 1. Equipo (Admins), 2. Clientes Tienda, 3. Matriz de Permisos -->
            <div class="admin-sub-tabs-bar" style="margin-bottom: 1.25rem; display: flex; gap: 8px; border-bottom: 2px solid var(--admin-border-color); padding-bottom: 6px;">
                <button type="button" class="admin-sub-tab ${activeSubtab === 'team' ? 'active' : ''}" id="subtab-btn-team" onclick="window.switchUserSubtab('team')" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #dc2626;">shield_person</span>
                    <span>🛡️ Equipo Administrativo (${teamUsers.length})</span>
                </button>
                <button type="button" class="admin-sub-tab ${activeSubtab === 'clients' ? 'active' : ''}" id="subtab-btn-clients" onclick="window.switchUserSubtab('clients')" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #16a34a;">group</span>
                    <span>👥 Clientes de la Tienda (${clientUsers.length})</span>
                </button>
                <button type="button" class="admin-sub-tab ${activeSubtab === 'matrix' ? 'active' : ''}" id="subtab-btn-matrix" onclick="window.switchUserSubtab('matrix')" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">key</span>
                    <span>🔑 Matriz de Permisos por Rol</span>
                </button>
            </div>

            <!-- ======================================================== -->
            <!-- SUBTAB 1: EQUIPO ADMINISTRATIVO (SuperAdmins & Colaboradores) -->
            <!-- ======================================================== -->
            <div id="users-subtab-team" style="display: ${activeSubtab === 'team' ? 'block' : 'none'};">
                <!-- Métricas de Equipo -->
                <div class="stats-grid" style="margin-bottom: 1.25rem;">
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(220, 38, 38, 0.1); color: #dc2626;">
                            <span class="material-symbols-outlined">shield_person</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">SuperAdmins (Acceso Total)</span>
                            <h3>${teamUsers.filter(u => u.role === 'superadmin').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                            <span class="material-symbols-outlined">precision_manufacturing</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Colaboradores (Taller/Logística)</span>
                            <h3>${teamUsers.filter(u => u.role === 'colaborador').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(22, 163, 74, 0.1); color: #16a34a;">
                            <span class="material-symbols-outlined">check_circle</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Cuentas Activas</span>
                            <h3>${teamUsers.filter(u => u.status === 'activo').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
                            <span class="material-symbols-outlined">cloud_sync</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Sincronización Cloudflare</span>
                            <h3 style="font-size: 1rem; color: #16a34a;">En vivo (KV)</h3>
                        </div>
                    </div>
                </div>

                <!-- Aviso de Seguridad para el Equipo -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.84rem; color: #334155; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #dc2626; font-size: 20px;">lock</span>
                        <span>Solo las cuentas listadas aquí abajo tienen autorización para ingresar al Panel de Control tras iniciar sesión con Google.</span>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 2px 8px; border-radius: 12px;">Protegido con Firebase Auth</span>
                </div>

                <!-- Tabla de Equipo -->
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Miembro del Equipo / Cuenta de Google</th>
                                <th>Teléfono WhatsApp</th>
                                <th style="text-align: center;">Rol de Acceso</th>
                                <th style="text-align: center;">Estado</th>
                                <th style="text-align: center; width: 120px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teamUsers.map(u => {
                                const rInfo = roleLabels[u.role] || roleLabels.colaborador;
                                const isMainSuperAdmin = (u.email || '').toLowerCase() === 'yonatanorellana1990@gmail.com';
                                return `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 800; color: var(--admin-text-main); font-size: 0.92rem; display: flex; align-items: center; gap: 6px;">
                                                <span>${u.nombre}</span>
                                                ${isMainSuperAdmin ? '<span style="font-size: 0.65rem; background: #fee2e2; color: #dc2626; padding: 1px 6px; border-radius: 4px; font-weight: 800;">PROPIETARIO</span>' : ''}
                                            </div>
                                            <div style="font-size: 0.78rem; color: #475569; display: flex; align-items: center; gap: 4px; margin-top: 3px;">
                                                <svg width="13" height="13" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                                <span style="font-family: monospace; font-size: 0.8rem;">${u.email}</span>
                                            </div>
                                        </td>
                                        <td style="font-size: 0.85rem; font-weight: 600;">${u.telefono || '-'}</td>
                                        <td style="text-align: center;">
                                            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; background: ${rInfo.bg}; color: ${rInfo.color}; border: 1.5px solid ${rInfo.color}44;">
                                                <span class="material-symbols-outlined" style="font-size: 15px;">${rInfo.icon}</span>
                                                ${rInfo.label}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge" style="background: ${u.status === 'activo' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${u.status === 'activo' ? '#16a34a' : '#ef4444'}; border: 1px solid ${u.status === 'activo' ? '#16a34a33' : '#ef444433'}; padding: 4px 10px; border-radius: 6px; font-size: 0.76rem; font-weight: 700;">
                                                ${u.status === 'activo' ? 'Activo' : 'Suspendido'}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <button type="button" class="admin-action-btn btn-edit-user" data-id="${u.id}" title="Editar Rol y Permisos">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                            </button>
                                            ${!isMainSuperAdmin ? `
                                                <button type="button" class="admin-action-btn btn-delete-user" data-id="${u.id}" style="color: #ef4444;" title="Quitar del equipo">
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

            <!-- ======================================================== -->
            <!-- SUBTAB 2: CLIENTES DE LA TIENDA (Público / Mayoristas VIP) -->
            <!-- ======================================================== -->
            <div id="users-subtab-clients" style="display: ${activeSubtab === 'clients' ? 'block' : 'none'};">
                <!-- Métricas de Clientes -->
                <div class="stats-grid" style="margin-bottom: 1.25rem;">
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(22, 163, 74, 0.1); color: #16a34a;">
                            <span class="material-symbols-outlined">group</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Total Clientes</span>
                            <h3>${clientUsers.length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(217, 119, 6, 0.1); color: #d97706;">
                            <span class="material-symbols-outlined">stars</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Mayoristas VIP (Nivel 3)</span>
                            <h3>${clientUsers.filter(u => u.clientTier === 'mayorista').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(2, 132, 199, 0.1); color: #0284c7;">
                            <span class="material-symbols-outlined">verified</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Frecuentes (Nivel 2)</span>
                            <h3>${clientUsers.filter(u => u.clientTier === 'frecuente').length}</h3>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background: rgba(100, 116, 139, 0.1); color: #64748b;">
                            <span class="material-symbols-outlined">person</span>
                        </div>
                        <div class="stat-card-info">
                            <span class="stat-label">Regulares (Nivel 1)</span>
                            <h3>${clientUsers.filter(u => !u.clientTier || u.clientTier === 'regular').length}</h3>
                        </div>
                    </div>
                </div>

                <!-- Aviso informativo de Clientes -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; font-size: 0.84rem; color: #166534; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #16a34a; font-size: 20px;">info</span>
                        <span><strong>Registro Público:</strong> Cualquier persona que se registre en la tienda entra aquí por defecto con rol <em>Cliente</em>. NO tienen acceso al panel admin a menos que los promuevas a Colaborador.</span>
                    </div>
                </div>

                <!-- Tabla de Clientes -->
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Cliente / Cuenta de Google</th>
                                <th>Teléfono WhatsApp</th>
                                <th style="text-align: center;">Nivel de Descuento</th>
                                <th style="text-align: center;">Estado</th>
                                <th style="text-align: right;">Compras Acumuladas</th>
                                <th style="text-align: center; width: 140px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clientUsers.length === 0 ? `
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
                                        <span class="material-symbols-outlined" style="font-size: 36px; display: block; margin-bottom: 6px;">person_off</span>
                                        No hay clientes registrados en esta lista todavía.
                                    </td>
                                </tr>
                            ` : clientUsers.map(u => {
                                const tInfo = tierLabels[u.clientTier] || tierLabels.regular;
                                return `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 700; color: var(--admin-text-main); font-size: 0.9rem;">${u.nombre}</div>
                                            <div style="font-size: 0.76rem; color: #64748b; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                                                <svg width="12" height="12" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                                <span>${u.email}</span>
                                            </div>
                                        </td>
                                        <td style="font-size: 0.85rem; font-weight: 600;">${u.telefono || '-'}</td>
                                        <td style="text-align: center;">
                                            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.76rem; font-weight: 700; color: ${tInfo.badge}; background: ${tInfo.badge}15; border: 1px solid ${tInfo.badge}33;">
                                                ${tInfo.label}
                                            </span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge" style="background: ${u.status === 'activo' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${u.status === 'activo' ? '#16a34a' : '#ef4444'}; border: 1px solid ${u.status === 'activo' ? '#16a34a33' : '#ef444433'}; padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 700;">
                                                ${u.status === 'activo' ? 'Activo' : 'Suspendido'}
                                            </span>
                                        </td>
                                        <td style="text-align: right; font-size: 0.85rem; font-weight: 700;">
                                            $${(u.totalSpent || 0).toLocaleString()} <span style="font-size: 0.72rem; color: var(--admin-text-muted); font-weight: 500;">(${u.totalOrders || 0} ped.)</span>
                                        </td>
                                        <td style="text-align: center;">
                                            <button type="button" class="admin-action-btn btn-edit-user" data-id="${u.id}" title="Editar Nivel y Datos">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
                                            </button>
                                            <button type="button" class="admin-action-btn btn-promote-user" data-id="${u.id}" style="color: #2563eb;" title="Promover al Equipo de Taller">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">upgrade</span>
                                            </button>
                                            <button type="button" class="admin-action-btn btn-delete-user" data-id="${u.id}" style="color: #ef4444;" title="Eliminar cliente">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ======================================================== -->
            <!-- SUBTAB 3: MATRIZ DE PERMISOS POR ROL (RBAC) -->
            <!-- ======================================================== -->
            <div id="users-subtab-matrix" style="display: ${activeSubtab === 'matrix' ? 'block' : 'none'};">
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

            <!-- Modal Editor de Usuario / Miembro -->
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
                            <input type="text" id="user-edit-nombre" class="premium-input" placeholder="Ej: Juan Pérez" required>
                        </div>
                        <div class="form-group">
                            <label for="user-edit-email">Cuenta de Google Autorizada (Email)</label>
                            <input type="email" id="user-edit-email" class="premium-input" placeholder="ejemplo@gmail.com" required>
                            <small style="color: #64748b; font-size: 0.72rem; display: block; margin-top: 3px;">Esta cuenta de Google será la validada al iniciar sesión con Google.</small>
                        </div>
                        <div class="form-group">
                            <label for="user-edit-telefono">Teléfono WhatsApp</label>
                            <input type="text" id="user-edit-telefono" class="premium-input" placeholder="+54 9 11 ...">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label for="user-edit-role">Rol en el Panel (RBAC)</label>
                                <select id="user-edit-role" class="premium-select">
                                    <option value="cliente">Cliente (Sin acceso admin)</option>
                                    <option value="colaborador">Colaborador (Taller/Logística)</option>
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
                                <option value="suspendido">Suspendido (Acceso bloqueado)</option>
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

        // Bind events: Nuevo Miembro del Equipo
        document.getElementById("btn-admin-add-team")?.addEventListener("click", () => {
            document.getElementById("admin-user-modal-title").textContent = "Nuevo Miembro del Equipo Administrativo";
            document.getElementById("user-edit-id").value = "";
            document.getElementById("user-edit-nombre").value = "";
            document.getElementById("user-edit-email").value = "";
            document.getElementById("user-edit-telefono").value = "";
            document.getElementById("user-edit-role").value = "colaborador";
            document.getElementById("user-edit-tier").value = "regular";
            document.getElementById("user-edit-status").value = "activo";
            document.getElementById("admin-user-modal").style.display = "flex";
        });

        // Bind events: Registrar Cliente Manual
        document.getElementById("btn-admin-add-client")?.addEventListener("click", () => {
            document.getElementById("admin-user-modal-title").textContent = "Registrar Nuevo Cliente";
            document.getElementById("user-edit-id").value = "";
            document.getElementById("user-edit-nombre").value = "";
            document.getElementById("user-edit-email").value = "";
            document.getElementById("user-edit-telefono").value = "";
            document.getElementById("user-edit-role").value = "cliente";
            document.getElementById("user-edit-tier").value = "regular";
            document.getElementById("user-edit-status").value = "activo";
            document.getElementById("admin-user-modal").style.display = "flex";
        });

        // Bind events: Editar Usuario
        container.querySelectorAll(".btn-edit-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const u = getUsers().find(x => x.id === id);
                if (!u) return;
                document.getElementById("admin-user-modal-title").textContent = (u.role === 'superadmin' || u.role === 'colaborador')
                    ? "Editar Miembro del Equipo"
                    : "Editar Cliente";
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

        // Bind events: Promover Cliente al Equipo
        container.querySelectorAll(".btn-promote-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const u = getUsers().find(x => x.id === id);
                if (!u) return;
                if (confirm(`¿Deseás promover a "${u.nombre}" (${u.email}) a Colaborador del taller con acceso al Panel de Control?`)) {
                    const all = getUsers();
                    const target = all.find(x => x.id === id);
                    if (target) {
                        target.role = 'colaborador';
                        saveUsers(all);
                        activeSubtab = 'team';
                        renderAdminUsers();
                    }
                }
            });
        });

        // Bind events: Eliminar Usuario
        container.querySelectorAll(".btn-delete-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const u = getUsers().find(x => x.id === id);
                if (u && (u.email || '').toLowerCase() === 'yonatanorellana1990@gmail.com') {
                    alert('No podés eliminar la cuenta del SuperAdmin principal.');
                    return;
                }
                if (confirm(`¿Estás seguro de eliminar a "${u ? u.nombre : 'este usuario'}"?`)) {
                    const filtered = getUsers().filter(x => x.id !== id);
                    saveUsers(filtered);
                    renderAdminUsers();
                }
            });
        });

        // Guardar formulario
        document.getElementById("admin-user-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("user-edit-id").value;
            const nombre = document.getElementById("user-edit-nombre").value.trim();
            const email = document.getElementById("user-edit-email").value.trim().toLowerCase();
            const telefono = document.getElementById("user-edit-telefono").value.trim();
            const role = document.getElementById("user-edit-role").value;
            const clientTier = document.getElementById("user-edit-tier").value;
            const status = document.getElementById("user-edit-status").value;

            let users = getUsers();
            if (id) {
                const idx = users.findIndex(x => x.id === id);
                if (idx !== -1) {
                    const existingUser = users[idx];
                    users[idx] = {
                        ...existingUser,
                        nombre,
                        email,
                        telefono,
                        role,
                        clientTier,
                        status
                    };
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
                    provider: 'google',
                    createdAt: new Date().toISOString(),
                    totalOrders: 0,
                    totalSpent: 0
                });
            }
            saveUsers(users);
            document.getElementById("admin-user-modal").style.display = "none";
            // Si el rol es admin/colaborador, mostramos la lista de equipo, si es cliente la de clientes
            activeSubtab = (role === 'superadmin' || role === 'colaborador') ? 'team' : 'clients';
            renderAdminUsers();
        });
    }

    window.switchUserSubtab = function(tabKey) {
        activeSubtab = tabKey;
        const btnTeam = document.getElementById("subtab-btn-team");
        const btnClients = document.getElementById("subtab-btn-clients");
        const btnMatrix = document.getElementById("subtab-btn-matrix");
        const viewTeam = document.getElementById("users-subtab-team");
        const viewClients = document.getElementById("users-subtab-clients");
        const viewMatrix = document.getElementById("users-subtab-matrix");

        if (btnTeam) btnTeam.classList.toggle('active', tabKey === 'team');
        if (btnClients) btnClients.classList.toggle('active', tabKey === 'clients');
        if (btnMatrix) btnMatrix.classList.toggle('active', tabKey === 'matrix');

        if (viewTeam) viewTeam.style.display = (tabKey === 'team') ? 'block' : 'none';
        if (viewClients) viewClients.style.display = (tabKey === 'clients') ? 'block' : 'none';
        if (viewMatrix) viewMatrix.style.display = (tabKey === 'matrix') ? 'block' : 'none';
    };

    window.AdminUsers = {
        renderTable: renderAdminUsers
    };

    window.renderAdminUsers = renderAdminUsers;
})();
