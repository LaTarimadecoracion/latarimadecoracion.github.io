const url = 'https://www.mercadolibre.com.ar/pizarra-pizarron-cartel-doble-hoja-grande-vereda/up/MLAU5156448073';

async function testProxy() {
    console.log('Testing proxy for:', url);
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const r = await fetch(proxyUrl);
    console.log('Status:', r.status);
    const html = await r.text();
    console.log('Length:', html.length);
    console.log('Suspicious?:', html.includes('suspicious-traffic-frontend'));
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : null);

    const imgs = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^\s"'\)]+/gi) || [];
    console.log('Images found:', imgs.length);
    if (imgs.length > 0) {
        console.log('Sample image:', imgs[0]);
    }

    const priceMatch = html.match(/"price"\s*:\s*([0-9.]+)/i);
    console.log('Price match:', priceMatch ? priceMatch[1] : null);
}

testProxy().catch(console.error);
