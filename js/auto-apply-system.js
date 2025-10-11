/**
 * Sistema de Aplicación Automática de Cambios
 * Detecta cambios en main-data.json y los aplica automáticamente
 */

class AutoApplySystem {
    constructor() {
        this.lastModified = null;
        this.checkInterval = 30000; // Verificar cada 30 segundos
        this.isEnabled = false;
    }

    init() {
        // SISTEMA DESHABILITADO TEMPORALMENTE para evitar conflictos con main-page-manager.js
        console.log('⚠️ Auto-apply-system deshabilitado para evitar conflictos de orden');
        this.isEnabled = false;
        return;
        
        // Código original comentado:
        // const urlParams = new URLSearchParams(window.location.search);
        // this.isEnabled = urlParams.has('auto-update') || 
        //                 window.location.hostname === 'localhost' ||
        //                 window.location.hostname === '127.0.0.1';

        // if (this.isEnabled) {
        //     console.log('🔄 Sistema de auto-aplicación habilitado');
        //     this.startMonitoring();
        // }
    }

    startMonitoring() {
        this.checkForUpdates();
        setInterval(() => this.checkForUpdates(), this.checkInterval);
    }

    async checkForUpdates() {
        try {
            const response = await fetch('edit/main-data.json', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const lastModified = response.headers.get('Last-Modified');
            
            if (this.lastModified && lastModified !== this.lastModified) {
                console.log('📱 Cambios detectados en main-data.json, aplicando...');
                await this.applyUpdates();
            }
            
            this.lastModified = lastModified;
        } catch (error) {
            console.warn('⚠️ Error verificando actualizaciones:', error);
        }
    }

    async applyUpdates() {
        try {
            const manager = new MainPageManager();
            await manager.init();
            
            // Mostrar notificación visual
            this.showUpdateNotification();
        } catch (error) {
            console.error('❌ Error aplicando actualizaciones:', error);
        }
    }

    showUpdateNotification() {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
        `;
        notification.innerHTML = '✅ Configuración actualizada automáticamente';
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Clase para generar HTML estático desde JSON
class StaticHTMLGenerator {
    constructor() {
        this.data = null;
    }

    async generateFullHTML() {
        try {
            const response = await fetch('edit/main-data.json');
            this.data = await response.json();
            
            const htmlContent = this.buildHTMLStructure();
            return htmlContent;
        } catch (error) {
            console.error('Error generando HTML:', error);
            return null;
        }
    }

    buildHTMLStructure() {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    ${this.generateHead()}
</head>
<body class="home">
            ${this.generateFloatingIcons()}
    <div class="container">
        ${this.generateHeader()}
        ${this.generateMainNavigation()}
        ${this.generateNavigationButtons()}
        ${this.generateSocialSection()}
    </div>
    ${this.generateScripts()}
</body>
</html>`;
    }

    generateHead() {
        const seo = this.data.seo || {};
        return `
    <!-- SEO y Open Graph -->
    <meta name="description" content="${seo.description || ''}">
    <meta name="keywords" content="${seo.keywords || ''}">
    <meta name="robots" content="index,follow">
    <meta property="og:title" content="${seo.title || ''}">
    <meta property="og:description" content="${seo.description || ''}">
    <meta property="og:image" content="https://latarimadecoracion.github.io/img/icono-carpintero.png">
    <meta property="og:url" content="https://latarimadecoracion.github.io/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_AR">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${seo.title || ''}">
    <meta name="twitter:description" content="${seo.description || ''}">
    <meta name="twitter:image" content="https://latarimadecoracion.github.io/img/icono-carpintero.png">
    <link rel="canonical" href="https://latarimadecoracion.github.io/">
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-JXNJV3XERK"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-JXNJV3XERK');
    </script>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${seo.title || 'LA TARIMA - Carpintería'}</title>
    <link rel="stylesheet" href="estilos.css?v=20251003">
    <link rel="icon" href="img/ico.png" type="image/png">
    <meta name="theme-color" content="#ffffff">
    
    ${this.generateStructuredData()}`;
    }

    generateStructuredData() {
        const social = this.data.socialLinks || {};
        return `
    <script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "${this.data.siteName || 'LA TARIMA'}",
    "url": "https://latarimadecoracion.github.io/",
    "logo": "https://latarimadecoracion.github.io/img/icono-carpintero.png",
    "sameAs": [
        "${social.instagram || ''}",
        "${social.facebook || ''}",
        "${social.tiktok || ''}",
        "${social.youtube || ''}"
    ],
    "contactPoint": [
        {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "areaServed": "AR",
            "availableLanguage": ["es"],
            "telephone": "+54 9 11 6700-7723",
            "url": "${social.whatsapp || ''}"
        }
    ]
}
    </script>`;
    }

    generateFloatingIcons() {
        // Los iconos flotantes se manejan dinámicamente por main-page-manager.js
        // Este método devuelve vacío para evitar duplicación
        return '<!-- Iconos flotantes manejados dinámicamente -->';
    }

    generateHeader() {
        const social = this.data.socialLinks || {};
        return `
        <header class="site-header">
            <a href="index.html" aria-label="Ir al inicio"><h1>${this.data.siteName || 'LA TARIMA'}</h1></a>
            <a href="index.html" aria-label="Ir al inicio"><div class="subtitle">${this.data.subtitle || 'Carpintería Online'}</div></a>
            <!-- Redes sociales -->
            <div class="socials">
                <a href="${social.tiktok || '#'}" target="_blank" rel="noopener" aria-label="TikTok">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 3c.3 2 1.7 3.6 3.6 3.9.3 0 .4.2.4.4v2.2c0 .3-.2.5-.5.5-1.7 0-3.3-.6-4.5-1.6v6.6c0 3-2.4 5.5-5.4 5.7-3.2.2-5.9-2.4-5.9-5.6 0-3.1 2.5-5.6 5.6-5.6.4 0 .8 0 1.1.1.2 0 .3.2.3.4v2.3c0 .2-.2.4-.4.4-.3-.1-.6-.1-.9-.1-1.6 0-2.9 1.4-2.8 3 .1 1.5 1.4 2.7 3 2.7 1.6 0 2.9-1.3 2.9-2.9V3.5c0-.3.2-.5.5-.5H16z"/>
                    </svg>
                </a>
                <a href="${social.instagram || '#'}" target="_blank" rel="noopener" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                        <circle cx="12" cy="12" r="4"></circle>
                        <circle cx="17" cy="7" r="1.5"></circle>
                    </svg>
                </a>
                <a href="${social.facebook || '#'}" target="_blank" rel="noopener" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M13 22v-9h3l.5-3H13V8.5c0-.9.3-1.5 1.7-1.5H16V4.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V10H7v3h3v9h3z"/>
                    </svg>
                </a>
                <a href="${social.youtube || '#'}" target="_blank" rel="noopener" aria-label="YouTube">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M23.5 7.2c-.3-1.2-1.2-2.1-2.4-2.4C19 4.3 12 4.3 12 4.3s-7 0-9.1.5C1.7 5.1.8 6 .5 7.2.1 9.3.1 12 .1 12s0 2.7.4 4.8c.3 1.2 1.2 2.1 2.4 2.4C5 19.7 12 19.7 12 19.7s7 0 9.1-.5c1.2-.3 2.1-1.2 2.4-2.4.4-2.1.4-4.8.4-4.8s0-2.7-.4-4.8zM9.8 15.5V8.5l6 3.5-6 3.5z"/>
                    </svg>
                </a>
                <a href="${social.whatsapp || '#'}" target="_blank" rel="noopener" aria-label="WhatsApp">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                    </svg>
                </a>
            </div>
        </header>`;
    }

    generateMainNavigation() {
        const barandas = this.data.mainNavigation?.barandas || {};
        let dropdownItems = '';
        
        if (barandas.items && barandas.items.length > 0) {
            dropdownItems = barandas.items.map(item => `
                <a href="${item.url}" class="main-btn" id="${item.id}" aria-label="${item.title}">
                    <span class="icon-circle">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="chev-right-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </span>
                    <span class="btn-text">${item.title}</span>
                    <span class="spacer"></span>
                </a>`).join('');
        }

        return `
        <!-- Dropdown de Barandas para cama -->
        <details class="dropdown" id="dd-barandas" aria-label="${barandas.title || 'Barandas para cama'}">
            <summary>
                <button class="main-btn" type="button" aria-expanded="false">
                    <span class="icon-circle">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="arrow-icon">
                            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                        </svg>
                    </span>
                    <span class="btn-text">${barandas.title || 'Barandas para cama'}</span>
                    <span class="spacer"></span>
                </button>
            </summary>
            <div class="dropdown-content">
                ${dropdownItems}
            </div>
        </details>`;
    }

    generateNavigationButtons() {
        if (!this.data.navigationButtons || this.data.navigationButtons.length === 0) {
            return '';
        }

        return this.data.navigationButtons.map(button => `
        <a href="${button.url}" class="main-btn" id="${button.id}" aria-label="${button.title}">
            <span class="icon-circle">
                <img src="${button.icon}" alt="${button.title}" class="icon-22" />
            </span>
            <span class="btn-text">${button.title}</span>
            <span class="spacer"></span>
        </a>`).join('');
    }

    generateSocialSection() {
        const socialSection = this.data.socialSection || {};
        let socialLinks = '';

        if (socialSection.links && socialSection.links.length > 0) {
            socialLinks = socialSection.links.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener" class="home-only social-link">
            <button class="main-btn" aria-label="${link.name}">
                <span class="icon-circle">
                    ${this.getSocialSVG(link.name, link.color)}
                </span>
                <span class="btn-text">${link.displayText}</span>
                <span class="spacer"></span>
            </button>
        </a>`).join('');
        }

        return `
        <!-- Subtítulo y redes (SOLO inicio) -->
        <div class="home-only home-heading">${socialSection.title || 'Nuestras redes'}</div>
        ${socialLinks}`;
    }

    generateScripts() {
        return `
<script>
// Maneja el despliegue del dropdown y accesibilidad del botón
(function(){
    var dd = document.getElementById('dd-barandas');
    if (!dd) return;
    var btn = dd.querySelector('summary > .main-btn');
    if (!btn) return;
    function sync(){ btn.setAttribute('aria-expanded', dd.hasAttribute('open') ? 'true' : 'false'); }
    btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); dd.open = !dd.open; sync(); });
    dd.addEventListener('toggle', sync);
    sync();
})();
</script>
<script src="js/main-page-manager.js"></script>`;
    }

    getSocialSVG(platform, color) {
        // Misma función que en main-page-manager.js
        const svgs = {
            'WhatsApp': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
            </svg>`,
            // ... otros SVGs igual que en main-page-manager.js
        };
        return svgs[platform] || `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22"><circle cx="12" cy="12" r="10" fill="${color}"/></svg>`;
    }
}

// Inicializar sistema de auto-aplicación
document.addEventListener('DOMContentLoaded', () => {
    const autoApply = new AutoApplySystem();
    autoApply.init();
});

// Exportar para uso global
window.AutoApplySystem = AutoApplySystem;
window.StaticHTMLGenerator = StaticHTMLGenerator;