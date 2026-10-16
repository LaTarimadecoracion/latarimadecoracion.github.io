const fs = require('fs');

try {
    const html = fs.readFileSync('_dev/dump.html', 'utf8');
    console.log('Dump file size:', html.length);
    console.log('Is suspicious-traffic-frontend?:', html.includes('suspicious-traffic-frontend'));

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : null);

    // Look for price
    const priceMatch = html.match(/andes-money-amount__fraction[^>]*>([0-9.]+)</i);
    console.log('Price fraction match:', priceMatch ? priceMatch[1] : null);

    // Look for description
    const descMatch = html.match(/class="ui-pdp-description__content"[^>]*>([\s\S]*?)<\/div>/i) ||
                      html.match(/class="ui-pdp-description"[^>]*>([\s\S]*?)<\/div>/i);
    console.log('Desc match length:', descMatch ? descMatch[1].length : 0);

    // Look for images
    const imgs = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^\s"'<>\)]+/gi) || [];
    console.log('Total ML images count:', imgs.length);

    const highRes = [...new Set(imgs.map(u => u.replace(/-[A-Z]\.webp$/i, '-O.webp')))]
        .filter(u => !u.includes('frontend-assets'));
    console.log('Clean High-Res images count:', highRes.length);
    console.log('First 5 images:', highRes.slice(0, 5));
} catch (e) {
    console.error(e);
}
