/**
 * Sistema de Integración del Editor Principal
 * Carga y aplica la configuración desde main-data.json
 */

class MainPageManager {
    constructor() {
        this.data = null;
        this.isHomePage = document.body.classList.contains('home');
    }

    async init() {
        // Iconos flotantes deshabilitados
        // const container = document.getElementById('floating-icons-container');
        // if (container) {
        //     container.classList.add('loading');
        // }

        try {
            await this.loadData();
            this.applyConfiguration();
            console.log('✅ Configuración aplicada correctamente - Sistema único activo');
            
        } catch (error) {
            console.error('❌ Error al aplicar configuración:', error);
            // Aplicar configuración por defecto si falla
            this.applyFallbackConfiguration();
        } finally {
            // Iconos flotantes deshabilitados
            // if (container) {
            //     container.classList.remove('loading');
            // }
        }
    }

    async loadData() {
        const response = await fetch('edit/main-data.json');
        if (!response.ok) {
            throw new Error('No se pudo cargar main-data.json');
        }
        this.data = await response.json();
    }

    applyConfiguration() {
        if (!this.data) return;

        // Aplicar configuración básica del sitio
        this.updateSiteBasics();
        
        // Aplicar SEO
        this.updateSEO();
        
        // Aplicar enlaces sociales del header
        this.updateHeaderSocials();
        
        // Aplicar iconos flotantes
        this.updateFloatingIcons();
        
        // Solo en la página principal
        if (this.isHomePage) {
            this.updateMainNavigation();
            this.updateNavigationButtons();
            this.updateSocialSection();
        }
    }

    updateSiteBasics() {
        // Actualizar título principal
        const mainTitle = document.querySelector('h1');
        if (mainTitle && this.data.siteName) {
            mainTitle.textContent = this.data.siteName;
        }

        // Actualizar subtítulo
        const subtitle = document.querySelector('.subtitle');
        if (subtitle && this.data.subtitle) {
            subtitle.textContent = this.data.subtitle;
        }

        // Actualizar título de la página
        if (this.data.seo?.title) {
            document.title = this.data.seo.title;
        }
    }

    updateSEO() {
        if (!this.data.seo) return;

        // Actualizar meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = this.data.seo.description;

        // Actualizar meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = this.data.seo.keywords;

        // Actualizar Open Graph
        this.updateOpenGraph();
    }

    updateOpenGraph() {
        const ogMetas = {
            'og:title': this.data.seo.title,
            'og:description': this.data.seo.description,
            'twitter:title': this.data.seo.title,
            'twitter:description': this.data.seo.description
        };

        Object.entries(ogMetas).forEach(([property, content]) => {
            let meta = document.querySelector(`meta[property="${property}"]`) || 
                      document.querySelector(`meta[name="${property}"]`);
            if (meta) {
                meta.content = content;
            }
        });
    }

    updateHeaderSocials() {
        if (!this.data.socialLinks) return;

        const socialLinks = {
            'tiktok': this.data.socialLinks.tiktok,
            'instagram': this.data.socialLinks.instagram,
            'facebook': this.data.socialLinks.facebook,
            'youtube': this.data.socialLinks.youtube,
            'whatsapp': this.data.socialLinks.whatsapp
        };

        // Actualizar enlaces en el header
        Object.entries(socialLinks).forEach(([platform, url]) => {
            const links = document.querySelectorAll(`a[href*="${platform}"], a[aria-label*="${platform}" i]`);
            links.forEach(link => {
                if (url && link.href !== url) {
                    link.href = url;
                }
            });
        });
    }

    updateFloatingIcons() {
        console.log('🎯 Iniciando actualización de iconos flotantes...');
        
        // Mantener compatibilidad con formato anterior
        let iconosData = this.data.floatingIcons;
        if (!iconosData && this.data.floatingIcon) {
            iconosData = [{
                id: "main",
                text: this.data.floatingIcon.text,
                url: this.data.floatingIcon.url,
                image: this.data.floatingIcon.image,
                position: 1
            }];
        }
        
        // LIMPIAR TODOS LOS ICONOS FLOTANTES EXISTENTES EN EL DOM
        const existingIcons = document.querySelectorAll('.floating-carpenter, .floating-icon');
        console.log(`🗑️ Eliminando ${existingIcons.length} iconos flotantes existentes`);
        existingIcons.forEach(icon => icon.remove());
        
        // También limpiar el contenedor específico
        const container = document.getElementById('floating-icons-container');
        if (container) {
            container.innerHTML = '';
        }

        if (!iconosData || iconosData.length === 0) {
            console.log('⚠️ No hay iconos flotantes configurados');
            return;
        }

        // Ordenar iconos por posición
        const iconosOrdenados = [...iconosData].sort((a, b) => (a.position || 1) - (b.position || 1));
        console.log('📋 Orden de iconos flotantes:', iconosOrdenados.map(i => `${i.position}: ${i.text}`));

        // Crear nuevos iconos flotantes directamente en el body
        iconosOrdenados.forEach((icono, index) => {
            console.log(`➕ Creando icono flotante ${index + 1}: ${icono.text}`);
            this.createFloatingIcon(icono, index);
        });

        console.log(`✅ ${iconosOrdenados.length} iconos flotantes aplicados correctamente`);
    }

    createFloatingIcon(iconoData, index) {
        const floatingIcon = document.createElement('a');
        floatingIcon.href = iconoData.url;
        floatingIcon.className = 'floating-carpenter';
        floatingIcon.title = iconoData.text;
        floatingIcon.setAttribute('data-icon-id', iconoData.id);
        floatingIcon.setAttribute('data-position', iconoData.position || (index + 1));
        
        // Aplicar estilos directamente para posicionamiento inmediato
        floatingIcon.style.cssText = `
            position: fixed;
            right: 20px;
            top: ${22 + (index * 60)}px;
            width: 48px;
            height: 48px;
            background: #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 12px rgba(0,0,0,0.10);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-decoration: none;
            border: 2px solid #0074D9;
            opacity: 1;
            transform: translateX(0) scale(1);
        `;

        // Crear contenedor del icono
        const iconContainer = document.createElement('span');
        iconContainer.className = 'carpenter-icon';

        // Crear imagen
        const img = document.createElement('img');
        img.src = iconoData.image;
        img.alt = iconoData.text;
        img.style.cssText = 'width: 32px; height: 32px; object-fit: contain; border-radius: 50%;';

        // Manejar error de carga de imagen
        img.onerror = () => {
            img.src = 'img/ico.png'; // Imagen por defecto
            console.warn(`Error cargando imagen: ${iconoData.image}`);
        };

        // La imagen se mostrará inmediatamente ya que el icono ya tiene opacity: 1

        iconContainer.appendChild(img);
        floatingIcon.appendChild(iconContainer);

        // Efectos hover mejorados
        floatingIcon.addEventListener('mouseenter', () => {
            floatingIcon.style.transform = 'translateX(0) scale(1.08)';
            floatingIcon.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
        });

        floatingIcon.addEventListener('mouseleave', () => {
            floatingIcon.style.transform = 'translateX(0) scale(1)';
            floatingIcon.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)';
        });

        // Agregar directamente al body para evitar conflictos con otros contenedores
        document.body.appendChild(floatingIcon);
        console.log(`✅ Icono flotante agregado: ${iconoData.text} (posición ${iconoData.position})`);
    }

    updateMainNavigation() {
        // Compatibilidad con estructura antigua
        if (this.data.mainNavigation?.barandas && !this.data.mainNavigation?.dropdownMenus) {
            this.data.mainNavigation.dropdownMenus = [
                {
                    id: "barandas",
                    title: this.data.mainNavigation.barandas.title || "Barandas para cama",
                    items: this.data.mainNavigation.barandas.items || []
                }
            ];
        }

        // Actualizar menús desplegables
        if (this.data.mainNavigation?.dropdownMenus) {
            this.updateDropdownMenus();
        }

        // Actualizar botones directos
        if (this.data.mainNavigation?.directButtons) {
            this.updateDirectButtons();
        }
    }

    updateDropdownMenus() {
        const dropdownMenus = this.data.mainNavigation.dropdownMenus;
        
        // Por ahora, actualizar el dropdown de barandas (primera posición)
        if (dropdownMenus.length > 0) {
            const firstMenu = dropdownMenus[0];
            
            // Actualizar título del dropdown
            const dropdownBtn = document.querySelector('#dd-barandas .btn-text');
            if (dropdownBtn) {
                dropdownBtn.textContent = firstMenu.title;
            }

            // Actualizar items del dropdown
            const dropdownContent = document.querySelector('#dd-barandas .dropdown-content');
            if (dropdownContent && firstMenu.items && firstMenu.items.length > 0) {
                dropdownContent.innerHTML = '';
                
                firstMenu.items.forEach(item => {
                    const link = this.createNavigationLink(item.title, item.url, item.id);
                    dropdownContent.appendChild(link);
                });
            }
        }
    }

    updateDirectButtons() {
        const directButtons = this.data.mainNavigation.directButtons;
        
        if (!directButtons || directButtons.length === 0) {
            return;
        }

        // Encontrar el contenedor después del dropdown de barandas
        const dropdown = document.querySelector('#dd-barandas');
        if (!dropdown) {
            console.error('❌ No se encontró #dd-barandas para insertar botones directos');
            return;
        }

        // Remover botones directos existentes
        const existingDirectButtons = document.querySelectorAll('.direct-nav-button');
        existingDirectButtons.forEach(btn => btn.remove());

        // Crear botones directos
        directButtons.forEach(button => {
            const navButton = this.createDirectButton(button);
            dropdown.parentNode.insertBefore(navButton, dropdown.nextSibling);
        });
    }

    updateNavigationButtons() {
        if (!this.data.navigationButtons || this.data.navigationButtons.length === 0) {
            console.log('⚠️ No hay botones de navegación para actualizar');
            return;
        }

        console.log('🔘 Actualizando botones de navegación...');

        // Encontrar el contenedor después del dropdown de barandas
        const dropdown = document.querySelector('#dd-barandas');
        if (!dropdown) {
            console.error('❌ No se encontró #dd-barandas');
            return;
        }

        // Eliminar botones existentes (que no sean el dropdown ni las redes sociales)
        let nextElement = dropdown.nextElementSibling;
        let removedCount = 0;
        while (nextElement && !nextElement.classList.contains('home-heading')) {
            const toRemove = nextElement;
            nextElement = nextElement.nextElementSibling;
            if (toRemove.tagName === 'A' && toRemove.classList.contains('main-btn')) {
                toRemove.remove();
                removedCount++;
            }
        }
        console.log('🗑️ Eliminados', removedCount, 'botones existentes');

        // Insertar nuevos botones
        const socialHeading = document.querySelector('.home-heading');
        this.data.navigationButtons.forEach((button, index) => {
            console.log(`➕ Agregando botón ${index + 1}: ${button.title}`);
            const buttonElement = this.createMainButton(button);
            if (socialHeading) {
                socialHeading.parentNode.insertBefore(buttonElement, socialHeading);
            }
        });
        
        console.log('✅ Botones de navegación actualizados correctamente');
    }

    updateSocialSection() {
        if (!this.data.socialSection) return;

        // Actualizar título de la sección
        const socialHeading = document.querySelector('.home-heading');
        if (socialHeading && this.data.socialSection.title) {
            socialHeading.textContent = this.data.socialSection.title;
        }

        // Actualizar enlaces sociales
        if (this.data.socialSection.links && this.data.socialSection.links.length > 0) {
            this.updateSocialLinks();
        }
    }

    updateSocialLinks() {
        console.log('🔗 Actualizando enlaces sociales...');
        
        // Encontrar todos los enlaces sociales existentes
        const existingSocialLinks = document.querySelectorAll('.social-link');
        console.log('🗑️ Eliminando', existingSocialLinks.length, 'enlaces existentes');
        
        // Eliminar enlaces existentes
        existingSocialLinks.forEach(link => link.remove());

        // Crear nuevos enlaces basados en la configuración
        const socialHeading = document.querySelector('.home-heading');
        if (!socialHeading) {
            console.error('❌ No se encontró .home-heading');
            return;
        }

        // CORREGIDO: Agregar en orden correcto usando insertBefore con referencia correcta
        let nextReference = socialHeading.nextSibling;
        this.data.socialSection.links.forEach((linkData, index) => {
            console.log(`➕ Agregando red social ${index + 1}: ${linkData.name}`);
            const socialLink = this.createSocialLink(linkData);
            socialHeading.parentNode.insertBefore(socialLink, nextReference);
            nextReference = socialLink.nextSibling;
        });
        
        console.log('✅ Enlaces sociales actualizados correctamente');
    }

    createNavigationLink(title, url, id) {
        const link = document.createElement('a');
        link.href = url;
        link.className = 'main-btn';
        link.id = id;
        link.setAttribute('aria-label', title);
        
        link.innerHTML = `
            <span class="icon-circle">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="chev-right-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </span>
            <span class="btn-text">${title}</span>
            <span class="spacer"></span>
        `;
        
        return link;
    }

    createMainButton(buttonData) {
        const link = document.createElement('a');
        link.href = buttonData.url;
        link.className = 'main-btn';
        link.id = buttonData.id;
        link.setAttribute('aria-label', buttonData.title);
        
        const iconHTML = buttonData.icon ? 
            `<img src="${buttonData.icon}" alt="${buttonData.title}" class="icon-22" />` :
            `<svg viewBox="0 0 24 24" aria-hidden="true" class="chev-right-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>`;
        
        link.innerHTML = `
            <span class="icon-circle">
                ${iconHTML}
            </span>
            <span class="btn-text">${buttonData.title}</span>
            <span class="spacer"></span>
        `;
        
        return link;
    }

    createSocialLink(linkData) {
        const wrapper = document.createElement('a');
        wrapper.href = linkData.url;
        wrapper.target = '_blank';
        wrapper.rel = 'noopener';
        wrapper.className = 'home-only social-link';
        
        const button = document.createElement('button');
        button.className = 'main-btn';
        button.setAttribute('aria-label', linkData.name);
        
        const svgIcon = this.getSocialSVG(linkData.name, linkData.color);
        
        button.innerHTML = `
            <span class="icon-circle">
                ${svgIcon}
            </span>
            <span class="btn-text">${linkData.displayText}</span>
            <span class="spacer"></span>
        `;
        
        wrapper.appendChild(button);
        return wrapper;
    }

    getSocialSVG(platform, color = '#000') {
        const svgs = {
            'WhatsApp': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
            </svg>`,
            'TikTok': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M16 3c.3 2 1.7 3.6 3.6 3.9.3 0 .4.2.4.4v2.2c0 .3-.2.5-.5.5-1.7 0-3.3-.6-4.5-1.6v6.6c0 3-2.4 5.5-5.4 5.7-3.2.2-5.9-2.4-5.9-5.6 0-3.1 2.5-5.6 5.6-5.6.4 0 .8 0 1.1.1.2 0 .3.2.3.4v2.3c0 .2-.2.4-.4.4-.3-.1-.6-.1-.9-.1-1.6 0-2.9 1.4-2.8 3 .1 1.5 1.4 2.7 3 2.7 1.6 0 2.9-1.3 2.9-2.9V3.5c0-.3.2-.5.5-.5H16z"/>
            </svg>`,
            'Instagram': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3a5 5 0 110 10 5 5 0 010-10zm0 2.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zM18.5 6.5a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z"/>
            </svg>`,
            'Facebook': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M13 22v-9h3l.5-3H13V8.5c0-.9.3-1.5 1.7-1.5H16V4.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V10H7v3h3v9h3z"/>
            </svg>`,
            'YouTube': `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
                <path fill="${color}" d="M23.5 7.2c-.3-1.2-1.2-2.1-2.4-2.4C19 4.3 12 4.3 12 4.3s-7 0-9.1.5C1.7 5.1.8 6 .5 7.2.1 9.3.1 12 .1 12s0 2.7.4 4.8c.3 1.2 1.2 2.1 2.4 2.4C5 19.7 12 19.7 12 19.7s7 0 9.1-.5c1.2-.3 2.1-1.2 2.4-2.4.4-2.1.4-4.8.4-4.8s0-2.7-.4-4.8zM9.8 15.5V8.5l6 3.5-6 3.5z"/>
            </svg>`
        };
        
        return svgs[platform] || `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon-22">
            <circle cx="12" cy="12" r="10" fill="${color}"/>
        </svg>`;
    }

    applyFallbackConfiguration() {
        console.log('🔄 Aplicando configuración por defecto...');
        
        // Configuración de emergencia para iconos flotantes
        const container = document.getElementById('floating-icons-container');
        if (container) {
            container.innerHTML = '';
            
            const defaultIcon = {
                id: "fallback",
                text: "Regalos para seguidores",
                url: "regalos/index.html",
                image: "img/icono-carpintero.png",
                position: 1
            };
            
            this.createFloatingIcon(defaultIcon, 0, container);
            
            setTimeout(() => {
                container.classList.add('loaded');
            }, 100);
            
            console.log('✅ Icono flotante por defecto aplicado');
        }
    }

    createDirectButton(buttonData) {
        const link = document.createElement('a');
        link.href = buttonData.url || '#';
        link.className = 'main-btn direct-nav-button';
        link.id = buttonData.id || '';
        link.setAttribute('aria-label', buttonData.title);
        
        link.innerHTML = `
            <span class="icon-circle">
                <svg viewBox="0 0 24 24" aria-hidden="true" class="chev-right-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </span>
            <span class="btn-text">${buttonData.title}</span>
            <span class="spacer"></span>
        `;
        
        return link;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const manager = new MainPageManager();
    manager.init();
});

// Exportar para uso global si es necesario
window.MainPageManager = MainPageManager;