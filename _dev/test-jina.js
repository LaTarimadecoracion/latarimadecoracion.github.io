const targetUrl = 'https://www.mercadolibre.com.ar/pizarra-pizarron-cartel-doble-hoja-grande-vereda/up/MLAU5156448073';

async function testJina() {
    console.log('Testing Jina Reader on:', targetUrl);
    const r = await fetch('https://r.jina.ai/' + targetUrl, {
        headers: {
            'Accept': 'text/plain'
        }
    });

    console.log('Status:', r.status);
    const md = await r.text();
    console.log('Length:', md.length);
    console.log('--- START PREVIEW ---');
    console.log(md.substring(0, 1500));
    console.log('--- END PREVIEW ---');

    const mlImages = md.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^\s\)\"\']+/gi) || [];
    console.log('ML Images found:', mlImages.length);
    console.log('Samples:', [...new Set(mlImages)].slice(0, 5));
}

testJina().catch(console.error);
