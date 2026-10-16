const url = 'https://www.mercadolibre.com.ar/pizarra-pizarron-cartel-doble-hoja-grande-vereda/up/MLAU5156448073';

async function test() {
    console.log('Testing URL:', url);
    const mlaMatch = url.match(/MLA-?(\d+)/i);
    const mlauMatch = url.match(/MLAU-?(\d+)/i);
    console.log('mlaMatch:', mlaMatch, 'mlauMatch:', mlauMatch);

    const r = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-AR,es;q=0.9'
        }
    });

    console.log('HTTP Status:', r.status);
    const html = await r.text();
    console.log('HTML Length:', html.length);
    console.log('First 300 chars:', html.substring(0, 300));

    // Check LD+JSON
    const ldJsonMatches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    console.log('LD+JSON found count:', ldJsonMatches.length);
    for (const m of ldJsonMatches) {
        try {
            const parsed = JSON.parse(m[1]);
            console.log('Parsed schema type:', parsed['@type']);
            if (parsed.name) console.log('Schema name:', parsed.name);
            if (parsed.image) console.log('Schema image:', parsed.image);
            if (parsed.offers) console.log('Schema offers:', parsed.offers);
            if (parsed.description) console.log('Schema desc:', parsed.description.substring(0, 100));
        } catch(e) {}
    }

    // Look for MLA inside page
    const inPageMla = html.match(/MLA-?\d+/gi);
    console.log('In-page MLAs found:', [...new Set(inPageMla)].slice(0, 5));
}

test().catch(console.error);
