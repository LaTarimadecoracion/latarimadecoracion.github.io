/**
 * ============================================================================
 * CLOUDFLARE WORKER — PASARELA MERCADO PAGO + GESTOR DE PEDIDOS (KV)
 * ============================================================================
 * LA TARIMA DECORACIÓN
 * ============================================================================
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // -------------------------------------------------------------
      // 1. GET / o GET /status — Chequeo de salud del Worker
      // -------------------------------------------------------------
      if (request.method === 'GET' && (path === '/' || path === '/status')) {
        return new Response(JSON.stringify({
          success: true,
          service: 'La Tarima Cloudflare Worker (MP + Tracking)',
          kv_ready: !!env.ORDERS_KV,
          mp_ready: !!env.MP_ACCESS_TOKEN,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 2. GET /pedidos?id=LT-... — Consulta de estado de pedido (Cliente)
      // -------------------------------------------------------------
      if (request.method === 'GET' && path.startsWith('/pedidos')) {
        const orderId = url.searchParams.get('id');
        if (!orderId) {
          return new Response(JSON.stringify({ success: false, message: 'Falta parámetro ?id=' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!env.ORDERS_KV) {
          return new Response(JSON.stringify({ success: false, message: 'Base de datos KV no conectada' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const raw = await env.ORDERS_KV.get('order:' + orderId);
        if (!raw) {
          return new Response(JSON.stringify({ success: false, message: 'Pedido no encontrado' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const order = JSON.parse(raw);
        return new Response(JSON.stringify({ success: true, order }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 3. GET /admin/pedidos — Listado de pedidos para el Admin
      // -------------------------------------------------------------
      if (request.method === 'GET' && path === '/admin/pedidos') {
        if (!env.ORDERS_KV) {
          return new Response(JSON.stringify({ success: false, message: 'KV no configurado' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const list = await env.ORDERS_KV.list({ prefix: 'order:' });
        const orders = [];
        for (const key of list.keys) {
          const itemRaw = await env.ORDERS_KV.get(key.name);
          if (itemRaw) {
            try { orders.push(JSON.parse(itemRaw)); } catch (_) {}
          }
        }

        // Ordenar por fecha descendente (más nuevos primero)
        orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return new Response(JSON.stringify({ success: true, count: orders.length, orders }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 4. POST /admin/pedidos/status — Cambiar estado de pedido (Admin)
      // -------------------------------------------------------------
      if (request.method === 'POST' && path === '/admin/pedidos/status') {
        const body = await request.json();
        const { orderId, newStatus, note } = body;
        if (!orderId || !newStatus) {
          return new Response(JSON.stringify({ success: false, message: 'Faltan campos orderId o newStatus' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!env.ORDERS_KV) {
          return new Response(JSON.stringify({ success: false, message: 'KV no configurado' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const key = 'order:' + orderId;
        const currentRaw = await env.ORDERS_KV.get(key);
        if (!currentRaw) {
          return new Response(JSON.stringify({ success: false, message: 'Pedido no existe' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const order = JSON.parse(currentRaw);
        order.status = newStatus;
        order.updatedAt = Date.now();
        if (note) {
          order.notes = order.notes || [];
          order.notes.push({ text: note, at: Date.now() });
        }

        await env.ORDERS_KV.put(key, JSON.stringify(order));
        return new Response(JSON.stringify({ success: true, order }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 4b. POST /admin/pedidos/delete — Eliminar pedido de KV (Admin)
      // -------------------------------------------------------------
      if (request.method === 'POST' && path === '/admin/pedidos/delete') {
        const body = await request.json();
        const { orderId } = body;
        if (!orderId) {
          return new Response(JSON.stringify({ success: false, message: 'Falta orderId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (env.ORDERS_KV) {
          await env.ORDERS_KV.delete('order:' + orderId);
        }

        return new Response(JSON.stringify({ success: true, deleted: orderId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 4c. POST /pedidos/transferencia — Registrar pedido por Transferencia Bancaria
      // -------------------------------------------------------------
      if (request.method === 'POST' && (path === '/pedidos/transferencia' || path === '/api/pedidos/transferencia')) {
        const body = await request.json();
        const amount = Math.round(Number(body.amount) || 0);
        const title = String(body.title || 'Pedido por Transferencia - La Tarima').substring(0, 250);
        const externalRef = body.externalReference || ('LT-' + Date.now().toString().slice(-6));

        const orderRecord = {
          id: externalRef,
          title: title,
          amount: amount,
          clientName: body.payerName || body.clientName || 'Cliente',
          clientPhone: body.payerPhone || body.clientPhone || '',
          clientEmail: body.payerEmail || body.clientEmail || '',
          shippingAddress: body.shippingAddress || '',
          shippingMethod: body.shippingMethod || 'retira',
          shippingCost: Number(body.shippingCost) || 0,
          shippingLabel: body.shippingLabel || '',
          status: 'pendiente_de_confirmacion',
          paymentStatus: 'pendiente',
          paymentMethod: 'transferencia',
          transferAccount: body.transferAccount || 'general',
          userNotes: body.userNotes || '',
          cartItems: body.cartItems || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        if (env.ORDERS_KV) {
          try {
            await env.ORDERS_KV.put('order:' + externalRef, JSON.stringify(orderRecord));
          } catch (kvErr) {
            console.error('Error guardando pedido de transferencia en KV:', kvErr);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          id: externalRef,
          order: orderRecord
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 5. POST /webhook — Webhook de Mercado Pago (IPN)
      // -------------------------------------------------------------
      if (request.method === 'POST' && (path === '/webhook' || path === '/api/mercadopago/webhook')) {
        let topic = url.searchParams.get('topic') || url.searchParams.get('type');
        let paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');

        try {
          const hookBody = await request.json();
          if (hookBody) {
            topic = topic || hookBody.type || hookBody.topic;
            paymentId = paymentId || (hookBody.data && hookBody.data.id) || hookBody.id;
          }
        } catch (_) {}

        if ((topic === 'payment' || topic === 'merchant_order') && paymentId && env.MP_ACCESS_TOKEN && env.ORDERS_KV) {
          try {
            const mpPaymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
            });
            if (mpPaymentRes.ok) {
              const payData = await mpPaymentRes.json();
              const extRef = payData.external_reference;
              if (extRef) {
                const orderKey = 'order:' + extRef;
                const existingRaw = await env.ORDERS_KV.get(orderKey);
                if (existingRaw) {
                  const existingOrder = JSON.parse(existingRaw);
                  existingOrder.paymentStatus = payData.status; // approved, rejected, in_process
                  existingOrder.paymentId = payData.id;
                  if (payData.status === 'approved') {
                    existingOrder.status = 'pago_confirmado';
                  }
                  existingOrder.updatedAt = Date.now();
                  await env.ORDERS_KV.put(orderKey, JSON.stringify(existingOrder));
                }
              }
            }
          } catch (e) {
            console.error('Error procesando webhook de MP:', e);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // -------------------------------------------------------------
      // 6. POST / (o /crear-pago) — Crear Preferencia de Mercado Pago + Guardar en KV
      // -------------------------------------------------------------
      if (request.method === 'POST') {
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
        const rawOriginUrl = body.originUrl || 'https://latarimadecoracion.github.io';
        const isPublicHttpsOrigin = /^https:\/\//i.test(rawOriginUrl) && !/localhost|127\.0\.0\.1|192\.168\./i.test(rawOriginUrl);
        const safeBackOrigin = isPublicHttpsOrigin ? rawOriginUrl : 'https://latarimadecoracion.github.io';
        
        // Código de seguimiento único #LT-XXXXX
        const externalRef = body.externalReference || ('LT-' + Date.now().toString().slice(-6));

        // URL base de este mismo worker para el webhook automático
        const workerOrigin = `${url.protocol}//${url.host}`;
        const notificationUrl = `${workerOrigin}/webhook`;

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
            success: `${safeBackOrigin}/?mp_status=approved&ref=${encodeURIComponent(externalRef)}`,
            failure: `${safeBackOrigin}/?mp_status=failure&ref=${encodeURIComponent(externalRef)}`,
            pending: `${safeBackOrigin}/?mp_status=pending&ref=${encodeURIComponent(externalRef)}`
          },
          auto_return: 'approved',
          notification_url: notificationUrl,
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

        // Guardar pedido inicial en base de datos KV (si está conectada)
        if (env.ORDERS_KV) {
          const orderRecord = {
            id: externalRef,
            title: title,
            amount: amount,
            clientName: body.payerName || 'Cliente',
            clientPhone: body.payerPhone || '',
            clientEmail: body.payerEmail || '',
            status: 'pendiente_de_pago',
            paymentStatus: 'pending',
            preferenceId: mpData.id,
            paymentMethod: body.paymentMethod || 'mercadopago',
            cartItems: body.cartItems || [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          try {
            await env.ORDERS_KV.put('order:' + externalRef, JSON.stringify(orderRecord));
          } catch (kvErr) {
            console.error('Error guardando en KV:', kvErr);
          }
        }

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
      }

      return new Response(JSON.stringify({ success: false, message: 'Ruta no encontrada' }), {
        status: 404,
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
