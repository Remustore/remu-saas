import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MP_TOKEN_PROD = Deno.env.get('MP_ACCESS_TOKEN')      ?? '';
const MP_TOKEN_TEST = Deno.env.get('MP_ACCESS_TOKEN_TEST') ?? '';

// Precio único del plan — cambiar acá para todos
const PRECIO_PLAN = 10000;

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

    const body = {
      reason:             `${isTest ? '[PRUEBA] ' : ''}Remu Gestión · Plan Completo · ${nombre || tenantId}`,
      external_reference: tenantId,
      payer_email:        email,
      auto_recurring: {
        frequency:          1,
        frequency_type:     'months',
        transaction_amount: monto,
        currency_id:        'ARS',
      },
      back_url:         'https://remugestion.ar?mp_ok=1',
      notification_url: 'https://xycagqxhpwrbdurrjkdl.supabase.co/functions/v1/mp-webhook',
      status:           'pending',
    };

    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      throw new Error(`MP error ${mpRes.status}: ${err}`);
    }

    const mp = await mpRes.json();
    console.log(`[create-mp-preference] ${isTest ? 'TEST ' : ''}OK: ${tenantId} | $${monto} | sub: ${mp.id}`);

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
