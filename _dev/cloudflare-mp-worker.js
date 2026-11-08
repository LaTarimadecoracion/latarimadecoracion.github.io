/**
 * ============================================================================
 * CLOUDFLARE WORKER — PASARELA DE PAGO MERCADO PAGO PARA LA TARIMA
 * ============================================================================
 * ¿Cómo usarlo gratis en Cloudflare Workers?
 * 1. Entrá a https://dash.cloudflare.com ➔ "Workers & Pages" ➔ "Create Worker".
 * 2. Poné un nombre (ej: `pagos-latarima`) y dale a "Deploy".
 * 3. Tocá "Edit Code", borrá todo y pegá este archivo completo. Dale a "Deploy".
 * 4. Volvé a la pestaña de tu Worker ➔ "Settings" ➔ "Variables and Secrets" ➔ "+ Add".
 *    - Type: Secret
 *    - Variable name: MP_ACCESS_TOKEN
 *    - Value: (Pegá tu Access Token de Producción de Mercado Pago: APP_USR-xxxx...)
 * 5. Copiá la URL de tu Worker (ej: `https://pagos-latarima.tuusuario.workers.dev`)
 *    y pegala en el Panel de Administración de La Tarima ➔ Métodos de Pago ➔ "URL de Pasarela Cloud / Worker".
 * ============================================================================
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const secretToken = env.MP_ACCESS_TOKEN;

      if (!secretToken) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Falta configurar la variable secreta MP_ACCESS_TOKEN en Cloudflare Workers.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const title = String(body.title || 'Pedido La Tarima Carpintería').substring(0, 250);
      const amount = Math.round(Number(body.amount) || 0);
      if (amount <= 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'El monto a cobrar debe ser mayor a $0.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const maxInstallments = parseInt(body.maxInstallments, 10) || 12;
      const originUrl = body.originUrl || 'https://latarimadecoracion.github.io';
      const externalRef = body.externalReference || ('LT-' + Date.now());

      const preferencePayload = {
        items: [
          {
            id: String(body.itemId || 'pedido-latarima'),
            title: title,
            description: String(body.description || title).substring(0, 250),
            quantity: 1,
            currency_id: 'ARS',
            unit_price: amount
          }
        ],
        payer: {
          name: body.payerName || '',
          email: body.payerEmail || 'comprador@latarima.com.ar',
          phone: {
            number: body.payerPhone || ''
          }
        },
        payment_methods: {
          installments: maxInstallments
        },
        back_urls: {
          success: `${originUrl}/?mp_status=approved&ref=${encodeURIComponent(externalRef)}`,
          failure: `${originUrl}/?mp_status=failure&ref=${encodeURIComponent(externalRef)}`,
          pending: `${originUrl}/?mp_status=pending&ref=${encodeURIComponent(externalRef)}`
        },
        auto_return: 'approved',
        external_reference: externalRef,
        statement_descriptor: 'LA TARIMA'
      };

      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencePayload)
      });

      const mpData = await mpRes.json();

      if (!mpRes.ok || (!mpData.init_point && !mpData.sandbox_init_point)) {
        return new Response(JSON.stringify({
          success: false,
          message: mpData.message || 'Mercado Pago rechazó la creación del link.',
          details: mpData
        }), {
          status: mpRes.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const checkoutUrl = (body.mode === 'sandbox' && mpData.sandbox_init_point)
        ? mpData.sandbox_init_point
        : mpData.init_point;

      return new Response(JSON.stringify({
        success: true,
        id: mpData.id,
        init_point: checkoutUrl,
        sandbox_init_point: mpData.sandbox_init_point,
        external_reference: externalRef
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        message: err.message || 'Error interno en el Worker de pagos.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
