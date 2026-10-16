// js/admin/cajones/cajones-drag.js
// --- UTILIDAD REUTILIZABLE DE DRAG & DROP HORIZONTAL Y VERTICAL ---

(function() {
    'use strict';

    /**
     * Habilita reordenamiento por Drag & Drop en cualquier contenedor de elementos.
     * @param {Object} opts
     * @param {string|HTMLElement} opts.container - Selector o elemento contenedor
     * @param {string} opts.itemSelector - Selector de los elementos hijos que se arrastran
     * @param {string} opts.handleSelector - Selector del icono/handle de arrastre
     * @param {string} [opts.orientation='vertical'] - 'vertical' u 'horizontal'
     * @param {string} [opts.draggingClass='dragging'] - Clase CSS mientras se arrastra
     * @param {Function} [opts.onReorder] - Callback al soltar el elemento reordenado
     */
    function setupDragAndDrop(opts) {
        const container = typeof opts.container === 'string' 
            ? document.querySelector(opts.container) 
            : opts.container;
            
        if (!container) return;

        const itemSelector = opts.itemSelector;
        const handleSelector = opts.handleSelector;
        const isHorizontal = opts.orientation === 'horizontal';
        const draggingClass = opts.draggingClass || 'dragging';

        const items = container.querySelectorAll(itemSelector);
        items.forEach(item => {
            const handle = item.querySelector(handleSelector);
            if (handle) {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    item.setAttribute('draggable', 'true');
                });
                handle.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    item.setAttribute('draggable', 'true');
                });
                handle.addEventListener('mouseup', () => item.setAttribute('draggable', 'false'));
                handle.addEventListener('touchend', () => item.setAttribute('draggable', 'false'));
            }

            item.addEventListener('dragstart', (e) => {
                item.classList.add(draggingClass);
                item.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.id || '');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove(draggingClass);
                item.removeAttribute('draggable');
                item.style.opacity = '1';
                if (typeof opts.onReorder === 'function') {
                    opts.onReorder();
                }
            });
        });

        if (!container.dataset.dragBoundGeneric) {
            container.dataset.dragBoundGeneric = "true";

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = container.querySelector(`.${draggingClass}`);
                if (!draggingItem) return;

                const siblings = [...container.querySelectorAll(`${itemSelector}:not(.${draggingClass})`)];
                const afterElement = siblings.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = isHorizontal 
                        ? (e.clientX - box.left - box.width / 2)
                        : (e.clientY - box.top - box.height / 2);

                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;

                if (afterElement == null) {
                    container.appendChild(draggingItem);
                } else {
                    container.insertBefore(draggingItem, afterElement);
                }
            });
        }
    }

    window.CajonesAdminDrag = {
        setup: setupDragAndDrop
    };
})();
