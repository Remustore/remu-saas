import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MP_TOKEN      = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL   = 'rensiignacio34@gmail.com';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };

async function notificarPago(nombreNegocio: string, monto: number, payerEmail: string) {
  if (!RESEND_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Remu Gestion <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `💰 Pago activado: ${nombreNegocio}`,
        html: `<p>Se activó la suscripción de <strong>${nombreNegocio}</strong>.</p>
               <p>Monto: $${monto}<br>Email del pagador: ${payerEmail}<br>Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>`
      })
    });
  } catch (e) {
    console.error('[mp-webhook] Error enviando email:', e);
  }
}

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

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Identificar el tenant: primero por external_reference (si vino seteado),
    // si no por el email del pagador (columna tenants.email, o el email de su usuario en Auth)
    let ref = mp.external_reference || '';
    let tenant: { id: string; nombre: string; modulos: any } | null = null;
    const payerEmail = (mp.payer_email || '').toLowerCase();

    if (ref) {
      const { data } = await sb.from('tenants').select('id, nombre, modulos').eq('id', ref).maybeSingle();
      if (data) tenant = data;
    }

    if (!tenant) {
      if (!payerEmail) return new Response('no_ref_no_email', { status: 200, headers: cors });

      const { data: porEmail } = await sb.from('tenants').select('id, nombre, modulos').eq('email', payerEmail).maybeSingle();
      if (porEmail) {
        tenant = porEmail;
      } else {
        // Tenants creados antes de guardar el email: buscar el usuario en Auth y su tenant_id
        const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 });
        const u = (usersPage?.users || []).find(x => (x.email || '').toLowerCase() === payerEmail);
        const tid = u?.user_metadata?.tenant_id;
        if (tid) {
          const { data } = await sb.from('tenants').select('id, nombre, modulos').eq('id', tid).maybeSingle();
          if (data) {
            tenant = data;
            // Backfill para que la próxima notificación matchee directo
            await sb.from('tenants').update({ email: payerEmail }).eq('id', tid);
          }
        }
      }
      if (!tenant) return new Response('tenant_no_encontrado', { status: 200, headers: cors });
      ref = tenant.id;
    }

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

    const monto = mp.auto_recurring?.transaction_amount || mp.transaction_amount || 0;
    await notificarPago(tenant.nombre || ref, monto, payerEmail);

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
