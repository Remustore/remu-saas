import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MP_TOKEN_PROD = Deno.env.get('MP_ACCESS_TOKEN')      ?? '';
const MP_TOKEN_TEST = Deno.env.get('MP_ACCESS_TOKEN_TEST') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,authorization',
};

const PRECIOS: Record<string, number> = {
  basico:   25000,
  completo: 45000,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { tenantId, tier, email, nombre, test } = await req.json();

    if (!tenantId || !email) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isTest     = test === true;
    const token      = isTest ? MP_TOKEN_TEST : MP_TOKEN_PROD;
    const monto      = isTest ? 100 : (PRECIOS[tier] ?? PRECIOS.completo); // $100 en prueba
    const planNombre = tier === 'basico' ? 'Plan Básico' : 'Plan Completo';

    if (!token) throw new Error(isTest ? 'MP_ACCESS_TOKEN_TEST no configurado' : 'MP_ACCESS_TOKEN no configurado');

    const body = {
      reason:             `${isTest ? '[PRUEBA] ' : ''}remu gestión · ${planNombre} · ${nombre || tenantId}`,
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
    console.log(`[create-mp-preference] ${isTest ? 'TEST ' : ''}Preferencia creada: ${tenantId} | tier: ${tier} | monto: $${monto}`);

    return new Response(JSON.stringify({ init_point: mp.init_point, id: mp.id, test: isTest }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[create-mp-preference] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
