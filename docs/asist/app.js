/**
 * AutoFlow - Node-based Visual Editor for AutoResponder.ai Rules
 */

// Define standard CSV Headers for AutoResponder.ai
const CSV_HEADERS = [
    "received_message", "pattern_matching", "reply_message", "multiple_replies", 
    "multiple_reply_delay", "multiple_reply_delay_max", "recipients", "contacts", 
    "ignored_contacts", "reply_delay", "reply_delay_max", "specific_times", 
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", 
    "pause_type", "pause_value", "disabled", "subrule_of", "go_to_rule", 
    "req_screen_off", "req_charging", "req_silent", "req_do_not_disturb", 
    "req_car_mode", "prev_rule_timeout", "priority_alert", "probability", 
    "package_names", "label", "web_product", "web_category", "show_as_chip"
];

// App State
let rulesData = new Map(); // label -> ruleDataObject
let nodePositions = {};    // label -> {x, y}
let currentScale = 1.0;
let panX = 100;
let panY = 100;

// Web integration data (loaded from products-data.js)
const webCategories = [];
const webProducts = [];

try {
    let productsSource = typeof productsData !== 'undefined' ? productsData : [];
    
    // Check if there is newer data in localStorage
    const localProductsStr = localStorage.getItem('sessionProductsAutonomo');
    if (localProductsStr) {
        try {
            const localProducts = JSON.parse(localProductsStr);
            if (Array.isArray(localProducts) && localProducts.length > 0) {
                productsSource = localProducts;
                console.log("🪵 [AutoFlow] Cargados productos activos de localStorage (sessionProductsAutonomo).");
            }
        } catch(e) {
            console.error("Error parsing sessionProductsAutonomo:", e);
        }
    }
    
    productsSource.forEach(cat => {
        webCategories.push({ id: cat.id, name: cat.name });
        if (cat.products && Array.isArray(cat.products)) {
            cat.products.forEach(p => {
                webProducts.push({ id: p.id, title: p.title, catId: cat.id });
            });
        }
    });
} catch(e) {
    console.error("Error loading product/category lists:", e);
}

// Temporary State for Dragging Wires
let activeWireDrag = null; // { fromLabel, startX, startY }

// DOM Elements
const viewport = document.getElementById("canvas-viewport");
const workspace = document.getElementById("canvas-workspace");
const nodesContainer = document.getElementById("nodes-container");
const svgGroup = document.getElementById("connections-group");
const tempWire = document.getElementById("temp-wire");

// Initialize application on load
window.addEventListener("DOMContentLoaded", () => {
    setupCanvasControls();
    setupToolbarActions();
    setupSimulator();
    loadWorkspaceState();
    
    // Spawn a default rule if empty
    if (rulesData.size === 0) {
        createDefaultWelcomeRules();
    }
    
    // Ensure search_fallback and no_entendido rules exist
    ensureFallbackRulesExist();
});

// Show custom toast notification
function showToast(message, type = "success") {
    const toast = document.getElementById("notification-toast");
    toast.textContent = message;
    toast.className = `notification-toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// Ensures search_fallback and no_entendido rules exist on the workspace as editable node cards
function ensureFallbackRulesExist(skipRender = false) {
    let changed = false;
    
    if (!rulesData.has("search_fallback")) {
        const searchFallbackRule = createRuleObject({
            label: "search_fallback",
            received_message: "search_fallback",
            reply_message: "¡Sí! Encontré estos productos que coinciden en nuestra web:\n\n[producto]\n\n¿Te gustaría ver los detalles de alguno?",
            pattern_matching: "none",
            disabled: "0",
            subrule_of: "",
            go_to_rule: "",
            show_as_chip: "0",
            reply_delay: "0.8"
        });
        rulesData.set(searchFallbackRule.label, searchFallbackRule);
        nodePositions[searchFallbackRule.label] = { x: 150, y: 600 };
        if (!skipRender) renderNode(searchFallbackRule);
        changed = true;
    }
    
    if (!rulesData.has("no_entendido")) {
        const noEntendidoRule = createRuleObject({
            label: "no_entendido",
            received_message: "no_entendido",
            reply_message: "No logré comprender tu consulta. Podés escribir otra palabra clave o enviarnos un WhatsApp directo para chatear con nosotros en el taller.",
            pattern_matching: "none",
            disabled: "0",
            subrule_of: "",
            go_to_rule: "",
            show_as_chip: "0",
            reply_delay: "0.8"
        });
        rulesData.set(noEntendidoRule.label, noEntendidoRule);
        nodePositions[noEntendidoRule.label] = { x: 550, y: 600 };
        if (!skipRender) renderNode(noEntendidoRule);
        changed = true;
    }
    
    if (changed) {
        saveWorkspaceState();
        updateConnections();
    }
}

// Generate Default Rules for demo
function createDefaultWelcomeRules() {
    const parentRule = createRuleObject({
        received_message: "*",
        pattern_matching: "none",
        reply_message: "¡Hola! Bienvenido a Carpintería La Tarima 🪵\n\n¿En qué podemos ayudarte hoy?\n1. Ver catálogo y precios\n2. Diseños a medida\n3. Ubicación y Horarios",
        label: "tarima_bienvenida"
    });
    
    const subRule1 = createRuleObject({
        received_message: "1",
        pattern_matching: "none",
        reply_message: "Podés ver todo nuestro catálogo con stock y precios directamente en la web:\n🔗 https://latarimadecoracion.github.io/",
        subrule_of: "tarima_bienvenida",
        label: "tarima_catalogo"
    });

    const subRule2 = createRuleObject({
        received_message: "2",
        pattern_matching: "none",
        reply_message: "¡Claro! Fabricamos barandas de cama, escaleras y ménsulas a medida.\n\nEscribinos detallando las medidas que necesitás y te pasamos presupuesto.",
        subrule_of: "tarima_bienvenida",
        label: "tarima_medidas"
    });
    
    rulesData.set(parentRule.label, parentRule);
    rulesData.set(subRule1.label, subRule1);
    rulesData.set(subRule2.label, subRule2);
    
    nodePositions["tarima_bienvenida"] = { x: 150, y: 150 };
    nodePositions["tarima_catalogo"] = { x: 550, y: 80 };
    nodePositions["tarima_medidas"] = { x: 550, y: 380 };
    
    renderAllNodes();
}

// Helper to construct a complete rule object with all headers
function createRuleObject(overrides = {}) {
    const defaultObj = {};
    CSV_HEADERS.forEach(h => {
        defaultObj[h] = "";
    });
    
    // Assign typical defaults
    defaultObj.received_message = "*";
    defaultObj.pattern_matching = "none";
    defaultObj.multiple_replies = "single";
    defaultObj.recipients = "b";
    defaultObj.pause_type = "seconds";
    defaultObj.pause_value = "0";
    defaultObj.disabled = "0";
    defaultObj.specific_times = "0";
    
    // Auto-generate label if missing
    if (!overrides.label) {
        overrides.label = "rule_" + Math.random().toString(36).substr(2, 9);
    }
    
    return { ...defaultObj, ...overrides };
}

// ----------------------------------------------------
// CANVAS INTERACTION (ZOOM, PAN, DRAG & DROP NODES)
// ----------------------------------------------------
function setupCanvasControls() {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    
    // Apply initial transforms
    updateWorkspaceTransform();
    
    // Canvas panning handlers
    viewport.addEventListener("mousedown", (e) => {
        // If clicking directly on a node card, form input, button, or socket, do not pan
        if (e.target !== viewport && e.target !== workspace && e.target.id !== "connections-svg") {
            return;
        }
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewport.style.cursor = "grabbing";
    });
    
    window.addEventListener("mousemove", (e) => {
        if (isPanning) {
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateWorkspaceTransform();
        } else if (activeWireDrag) {
            updateDragWire(e.clientX, e.clientY);
        }
    });
    
    window.addEventListener("mouseup", (e) => {
        if (isPanning) {
            isPanning = false;
            viewport.style.cursor = "grab";
        }
        
        if (activeWireDrag) {
            // Cancel wire drawing if we didn't end on a socket-in
            setTimeout(() => {
                cancelWireDrag();
            }, 50);
        }
    });
    
    // Zoom via mouse wheel
    viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomIntensity = 0.08;
        const mouseX = e.clientX - viewport.getBoundingClientRect().left;
        const mouseY = e.clientY - viewport.getBoundingClientRect().top;
        
        // Calculate workspace coordinates under mouse cursor
        const wsMouseX = (mouseX - panX) / currentScale;
        const wsMouseY = (mouseY - panY) / currentScale;
        
        // Apply zoom scale limits
        const delta = e.deltaY < 0 ? 1 : -1;
        const oldScale = currentScale;
        currentScale += delta * zoomIntensity * currentScale;
        currentScale = Math.max(0.15, Math.min(3.0, currentScale));
        
        // Adjust pan to keep cursor at the same workspace spot
        panX = mouseX - wsMouseX * currentScale;
        panY = mouseY - wsMouseY * currentScale;
        
        updateWorkspaceTransform();
    }, { passive: false });
    
    // Double click to create new node
    viewport.addEventListener("dblclick", (e) => {
        if (e.target === viewport || e.target === workspace || e.target.id === "connections-svg") {
            const rect = viewport.getBoundingClientRect();
            const clickX = (e.clientX - rect.left - panX) / currentScale;
            const clickY = (e.clientY - rect.top - panY) / currentScale;
            
            const newRule = createRuleObject();
            rulesData.set(newRule.label, newRule);
            nodePositions[newRule.label] = { x: clickX - 150, y: clickY - 100 };
            
            renderNode(newRule);
            showToast("Nueva regla creada");
            saveWorkspaceState();
        }
    });
    
    // HUD buttons logic
    document.getElementById("hud-zoom-in").addEventListener("click", () => {
        currentScale = Math.min(3.0, currentScale * 1.2);
        updateWorkspaceTransform();
    });
    document.getElementById("hud-zoom-out").addEventListener("click", () => {
        currentScale = Math.max(0.15, currentScale / 1.2);
        updateWorkspaceTransform();
    });
    document.getElementById("hud-zoom-reset").addEventListener("click", () => {
        currentScale = 1.0;
        panX = 100;
        panY = 100;
        updateWorkspaceTransform();
    });
}

function updateWorkspaceTransform() {
    workspace.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
}

// ----------------------------------------------------
// NODE CARD RENDERING & DRAGGING
// ----------------------------------------------------
function renderAllNodes() {
    nodesContainer.innerHTML = "";
    rulesData.forEach(rule => {
        renderNode(rule);
    });
    updateConnections();
}

function renderNode(rule) {
    const pos = nodePositions[rule.label] || { x: 100, y: 100 };
    const otherLabels = Array.from(rulesData.keys()).filter(lbl => lbl !== rule.label);
    
    const card = document.createElement("div");
    card.className = `node-card ${rule.disabled === "1" ? "disabled-rule" : ""}`;
    card.setAttribute("data-label", rule.label);
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;
    
    // Build Sockets
    const socketIn = document.createElement("div");
    socketIn.className = "socket socket-in";
    socketIn.title = "Suelte el hilo aquí para conectar (Mantenga Shift para crear Redirección/Embudo)";
    
    const socketOut = document.createElement("div");
    socketOut.className = "socket socket-out";
    socketOut.title = "Arrastre hacia otra regla (Mantenga Shift para crear Redirección/Embudo)";
    
    // Build Card Content HTML
    card.innerHTML = `
        <div class="node-header">
            <div class="node-title-container">
                <span class="node-drag-handle">⠿</span>
                <input type="text" class="node-label-input" value="${rule.label}" title="ID Único / Etiqueta de la regla" placeholder="ID de la regla">
            </div>
            <div class="node-controls">
                <label class="switch" title="Activar/Desactivar regla">
                    <input type="checkbox" class="node-disable-toggle" ${rule.disabled === "1" ? "" : "checked"}>
                    <span class="slider"></span>
                </label>
                <button class="btn-duplicate-node" title="Duplicar regla">❐</button>
                <button class="btn-delete-node" title="Borrar regla">×</button>
            </div>
        </div>
        
        <div class="form-group">
            <label>Mensaje recibido (Trigger)</label>
            <input type="text" class="form-input rule-trigger" value="${escapeHtml(rule.received_message)}" placeholder="Ej: Hola o *">
            <label class="condition-item" style="display: flex; align-items: center; gap: 6px; font-size: 11px; margin-top: 2px; text-transform: none; font-weight: normal; color: var(--text-main); letter-spacing: 0; cursor: pointer;">
                <input type="checkbox" class="chk-show-chip" ${rule.show_as_chip !== "0" && rule.show_as_chip !== "false" ? "checked" : ""} style="width: auto; margin: 0; cursor: pointer;">
                Mostrar como botón rápido (Sugerencia)
            </label>
        </div>
        
        <div class="form-group">
            <label>Tipo Coincidencia</label>
            <select class="form-select rule-matching">
                <option value="none" ${rule.pattern_matching === "none" || !rule.pattern_matching ? "selected" : ""}>Coincidencia exacta (o Todo *)</option>
                <option value="similarity" ${rule.pattern_matching === "similarity" ? "selected" : ""}>Coincidencia por similitud</option>
                <option value="pattern" ${rule.pattern_matching === "pattern" ? "selected" : ""}>Patrón (Wildcards/Comodines)</option>
                <option value="regex" ${rule.pattern_matching === "regex" ? "selected" : ""}>Expresión Regular (RegEx)</option>
                <option value="productos" ${rule.pattern_matching === "productos" ? "selected" : ""}>Buscador de Productos (Inteligente)</option>
                <option value="categorias" ${rule.pattern_matching === "categorias" ? "selected" : ""}>Buscador de Categorías (Inteligente)</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Mensaje de Respuesta</label>
            <textarea class="form-textarea rule-reply" placeholder="Escribe la respuesta del bot...">${escapeHtml(rule.reply_message)}</textarea>
        </div>
        
        <button class="links-toggle" style="width: 100%; text-align: left; background: none; border: none; border-top: 1px dashed rgba(160, 113, 91, 0.25); margin-top: 10px; padding: 10px 0 0; color: #A0715B; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-family: inherit;">
            <span>🔗 Insertar Enlace / Botón</span>
            <span class="links-toggle-icon" style="font-size: 10px; transition: transform 0.2s;">▶</span>
        </button>
        
        <div class="links-panel" style="display: none; margin-top: 6px; padding: 4px 0;">
            <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
                <div>
                    <label style="font-size: 11px; color: #718096; display: block; margin-bottom: 2px;">Insertar Producto (Shortcode)</label>
                    <select class="form-select val-web-product" style="font-size: 12px; padding: 4px;">
                        <option value="">-- Selecciona para insertar --</option>
                        ${webProducts.map(p => `
                            <option value="${p.id}">${escapeHtml(p.title)}</option>
                        `).join("")}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #718096; display: block; margin-bottom: 2px;">Insertar Categoría (Shortcode)</label>
                    <select class="form-select val-web-category" style="font-size: 12px; padding: 4px;">
                        <option value="">-- Selecciona para insertar --</option>
                        ${webCategories.map(c => `
                            <option value="${c.id}">${escapeHtml(c.name)}</option>
                        `).join("")}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #718096; display: block; margin-bottom: 2px;">Insertar Sección (Shortcode)</label>
                    <select class="form-select val-web-section" style="font-size: 12px; padding: 4px;">
                        <option value="">-- Selecciona para insertar --</option>
                        <option value="inicio">🏠 Inicio</option>
                        <option value="catalogo">📖 Catálogo</option>
                        <option value="calcular">📐 Calculador de Ménsulas</option>
                        <option value="mayorista">💼 Portal Mayorista</option>
                        <option value="musica">🎵 Reproductor de Música</option>
                        <option value="visualizador">👁️ Visualizador 3D</option>
                        <option value="alquileres">🎪 Alquiler de Muebles</option>
                        <option value="nosotros">ℹ️ Nosotros</option>
                        <option value="perfil">🛒 Carrito / Mi Pedido</option>
                        <option value="avisos">🔔 Avisos y Novedades</option>
                        <option value="videos">🎥 Galería de Videos</option>
                        <option value="buscar">🔍 Buscador de Productos</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #718096; display: block; margin-bottom: 2px;">Insertar Red Social (Shortcode)</label>
                    <select class="form-select val-web-social" style="font-size: 12px; padding: 4px;">
                        <option value="">-- Selecciona para insertar --</option>
                        <option value="wpp">💬 WhatsApp</option>
                        <option value="ig">📸 Instagram</option>
                        <option value="fb">👤 Facebook</option>
                        <option value="tiktok">🎵 TikTok</option>
                        <option value="yt">📺 YouTube</option>
                        <option value="ml">🛍️ Mercado Libre</option>
                    </select>
                </div>
                <div style="border-top: 1px dotted rgba(160, 113, 91, 0.15); margin-top: 4px; padding-top: 8px;">
                    <label style="font-size: 11px; color: #718096; display: block; margin-bottom: 2px; font-weight: 600;">Insertar Enlace Externo (Personalizado)</label>
                    <div style="display: flex; gap: 4px; margin-bottom: 4px;">
                        <input type="text" class="form-input val-ext-url" style="font-size: 11px; padding: 4px; flex: 1;" placeholder="https://ejemplo.com">
                        <input type="text" class="form-input val-ext-text" style="font-size: 11px; padding: 4px; width: 90px;" placeholder="Texto botón">
                    </div>
                    <button type="button" class="btn-primary btn-insert-ext-link" style="font-size: 11px; padding: 4px 8px; width: 100%; border-radius: 4px; font-weight: 600; background: var(--color-primary, #A0715B); color: white; border: none; cursor: pointer;">➕ Insertar Enlace Externo</button>
                </div>
            </div>
        </div>
        
        <button class="advanced-toggle">⚙️ Opciones avanzadas</button>
        
        <div class="advanced-panel">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="form-group">
                    <label>Retraso Mín (seg)</label>
                    <input type="number" class="form-input val-delay" value="${rule.reply_delay}" placeholder="0" min="0">
                </div>
                <div class="form-group">
                    <label>Retraso Máx (seg)</label>
                    <input type="number" class="form-input val-delay-max" value="${rule.reply_delay_max}" placeholder="0" min="0">
                </div>
            </div>
            
            <div class="form-group">
                <label>Destinatarios</label>
                <select class="form-select val-recipients">
                    <option value="b" ${rule.recipients === "b" ? "selected" : ""}>Ambos (Grupos e Indiv.)</option>
                    <option value="i" ${rule.recipients === "i" ? "selected" : ""}>Sólo Individuales</option>
                    <option value="g" ${rule.recipients === "g" ? "selected" : ""}>Sólo Grupos</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Redirección (Ir a regla)</label>
                <select class="form-select val-goto-rule">
                    <option value="" ${!rule.go_to_rule ? "selected" : ""}>Ninguna (Desactivada)</option>
                    ${otherLabels.map(lbl => `
                        <option value="${lbl}" ${rule.go_to_rule === lbl ? "selected" : ""}>${lbl}</option>
                    `).join("")}
                </select>
            </div>
            
            <div class="form-group">
                <label>Días de respuesta</label>
                <div class="days-grid">
                    ${["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((day, idx) => {
                        const dayCol = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][idx];
                        const checked = rule[dayCol] === "1" || rule[dayCol] === "true";
                        return `
                            <input type="checkbox" id="chk-${rule.label}-${dayCol}" class="day-checkbox chk-day" data-day="${dayCol}" ${checked ? "checked" : ""}>
                            <label for="chk-${rule.label}-${dayCol}" class="day-label">${day}</label>
                        `;
                    }).join("")}
                </div>
            </div>
            
            <div class="form-group">
                <label>Condiciones Requeridas</label>
                <div class="conditions-list">
                    <label class="condition-item">
                        <input type="checkbox" class="chk-cond" data-col="req_screen_off" ${rule.req_screen_off === "1" ? "checked" : ""}>
                        Pantalla apagada
                    </label>
                    <label class="condition-item">
                        <input type="checkbox" class="chk-cond" data-col="req_charging" ${rule.req_charging === "1" ? "checked" : ""}>
                        Cargando batería
                    </label>
                    <label class="condition-item">
                        <input type="checkbox" class="chk-cond" data-col="req_silent" ${rule.req_silent === "1" ? "checked" : ""}>
                        Modo Silencio activo
                    </label>
                </div>
            </div>
        </div>
    `;
    
    // Add sockets to card
    card.appendChild(socketIn);
    card.appendChild(socketOut);
    
    // Inject into container
    nodesContainer.appendChild(card);
    
    // Bind events for inputs & changes
    bindNodeEvents(card, rule);
}

function duplicateRule(originalRule) {
    // Generate unique label
    let baseLabel = originalRule.label + "_copia";
    let newLabel = baseLabel;
    let counter = 1;
    while (rulesData.has(newLabel)) {
        newLabel = `${baseLabel}_${counter}`;
        counter++;
    }
    
    // Clone properties
    const clonedRule = { ...originalRule };
    clonedRule.label = newLabel;
    
    // Offset visual coordinates
    const origPos = nodePositions[originalRule.label] || { x: 100, y: 100 };
    nodePositions[newLabel] = {
        x: origPos.x + 40,
        y: origPos.y + 40
    };
    
    // Save to state
    rulesData.set(newLabel, clonedRule);
    
    // Render
    renderNode(clonedRule);
    updateConnections();
    saveWorkspaceState();
    
    showToast(`Regla duplicada como '${newLabel}'`, "success");
}

function bindNodeEvents(card, rule) {
    // 1. Dragging Node Card
    const dragHandle = card.querySelector(".node-drag-handle");
    let isDragging = false;
    let nodeStartX = 0;
    let nodeStartY = 0;
    let mouseStartX = 0;
    let mouseStartY = 0;
    
    dragHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        
        // Bring card to front
        nodesContainer.appendChild(card);
        
        const pos = nodePositions[rule.label] || { x: 100, y: 100 };
        nodeStartX = pos.x;
        nodeStartY = pos.y;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        card.classList.add("selected");
    });
    
    window.addEventListener("mousemove", (e) => {
        if (isDragging) {
            const dx = e.clientX - mouseStartX;
            const dy = e.clientY - mouseStartY;
            
            // Adjust delta by zoom scale
            const x = nodeStartX + dx / currentScale;
            const y = nodeStartY + dy / currentScale;
            
            nodePositions[rule.label] = { x, y };
            card.style.left = `${x}px`;
            card.style.top = `${y}px`;
            
            updateConnections();
        }
    });
    
    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            card.classList.remove("selected");
            saveWorkspaceState();
        }
    });
    
    // 2. Double click inside card prevents spawning another node
    card.addEventListener("dblclick", (e) => {
        e.stopPropagation();
    });
    
    // 2b. Prevent event propagation on interactive elements to allow typing and clicking
    card.querySelectorAll("input, select, textarea, button").forEach(el => {
        el.addEventListener("mousedown", (e) => e.stopPropagation());
        el.addEventListener("mouseup", (e) => e.stopPropagation());
        el.addEventListener("click", (e) => e.stopPropagation());
    });
    
    // 3. Label/Custom ID Change
    const labelInput = card.querySelector(".node-label-input");
    labelInput.addEventListener("change", () => {
        let newLabel = labelInput.value.trim().replace(/[^a-zA-Z0-9_]/g, ""); // Keep clean IDs
        if (!newLabel) newLabel = rule.label;
        
        if (newLabel !== rule.label) {
            // Check uniqueness
            if (rulesData.has(newLabel)) {
                showToast("El ID de regla ya existe. Elige uno diferente.", "error");
                labelInput.value = rule.label;
                return;
            }
            
            // Update mapping
            const oldLabel = rule.label;
            rule.label = newLabel;
            
            rulesData.delete(oldLabel);
            rulesData.set(newLabel, rule);
            
            // Update node position entry
            if (nodePositions[oldLabel]) {
                nodePositions[newLabel] = nodePositions[oldLabel];
                delete nodePositions[oldLabel];
            }
            
            // Update DOM element references
            card.setAttribute("data-label", newLabel);
            
            // Update any children subrule references
            rulesData.forEach(r => {
                if (r.subrule_of === oldLabel) {
                    r.subrule_of = newLabel;
                }
                if (r.go_to_rule === oldLabel) {
                    r.go_to_rule = newLabel;
                }
            });
            
            saveWorkspaceState();
            renderAllNodes();
        }
    });
    
    // Duplicar Node
    card.querySelector(".btn-duplicate-node").addEventListener("click", () => {
        duplicateRule(rule);
    });
    
    // 4. Delete Node
    card.querySelector(".btn-delete-node").addEventListener("click", () => {
        // Disconnect children
        rulesData.forEach(r => {
            if (r.subrule_of === rule.label) {
                r.subrule_of = "";
            }
        });
        
        rulesData.delete(rule.label);
        delete nodePositions[rule.label];
        card.remove();
        updateConnections();
        saveWorkspaceState();
        showToast("Regla eliminada", "success");
    });
    
    // 5. Disabled Toggle Switch
    const disableToggle = card.querySelector(".node-disable-toggle");
    disableToggle.addEventListener("change", () => {
        rule.disabled = disableToggle.checked ? "0" : "1";
        card.classList.toggle("disabled-rule", !disableToggle.checked);
        saveWorkspaceState();
    });
    
    // 5b. Links Panel Expand
    const linksToggle = card.querySelector(".links-toggle");
    const linksPanel = card.querySelector(".links-panel");
    const linksIcon = card.querySelector(".links-toggle-icon");
    linksToggle.addEventListener("click", () => {
        const isShown = linksPanel.style.display !== "none";
        if (isShown) {
            linksPanel.style.display = "none";
            linksIcon.textContent = "▶";
        } else {
            linksPanel.style.display = "block";
            linksIcon.textContent = "▼";
        }
    });
    
    // 6. Advanced Settings Expand
    const advToggle = card.querySelector(".advanced-toggle");
    const advPanel = card.querySelector(".advanced-panel");
    advToggle.addEventListener("click", () => {
        const isShown = advPanel.classList.toggle("show");
        advToggle.textContent = isShown ? "⚙️ Ocultar avanzadas" : "⚙️ Opciones avanzadas";
    });
    
    // 7. Input updates mapping to rules data
    card.querySelector(".rule-trigger").addEventListener("input", (e) => {
        rule.received_message = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".rule-matching").addEventListener("change", (e) => {
        rule.pattern_matching = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".rule-reply").addEventListener("input", (e) => {
        rule.reply_message = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".val-web-product").addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const replyTextarea = card.querySelector(".rule-reply");
        const startPos = replyTextarea.selectionStart;
        const endPos = replyTextarea.selectionEnd;
        const text = replyTextarea.value;
        const shortcode = `[producto:${val}]`;
        
        replyTextarea.value = text.substring(0, startPos) + shortcode + text.substring(endPos);
        replyTextarea.focus();
        replyTextarea.selectionStart = startPos + shortcode.length;
        replyTextarea.selectionEnd = startPos + shortcode.length;
        
        rule.reply_message = replyTextarea.value;
        saveWorkspaceState();
        
        e.target.value = "";
    });
    
    card.querySelector(".val-web-category").addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const replyTextarea = card.querySelector(".rule-reply");
        const startPos = replyTextarea.selectionStart;
        const endPos = replyTextarea.selectionEnd;
        const text = replyTextarea.value;
        const shortcode = `[categoria:${val}]`;
        
        replyTextarea.value = text.substring(0, startPos) + shortcode + text.substring(endPos);
        replyTextarea.focus();
        replyTextarea.selectionStart = startPos + shortcode.length;
        replyTextarea.selectionEnd = startPos + shortcode.length;
        
        rule.reply_message = replyTextarea.value;
        saveWorkspaceState();
        
        e.target.value = "";
    });
    
    card.querySelector(".val-web-section").addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const replyTextarea = card.querySelector(".rule-reply");
        const startPos = replyTextarea.selectionStart;
        const endPos = replyTextarea.selectionEnd;
        const text = replyTextarea.value;
        const shortcode = `[seccion:${val}]`;
        
        replyTextarea.value = text.substring(0, startPos) + shortcode + text.substring(endPos);
        replyTextarea.focus();
        replyTextarea.selectionStart = startPos + shortcode.length;
        replyTextarea.selectionEnd = startPos + shortcode.length;
        
        rule.reply_message = replyTextarea.value;
        saveWorkspaceState();
        
        e.target.value = "";
    });
    
    card.querySelector(".val-web-social").addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const replyTextarea = card.querySelector(".rule-reply");
        const startPos = replyTextarea.selectionStart;
        const endPos = replyTextarea.selectionEnd;
        const text = replyTextarea.value;
        const shortcode = `[${val}]`;
        
        replyTextarea.value = text.substring(0, startPos) + shortcode + text.substring(endPos);
        replyTextarea.focus();
        replyTextarea.selectionStart = startPos + shortcode.length;
        replyTextarea.selectionEnd = startPos + shortcode.length;
        
        rule.reply_message = replyTextarea.value;
        saveWorkspaceState();
        
        e.target.value = "";
    });
    
    card.querySelector(".btn-insert-ext-link").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const urlInput = card.querySelector(".val-ext-url");
        const textInput = card.querySelector(".val-ext-text");
        
        const url = urlInput.value.trim();
        if (!url) {
            showToast("Debes ingresar una URL válida", "error");
            return;
        }
        
        const textVal = textInput.value.trim();
        const shortcode = textVal ? `[url=${url}|${textVal}]` : `[url=${url}]`;
        
        const replyTextarea = card.querySelector(".rule-reply");
        const startPos = replyTextarea.selectionStart;
        const endPos = replyTextarea.selectionEnd;
        const text = replyTextarea.value;
        
        replyTextarea.value = text.substring(0, startPos) + shortcode + text.substring(endPos);
        replyTextarea.focus();
        replyTextarea.selectionStart = startPos + shortcode.length;
        replyTextarea.selectionEnd = startPos + shortcode.length;
        
        rule.reply_message = replyTextarea.value;
        saveWorkspaceState();
        
        urlInput.value = "";
        textInput.value = "";
    });
    
    card.querySelector(".chk-show-chip").addEventListener("change", (e) => {
        rule.show_as_chip = e.target.checked ? "1" : "0";
        saveWorkspaceState();
    });
    
    card.querySelector(".val-delay").addEventListener("change", (e) => {
        rule.reply_delay = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".val-delay-max").addEventListener("change", (e) => {
        rule.reply_delay_max = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".val-recipients").addEventListener("change", (e) => {
        rule.recipients = e.target.value;
        saveWorkspaceState();
    });
    
    card.querySelector(".val-goto-rule").addEventListener("change", (e) => {
        rule.go_to_rule = e.target.value;
        saveWorkspaceState();
        updateConnections();
    });
    
    // Day Checkboxes
    card.querySelectorAll(".chk-day").forEach(chk => {
        chk.addEventListener("change", () => {
            const day = chk.getAttribute("data-day");
            rule[day] = chk.checked ? "1" : "";
            saveWorkspaceState();
        });
    });
    
    // Conditions Checkboxes
    card.querySelectorAll(".chk-cond").forEach(chk => {
        chk.addEventListener("change", () => {
            const col = chk.getAttribute("data-col");
            rule[col] = chk.checked ? "1" : "";
            saveWorkspaceState();
        });
    });
    
    // 8. Output socket dragging (creation of lines)
    const socketOut = card.querySelector(".socket-out");
    socketOut.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate starting coords in workspace scale
        const cardPos = nodePositions[rule.label] || { x: 100, y: 100 };
        const startX = cardPos.x + card.offsetWidth / 2;
        const startY = cardPos.y + card.offsetHeight;
        
        activeWireDrag = {
            fromLabel: rule.label,
            startX: startX,
            startY: startY
        };
    });
    
    // 9. Input socket drop handler
    const socketIn = card.querySelector(".socket-in");
    socketIn.addEventListener("mouseup", (e) => {
        if (activeWireDrag && activeWireDrag.fromLabel !== rule.label) {
            e.stopPropagation();
            
            const fromLabel = activeWireDrag.fromLabel;
            const targetLabel = rule.label;
            
            const targetRuleObj = rulesData.get(targetLabel);
            const fromRuleObj = rulesData.get(fromLabel);
            
            const useRedirection = e.shiftKey;
            
            if (useRedirection) {
                if (fromRuleObj) {
                    fromRuleObj.go_to_rule = targetLabel;
                    showToast(`Redirección creada: '${fromLabel}' saltará a '${targetLabel}'`);
                    
                    const fromCardEl = document.querySelector(`.node-card[data-label="${fromLabel}"]`);
                    if (fromCardEl) {
                        const gotoSelect = fromCardEl.querySelector(".val-goto-rule");
                        if (gotoSelect) gotoSelect.value = targetLabel;
                    }
                }
            } else {
                if (targetRuleObj) {
                    const parentVal = targetRuleObj.subrule_of ? targetRuleObj.subrule_of.trim() : "";
                    let parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
                    if (!parents.includes(fromLabel)) {
                        parents.push(fromLabel);
                        targetRuleObj.subrule_of = parents.join(",");
                        showToast(`Regla conectada como submenú de '${fromLabel}'`);
                    } else {
                        showToast("Estas reglas ya están conectadas");
                    }
                }
            }
            
            cancelWireDrag();
            updateConnections();
            saveWorkspaceState();
        }
    });
}

// ----------------------------------------------------
// CONNECTION WIRES DRAWING & MANAGING
// ----------------------------------------------------
function updateConnections() {
    svgGroup.innerHTML = "";
    
    rulesData.forEach(rule => {
        // Draw parent-child submenu connections (solid blue)
        const parentVal = rule.subrule_of ? rule.subrule_of.trim() : "";
        const parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
        
        parents.forEach(parentLabel => {
            if (rulesData.has(parentLabel)) {
                drawCurve(parentLabel, rule.label, false);
            }
        });
        
        // Draw redirection jump connections (dashed orange)
        const targetLabel = rule.go_to_rule;
        if (targetLabel && rulesData.has(targetLabel)) {
            drawCurve(rule.label, targetLabel, true);
        }
    });
}

function drawCurve(parentLabel, childLabel, isRedirection = false) {
    const parentCard = document.querySelector(`.node-card[data-label="${parentLabel}"]`);
    const childCard = document.querySelector(`.node-card[data-label="${childLabel}"]`);
    
    if (!parentCard || !childCard) return;
    
    const pPos = nodePositions[parentLabel] || { x: 0, y: 0 };
    const cPos = nodePositions[childLabel] || { x: 0, y: 0 };
    
    const startX = pPos.x + parentCard.offsetWidth / 2;
    const startY = pPos.y + parentCard.offsetHeight;
    
    const endX = cPos.x + childCard.offsetWidth / 2;
    const endY = cPos.y;
    
    // Draw Bezier path
    const dx = Math.abs(endX - startX) / 2;
    const dy = Math.max(80, Math.abs(endY - startY) / 2);
    
    const pathD = `M ${startX} ${startY} C ${startX} ${startY + dy} ${endX} ${endY - dy} ${endX} ${endY}`;
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("class", isRedirection ? "connection-path redirection-wire" : "connection-path");
    path.setAttribute("title", isRedirection ? "Redirección: Doble clic para eliminar" : "Subregla: Doble clic para eliminar");
    
    // Enable click selection / Double click delete
    path.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        if (isRedirection) {
            const parentRule = rulesData.get(parentLabel);
            if (parentRule) {
                parentRule.go_to_rule = "";
                showToast("Redirección eliminada");
                updateConnections();
                saveWorkspaceState();
                
                // Re-render parent card to update its select dropdown value
                const parentNodeEl = document.querySelector(`.node-card[data-label="${parentLabel}"]`);
                if (parentNodeEl) {
                    const gotoSelect = parentNodeEl.querySelector(".val-goto-rule");
                    if (gotoSelect) gotoSelect.value = "";
                }
            }
        } else {
            const childRule = rulesData.get(childLabel);
            if (childRule) {
                const parentVal = childRule.subrule_of ? childRule.subrule_of.trim() : "";
                let parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
                parents = parents.filter(p => p !== parentLabel);
                childRule.subrule_of = parents.join(",");
                
                showToast("Conexión de subregla eliminada");
                updateConnections();
                saveWorkspaceState();
            }
        }
    });
    
    svgGroup.appendChild(path);
}

// Draw temporary wire when dragging
function updateDragWire(clientX, clientY) {
    if (!activeWireDrag) return;
    
    const rect = viewport.getBoundingClientRect();
    const curX = (clientX - rect.left - panX) / currentScale;
    const curY = (clientY - rect.top - panY) / currentScale;
    
    const startX = activeWireDrag.startX;
    const startY = activeWireDrag.startY;
    
    const dy = Math.max(50, Math.abs(curY - startY) / 2);
    const pathD = `M ${startX} ${startY} C ${startX} ${startY + dy} ${curX} ${curY - dy} ${curX} ${curY}`;
    
    tempWire.setAttribute("d", pathD);
    tempWire.style.display = "block";
}

function cancelWireDrag() {
    activeWireDrag = null;
    tempWire.style.display = "none";
    tempWire.setAttribute("d", "");
}

// ----------------------------------------------------
// CSV / PROJECT FILE IMPORTS & EXPORTS
// ----------------------------------------------------
function setupToolbarActions() {
    // Add rule button
    document.getElementById("btn-add-rule").addEventListener("click", () => {
        const centerCoords = getCanvasCenterCoordinates();
        const newRule = createRuleObject();
        rulesData.set(newRule.label, newRule);
        nodePositions[newRule.label] = centerCoords;
        
        renderNode(newRule);
        showToast("Nueva regla creada");
        saveWorkspaceState();
    });
    
    // Assistant On/Off toggle
    const btnToggleAssistant = document.getElementById("btn-toggle-assistant");
    const assistantStatusLabel = document.getElementById("assistant-status-label");
    
    function updateAssistantToggleUI() {
        const isEnabled = localStorage.getItem("assistant_enabled") !== "false";
        if (assistantStatusLabel) {
            assistantStatusLabel.textContent = isEnabled ? "Activo" : "Apagado";
            assistantStatusLabel.style.color = isEnabled ? "#48BB78" : "#FC8181";
            assistantStatusLabel.style.fontWeight = "700";
        }
        if (btnToggleAssistant) {
            btnToggleAssistant.style.opacity = isEnabled ? "1" : "0.75";
        }
    }
    
    if (btnToggleAssistant) {
        updateAssistantToggleUI();
        btnToggleAssistant.addEventListener("click", () => {
            const isEnabled = localStorage.getItem("assistant_enabled") !== "false";
            localStorage.setItem("assistant_enabled", isEnabled ? "false" : "true");
            updateAssistantToggleUI();
            showToast(
                isEnabled ? "Asistente desactivado en la web 🔕" : "Asistente activado en la web ✅",
                isEnabled ? "error" : "success"
            );
        });
    }
    
    // Clear canvas
    document.getElementById("btn-clear").addEventListener("click", () => {
        if (confirm("¿Estás seguro de que quieres borrar todas las reglas? Se perderá el trabajo actual.")) {
            rulesData.clear();
            nodePositions = {};
            renderAllNodes();
            saveWorkspaceState();
            showToast("Lienzo borrado", "success");
        }
    });
    
    // CSV Export
    document.getElementById("btn-export-csv").addEventListener("click", () => {
        if (rulesData.size === 0) {
            showToast("No hay reglas para exportar", "error");
            return;
        }
        
        // Convert rulesData map values to a list in the order of export
        const rulesList = Array.from(rulesData.values());
        
        // Build map of rule labels to their 1-based index in the CSV rows
        const labelToRowIndex = new Map();
        rulesList.forEach((rule, idx) => {
            labelToRowIndex.set(rule.label, idx + 1);
        });
        
        // Build rows, converting label references to 1-based numerical indices
        const rows = rulesList.map(rule => {
            const ruleCopy = { ...rule };
            
            // Convert parent label to row index
            if (ruleCopy.subrule_of && labelToRowIndex.has(ruleCopy.subrule_of)) {
                ruleCopy.subrule_of = String(labelToRowIndex.get(ruleCopy.subrule_of));
            }
            
            // Convert redirection label to row index
            if (ruleCopy.go_to_rule && labelToRowIndex.has(ruleCopy.go_to_rule)) {
                ruleCopy.go_to_rule = String(labelToRowIndex.get(ruleCopy.go_to_rule));
            }
            
            return CSV_HEADERS.map(h => ruleCopy[h]);
        });
        
        const csvString = generateCSV(CSV_HEADERS, rows);
        downloadFile(csvString, "AutoResponder_Rules_Export.csv", "text/csv");
        showToast("Archivo CSV exportado exitosamente", "success");
    });
    
    // Guide Modal
    const guideBtn = document.getElementById("btn-guide");
    const guideModal = document.getElementById("variables-modal");
    const closeModal = document.getElementById("btn-close-modal");
    
    if (guideBtn && guideModal) {
        guideBtn.addEventListener("click", () => {
            guideModal.classList.add("open");
        });
        
        if (closeModal) {
            closeModal.addEventListener("click", () => {
                guideModal.classList.remove("open");
            });
        }
        
        guideModal.addEventListener("click", (e) => {
            if (e.target === guideModal) {
                guideModal.classList.remove("open");
            }
        });
    }
    
    // CSV Import
    const csvInput = document.getElementById("csv-upload");
    csvInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = parseCSVText(evt.target.result);
                if (parsed.length === 0) throw new Error("Archivo CSV vacío o inválido");
                
                rulesData.clear();
                nodePositions = {};
                
                parsed.forEach(rule => {
                    if (rule.pattern_matching === "exact") {
                        rule.pattern_matching = "none";
                    }
                    if (rule.pattern_matching === "pattern_matching") {
                        rule.pattern_matching = "pattern";
                    }
                    rulesData.set(rule.label, rule);
                });
                
                ensureFallbackRulesExist(true);
                
                // Arrange imported rules nicely using autoLayout
                autoLayout();
                saveWorkspaceState();
                showToast(`Se importaron ${rulesData.size} reglas del CSV`, "success");
            } catch (err) {
                console.error(err);
                showToast("Error al importar el CSV: " + err.message, "error");
            }
            csvInput.value = ""; // Reset input
        };
        reader.readAsText(file, "UTF-8");
    });
    
    // Project Save JSON
    document.getElementById("btn-save-project").addEventListener("click", () => {
        const project = {
            rules: Array.from(rulesData.entries()),
            positions: nodePositions,
            panX: panX,
            panY: panY,
            zoom: currentScale
        };
        const jsonStr = JSON.stringify(project, null, 2);
        downloadFile(jsonStr, "AutoFlow_Project.json", "application/json");
        showToast("Proyecto visual guardado", "success");
    });
    
    // Project Load JSON
    const jsonInput = document.getElementById("project-upload");
    jsonInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const project = JSON.parse(evt.target.result);
                if (!project.rules || !project.positions) {
                    throw new Error("Formato de proyecto inválido");
                }
                
                rulesData = new Map(project.rules);
                rulesData.forEach(rule => {
                    if (rule.pattern_matching === "exact") {
                        rule.pattern_matching = "none";
                    }
                    if (rule.pattern_matching === "pattern_matching") {
                        rule.pattern_matching = "pattern";
                    }
                });
                nodePositions = project.positions;
                panX = project.panX || 100;
                panY = project.panY || 100;
                currentScale = project.zoom || 1.0;
                
                ensureFallbackRulesExist(true);
                
                updateWorkspaceTransform();
                renderAllNodes();
                saveWorkspaceState();
                showToast("Proyecto cargado exitosamente", "success");
            } catch (err) {
                console.error(err);
                showToast("Error al cargar proyecto: " + err.message, "error");
            }
            jsonInput.value = ""; // Reset
        };
        reader.readAsText(file);
    });
}

function getCanvasCenterCoordinates() {
    const rect = viewport.getBoundingClientRect();
    const x = (rect.width / 2 - 150 - panX) / currentScale;
    const y = (rect.height / 2 - 100 - panY) / currentScale;
    return { x, y };
}

// ----------------------------------------------------
// AUTO-LAYOUT TREE ALGORITHM
// ----------------------------------------------------
function autoLayout() {
    if (rulesData.size === 0) return;
    
    // Identify links
    const parentToChildren = {};
    const allLabels = new Set();
    
    rulesData.forEach(rule => {
        if (rule.label) {
            allLabels.add(rule.label);
        }
    });
    
    rulesData.forEach(rule => {
        const parent = rule.subrule_of;
        if (parent && allLabels.has(parent)) {
            if (!parentToChildren[parent]) parentToChildren[parent] = [];
            parentToChildren[parent].push(rule.label);
        }
    });
    
    // Roots are rules that don't have a parent, or their parent label is not in our dataset
    const roots = [];
    rulesData.forEach(rule => {
        const parent = rule.subrule_of;
        if (!parent || !allLabels.has(parent)) {
            roots.push(rule.label);
        }
    });
    
    const positions = {};
    let nextY = 80;
    
    // Recursive layout for each branch
    function layoutBranch(label, x, startY) {
        positions[label] = { x: x, y: startY };
        const children = parentToChildren[label] || [];
        
        if (children.length === 0) {
            return 280; // height offset
        }
        
        let totalChildHeight = 0;
        let childY = startY - ((children.length - 1) * 320) / 2;
        
        children.forEach(child => {
            const h = layoutBranch(child, x + 380, childY);
            childY += h;
            totalChildHeight += h;
        });
        
        return Math.max(totalChildHeight, 320);
    }
    
    roots.forEach(root => {
        const branchHeight = layoutBranch(root, 100, nextY);
        nextY += branchHeight + 50;
    });
    
    // Apply positions
    nodePositions = positions;
    renderAllNodes();
}

// ----------------------------------------------------
// LOCAL STORAGE STATE PERSISTENCE
// ----------------------------------------------------
function saveWorkspaceState() {
    const data = {
        rules: Array.from(rulesData.entries()),
        positions: nodePositions,
        panX: panX,
        panY: panY,
        zoom: currentScale
    };
    localStorage.setItem("autoflow_state", JSON.stringify(data));
}

function loadWorkspaceState() {
    try {
        const saved = localStorage.getItem("autoflow_state");
        if (saved) {
            const data = JSON.parse(saved);
            if (data.rules && data.positions) {
                rulesData = new Map(data.rules);
                // Clean up any literal \n strings to real newlines in cached data
                rulesData.forEach(rule => {
                    if (rule.reply_message) {
                        rule.reply_message = rule.reply_message.replace(/\\n/g, '\n');
                    }
                    if (rule.received_message) {
                        rule.received_message = rule.received_message.replace(/\\n/g, '\n');
                    }
                    if (rule.pattern_matching === "exact") {
                        rule.pattern_matching = "none";
                    }
                    if (rule.pattern_matching === "pattern_matching") {
                        rule.pattern_matching = "pattern";
                    }
                });
                nodePositions = data.positions;
                panX = data.panX ?? 100;
                panY = data.panY ?? 100;
                currentScale = data.zoom ?? 1.0;
                
                updateWorkspaceTransform();
                renderAllNodes();
            }
        }
    } catch (e) {
        console.error("Error loading saved state:", e);
    }
}

// ----------------------------------------------------
// CSV PARSING & GENERATION UTILITIES
// ----------------------------------------------------
function parseCSVText(text) {
    let lines = [];
    let row = [""];
    let inQuotes = false;
    
    // Check if the first line is sep=, (with or without quotes)
    let startIdx = 0;
    let firstLineEnd = text.indexOf("\n");
    if (firstLineEnd === -1) {
        firstLineEnd = text.indexOf("\r");
    }
    if (firstLineEnd !== -1) {
        const firstLine = text.substring(0, firstLineEnd).trim().replace(/^"|"$/g, '');
        if (firstLine === "sep=,") {
            startIdx = firstLineEnd + 1;
        }
    }
    
    for (let i = startIdx; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                row[row.length - 1] += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push("");
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += char;
        }
    }
    if (row.length > 1 || row[0] !== "") {
        lines.push(row);
    }
    
    if (lines.length < 2) return [];
    
    // Match headers
    const fileHeaders = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1);
    
    const parsedRules = [];
    
    rows.forEach((rowCells, rIdx) => {
        // Skip empty rows
        if (rowCells.length === 1 && rowCells[0] === "") return;
        
        const rule = createRuleObject();
        
        // Map available columns by name
        fileHeaders.forEach((header, colIdx) => {
            let cellVal = rowCells[colIdx] ?? "";
            if (header === "reply_message" || header === "received_message") {
                // Convert literal \n back to real newlines for editing in UI
                cellVal = cellVal.replace(/\\n/g, '\n');
            }
            if (CSV_HEADERS.includes(header)) {
                rule[header] = cellVal;
            }
        });
        
        // Enforce a label/Custom ID if not present
        if (!rule.label) {
            rule.label = `rule_row_${rIdx + 1}`;
        }
        
        parsedRules.push(rule);
    });
    
    // Resolve numerical references in subrule_of and go_to_rule to actual string labels
    parsedRules.forEach(rule => {
        let parentVal = rule.subrule_of;
        if (parentVal && /^\d+$/.test(parentVal)) {
            const parentIdx = parseInt(parentVal, 10) - 1;
            if (parsedRules[parentIdx]) {
                rule.subrule_of = parsedRules[parentIdx].label;
            }
        }
        
        let gotoVal = rule.go_to_rule;
        if (gotoVal && /^\d+$/.test(gotoVal)) {
            const gotoIdx = parseInt(gotoVal, 10) - 1;
            if (parsedRules[gotoIdx]) {
                rule.go_to_rule = parsedRules[gotoIdx].label;
            }
        }
    });
    
    return parsedRules;
}

function generateCSV(headers, rows) {
    let csvContent = "sep=,\n";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
    
    rows.forEach(row => {
        const line = row.map((val, colIdx) => {
            if (val === null || val === undefined) return "";
            let strVal = String(val);
            const header = headers[colIdx];
            if (header === "reply_message" || header === "received_message") {
                // Convert real newlines back to literal \n for CSV format
                strVal = strVal.replace(/\r?\n/g, '\\n');
            }
            return `"${strVal.replace(/"/g, '""')}"`;
        }).join(",");
        csvContent += line + "\n";
    });
    
    return csvContent;
}

// Trigger file download helper
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType + ";charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// HTML Escaper helper
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ----------------------------------------------------
// CHATBOT SIMULATOR ENGINE
// ----------------------------------------------------
let activeContextRuleLabel = null;

// Helper: pick the seasonal Tari avatar
function getSeasonalProfilePic() {
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 11 = Dec
    const date = now.getDate();
    const base = "img/";

    if ((month === 11) || (month === 0 && date <= 6)) {
        const opts = ["tari-navidad.webp", "tari-papanoel.webp", "tari-reno.webp"];
        return base + opts[Math.floor(Math.random() * opts.length)];
    }
    if (month === 1 && date >= 10 && date <= 16) return base + "tari-sanvalentin.webp";
    if ((month === 9 && date >= 25) || (month === 10 && date <= 2)) return base + "tari-halloween.webp";
    if (month === 5 || month === 6 || month === 7) return base + "tari-nieve.webp";
    if (month === 0 || (month === 1 && date < 10)) return base + "tari-playa.webp";

    const defaults = [
        "Tari.webp", "Tari2.webp", "tari-fondoblanco.webp", "tari-feliz.webp",
        "tari-blabla.webp", "tari-celular.webp", "tari-genius.webp", "tari-pc.webp"
    ];
    return base + defaults[Math.floor(Math.random() * defaults.length)];
}

function setupSimulator() {
    const btnToggle = document.getElementById("btn-toggle-simulator");
    const panel = document.getElementById("simulator-panel");
    const btnClose = document.getElementById("btn-close-simulator");
    const btnReset = document.getElementById("btn-reset-simulator");
    const btnSend = document.getElementById("btn-send-message");
    const input = document.getElementById("simulator-input");
    const selectPosition = document.getElementById("select-sim-position");
    
    if (!btnToggle || !panel) return;

    // Set avatar
    const avatarContainer = document.getElementById("simulator-header-avatar-container");
    const avatarImg = document.getElementById("simulator-header-avatar");
    if (avatarContainer && avatarImg) {
        avatarImg.src = getSeasonalProfilePic();
        avatarContainer.style.display = "block";
    }
    
    // Load saved position
    let savedPos = localStorage.getItem("autoflow_sim_pos") || "dock-left";
    applySimulatorPosition(savedPos);
    if (selectPosition) {
        selectPosition.value = savedPos;
    }
    
    // Toggle Slide-out Panel
    btnToggle.addEventListener("click", () => {
        panel.classList.add("open");
        btnToggle.classList.add("open");
    });
    
    // Close Panel
    btnClose.addEventListener("click", () => {
        panel.classList.remove("open");
        btnToggle.classList.remove("open");
    });
    
    // Reset Chat Context
    btnReset.addEventListener("click", () => {
        resetSimulator();
    });
    
    // Send Message
    btnSend.addEventListener("click", () => {
        handleSendMessage();
    });
    
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    });
    
    // Position selection changer
    if (selectPosition) {
        selectPosition.addEventListener("change", (e) => {
            const newPos = e.target.value;
            applySimulatorPosition(newPos);
            localStorage.setItem("autoflow_sim_pos", newPos);
        });
    }
    
    // Make floating panel draggable
    setupSimulatorDragging();
}

function applySimulatorPosition(posClass) {
    const btnToggle = document.getElementById("btn-toggle-simulator");
    const panel = document.getElementById("simulator-panel");
    
    if (!btnToggle || !panel) return;
    
    // Remove all positioning classes
    const classesToRemove = ["dock-left", "dock-right", "dock-top", "dock-bottom", "dock-floating"];
    classesToRemove.forEach(cls => {
        panel.classList.remove(cls);
        btnToggle.classList.remove(cls);
    });
    
    // Add new class
    panel.classList.add(posClass);
    btnToggle.classList.add(posClass);
    
    // Reset inline styles if not floating
    if (posClass !== "dock-floating") {
        panel.style.left = "";
        panel.style.top = "";
        panel.style.width = "";
        panel.style.height = "";
    } else {
        // Apply saved or default floating coordinates
        const savedCoords = localStorage.getItem("autoflow_sim_coords");
        if (savedCoords) {
            const coords = JSON.parse(savedCoords);
            panel.style.left = coords.x + "px";
            panel.style.top = coords.y + "px";
        } else {
            panel.style.left = "80px";
            panel.style.top = "120px";
        }
        panel.style.width = "360px";
        panel.style.height = "520px";
    }
}

function setupSimulatorDragging() {
    const header = document.querySelector(".simulator-header");
    const panel = document.getElementById("simulator-panel");
    
    if (!header || !panel) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    
    header.addEventListener("mousedown", (e) => {
        // Only drag if in floating mode and not clicking buttons/inputs
        if (!panel.classList.contains("dock-floating")) return;
        if (e.target.tagName === "BUTTON" || e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = panel.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        panel.style.transition = "none"; // Disable transitions while dragging!
        
        e.preventDefault();
    });
    
    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const newLeft = initialLeft + dx;
        const newTop = initialTop + dy;
        
        panel.style.left = newLeft + "px";
        panel.style.top = newTop + "px";
    });
    
    window.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            // Restore transition
            panel.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), left 0.4s cubic-bezier(0.16, 1, 0.3, 1), top 0.4s cubic-bezier(0.16, 1, 0.3, 1), width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
            
            // Save floating coordinates
            const coords = {
                x: parseInt(panel.style.left),
                y: parseInt(panel.style.top)
            };
            localStorage.setItem("autoflow_sim_coords", JSON.stringify(coords));
        }
    });
}

function handleSendMessage() {
    const input = document.getElementById("simulator-input");
    const text = input.value.trim();
    if (!text) return;
    
    // Add Client Message
    addChatMessage("client", text);
    input.value = "";
    
    // Show typing status
    const indicator = document.getElementById("typing-indicator-wrapper");
    indicator.classList.add("active");
    scrollToBottom();
    
    // Match rule
    const matchedRule = findMatchingRule(text);
    
    function processRedirect(rule, visited = new Set()) {
        if (!rule.go_to_rule) return;
        const nextLabel = rule.go_to_rule;
        if (visited.has(nextLabel)) {
            addSystemMessage(`[Bucle detectado: Redirección detenida en ${nextLabel}]`);
            return;
        }
        
        const targetRule = rulesData.get(nextLabel);
        if (targetRule) {
            visited.add(nextLabel);
            
            let targetDelayMs = 800;
            if (targetRule.reply_delay) {
                const minDelay = parseFloat(targetRule.reply_delay) * 1000;
                const maxDelay = targetRule.reply_delay_max ? parseFloat(targetRule.reply_delay_max) * 1000 : minDelay;
                targetDelayMs = minDelay + Math.random() * (maxDelay - minDelay);
            }
            targetDelayMs = Math.max(200, Math.min(6000, targetDelayMs));
            
            setTimeout(() => {
                indicator.classList.add("active");
                scrollToBottom();
                
                setTimeout(() => {
                    indicator.classList.remove("active");
                    
                    let replyText = targetRule.reply_message;
                    if (targetRule.pattern_matching === "productos" || replyText.toLowerCase().includes("[producto]")) {
                        const matches = findMatchingProductsInEditor(text);
                        const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.id}]`).join(" ");
                        replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                    }
                    
                    if (targetRule.pattern_matching === "categorias" || replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                        const matches = findMatchingCategoriesInEditor(text);
                        const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                        replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
                    }
                    
                    addChatMessage("bot", replyText, targetRule);
                    activeContextRuleLabel = targetRule.label;
                    updateSimulatorHeader(`Contexto: '${targetRule.label}'`);
                    scrollToBottom();
                    
                    processRedirect(targetRule, visited);
                }, targetDelayMs);
            }, 500);
        }
    }
    
    if (matchedRule) {
        // Calculate simulated delay: reply_delay or reply_delay_max or default (800ms)
        let delayMs = 800;
        if (matchedRule.reply_delay) {
            const minDelay = parseFloat(matchedRule.reply_delay) * 1000;
            const maxDelay = matchedRule.reply_delay_max ? parseFloat(matchedRule.reply_delay_max) * 1000 : minDelay;
            delayMs = minDelay + Math.random() * (maxDelay - minDelay);
        }
        
        // Enforce delay bounds
        delayMs = Math.max(200, Math.min(6000, delayMs));
        
        setTimeout(() => {
            // Hide typing status
            indicator.classList.remove("active");
            
            // Prepare reply text with shortcode substitutions
            let replyText = matchedRule.reply_message;
            if (matchedRule.pattern_matching === "productos" || replyText.toLowerCase().includes("[producto]")) {
                const matches = findMatchingProductsInEditor(text);
                const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.id}]`).join(" ");
                replyText = replyText.replace(/\[producto\]/gi, shortcodes);
            }
            
            if (matchedRule.pattern_matching === "categorias" || replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                const matches = findMatchingCategoriesInEditor(text);
                const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
            }
            
            // Add Bot Message
            addChatMessage("bot", replyText, matchedRule);
            
            // Update active context rule
            activeContextRuleLabel = matchedRule.label;
            updateSimulatorHeader(`Contexto: '${matchedRule.label}'`);
            
            // Handle "Go to Rule" redirection recursively
            if (matchedRule.go_to_rule) {
                const visited = new Set([matchedRule.label]);
                processRedirect(matchedRule, visited);
            }
            scrollToBottom();
        }, delayMs);
    } else {
        // Simulating thinking before search fallback
        const products = findMatchingProductsInEditor(text);
        
        setTimeout(() => {
            indicator.classList.remove("active");
            
            if (products.length > 0) {
                const fallbackRule = findSearchFallbackRule();
                let replyText = fallbackRule ? fallbackRule.reply_message : `¡Sí! Encontré estos productos que coinciden en nuestra web:\n\n[producto]\n\n¿Te gustaría ver los detalles de alguno?`;
                
                const shortcodes = products.slice(0, 3).map(p => `[producto:${p.id}]`).join(" ");
                replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                
                addChatMessage("bot", replyText, fallbackRule || null);
                
                if (fallbackRule && fallbackRule.go_to_rule) {
                    const visited = new Set([fallbackRule.label]);
                    processRedirect(fallbackRule, visited);
                }
            } else {
                const fallbackRule = findFallbackRule();
                if (fallbackRule) {
                    let replyText = fallbackRule.reply_message;
                    if (replyText.toLowerCase().includes("[producto]")) {
                        const matches = findMatchingProductsInEditor(text);
                        const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.id}]`).join(" ");
                        replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                    }
                    if (replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                        const matches = findMatchingCategoriesInEditor(text);
                        const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                        replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
                    }
                    
                    addChatMessage("bot", replyText, fallbackRule);
                    activeContextRuleLabel = fallbackRule.label;
                    updateSimulatorHeader(`Contexto: '${fallbackRule.label}'`);
                    
                    if (fallbackRule.go_to_rule) {
                        const visited = new Set([fallbackRule.label]);
                        processRedirect(fallbackRule, visited);
                    }
                } else {
                    addSystemMessage("[Sin coincidencia: el bot no responde]");
                }
            }
            scrollToBottom();
        }, 1000);
    }
}

function normalizeForSearch(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function getCleanSearchTerms(text) {
    const stopWords = new Set([
        "tienen", "tenes", "venden", "vendes", "hola", "buenos", "dias", "tardes", "noches", 
        "por", "favor", "quisiera", "saber", "si", "hay", "tenen", "tendra", "tendran", 
        "busco", "necesito", "quiero", "ver", "mostrar", "el", "la", "los", "las", 
        "un", "una", "unos", "unas", "de", "del", "para", "con", "en", "y", "o", "que", 
        "como", "donde", "a", "al", "gracias", "buenas"
    ]);
    
    const clean = normalizeForSearch(text)
        .replace(/[¿?¡!.,:;()\-]/g, " ")
        .trim();
        
    return clean.split(/\s+/)
        .filter(Boolean)
        .filter(term => !stopWords.has(term) && term.length >= 2);
}

function findMatchingProductsInEditor(text) {
    const queryTerms = getCleanSearchTerms(text);
    if (queryTerms.length === 0) return [];
    
    const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : (typeof productsData !== 'undefined' ? productsData : []);
    
    // Build indexed list matching getIndexedProducts()
    const indexed = [];
    sourceData.forEach(cat => {
        if (cat.visible === false && !cat.id.endsWith('-todos')) return;
        if (!cat.products) return;
        cat.products.forEach(product => {
            if (product.visible === false) return;
            let indexedAnyVariant = false;
            
            // Variant indexing
            if (product.acabados_groups && Array.isArray(product.acabados_groups)) {
                product.acabados_groups.forEach(acabado => {
                    if (acabado.acabado_name) {
                        indexed.push({
                            id: product.id,
                            product: product,
                            cat: cat,
                            nombre: product.title,
                            acabado: acabado.acabado_name,
                            image: acabado.cover_image || product.image,
                            tags: product.tags || [],
                            description: product.description || '',
                            medidas: acabado.medidas_variants ? acabado.medidas_variants.map(mv => mv.medida || '') : []
                        });
                        indexedAnyVariant = true;
                    }
                });
            }
            
            // Base product indexing
            if (!indexedAnyVariant) {
                indexed.push({
                    id: product.id,
                    product: product,
                    cat: cat,
                    nombre: product.title,
                    acabado: '',
                    image: product.image,
                    tags: product.tags || [],
                    description: product.description || '',
                    medidas: product.medidas_variants ? product.medidas_variants.map(mv => mv.medida || '') : []
                });
            }
        });
    });
    
    // Apply matching terms logic from runSearch()
    const results = [];
    indexed.forEach(item => {
        const matchesQuery = queryTerms.every(term => {
            const termNorm = term.replace(/\s+/g, '');
            
            // 1. Direct contains check
            const directMatch = normalizeForSearch(item.nombre).includes(term) ||
                (item.cat && item.cat.name && normalizeForSearch(item.cat.name).includes(term)) ||
                (item.acabado && normalizeForSearch(item.acabado).includes(term)) ||
                (item.description && normalizeForSearch(item.description).includes(term)) ||
                (item.tags && item.tags.some(tag => normalizeForSearch(tag).includes(term))) ||
                (item.medidas && item.medidas.some(medida => {
                    const normMedida = normalizeForSearch(medida).replace(/\s+/g, '');
                    return normMedida.includes(termNorm);
                }));
            
            if (directMatch) return true;
            
            // 2. Spelling similarity (Levenshtein) on product/category words
            const itemWords = normalizeForSearch(item.nombre).split(/\s+/).concat(
                item.cat && item.cat.name ? normalizeForSearch(item.cat.name).split(/\s+/) : []
            );
            for (let word of itemWords) {
                if (word.length >= 3 && getSimilarityRatio(term, word) >= 0.7) {
                    return true;
                }
            }
            
            return false;
        });
        
        if (matchesQuery) {
            // Deduplicate items by base product ID
            if (!results.some(r => r.id === item.id)) {
                results.push({ id: item.id, title: item.nombre });
            }
        }
    });
    
    return results.slice(0, 3);
}

function findMatchingCategoriesInEditor(text) {
    const queryTerms = getCleanSearchTerms(text);
    if (queryTerms.length === 0) return [];
    
    const results = [];
    webCategories.forEach(c => {
        const catNameNorm = normalizeForSearch(c.name);
        const catIdNorm = normalizeForSearch(c.id);
        
        const matchesQuery = queryTerms.every(term => {
            return catNameNorm.includes(term) || catIdNorm.includes(term);
        });
        
        if (matchesQuery) {
            results.push(c);
        }
    });
    
    return results.slice(0, 3);
}

function findFallbackRule() {
    const byLabel = rulesData.get("no_entendido");
    if (byLabel && byLabel.disabled !== "1") return byLabel;
    
    const rulesList = Array.from(rulesData.values());
    return rulesList.find(r => {
        const trig = r.received_message.toLowerCase().trim();
        return (trig === "no_entendido" || trig === "no entiendo" || trig === "fallback") && r.disabled !== "1";
    });
}

function findSearchFallbackRule() {
    const byLabel = rulesData.get("search_fallback");
    if (byLabel && byLabel.disabled !== "1") return byLabel;
    return null;
}

function findMatchingRule(text) {
    const normalizedText = text.toLowerCase().trim();
    const rulesList = Array.from(rulesData.values());
    const allLabels = new Set(rulesData.keys());
    
    // 1. Split into Subrules of active context vs Root rules
    const subrules = [];
    const roots = [];
    
    rulesList.forEach(rule => {
        if (rule.disabled === "1") return; // Skip disabled
        
        const parentVal = rule.subrule_of ? rule.subrule_of.trim() : "";
        const parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
        
        if (parents.includes(activeContextRuleLabel)) {
            subrules.push(rule);
        }
        
        const hasAnyValidParent = parents.some(p => allLabels.has(p));
        if (!hasAnyValidParent) {
            roots.push(rule);
        }
    });
    
    // Helper to run matching hierarchy
    function checkMatchInPool(pool) {
        // High priority: Exact, Similarity, and Dynamic Search matches
        for (let rule of pool) {
            const matchType = rule.pattern_matching;
            
            if (matchType === "productos") {
                const matches = findMatchingProductsInEditor(text);
                if (matches.length > 0) return rule;
            }
            if (matchType === "categorias") {
                const matches = findMatchingCategoriesInEditor(text);
                if (matches.length > 0) return rule;
            }
            
            const trigger = rule.received_message.toLowerCase().trim();
            
            if ((matchType === "none" || !matchType) && trigger !== "*" && trigger !== "") {
                if (normalizedText === trigger) return rule;
            }
            if (matchType === "similarity" && matchesSimilarity(normalizedText, trigger)) {
                return rule;
            }
        }
        
        // Mid priority: Wildcard pattern matching / Regex
        for (let rule of pool) {
            const matchType = rule.pattern_matching;
            if (matchType === "pattern" && matchWildcard(normalizedText, rule.received_message)) {
                return rule;
            }
            if (matchType === "regex") {
                try {
                    const reg = new RegExp(rule.received_message, "i");
                    if (reg.test(text)) return rule;
                } catch(e) {}
            }
        }
        
        // Low priority: Catch-all asterisk rules (*) or empty trigger types
        for (let rule of pool) {
            const trigger = rule.received_message.trim();
            if (trigger === "*" || trigger === "") {
                const isRoot = !rule.subrule_of || !allLabels.has(rule.subrule_of);
                if (isRoot) {
                    const cleanText = text.toLowerCase().replace(/[¿?¡!.,:;()\-]/g, "").trim();
                    const greetings = new Set(["hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "inicio", "comenzar", "start", "menu", "volver al inicio", "hola!", "hola.", "holaa"]);
                    if (greetings.has(cleanText) || cleanText === "") {
                        return rule;
                    }
                } else {
                    return rule;
                }
            }
        }
        
        return null;
    }
    
    // First check subrules in active context
    let matched = checkMatchInPool(subrules);
    if (matched) return matched;
    
    // Fallback to roots
    return checkMatchInPool(roots);
}

function isRuleMatch(text, rule) {
    const normalizedText = text.toLowerCase().trim();
    const trigger = rule.received_message.toLowerCase().trim();
    const matchType = rule.pattern_matching;
    
    if (trigger === "*" || trigger === "") {
        return true;
    }
    
    if (matchType === "none" || !matchType) {
        return normalizedText === trigger;
    }
    
    if (matchType === "similarity") {
        return matchesSimilarity(normalizedText, trigger);
    }
    
    if (matchType === "pattern") {
        return matchWildcard(normalizedText, rule.received_message);
    }
    
    if (matchType === "regex") {
        try {
            const reg = new RegExp(rule.received_message, "i");
            return reg.test(text);
        } catch(e) {
            return false;
        }
    }
    
    return false;
}

// Wildcard utility converting asterisks to RegEx
function matchWildcard(text, wildcardPattern) {
    const pattern = wildcardPattern.toLowerCase().trim();
    const str = text.toLowerCase().trim();
    
    // Convert * to .* and escape other special regex chars
    let regexStr = "^" + pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*') + "$";
    const regex = new RegExp(regexStr);
    return regex.test(str);
}

// Levenshtein distance string similarity ratio
function getSimilarityRatio(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j - 1][i] + 1, // deletion
                track[j][i - 1] + 1, // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return (maxLength - distance) / maxLength;
}

function matchesSimilarity(query, trigger) {
    const q = query.toLowerCase().trim();
    const t = trigger.toLowerCase().trim();
    
    if (getSimilarityRatio(q, t) >= 0.65) return true;
    if (q.includes(t)) return true;
    
    const queryWords = q.split(/\s+/).filter(Boolean);
    const triggerWords = t.split(/\s+/).filter(Boolean);
    
    if (triggerWords.length === 1) {
        const trigWord = triggerWords[0];
        for (let word of queryWords) {
            if (getSimilarityRatio(word, trigWord) >= 0.75) return true;
            if (word.startsWith(trigWord) && word.length - trigWord.length <= 2) return true;
            if (trigWord.startsWith(word) && trigWord.length - word.length <= 2) return true;
        }
    } else if (triggerWords.length > 1) {
        const matchedTerms = triggerWords.every(tWord => {
            return queryWords.some(qWord => {
                return getSimilarityRatio(qWord, tWord) >= 0.75 || qWord.includes(tWord) || tWord.includes(qWord);
            });
        });
        if (matchedTerms) return true;
    }
    
    return false;
}

// Chat UI Manipulation Helpers
function addChatMessage(sender, text, rule = null) {
    const chatArea = document.getElementById("simulator-chat-area");
    const bubble = document.createElement("div");
    bubble.className = `chat-message ${sender}`;
    
    if (sender === "bot") {
        const regex = /\[(producto|categoria|seccion):([^\]]+)\]|\[url=([^\]|]+)(?:\|([^\]]+))?\]|\[(wpp|whatsapp|ig|instagram|fb|facebook|tiktok|yt|youtube|ml|mercadolibre)\]/gi;
        let lastIndex = 0;
        let match;
        const sourceData = typeof productsData !== 'undefined' ? productsData : [];
        
        const webProds = [];
        const webCats = [];
        sourceData.forEach(cat => {
            webCats.push({ id: cat.id, name: cat.name });
            if (cat.products && Array.isArray(cat.products)) {
                cat.products.forEach(p => {
                    webProds.push({ id: p.id, title: p.title });
                });
            }
        });
        
        while ((match = regex.exec(text)) !== null) {
            const textPart = text.substring(lastIndex, match.index);
            if (textPart) {
                const span = document.createElement("span");
                span.innerHTML = escapeHtml(textPart).replace(/\n/g, "<br>");
                bubble.appendChild(span);
            }
            
            const type = match[1];
            const id = match[2] ? match[2].trim() : "";
            
            const btn = document.createElement("button");
            btn.className = "chat-link-btn";
            btn.style.cssText = "display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin: 4px; padding: 6px 12px; background: #A0715B; color: white; border: none; border-radius: 12px; font-size: 12px; cursor: pointer; font-weight: 500; font-family: inherit; vertical-align: middle;";
            
            let isBtnValid = false;
            
            if (type) {
                isBtnValid = true;
                if (type === "producto") {
                    const prod = webProds.find(p => p.id === id);
                    const prodTitle = prod ? prod.title : id;
                    btn.innerHTML = `🛍️ <strong>${escapeHtml(prodTitle.split(":")[0])}</strong>`;
                    btn.addEventListener("click", () => {
                        showToast(`Simulador: Abre detalle de "${prodTitle}" (ID: ${id})`, "success");
                    });
                } else if (type === "categoria") {
                    const cat = webCats.find(c => c.id === id);
                    const catName = cat ? cat.name : id;
                    btn.style.background = "#64748B";
                    btn.innerHTML = `📂 <strong>${escapeHtml(catName)}</strong>`;
                    btn.addEventListener("click", () => {
                        showToast(`Simulador: Abre feed de categoría "${catName}" (ID: ${id})`, "success");
                    });
                } else if (type === "seccion") {
                    const sections = {
                        inicio: { title: "Inicio", url: "index.html", icon: "🏠", view: "view-home" },
                        catalogo: { title: "Catálogo", url: "catalogo.html", icon: "📖", view: "view-catalogo" },
                        calcular: { title: "Calculador de Ménsulas", url: "calcular.html", icon: "📐", view: "view-calculator" },
                        mayorista: { title: "Portal Mayorista", url: "mayorista.html", icon: "💼", view: "view-mayorista" },
                        musica: { title: "Reproductor de Música", url: "musica.html", icon: "🎵", view: "view-musica" },
                        visualizador: { title: "Visualizador 3D", url: "visualizador.html", icon: "👁️", view: "view-visualizador" },
                        alquileres: { title: "Alquiler de Muebles", url: "index.html?view=alquileres", icon: "🎪", view: "view-rentals" },
                        nosotros: { title: "Nosotros", url: "index.html?view=nosotros", icon: "ℹ️", view: "view-about" },
                        perfil: { title: "Carrito / Mi Pedido", url: "index.html?view=perfil", icon: "🛒", view: "view-profile" },
                        avisos: { title: "Avisos y Novedades", url: "index.html?view=avisos", icon: "🔔", view: "view-notifications" },
                        videos: { title: "Galería de Videos", url: "index.html?view=videos", icon: "🎥", view: "view-videos" },
                        buscar: { title: "Buscador de Productos", url: "index.html?view=buscar", icon: "🔍", view: "view-search" }
                    };
                    const sect = sections[id] || { title: id, url: "#", icon: "🔗" };
                    btn.style.background = "var(--color-primary, #A0715B)";
                    btn.innerHTML = `${sect.icon} <strong>${escapeHtml(sect.title)}</strong>`;
                    btn.addEventListener("click", () => {
                        showToast(`Simulador: Redirige a página/vista "${sect.url || sect.view}"`, "success");
                    });
                }
            } else if (match[3]) {
                const btnUrl = match[3].trim();
                const btnText = match[4] ? match[4].trim() : "Abrir Enlace";
                isBtnValid = true;
                btn.innerHTML = `🔗 <strong>${escapeHtml(btnText)}</strong>`;
                btn.addEventListener("click", () => {
                    showToast(`Simulador: Abre enlace externo "${btnUrl}"`, "success");
                });
            } else if (match[5]) {
                const socialKey = match[5].toLowerCase().trim();
                const socialMap = {
                    wpp: { name: "WhatsApp", icon: "💬" },
                    whatsapp: { name: "WhatsApp", icon: "💬" },
                    ig: { name: "Instagram", icon: "📸" },
                    instagram: { name: "Instagram", icon: "📸" },
                    fb: { name: "Facebook", icon: "👤" },
                    facebook: { name: "Facebook", icon: "👤" },
                    tiktok: { name: "TikTok", icon: "🎵" },
                    yt: { name: "YouTube", icon: "📺" },
                    youtube: { name: "YouTube", icon: "📺" },
                    ml: { name: "Mercado Libre", icon: "🛍️" },
                    mercadolibre: { name: "Mercado Libre", icon: "🛍️" }
                };
                const soc = socialMap[socialKey];
                if (soc) {
                    isBtnValid = true;
                    btn.style.background = "var(--color-primary, #A0715B)";
                    btn.innerHTML = `${soc.icon} <strong>${escapeHtml(soc.name)}</strong>`;
                    btn.addEventListener("click", () => {
                        showToast(`Simulador: Abre red social "${soc.name}"`, "success");
                    });
                }
            }
            
            if (isBtnValid) {
                bubble.appendChild(btn);
            }
            lastIndex = regex.lastIndex;
        }
        
        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            const span = document.createElement("span");
            span.innerHTML = escapeHtml(remainingText).replace(/\n/g, "<br>");
            bubble.appendChild(span);
        }
    } else {
        bubble.textContent = text;
    }
    
    chatArea.appendChild(bubble);
}

function addSystemMessage(text) {
    const chatArea = document.getElementById("simulator-chat-area");
    const msg = document.createElement("div");
    msg.className = "chat-system-message";
    msg.innerHTML = `<span>${text}</span>`;
    chatArea.appendChild(msg);
}

function updateSimulatorHeader(statusText) {
    const headerP = document.querySelector(".simulator-title p");
    if (headerP) {
        headerP.textContent = `Estado: ${statusText}`;
    }
}

function resetSimulator() {
    const chatArea = document.getElementById("simulator-chat-area");
    chatArea.innerHTML = "";
    activeContextRuleLabel = null;
    updateSimulatorHeader("Contexto Limpio");
    addSystemMessage("Conversación reiniciada. Contexto limpio.");
    scrollToBottom();
}

function scrollToBottom() {
    const chatArea = document.getElementById("simulator-chat-area");
    chatArea.scrollTop = chatArea.scrollHeight;
}

