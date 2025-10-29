
let productosData = [];
let categoriaActual = 'todos';
let textoBusqueda = '';

fetch('productos.json')
  .then(res => res.json())
  .then(data => {
    productosData = data;
    mostrarProductos(productosData);
  });

function mostrarProductos(productos) {
  const contenedor = document.getElementById('productos');
  contenedor.innerHTML = '';
  productos.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'producto-card';
    card.innerHTML = `
      <img src="img/${prod.imagen}" alt="${prod.nombre}">
      <h3>${prod.nombre}</h3>
      <p>${prod.descripcion}</p>
    `;
    // Generar nombre de carpeta igual al nombre del producto
    const carpeta = prod.nombre.replace(/\s+/g, ' ').trim();
    card.style.cursor = 'pointer';
    card.onclick = () => {
      window.location.href = `${carpeta}/index.html`;
    };
    contenedor.appendChild(card);
  });
}

function filtrarYMostrar() {
  let filtrados = productosData;
  if (categoriaActual !== 'todos') {
    filtrados = filtrados.filter(prod => prod.nombre === categoriaActual);
  }
  if (textoBusqueda.trim() !== '') {
    filtrados = filtrados.filter(prod => prod.nombre.toLowerCase().includes(textoBusqueda));
  }
  mostrarProductos(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
  // Buscador
  const inputBusqueda = document.getElementById('busqueda');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', e => {
      textoBusqueda = e.target.value.toLowerCase();
      filtrarYMostrar();
    });
  }
  // Filtros por categoría
  const filtroBtns = document.querySelectorAll('.filtro-btn');
  filtroBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActual = btn.dataset.categoria;
      filtroBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtrarYMostrar();
    });
  });
});