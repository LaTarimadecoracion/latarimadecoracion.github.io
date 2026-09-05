// js/admin-utils.js
// --- ADMIN UTILS MODULE ---

window.safeAdminRun = function(fn) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            console.error('[Admin Fault Tolerance] Excepción capturada en la administración:', error);
            alert('Ocurrió un error en el panel de administración. Revisa la consola.');
        }
    };
};

    function showAdminToast(msg) {
        let toast = document.getElementById('admin-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'admin-toast';
            toast.className = 'admin-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ═════════════════════════════════════════════════
    //  ADMIN — Link Icon Modal (Nuevo)
    // ═════════════════════════════════════════════════
    let currentRowEditingLink = null;

    // ═════════════════════════════════════════════════
    //  ADMIN — Formulario de Producto (nuevo sistema limpio)
    // ═════════════════════════════════════════════════
    // Estado del formulario: array de objetos que representan cada grupo
    // Cada grupo en memoria tiene: id (dom), pendingFiles, existingImages, coverIndex
    let activeGroupsUI = [];
    let groupCounter = 0;

    // Lógica para cambiar el tamaño/resolución del modal del producto
    function applyModalSize(size) {
        const modalContent = document.getElementById('admin-product-modal-content');
        if (!modalContent) return;
        modalContent.classList.remove('size-sm', 'size-md', 'size-lg');
        modalContent.classList.add(`size-${size}`);

        const sizeTabs = document.querySelectorAll('.modal-size-tab');
        sizeTabs.forEach(tab => {
            if (tab.getAttribute('data-size') === size) {
                tab.classList.add('active');
                tab.style.background = '#FFF';
                tab.style.fontWeight = '600';
                tab.style.color = 'var(--text-main)';
            } else {
                tab.classList.remove('active');
                tab.style.background = 'transparent';
                tab.style.fontWeight = '500';
                tab.style.color = '#64748B';
            }
        });
    }

    // Cargar la preferencia de resolución guardada cuando el DOM está listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const savedSize = localStorage.getItem('adminProductModalSize') || 'sm';
            applyModalSize(savedSize);
        });
    } else {
        const savedSize = localStorage.getItem('adminProductModalSize') || 'sm';
        applyModalSize(savedSize);
    }

    // Delegación global de eventos para modales y elementos dinámicos
    document.addEventListener('click', (e) => {
        // Cancelar edición de producto
        if (e.target && e.target.closest('#btn-cancel-product')) {
            const modal = document.getElementById('admin-product-modal');
            if (modal) modal.style.display = 'none';
        }

        // Pestañas de tamaño de modal de producto
        const sizeTab = e.target && e.target.closest('.modal-size-tab');
        if (sizeTab) {
            const size = sizeTab.getAttribute('data-size');
            applyModalSize(size);
            localStorage.setItem('adminProductModalSize', size);
        }

        // Modal de edición de links - Cancelar
        if (e.target && e.target.closest('#btn-cancel-link-modal')) {
            const linkModal = document.getElementById('admin-link-modal');
            if (linkModal) linkModal.style.display = 'none';
            currentRowEditingLink = null;
        }

        // Modal de edición de links - Guardar
        if (e.target && e.target.closest('#btn-save-link-modal')) {
            if (currentRowEditingLink) {
                const linkLabelInput = document.getElementById('admin-link-label');
                const newLabel = linkLabelInput ? linkLabelInput.value.trim() : '';
                const selectedIconEl = document.querySelector('input[name="admin_link_icon"]:checked');
                const selectedIcon = selectedIconEl ? selectedIconEl.value : 'local_shipping';
                const highlightEl = document.getElementById('admin-link-highlight');
                const isHighlight = highlightEl ? highlightEl.checked : false;

                currentRowEditingLink.dataset.linkLabel = newLabel;
                currentRowEditingLink.dataset.iconType = selectedIcon;
                currentRowEditingLink.dataset.highlight = isHighlight ? 'true' : 'false';
            }
            const linkModal = document.getElementById('admin-link-modal');
            if (linkModal) linkModal.style.display = 'none';
            currentRowEditingLink = null;
        }
    });

    // Helper: Encontrar el elemento más cercano para arrastrar y soltar (Drag and Drop)
