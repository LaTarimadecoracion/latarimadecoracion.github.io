// Config remota de enlaces públicos (opcional)
// Pega aquí la URL "raw" de tu Gist (links.json) para que TODAS las páginas
// lean directamente desde allí sin tener que subir archivos al repo.
// Ejemplo: https://gist.githubusercontent.com/usuario/abcdef123/raw/links.json
// Si se deja vacío, las páginas caerán a los otros métodos (links.html embebido, data/links.json, etc.).

window.LT_LINKS_REMOTE = window.LT_LINKS_REMOTE || {
  // Desactivado: forzar uso de data/links.json como fuente única
  rawUrl: ""
};
