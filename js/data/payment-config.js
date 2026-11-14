// js/data/payment-config.js
// --- PAYMENT CONFIGURATION DATABASE ---
// Overwritten automatically by the Node server. DO NOT EDIT MANUALLY.

window.sessionPaymentConfig = {
    "transfer": {
        "active": true,
        "alias": "VENUS.PULMON.METRO",
        "cbu": "0720048988000002273736",
        "bank": "Banco Santander",
        "titular": "Yonatan Lucas Orellana",
        "cuit": "20-35281538-2",
        "discountPercent": 5
    },
    "transferCecilia": {
        "active": true,
        "alias": "latarima.deco",
        "cbu": "0000003100152918804776",
        "bank": "Mercado Pago",
        "titular": "Cecilia Beatriz Cerón",
        "cuit": "27-28767339-1",
        "discountPercent": 5
    },
    "mercadopago": {
        "active": true,
        "mode": "production",
        "publicKey": "APP_USR-be803e20-9c32-45f1-8354-8691ea7fa550",
        "accessToken": "",
        "workerUrl": "",
        "surchargePercent": 0,
        "creditSurchargePercent": 0,
        "maxInstallments": 12,
        "hasLocalSecret": true
    }
};
