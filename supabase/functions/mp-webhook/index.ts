import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MP_TOKEN      = Deno.env.get('MP_ACCESS_TOKEN') ?? '';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url  = new URL(req.url);
    const tipo = url.searchParams.get('type') || '';
    const id   = url.searchParams.get('id')   || '';

    // MP solo notifica suscripciones con type=subscription_preapproval
    if (tipo !== 'subscription_preapproval' || !id) {
      return new Response('ignored', { status: 200, headers: cors });
    }

    // Consultar MP para verificar el estado real del pago
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` }
    });
    if (!mpRes.ok) throw new Error(`MP API error: ${mpRes.status}`);
    const mp = await mpRes.json();

    // Solo activar si la suscripción está autorizada/activa
    if (mp.status !== 'authorized') {
      return new Response('not_authorized', { status: 200, headers: cors });
    }

    // Buscar el tenant por el ref que se pasa en external_reference
    const ref = mp.external_reference || '';
    if (!ref) return new Response('no_ref', { status: 200, headers: cors });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Obtener tenant actual para leer módulos existentes
    const { data: tenant, error: tErr } = await sb
      .from('tenants').select('modulos').eq('id', ref).single();
    if (tErr || !tenant) throw new Error(`Tenant no encontrado: ${ref}`);

    const ahora = new Date().toISOString();
    const nuevo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const mods  = {
      ...(tenant.modulos || {}),
      pago_activo:   true,
      trial_hasta:   nuevo,
      ultimo_pago:   ahora,
      mp_sub_id:     id,
      origen_pago:   'webhook'
    };

    const { error: uErr } = await sb
      .from('tenants').update({ modulos: mods, activo: true }).eq('id', ref);
    if (uErr) throw new Error(uErr.message);

    console.log(`[mp-webhook] Tenant activado: ${ref} | sub: ${id}`);
    return new Response(JSON.stringify({ ok: true, tenant: ref }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('[mp-webhook] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
