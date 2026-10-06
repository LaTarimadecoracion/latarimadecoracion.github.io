/* js/assistant.js */
/* Interactive Web Assistant for La Tarima 🪵 */

(function() {
    // Define standard CSV Headers matching AutoFlow editor
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

    // Assistant State
    let assistantRules = new Map();
    let activeContextRuleLabel = null;
    let hasOpenedChat = false;

    // DOM Elements
    let fabEl = null;
    let chatWindowEl = null;
    let messagesContainerEl = null;
    let typingIndicatorEl = null;
    let chipsContainerEl = null;
    let inputEl = null;
    let sendBtnEl = null;

    // Initialize Widget
    document.addEventListener("DOMContentLoaded", async () => {
        // 1. Check if disabled globally via config.json on the server
        try {
            const configRes = await fetch("asist/config.json?v=2");
            if (configRes.ok) {
                const configData = await configRes.json();
                if (configData.enabled === false) {
                    console.log("🪵 [Asistente] Desactivado globalmente por configuración.");
                    return;
                }
            }
        } catch(e) {
            console.error("🪵 [Asistente] Error cargando config.json:", e);
        }

        // 2. Check if disabled locally in development
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && localStorage.getItem("assistant_enabled") === "false") return;
        
        // 3. Load Rules
        assistantRules = await loadRules();
        
        // 4. Create UI Elements
        createChatElements();
        
        // 5. Setup Listeners
        setupWidgetEvents();
    });

    // Load Rules: LocalStorage (Preview Mode) -> CSV File -> Fallbacks
    async function loadRules() {
        // 1. Try local storage (allows real-time updates from visual editor on the same domain in development)
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal) {
                const saved = localStorage.getItem("autoflow_state");
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.rules && data.rules.length > 0) {
                        console.log("🪵 [Asistente] Cargadas reglas desde localStorage (Modo Preview).");
                        const rulesMap = new Map(data.rules);
                        cleanRulesData(rulesMap);
                        return rulesMap;
                    }
                }
            }
        } catch(e) {
            console.error("[Asistente] Error cargando reglas desde localStorage:", e);
        }

        // 2. Try fetching the Bot-Demo1.csv
        try {
            const res = await fetch("asist/Bot-Demo1.csv?v=2");
            if (res.ok) {
                const csvText = await res.text();
                const parsedRules = parseCSVText(csvText);
                if (parsedRules.length > 0) {
                    console.log(`Log [Asistente] Cargadas ${parsedRules.length} reglas desde Bot-Demo1.csv`);
                    const rulesMap = new Map();
                    parsedRules.forEach(rule => {
                        rulesMap.set(rule.label, rule);
                    });
                    return rulesMap;
                }
            }
        } catch(e) {
            console.error("[Asistente] Error cargando Bot-Demo1.csv:", e);
        }

        // 3. Fallback estático
        console.log("🪵 [Asistente] Cargando reglas estáticas de respaldo.");
        const rulesMap = new Map();
        const welcome = createRuleObject({
            received_message: "*",
            pattern_matching: "none",
            reply_message: "¡Hola! Bienvenido a Carpintería La Tarima 🪵\n\n¿En qué te puedo ayudar hoy?\n1. Ver catálogo y precios\n2. Muebles a medida\n3. Dónde estamos",
            label: "tarima_bienvenida"
        });
        const sub1 = createRuleObject({
            received_message: "1",
            reply_message: "Podés ver todo nuestro catálogo completo con stock y precios directamente en la web.\n\nTambién podés usar este chat para buscar algún producto en específico (ej: barandas, escaleras, estantes).",
            subrule_of: "tarima_bienvenida",
            label: "tarima_catalogo"
        });
        const sub2 = createRuleObject({
            received_message: "2",
            reply_message: "Diseñamos y fabricamos barandas de cama, escaleras de pintor y ménsulas a medida.\n\n¿De qué medidas necesitás? Escribinos y te pasamos presupuesto.",
            subrule_of: "tarima_bienvenida",
            label: "tarima_medidas"
        });

        rulesMap.set(welcome.label, welcome);
        rulesMap.set(sub1.label, sub1);
        rulesMap.set(sub2.label, sub2);
        return rulesMap;
    }

    function cleanRulesData(rulesMap) {
        rulesMap.forEach(rule => {
            if (rule.reply_message) rule.reply_message = rule.reply_message.replace(/\\n/g, '\n');
            if (rule.received_message) rule.received_message = rule.received_message.replace(/\\n/g, '\n');
            if (rule.pattern_matching === "exact") rule.pattern_matching = "none";
            if (rule.pattern_matching === "pattern_matching") rule.pattern_matching = "pattern";
        });
    }

    // Helper to construct a complete rule object
    function createRuleObject(overrides = {}) {
        const defaultObj = {};
        CSV_HEADERS.forEach(h => {
            defaultObj[h] = "";
        });
        defaultObj.received_message = "*";
        defaultObj.pattern_matching = "none";
        defaultObj.disabled = "0";
        if (!overrides.label) {
            overrides.label = "rule_" + Math.random().toString(36).substr(2, 9);
        }
        return { ...defaultObj, ...overrides };
    }

    // Parse CSV Text
    function parseCSVText(text) {
        let lines = [];
        let row = [""];
        let inQuotes = false;
        
        let startIdx = 0;
        let firstLineEnd = text.indexOf("\n");
        if (firstLineEnd === -1) firstLineEnd = text.indexOf("\r");
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
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push("");
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
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
        
        const fileHeaders = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1);
        const parsedRules = [];
        
        rows.forEach((rowCells, rIdx) => {
            if (rowCells.length === 1 && rowCells[0] === "") return;
            const rule = createRuleObject();
            
            fileHeaders.forEach((header, colIdx) => {
                let cellVal = rowCells[colIdx] ?? "";
                if (header === "reply_message" || header === "received_message") {
                    cellVal = cellVal.replace(/\\n/g, '\n');
                }
                if (CSV_HEADERS.includes(header)) {
                    rule[header] = cellVal;
                }
            });
            
            if (!rule.label) {
                rule.label = `rule_row_${rIdx + 1}`;
            }
            parsedRules.push(rule);
        });

        // Resolve references to actual labels
        parsedRules.forEach(rule => {
            let parentVal = rule.subrule_of;
            if (parentVal && /^\d+$/.test(parentVal)) {
                const parentIdx = parseInt(parentVal, 10) - 1;
                if (parsedRules[parentIdx]) rule.subrule_of = parsedRules[parentIdx].label;
            }
            let gotoVal = rule.go_to_rule;
            if (gotoVal && /^\d+$/.test(gotoVal)) {
                const gotoIdx = parseInt(gotoVal, 10) - 1;
                if (parsedRules[gotoIdx]) rule.go_to_rule = parsedRules[gotoIdx].label;
            }
        });
        
        return parsedRules;
    }

    // Helper to get seasonal avatar image
    function getSeasonalProfilePic() {
        const now = new Date();
        const month = now.getMonth(); // 0 = Jan, 11 = Dec
        const date = now.getDate();
        
        // 1. Navidad (December 1 to January 6)
        if ((month === 11) || (month === 0 && date <= 6)) {
            const seasonal = ["tari-navidad.webp", "tari-papanoel.webp", "tari-reno.webp"];
            const chosen = seasonal[Math.floor(Math.random() * seasonal.length)];
            return `asist/img/${chosen}`;
        }
        
        // 2. San Valentín (February 10 to February 16)
        if (month === 1 && date >= 10 && date <= 16) {
            return "asist/img/tari-sanvalentin.webp";
        }
        
        // 3. Halloween (October 25 to November 2)
        if ((month === 9 && date >= 25) || (month === 10 && date <= 2)) {
            return "asist/img/tari-halloween.webp";
        }
        
        // 4. Invierno (June, July, August)
        if (month === 5 || month === 6 || month === 7) {
            return "asist/img/tari-nieve.webp";
        }
        
        // 5. Verano (January, February)
        if (month === 0 || month === 1) {
            return "asist/img/tari-playa.webp";
        }
        
        // Default / Random Tari poses
        const defaults = [
            "Tari.webp", "Tari2.webp", "tari-fondoblanco.webp", "tari-feliz.webp", 
            "tari-blabla.webp", "tari-celular.webp", "tari-genius.webp", "tari-pc.webp"
        ];
        const chosen = defaults[Math.floor(Math.random() * defaults.length)];
        return `asist/img/${chosen}`;
    }

    // Create Chat Widget DOM structure
    function createChatElements() {
        const avatarUrl = getSeasonalProfilePic();

        // FAB Button
        fabEl = document.createElement("button");
        fabEl.className = "assistant-fab";
        fabEl.innerHTML = `<img src="${avatarUrl}" alt="Tari" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
        fabEl.title = "Chat de Soporte y Consultas";
        
        const badge = document.createElement("span");
        badge.className = "assistant-fab-badge";
        fabEl.appendChild(badge);

        // Chat Box Window
        chatWindowEl = document.createElement("div");
        chatWindowEl.className = "assistant-chat-window";
        chatWindowEl.innerHTML = `
            <header class="assistant-header">
                <div class="assistant-profile">
                    <div class="assistant-avatar">
                        <img src="${avatarUrl}" alt="Tari" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">
                    </div>
                    <div class="assistant-info">
                        <h3>Asistente La Tarima</h3>
                        <div class="assistant-status">En línea</div>
                    </div>
                </div>
                <button class="assistant-close-btn" title="Cerrar">&times;</button>
            </header>
            <div class="assistant-messages">
                <!-- Messages will load here -->
            </div>
            <div class="typing-indicator-container">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="assistant-suggestion-chips">
                <!-- Suggestion chips will load here -->
            </div>
            <div class="assistant-input-area">
                <input type="text" class="assistant-input" placeholder="Escribí una consulta..." autocomplete="off">
            </div>
        `;

        document.body.appendChild(fabEl);
        document.body.appendChild(chatWindowEl);

        // Cache elements
        messagesContainerEl = chatWindowEl.querySelector(".assistant-messages");
        typingIndicatorEl = chatWindowEl.querySelector(".typing-indicator-container");
        chipsContainerEl = chatWindowEl.querySelector(".assistant-suggestion-chips");
        inputEl = chatWindowEl.querySelector(".assistant-input");
        sendBtnEl = chatWindowEl.querySelector(".assistant-send-btn");
    }

    // Bind event listeners
    function setupWidgetEvents() {
        // FAB click toggle
        fabEl.addEventListener("click", () => {
            const isOpen = chatWindowEl.classList.toggle("open");
            if (isOpen) {
                // Clear unread badge
                const badge = fabEl.querySelector(".assistant-fab-badge");
                if (badge) badge.style.display = "none";
                
                inputEl.focus();
                
                // Show welcome message if empty
                if (messagesContainerEl.children.length === 0) {
                    sendWelcome();
                }
            }
        });

        // Close button click
        chatWindowEl.querySelector(".assistant-close-btn").addEventListener("click", () => {
            chatWindowEl.classList.remove("open");
        });

        // Send button click (if present)
        if (sendBtnEl) {
            sendBtnEl.addEventListener("click", () => {
                const val = inputEl.value.trim();
                if (val) {
                    handleClientMessage(val);
                    inputEl.value = "";
                }
            });
        }

        // Input enter key
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const val = inputEl.value.trim();
                if (val) {
                    handleClientMessage(val);
                    inputEl.value = "";
                }
            }
        });
    }

    // Send the first welcome message
    function sendWelcome() {
        showTypingIndicator(true);
        setTimeout(() => {
            showTypingIndicator(false);
            const welcomeRule = findWelcomeRule();
            if (welcomeRule) {
                addChatMessage("bot", welcomeRule.reply_message, welcomeRule);
                activeContextRuleLabel = welcomeRule.label;
                renderSuggestionChips(welcomeRule.label);
            } else {
                addChatMessage("bot", "¡Hola! ¿En qué te puedo ayudar hoy? Escribí tu pregunta.");
            }
        }, 600);
    }

    // Find the catch-all root welcome rule
    function findWelcomeRule() {
        const rulesList = Array.from(assistantRules.values());
        // Find * rule at root level (no parent)
        return rulesList.find(r => r.received_message === "*" && (!r.subrule_of || !assistantRules.has(r.subrule_of)) && r.disabled !== "1");
    }

    // Find the custom fallback rule (label "no_entendido" or fallback by trigger)
    function findFallbackRule() {
        const byLabel = assistantRules.get("no_entendido");
        if (byLabel && byLabel.disabled !== "1") return byLabel;
        
        const rulesList = Array.from(assistantRules.values());
        return rulesList.find(r => {
            const trig = r.received_message.toLowerCase().trim();
            return (trig === "no_entendido" || trig === "no entiendo" || trig === "fallback") && r.disabled !== "1";
        });
    }

    // Find the custom product search fallback rule (label "search_fallback")
    function findSearchFallbackRule() {
        const byLabel = assistantRules.get("search_fallback");
        if (byLabel && byLabel.disabled !== "1") return byLabel;
        return null;
    }

    // Process Client Message
    function handleClientMessage(text) {
        // Add message bubble
        addChatMessage("client", text);
        
        // Show typing indicator
        showTypingIndicator(true);
        
        // 1. Detect dynamic compound queries (e.g. "mesa y escalera", "baranda y estante")
        const queryTerms = getCleanSearchTerms(text);
        let isCompoundSearch = false;
        let searchProducts = [];
        
        if (queryTerms.length > 1) {
            searchProducts = searchStoreProducts(text);
            // If we found products, check if they belong to different categories
            if (searchProducts.length > 1) {
                const uniqueCats = new Set(searchProducts.map(p => p.cat ? p.cat.id : ''));
                if (uniqueCats.size > 1) {
                    isCompoundSearch = true;
                }
            }
        }

        if (isCompoundSearch) {
            setTimeout(() => {
                showTypingIndicator(false);
                const fallbackRule = findSearchFallbackRule();
                let replyText = fallbackRule ? fallbackRule.reply_message : `¡Sí! Encontré estos productos que coinciden en nuestra web:\n\n[producto]\n\n¿Te gustaría ver los detalles de alguno?`;
                const shortcodes = searchProducts.slice(0, 3).map(p => `[producto:${p.product.id}]`).join(" ");
                replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                
                addChatMessage("bot", replyText, fallbackRule || null);
            }, 800);
            return;
        }

        // Match rule
        const matchedRule = findMatchingRule(text);
        
        function processRedirect(rule, visited = new Set()) {
            if (!rule.go_to_rule) return;
            const nextLabel = rule.go_to_rule;
            if (visited.has(nextLabel)) {
                console.warn("Circulo/Bucle de redirección detectado y detenido para evitar bucle infinito:", nextLabel);
                return;
            }
            
            const targetRule = assistantRules.get(nextLabel);
            if (targetRule) {
                visited.add(nextLabel);
                
                let targetDelayMs = 800;
                if (targetRule.reply_delay) {
                    const minDelay = parseFloat(targetRule.reply_delay) * 1000;
                    const maxDelay = targetRule.reply_delay_max ? parseFloat(targetRule.reply_delay_max) * 1000 : minDelay;
                    targetDelayMs = minDelay + Math.random() * (maxDelay - minDelay);
                }
                targetDelayMs = Math.max(200, Math.min(4000, targetDelayMs));
                
                setTimeout(() => {
                    showTypingIndicator(true);
                    setTimeout(() => {
                        showTypingIndicator(false);
                        
                        // Prepare reply text with shortcode substitutions
                        let replyText = targetRule.reply_message;
                        if (targetRule.pattern_matching === "productos" || replyText.toLowerCase().includes("[producto]")) {
                            const matches = searchStoreProducts(text);
                            const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.product.id}]`).join(" ");
                            replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                        }
                        
                        if (targetRule.pattern_matching === "categorias" || replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                            const matches = searchStoreCategories(text);
                            const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                            replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
                        }
                        
                        addChatMessage("bot", replyText, targetRule);
                        activeContextRuleLabel = targetRule.label;
                        renderSuggestionChips(targetRule.label);
                        
                        // Continue redirect chain
                        processRedirect(targetRule, visited);
                    }, targetDelayMs);
                }, 500);
            }
        }
        
        if (matchedRule) {
            let delayMs = 800;
            if (matchedRule.reply_delay) {
                const minDelay = parseFloat(matchedRule.reply_delay) * 1000;
                const maxDelay = matchedRule.reply_delay_max ? parseFloat(matchedRule.reply_delay_max) * 1000 : minDelay;
                delayMs = minDelay + Math.random() * (maxDelay - minDelay);
            }
            delayMs = Math.max(200, Math.min(4000, delayMs));

            setTimeout(() => {
                showTypingIndicator(false);
                
                // Prepare reply text with shortcode substitutions
                let replyText = matchedRule.reply_message;
                if (matchedRule.pattern_matching === "productos" || replyText.toLowerCase().includes("[producto]")) {
                    const matches = searchStoreProducts(text);
                    const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.product.id}]`).join(" ");
                    replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                }
                
                if (matchedRule.pattern_matching === "categorias" || replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                    const matches = searchStoreCategories(text);
                    const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                    replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
                }
                
                // Add reply
                addChatMessage("bot", replyText, matchedRule);
                
                // Update Context
                activeContextRuleLabel = matchedRule.label;
                
                // Render subrule chips
                renderSuggestionChips(matchedRule.label);

                // Handle go_to_rule redirect
                if (matchedRule.go_to_rule) {
                    const visited = new Set([matchedRule.label]);
                    processRedirect(matchedRule, visited);
                }
            }, delayMs);
        } else {
            // Interactive Search Engine fallback
            const products = searchStoreProducts(text);
            
            setTimeout(() => {
                showTypingIndicator(false);
                
                if (products.length > 0) {
                    // We found matching products!
                    const fallbackRule = findSearchFallbackRule();
                    let replyText = fallbackRule ? fallbackRule.reply_message : `¡Sí! Encontré estos productos que coinciden en nuestra web:\n\n[producto]\n\n¿Te gustaría ver los detalles de alguno?`;
                    
                    const shortcodes = products.slice(0, 3).map(p => `[producto:${p.product.id}]`).join(" ");
                    replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                    
                    addChatMessage("bot", replyText, fallbackRule || null);
                    
                    if (fallbackRule && fallbackRule.go_to_rule) {
                        const visited = new Set([fallbackRule.label]);
                        processRedirect(fallbackRule, visited);
                    }
                } else {
                    // Check if there is a custom fallback rule configured
                    const fallbackRule = findFallbackRule();
                    if (fallbackRule) {
                        let replyText = fallbackRule.reply_message;
                        if (replyText.toLowerCase().includes("[producto]")) {
                            const matches = searchStoreProducts(text);
                            const shortcodes = matches.slice(0, 3).map(p => `[producto:${p.product.id}]`).join(" ");
                            replyText = replyText.replace(/\[producto\]/gi, shortcodes);
                        }
                        if (replyText.toLowerCase().includes("[categoría]") || replyText.toLowerCase().includes("[categoria]")) {
                            const matches = searchStoreCategories(text);
                            const shortcodes = matches.slice(0, 3).map(c => `[categoria:${c.id}]`).join(" ");
                            replyText = replyText.replace(/\[categoría\]/gi, shortcodes).replace(/\[categoria\]/gi, shortcodes);
                        }
                        
                        addChatMessage("bot", replyText, fallbackRule);
                        activeContextRuleLabel = fallbackRule.label;
                        renderSuggestionChips(fallbackRule.label);
                        
                        if (fallbackRule.go_to_rule) {
                            const visited = new Set([fallbackRule.label]);
                            processRedirect(fallbackRule, visited);
                        }
                    } else {
                        // Absolute fallback: Show custom message with WhatsApp redirection
                        const fallbackMsg = "No logré comprender tu consulta. Podés escribir otra palabra clave o enviarnos un WhatsApp directo para chatear con nosotros en el taller.";
                        addChatMessage("bot", fallbackMsg);
                        renderFallbackChips();
                    }
                }
            }, 1000);
        }
    }

    // Levenshtein and Wildcard Pattern Matching
    function findMatchingRule(text) {
        const normalizedText = text.toLowerCase().trim();
        const rulesList = Array.from(assistantRules.values());
        
        // Split into Subrules in active context vs Root rules
        const subrules = [];
        const roots = [];
        
        rulesList.forEach(rule => {
            if (rule.disabled === "1") return;
            const parentVal = rule.subrule_of ? rule.subrule_of.trim() : "";
            const parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
            
            if (parents.includes(activeContextRuleLabel)) {
                subrules.push(rule);
            }
            
            const hasAnyValidParent = parents.some(p => assistantRules.has(p));
            if (!hasAnyValidParent) {
                roots.push(rule);
            }
        });

        // Matching pool checking helper
        function checkMatchInPool(pool) {
            // Priority 1: Exact matches, similarity and Dynamic search matching
            for (let rule of pool) {
                const matchType = rule.pattern_matching;
                
                if (matchType === "productos") {
                    const matches = searchStoreProducts(text);
                    if (matches.length > 0) return rule;
                }
                if (matchType === "categorias") {
                    const matches = searchStoreCategories(text);
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
            
            // Priority 2: Wildcard patterns / RegEx
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
            
            // Priority 3: Catch-all (*)
            for (let rule of pool) {
                const trigger = rule.received_message.trim();
                if (trigger === "*" || trigger === "") {
                    const isRoot = !rule.subrule_of || !assistantRules.has(rule.subrule_of);
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

        // Try subrules of current context first
        let matched = checkMatchInPool(subrules);
        if (matched) return matched;
        
        // Fallback to root level rules
        return checkMatchInPool(roots);
    }

    // String Wildcard check
    function matchWildcard(text, wildcardPattern) {
        const pattern = wildcardPattern.toLowerCase().trim();
        const str = text.toLowerCase().trim();
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

    // Smart Spanish keyword & similarity matching (handles singular/plurals, substrings and word-by-word similarity)
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
                if (getSimilarityRatio(word, trigWord) >= 0.65) return true;
                if (word.startsWith(trigWord) && word.length - trigWord.length <= 2) return true;
                if (trigWord.startsWith(word) && trigWord.length - word.length <= 2) return true;
            }
        } else if (triggerWords.length > 1) {
            const matchedTerms = triggerWords.every(tWord => {
                return queryWords.some(qWord => {
                    return getSimilarityRatio(qWord, tWord) >= 0.65 || qWord.includes(tWord) || tWord.includes(qWord);
                });
            });
            if (matchedTerms) return true;
        }
        
        return false;
    }

    // Normalize string for search matching (removes accents/diacritics and converts to lowercase)
    function normalizeForSearch(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    // Filters out conversational stop words and Spanish punctuation to enable conversational searches
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

    // Search Store Products from productsData
    function searchStoreProducts(text) {
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
        const matchProductWithTerms = (item, terms, logic) => {
            const checkTerm = (term) => {
                const termNorm = term.replace(/\s+/g, '');
                
                // Helper: check if two words share a common root/prefix of at least 4 chars
                const sharesRoot = (a, b) => {
                    const minLen = Math.min(a.length, b.length);
                    if (minLen < 4) return false;
                    const prefixLen = Math.min(minLen, Math.max(4, Math.floor(minLen * 0.7)));
                    return a.substring(0, prefixLen) === b.substring(0, prefixLen);
                };
                
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
                
                // 2. Reverse contains / Levenshtein / Prefix check
                const nombreNorm = normalizeForSearch(item.nombre);
                const nombreWords = nombreNorm.split(/\s+/);
                const catWords = item.cat && item.cat.name ? normalizeForSearch(item.cat.name).split(/\s+/) : [];
                const allWords = nombreWords.concat(catWords);
                
                for (let word of allWords) {
                    if (word.length < 3) continue;
                    if (term.includes(word) || word.includes(term)) return true;
                    if (sharesRoot(term, word)) return true;
                    if (word.length >= 3 && getSimilarityRatio(term, word) >= 0.65) return true;
                }
                
                return false;
            };

            if (logic === 'AND') {
                return terms.every(checkTerm);
            } else {
                return terms.some(checkTerm);
            }
        };

        // 1. Try AND search
        let matchedItems = indexed.filter(item => matchProductWithTerms(item, queryTerms, 'AND'));
        let usedOrLogic = false;

        // 2. Fall back to OR search if no results and query has multiple terms
        if (matchedItems.length === 0 && queryTerms.length > 1) {
            matchedItems = indexed.filter(item => matchProductWithTerms(item, queryTerms, 'OR'));
            usedOrLogic = true;
        }

        // Deduplicate and return results
        const results = [];
        matchedItems.forEach(item => {
            if (!results.some(r => r.product.id === item.product.id)) {
                results.push(item);
            }
        });

        if (usedOrLogic) {
            // Sort by relevance (most term matches first)
            const countMatches = (item) => queryTerms.filter(term => matchProductWithTerms(item, [term], 'AND')).length;
            results.sort((a, b) => countMatches(b) - countMatches(a));
        }

        return results.slice(0, 3);
    }

    // Search Store Categories from productsData
    function searchStoreCategories(text) {
        const queryTerms = getCleanSearchTerms(text);
        if (queryTerms.length === 0) return [];
        
        const results = [];
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : (typeof productsData !== 'undefined' ? productsData : []);
        
        sourceData.forEach(cat => {
            const catNameNorm = normalizeForSearch(cat.name);
            const catIdNorm = normalizeForSearch(cat.id);
            
            const matchesQuery = queryTerms.every(term => {
                return catNameNorm.includes(term) || catIdNorm.includes(term);
            });
            
            if (matchesQuery) {
                results.push(cat);
            }
        });
        
        return results.slice(0, 3);
    }

    // Render Chat Messages
    function addChatMessage(sender, text, rule = null) {
        const bubble = document.createElement("div");
        bubble.className = `assistant-msg ${sender}`;
        
        if (sender === "bot") {
            const regex = /\[(producto|categoria|seccion):([^\]]+)\]|\[url=([^\]|]+)(?:\|([^\]]+))?\]|\[(wpp|whatsapp|ig|instagram|fb|facebook|tiktok|yt|youtube|ml|mercadolibre)\]/gi;
            let lastIndex = 0;
            let match;
            const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : (typeof productsData !== 'undefined' ? productsData : []);
            
            while ((match = regex.exec(text)) !== null) {
                const textPart = text.substring(lastIndex, match.index);
                if (textPart) {
                    const span = document.createElement("span");
                    span.textContent = textPart;
                    span.innerHTML = span.innerHTML.replace(/\n/g, "<br>");
                    bubble.appendChild(span);
                }
                
                const type = match[1];
                const id = match[2] ? match[2].trim() : "";
                
                const btn = document.createElement("button");
                btn.className = "chat-action-btn";
                btn.style.cssText = "display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin: 4px; padding: 6px 12px; vertical-align: middle;";
                
                let isBtnValid = false;
                
                if (type) {
                    isBtnValid = true;
                    if (type === "producto") {
                        let prodTitle = id;
                        let catName = "";
                        const catObj = sourceData.find(c => c.products.some(p => p.id === id));
                        if (catObj) {
                            catName = catObj.name;
                            const pObj = catObj.products.find(p => p.id === id);
                            if (pObj) prodTitle = pObj.title;
                        }
                        btn.innerHTML = `🛍️ <strong>${prodTitle.split(":")[0]}</strong>`;
                        btn.addEventListener("click", (e) => {
                            e.preventDefault();
                            viewProductDetail(id, catName);
                        });
                    } else if (type === "categoria") {
                        const catObj = sourceData.find(c => c.id === id);
                        const catName = catObj ? catObj.name : id;
                        btn.style.borderColor = "var(--text-muted, #718096)";
                        btn.style.color = "var(--text-muted, #718096)";
                        btn.innerHTML = `📂 <strong>${catName}</strong>`;
                        btn.addEventListener("click", (e) => {
                            e.preventDefault();
                            viewCategoryFeed(id);
                        });
                    } else if (type === "seccion") {
                        const sections = {
                            inicio: { title: "Inicio", url: "index.html", icon: "🏠", view: "view-home" },
                            catalogo: { title: "Catálogo", url: "catalogo.html", icon: "📖", view: "view-catalogo" },
                            calcular: { title: "Calculador de Ménsulas", url: "calcular.html", icon: "📐", view: "view-calculator" },
                            mayorista: { title: "Portal Mayorista", url: "mayorista.html", icon: "💼", view: "view-mayorista" },
                            stock: { title: "Control de Stock Personal", url: "apps/stock.html", icon: "📦", view: "view-stock" },
                            musica: { title: "Reproductor de Música", url: "musica.html", icon: "🎵", view: "view-musica" },
                            visualizador: { title: "Visualizador 3D", url: "visualizador.html", icon: "👁️", view: "view-visualizador" },
                            alquileres: { title: "Alquiler de Muebles", url: "index.html?view=alquileres", icon: "🎪", view: "view-rentals" },
                            nosotros: { title: "Nosotros", url: "index.html?view=nosotros", icon: "ℹ️", view: "view-about" },
                            perfil: { title: "Carrito / Mi Pedido", url: "index.html?view=perfil", icon: "🛒", view: "view-profile" },
                            avisos: { title: "Avisos y Novedades", url: "index.html?view=avisos", icon: "🔔", view: "view-notifications" },
                            videos: { title: "Galería de Videos", url: "index.html?view=videos", icon: "🎥", view: "view-videos" },
                            buscar: { title: "Buscador de Productos", url: "index.html?view=buscar", icon: "🔍", view: "view-search" },
                            ayudin: { title: "Ayudín y Guías", url: "ayudin.html", icon: "💡", view: "view-ayudin" }
                        };
                        const sect = sections[id] || { title: id, url: "#", icon: "🔗" };
                        btn.style.borderColor = "var(--color-primary, #A0715B)";
                        btn.style.color = "var(--color-primary, #A0715B)";
                        btn.innerHTML = `${sect.icon} <strong>${sect.title}</strong>`;
                        btn.addEventListener("click", (e) => {
                            e.preventDefault();
                            if (sect.view && window.navigateToView) {
                                window.navigateToView(sect.view);
                            } else {
                                window.location.href = sect.url;
                            }
                        });
                    }
                } else if (match[3]) {
                    const btnUrl = match[3].trim();
                    const btnText = match[4] ? match[4].trim() : "Abrir Enlace";
                    isBtnValid = true;
                    btn.style.borderColor = "var(--color-primary, #A0715B)";
                    btn.style.color = "var(--color-primary, #A0715B)";
                    btn.innerHTML = `🔗 <strong>${btnText}</strong>`;
                    btn.addEventListener("click", (e) => {
                        e.preventDefault();
                        window.open(btnUrl, "_blank");
                    });
                } else if (match[5]) {
                    const socialKey = match[5].toLowerCase().trim();
                    const socialMap = {
                        wpp: { name: "WhatsApp", icon: "💬", key: "whatsapp" },
                        whatsapp: { name: "WhatsApp", icon: "💬", key: "whatsapp" },
                        ig: { name: "Instagram", icon: "📸", key: "instagram" },
                        instagram: { name: "Instagram", icon: "📸", key: "instagram" },
                        fb: { name: "Facebook", icon: "👤", key: "facebook" },
                        facebook: { name: "Facebook", icon: "👤", key: "facebook" },
                        tiktok: { name: "TikTok", icon: "🎵", key: "tiktok" },
                        yt: { name: "YouTube", icon: "📺", key: "youtube" },
                        youtube: { name: "YouTube", icon: "📺", key: "youtube" },
                        ml: { name: "Mercado Libre", icon: "🛍️", key: "mercadolibre" },
                        mercadolibre: { name: "Mercado Libre", icon: "🛍️", key: "mercadolibre" }
                    };
                    const soc = socialMap[socialKey];
                    if (soc) {
                        const links = (window.siteConfig && window.siteConfig.socialLinks) ? window.siteConfig.socialLinks : {};
                        let btnUrl = links[soc.key] || "";
                        if (!btnUrl && soc.key === "whatsapp") {
                            btnUrl = "https://wa.me/5491167007723";
                        }
                        if (btnUrl) {
                            isBtnValid = true;
                            btn.style.borderColor = "var(--color-primary, #A0715B)";
                            btn.style.color = "var(--color-primary, #A0715B)";
                            btn.innerHTML = `${soc.icon} <strong>${soc.name}</strong>`;
                            btn.addEventListener("click", (e) => {
                                e.preventDefault();
                                window.open(btnUrl, "_blank");
                            });
                        }
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
                span.textContent = remainingText;
                span.innerHTML = span.innerHTML.replace(/\n/g, "<br>");
                bubble.appendChild(span);
            }
        } else {
            bubble.textContent = text;
        }
        
        messagesContainerEl.appendChild(bubble);
        scrollToBottom();
    }

    // Navigate to Product Detail page
    function viewProductDetail(productId, catName) {
        const sourceData = (typeof sessionProducts !== 'undefined' && sessionProducts.length > 0) ? sessionProducts : (typeof productsData !== 'undefined' ? productsData : []);
        const cat = sourceData.find(c => c.name === catName || c.products.some(p => p.id === productId));
        if (!cat) return;
        const prod = cat.products.find(p => p.id === productId);
        if (prod && window.showProductDetail) {
            chatWindowEl.classList.remove("open"); // minimize chat
            window.showProductDetail(prod, cat.name);
        }
    }

    // Navigate to Category Feed
    function viewCategoryFeed(categoryId) {
        if (window.navigateToCategoryFeed) {
            chatWindowEl.classList.remove("open"); // minimize chat
            window.navigateToCategoryFeed(categoryId);
        }
    }

    // Typing Status Toggle
    function showTypingIndicator(show) {
        if (show) {
            typingIndicatorEl.classList.add("active");
        } else {
            typingIndicatorEl.classList.remove("active");
        }
        scrollToBottom();
    }

    // Render Subrule suggestion chips
    function renderSuggestionChips(activeRuleLabel) {
        chipsContainerEl.innerHTML = "";
        if (!activeRuleLabel) return;
        
        // Find subrules that are configured to show as chips (defaults to true unless explicitly disabled with "0" or "false")
        const subrules = Array.from(assistantRules.values()).filter(rule => {
            const parentVal = rule.subrule_of ? rule.subrule_of.trim() : "";
            const parents = parentVal ? parentVal.split(",").map(p => p.trim()).filter(Boolean) : [];
            return parents.includes(activeRuleLabel) && 
                   rule.disabled !== "1" && 
                   rule.show_as_chip !== "0" && 
                   rule.show_as_chip !== "false";
        });
        
        subrules.forEach(rule => {
            const triggerText = rule.received_message.trim();
            if (triggerText === "*" || triggerText === "") return;
            
            // Clean up trigger label
            let label = triggerText.replace(/\*/g, "").trim();
            if (!label) return;
            label = label.charAt(0).toUpperCase() + label.slice(1);
            
            const chip = document.createElement("button");
            chip.className = "suggestion-chip";
            chip.textContent = label;
            chip.addEventListener("click", () => {
                handleClientMessage(triggerText);
            });
            chipsContainerEl.appendChild(chip);
        });
    }

    // Render search product suggestion chips
    function renderProductSearchChips(products) {
        chipsContainerEl.innerHTML = "";
        
        products.forEach(p => {
            const chip = document.createElement("button");
            chip.className = "suggestion-chip";
            chip.innerHTML = `🛍️ Ver ${p.product.title.split(":")[0]}`;
            chip.addEventListener("click", () => {
                viewProductDetail(p.product.id, p.categoryName);
            });
            chipsContainerEl.appendChild(chip);
        });

        // Option to reset/go to main menu
        const resetChip = document.createElement("button");
        resetChip.className = "suggestion-chip";
        resetChip.style.background = "#E2E8F0";
        resetChip.textContent = "⬅️ Volver al Inicio";
        resetChip.addEventListener("click", () => {
            sendWelcome();
        });
        chipsContainerEl.appendChild(resetChip);
    }

    // Render chips for fallback (no matches)
    function renderFallbackChips() {
        chipsContainerEl.innerHTML = "";
        
        // WhatsApp Direct Link
        const waChip = document.createElement("button");
        waChip.className = "suggestion-chip";
        waChip.style.borderColor = "#48BB78";
        waChip.style.color = "#2F855A";
        waChip.style.fontWeight = "600";
        waChip.innerHTML = "💬 Chatear por WhatsApp";
        waChip.addEventListener("click", () => {
            window.open("https://wa.me/5491167007723", "_blank");
        });
        chipsContainerEl.appendChild(waChip);
        
        // Go back to options
        const resetChip = document.createElement("button");
        resetChip.className = "suggestion-chip";
        resetChip.style.background = "#E2E8F0";
        resetChip.textContent = "🪵 Ver Opciones";
        resetChip.addEventListener("click", () => {
            sendWelcome();
        });
        chipsContainerEl.appendChild(resetChip);
    }

    function scrollToBottom() {
        messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
    }
})();
