// Test para normalizeTransaction (mimic de app.js)
function normalizeTransaction(t) {
    const tx = Object.assign({}, t);
    if (tx.amount === undefined || tx.amount === null) {
        tx.amount = 0;
    }
    if (typeof tx.amount === 'string') {
        let s = tx.amount.replace(/[^0-9,\.-]/g, '');
        if (s.includes('.') && s.includes(',')) {
            s = s.replace(/\./g, '').replace(/,/g, '.');
        } else if (s.includes(',')) {
            s = s.replace(/,/g, '.');
        } else if (s.includes('.')) {
            const parts = s.split('.');
            if (parts.length === 2) {
                // Un único punto: tratar siempre como decimal
                s = parts.join('.');
            } else {
                // Múltiples puntos: eliminar como separadores de miles
                s = parts.join('');
            }
        }
        const n = parseFloat(s);
        tx.amount = isNaN(n) ? 0 : n;
    } else if (typeof tx.amount === 'number') {
        // ok
    } else {
        const n = parseFloat(tx.amount);
        tx.amount = isNaN(n) ? 0 : n;
    }
    return tx;
}

const tests = [
    '20.20',
    '20,20',
    '1.234,56',
    '1.234.567',
    '1234.56',
    '1500',
    '20.2',
    '20.222',
    '2.020',
    '2,020' // ambiguous
];

console.log('Probando normalización de montos:');
for (const s of tests) {
    const r = normalizeTransaction({ amount: s });
    console.log(`${s} -> ${r.amount}`);
}
