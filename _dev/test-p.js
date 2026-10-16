const testUrl = 'https://mercadolibre.com.ar/pizarra-pizarron-cartel-doble-hoja-grande-vereda/p/MLAU5156448073';

async function run() {
    const r = await fetch(testUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-AR,es;q=0.9'
        }
    });

    console.log('Status /p/:', r.status);
    const html = await r.text();
    console.log('Length:', html.length);
    console.log('Is suspicious-traffic-frontend?:', html.includes('suspicious-traffic-frontend'));

    // Test Google cache or open scrapers
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Title match:', titleMatch ? titleMatch[1] : null);
}

run().catch(console.error);
