import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MP_TOKEN_PROD = Deno.env.get('MP_ACCESS_TOKEN')      ?? '';
const MP_TOKEN_TEST = Deno.env.get('MP_ACCESS_TOKEN_TEST') ?? '';

// Plan de suscripción mensual creado en MP (creado una sola vez con setup-mp-plan)
const MP_PLAN_ID   = '5d98f94b739046ce97fadcf1b1353373';
const PRECIO_PLAN  = 10000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { tenantId, email, nombre, test } = await req.json();

    if (!tenantId || !email) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros: tenantId y email son requeridos' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isTest = test === true;
    const token  = isTest ? MP_TOKEN_TEST : MP_TOKEN_PROD;
    const monto  = isTest ? 100 : PRECIO_PLAN;

    if (!token) {
      throw new Error(isTest
        ? 'MP_ACCESS_TOKEN_TEST no configurado en Supabase secrets'
        : 'MP_ACCESS_TOKEN no configurado en Supabase secrets'
      );
    }

    // Checkout Pro — cualquier cuenta de MP puede pagar, sin restricción de email
    // TODO: cambiar a plan de suscripción (MP_PLAN_ID) una vez que expire el rate limit de /preapproval
    const body = {
      items: [{
        title:       `${isTest ? '[PRUEBA] ' : ''}Remu Gestión · Plan Completo`,
        description: `Suscripción mensual — ${nombre || tenantId}`,
        quantity:    1,
        unit_price:  monto,
        currency_id: 'ARS',
      }],
      external_reference: tenantId,
      back_url:           'https://remugestion.ar?mp_ok=1',
      notification_url:   'https://xycagqxhpwrbdurrjkdl.supabase.co/functions/v1/mp-webhook',
      auto_return:        'approved',
    };
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`MP error ${r.status}: ${await r.text()}`);
    const mp = await r.json();

    console.log(`[create-mp-preference] ${isTest ? 'TEST ' : ''}OK: ${tenantId} | $${monto} | id: ${mp.id}`);

    return new Response(JSON.stringify({ init_point: mp.init_point, id: mp.id, monto, test: isTest }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[create-mp-preference] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
