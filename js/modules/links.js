export const LINKS = {
  socials: {
    tiktok: "https://www.tiktok.com/@latarimadecoracion",
    instagram: "https://www.instagram.com/latarimadecoracion",
    facebook: "https://www.facebook.com/latarimadecoracion",
    youtube: "https://www.youtube.com/@latarimadecoracion",
    whatsapp: "https://wa.me/5491167007723"
  },
  pages: {
    home: "index.html",
    links: "links.html",
    calcular: "calcular.html",
    barandasDesmontables: "barandas_desmontables.html",
    barandasFijas: "barandas_fijas.html",
    barandasOrtopedicas: "barandas_ortopedicas.html",
    barandasSommier: "barandas_sommier.html",
    deck: "deck.html",
    estantes: "estantes.html",
    infantiles: "infantiles.html",
    organizadores: "organizadores.html",
    percheros: "percheros.html",
    fanales: "fanales.html",
    stepsCajones: "steps_cajones.html",
    camas: "camas.html",
    viacargo: "envios/viacargo.html",
    viacargoClon: "viacargo-clon.html"
  }
};

export function applyLinks(root=document){
  const map = LINKS;
  root.querySelectorAll('[data-link]').forEach(el => {
    const path = el.getAttribute('data-link');
    const url = path.split('.').reduce((acc, key) => acc ? acc[key] : undefined, map);
    if(url){
      el.setAttribute('href', url);
      if(!el.getAttribute('target')){
        el.setAttribute('target', /^https?:\/\//i.test(url) ? '_blank' : '_self');
      }
      if(/^https?:\/\//i.test(url)){
        el.setAttribute('rel', 'noopener');
      }
    }
  });
}
