import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (!MP_TOKEN) {
    return new Response(JSON.stringify({ error: 'MP_ACCESS_TOKEN no configurado' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason:         'Remu Gestión · Plan Completo',
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: 10000,
          currency_id:        'ARS',
        },
        back_url: 'https://remugestion.ar?mp_ok=1',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `MP ${res.status}`, detail: data }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    console.log('[setup-mp-plan] Plan creado:', data.id);

    return new Response(JSON.stringify({
      ok:         true,
      plan_id:    data.id,
      init_point: data.init_point,
      status:     data.status,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
