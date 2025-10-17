// Función para crear botones de producto con estado "Cargando..." si no hay href y cartel NUEVO si corresponde
export function crearBotonProducto(nombre, href, esNuevo = false) {
  const a = document.createElement('a');
  a.className = 'btn-product';
  let nuevoTag = '';
  if (esNuevo) {
    nuevoTag = `<span class="nuevo-tag">NUEVO</span>`;
  }
  if (href) {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `${nuevoTag}<span class="chev-right-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0074D9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </span>${nombre}`;
  } else {
    a.classList.add('loading-link');
    a.innerHTML = `${nuevoTag}<span class="chev-right-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0074D9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </span>${nombre}`;
  }
  return a;
}
