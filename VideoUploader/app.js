function uploadToYoutube() {
    document.getElementById('result').innerText = 'Función de subida a YouTube simulada (requiere integración API).';
}

function uploadToInstagram() {
    document.getElementById('result').innerText = 'Función de subida a Instagram simulada (requiere integración API y cuenta profesional).';
}

function mostrarTikToks() {
    const links = document.getElementById('tiktokLinks').value.split('\n').map(l => l.trim()).filter(l => l);
    const contenedor = document.getElementById('tiktokVideos');
    contenedor.innerHTML = '';
    links.forEach(link => {
        // Extraer el ID del video de TikTok
        const match = link.match(/tiktok\.com\/(?:@[^\/]+\/video\/|v\/)(\d+)/);
        if (match) {
            const id = match[1];
            const embed = `<iframe src="https://www.tiktok.com/embed/${id}" width="325" height="575" frameborder="0" allowfullscreen></iframe>`;
            contenedor.innerHTML += `<div style='margin-bottom:20px;'>${embed}</div>`;
        } else {
            contenedor.innerHTML += `<div style='color:red;'>Enlace inválido: ${link}</div>`;
        }
    });
}
