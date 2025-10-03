// Pivot renderer genérico para páginas de productos
// Uso: import { renderPivotModule } from '../js/modules/pivot.js'
// renderPivotModule({ moduleId, containerSelector: '#product-stack', medidaLabel: 'Medida', ...opciones })

function normalizeText(s){
  return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function slugify(s){
  return normalizeText(s).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function parseMedidaToTuple(medida){
  if (typeof medida !== 'string' || !medida.trim()) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  const m2 = medida.match(/(\d+)\s*x\s*(\d+)/i);
  if (m2) return [parseInt(m2[1],10), parseInt(m2[2],10)];
  const m1 = medida.match(/(\d+)/);
  if (m1) return [parseInt(m1[1],10), 0];
  return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
}
function uniqueSorted(arr){
  return Array.from(new Set(arr));
}
function parseCantidadTipo(t){
  if (typeof t !== 'string') return null;
  const m = t.match(/^(\d+)(?:\s*un)?$/i);
  return m ? parseInt(m[1],10) : null;
}
function orderTiposAuto(tipos, priority){
  const clean = tipos.filter(Boolean);
  const allCant = clean.length && clean.every(t => parseCantidadTipo(t) !== null);
  if (allCant) return clean.sort((a,b)=>parseCantidadTipo(a)-parseCantidadTipo(b));
  if (priority && priority.length){
    return clean.sort((a,b)=>{
      const na = normalizeText(a); const nb = normalizeText(b);
      const ia = priority.indexOf(na); const ib = priority.indexOf(nb);
      if (ia !== -1 || ib !== -1){
        if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
      }
      return a.localeCompare(b);
    });
  }
  return clean.sort((a,b)=>a.localeCompare(b));
}

async function getModuleRows(moduleId, fetchPath='Links/links.json'){
  try{
    const res = await fetch(fetchPath, { cache: 'no-store' });
    if(!res.ok) return [];
    const json = await res.json();
    const mod = json?.modules?.[moduleId];
    return Array.isArray(mod) ? mod : [];
  }catch(e){
    console.error('Error cargando', fetchPath, e);
    return [];
  }
}

function defaultGroupKey(row){
  return (row?.modelo||'Otros').toString();
}

function defaultImageForModel(basePath, modelKey){
  if (!basePath) return 'img/base.png';
  return `${basePath.replace(/\/$/,'')}/${slugify(modelKey)}.jpg`;
}

function isValidHref(href){
  return !!(href && href.trim() && href !== '#');
}

export async function renderPivotModule(options){
  const {
    moduleId,
    containerSelector = '#product-stack',
    fetchPath = 'Links/links.json',
    medidaLabel = 'Medida',
    tiposOrder = null,          // Array fijo de tipos en orden
    tiposPriority = null,       // Prioridad para ordenar si no se pasa tiposOrder
    groupKeyFn = defaultGroupKey,
    imageBasePath = null,
    imageForModel = null,       // (modelKey) => string
    variantForTipo = null,      // (tipo) => 'primary' | 'secondary'
    selectLabelMap = null,      // { [tipo]: 'Etiqueta' }
    showMissingCombos = true,   // mostrar placeholders para combos inexistentes
    includeMobileSelect = true, // incluir fila select en móvil
    rowFilter = null,           // (row) => boolean, para filtrar filas antes de agrupar
  } = options || {};

  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Aviso si se abre como file://
  if (location.protocol === 'file:'){
    container.innerHTML = `
      <div style="background:#fff3cd;border:1px solid #ffeeba;color:#856404;padding:10px 12px;border-radius:8px;margin-bottom:10px;">
        Para ver los productos cargados en <code>${fetchPath}</code>, abrí el sitio con un servidor local.
      </div>
    `;
  }

  let rows = await getModuleRows(moduleId, fetchPath);
  if (typeof rowFilter === 'function') {
    rows = rows.filter(r => {
      try { return !!rowFilter(r); } catch { return true; }
    });
  }
  if (!rows.length){
    container.innerHTML += `<p style="text-align:center;opacity:.7">Sin productos por ahora. Agregá filas en el módulo <code>${moduleId}</code> dentro de ${fetchPath}</p>`;
    return;
  }

  // Agrupar por modelo (clave configurable)
  const grupos = {};
  rows.forEach(r => {
    const key = groupKeyFn(r);
    (grupos[key] ||= []).push(r);
  });
  const modelos = Object.keys(grupos).sort((a,b)=>a.localeCompare(b));

  // Render por modelo
  modelos.forEach((modelo, idxModel) => {
    const items = grupos[modelo];

    // Medidas
    const medidas = uniqueSorted(items.map(i => (i.medida && i.medida.trim()) ? i.medida : 'Único'))
      .sort((a,b)=>{ const [aw,ah]=parseMedidaToTuple(a); const [bw,bh]=parseMedidaToTuple(b); if (aw!==bw) return aw-bw; if (ah!==bh) return ah-bh; return String(a).localeCompare(String(b)); });

    // Tipos
    let tipos = [];
    if (Array.isArray(tiposOrder) && tiposOrder.length){
      tipos = tiposOrder.filter(Boolean);
    } else {
      const tiposRaw = uniqueSorted(items.map(i => (i.tipo && i.tipo.trim()) ? i.tipo : '').filter(Boolean));
      tipos = orderTiposAuto(tiposRaw, tiposPriority);
    }

    // Mapa medida||tipo -> href
    const mapHref = new Map();
    items.forEach(i => {
      const med = (i.medida && i.medida.trim()) ? i.medida : 'Único';
      const tipo = (i.tipo && i.tipo.trim()) ? i.tipo : null;
      if (!tipo) return;
      const href = i.href || '';
      const key = med + '||' + tipo;
      const exists = mapHref.get(key);
      if (!exists || (!exists.href && href)) {
        mapHref.set(key, { href, present: true });
      }
    });

    // Tarjeta
    const card = document.createElement('div');
    card.className = 'product-card';

    const getImg = () => {
      if (typeof imageForModel === 'function') return imageForModel(modelo);
      return defaultImageForModel(imageBasePath, modelo);
    };

    const ths = [`<th>${medidaLabel}</th>`].concat(tipos.map(t=>`<th>${t}</th>`)).join('');

    const bodyRows = medidas.map((m, idxMed) => {
      // Desktop row
      const desktopCells = tipos.map(t => {
        const entry = mapHref.get(m + '||' + t);
        const href = entry && entry.href ? entry.href : '';
        const variant = typeof variantForTipo === 'function' ? (variantForTipo(t) || 'primary') : 'primary';
        const btn = isValidHref(href)
          ? `<a class="buy-btn ${variant}" href="${href}" target="_blank" rel="noopener">Comprar</a>`
          : `<span class="buy-btn loading-link" tabindex="-1"></span>`;
        return `<td data-label="${t}">${btn}</td>`;
      }).join('');
      const desktopRow = `<tr class="desktop-row"><td>${m}</td>${desktopCells}</tr>`;

      if (!includeMobileSelect) return desktopRow;

      // Mobile select row
      const selectId = `select-${slugify(modelo)}-${idxMed}`;
      const opciones = tipos.map(t => {
        const entry = mapHref.get(m + '||' + t);
        const href = entry && entry.href ? entry.href : '';
        const label = (selectLabelMap && selectLabelMap[t]) || t;
        if (isValidHref(href)) return `<option value="${href}">${label}</option>`;
        return `<option value="" disabled>${label} (Próximamente)</option>`;
      }).join('');

      const mobileRow = `
        <tr class="mobile-select-row">
          <td colspan="${tipos.length + 1}" style="text-align:center;">
            <div style="font-weight:600;font-size:1.08em;margin-bottom:8px;">${m}</div>
            <select id="${selectId}" class="dropbtn">
              <option value="" selected disabled>Elegir opción</option>
              ${opciones}
            </select>
          </td>
        </tr>
      `;
      return desktopRow + mobileRow;
    }).join('');

    card.innerHTML = `
      <div class="product-image">
        <img src="${getImg()}" alt="${modelo}" loading="lazy" onerror="this.onerror=null;this.src='img/base.png'">
      </div>
      <div class="product-card-title">${modelo}</div>
      <table class="product-table">
        <thead><tr>${ths}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `;

    container.appendChild(card);

    // Listeners selects móviles
    if (includeMobileSelect){
      setTimeout(()=>{
        const selects = card.querySelectorAll('.mobile-select-row select');
        selects.forEach(sel => sel.addEventListener('change', function(){
          const url = this.value; if (url) window.open(url, '_blank'); this.selectedIndex = 0;
        }));
      }, 0);
    }
  });
}
