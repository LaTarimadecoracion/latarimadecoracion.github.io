// Almacén de enlaces por módulo (persistido en localStorage)
const KEY = 'links_store_v1';
const OLD_KEY_PREFIX = 'links_store'; // p.ej.: 'links_store', 'links_store_v0'

function migrateOldKeysIfNeeded(){
  try{
    // Si ya existe la clave nueva, no migrar
    if(localStorage.getItem(KEY)) return;
    // Buscar cualquier clave que empiece con 'links_store' (excepto la v1 actual)
    let candidate = null;
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k === KEY) continue;
      if(k === OLD_KEY_PREFIX || (k.startsWith(OLD_KEY_PREFIX + '_v') || k === 'links_store_v0')){
        const raw = localStorage.getItem(k);
        if(!raw) continue;
        try{
          const obj = JSON.parse(raw);
          // Validar forma básica
          if(obj && typeof obj === 'object'){
            // Preferir el primer candidato válido encontrado
            candidate = obj;
            break;
          }
        }catch(_){ /* ignorar parse inválido */ }
      }
    }
    if(candidate){
      // Normalizar estructura mínima
      if(!candidate.modules || typeof candidate.modules !== 'object'){
        candidate.modules = {};
      }
      localStorage.setItem(KEY, JSON.stringify(candidate));
    }
  }catch(_){ /* ignorar errores de acceso */ }
}

function readStore(){
  try{
    migrateOldKeysIfNeeded();
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}

function writeStore(store){
  try{
    localStorage.setItem(KEY, JSON.stringify(store));
  }catch(e){
    // ignorar
  }
}

export function ensureStore(){
  const s = readStore();
  if(!s.modules){ s.modules = {}; }
  writeStore(s);
  return s;
}

export function getStore(){
  return readStore();
}

export function setStore(store){
  writeStore(store);
}

export function getModuleLinks(moduleId){
  const s = readStore();
  return (s.modules && s.modules[moduleId]) || [];
}

export function setModuleLinks(moduleId, links){
  const s = readStore();
  if(!s.modules) s.modules = {};
  s.modules[moduleId] = links;
  writeStore(s);
}
