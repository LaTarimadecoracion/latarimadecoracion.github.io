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
    const linkModal = document.getElementById('admin-link-modal');
    const linkLabelInput = document.getElementById('admin-link-label');
    const btnCancelLinkModal = document.getElementById('btn-cancel-link-modal');
    const btnSaveLinkModal = document.getElementById('btn-save-link-modal');
    
    let currentRowEditingLink = null;

    if (linkModal) {
        btnCancelLinkModal.addEventListener('click', () => {
            linkModal.style.display = 'none';
            currentRowEditingLink = null;
        });

        btnSaveLinkModal.addEventListener('click', () => {
            if (currentRowEditingLink) {
                const newLabel = linkLabelInput.value.trim();
                const selectedIconEl = document.querySelector('input[name="admin_link_icon"]:checked');
                const selectedIcon = selectedIconEl ? selectedIconEl.value : 'local_shipping';
                const isHighlight = document.getElementById('admin-link-highlight').checked;
                
                currentRowEditingLink.dataset.linkLabel = newLabel;
                currentRowEditingLink.dataset.iconType = selectedIcon;
                currentRowEditingLink.dataset.highlight = isHighlight ? 'true' : 'false';
            }
            linkModal.style.display = 'none';
            currentRowEditingLink = null;
        });
    }

    // ═════════════════════════════════════════════════
    //  ADMIN — Formulario de Producto (nuevo sistema limpio)
    // ═════════════════════════════════════════════════
    const productModal      = document.getElementById('admin-product-modal');
    const adminFormTitle    = document.getElementById('admin-form-title');
    const btnCancelProduct  = document.getElementById('btn-cancel-product');
    const adminAcabadosGroupsContainer = document.getElementById('admin-acabados-groups');
    const btnAddAcabadoGroup = document.getElementById('btn-add-acabado-group');

    // Estado del formulario: array de objetos que representan cada grupo
    // Cada grupo en memoria tiene: id (dom), pendingFiles, existingImages, coverIndex
    let activeGroupsUI = [];
    let groupCounter = 0;

    if (btnCancelProduct) {
        btnCancelProduct.addEventListener('click', () => { productModal.style.display = 'none'; });
    }

    // Lógica para cambiar el tamaño/resolución del modal del producto
    const modalContent = document.getElementById('admin-product-modal-content');
    const sizeTabs = document.querySelectorAll('.modal-size-tab');

    function applyModalSize(size) {
        if (!modalContent) return;
        modalContent.classList.remove('size-sm', 'size-md', 'size-lg');
        modalContent.classList.add(`size-${size}`);

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

    // Cargar la preferencia de resolución guardada
    const savedSize = localStorage.getItem('adminProductModalSize') || 'sm';
    applyModalSize(savedSize);

    sizeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const size = tab.getAttribute('data-size');
            applyModalSize(size);
            localStorage.setItem('adminProductModalSize', size);
        });
    });

    // Helper: Encontrar el elemento más cercano para arrastrar y soltar (Drag and Drop)
