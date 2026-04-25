import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Remu Gestión <noreply@remugestion.ar>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://remugestion.ar';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { tenantId, nombre, diasRestantes, mpLink } = await req.json();
    if (!tenantId) return new Response(JSON.stringify({ error: 'tenantId required' }), { status: 400 });

    // Obtener email del owner del tenant via service role
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: users } = await sb.auth.admin.listUsers();
    const owner = users?.users?.find((u: any) => u.user_metadata?.tenant_id === tenantId && u.user_metadata?.rol === 'admin');
    if (!owner?.email) return new Response(JSON.stringify({ skipped: 'no email found' }), { headers: { 'Access-Control-Allow-Origin': '*' } });

    const diasText = diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`;
    const pagoBtn = mpLink
      ? `<a href="${mpLink}" style="display:inline-block;background:#c9a84c;color:#080808;font-weight:700;font-size:.9rem;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:8px">💳 Renovar suscripción →</a>`
      : `<a href="${APP_URL}" style="display:inline-block;background:#c9a84c;color:#080808;font-weight:700;font-size:.9rem;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:8px">Ingresar al sistema →</a>`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#131313 0%,#1a1612 100%);padding:32px 32px 24px;border-bottom:1px solid #1e1e1e;text-align:center">
      <div style="font-family:Georgia,serif;font-size:1.8rem;font-weight:800;color:#c9a84c;letter-spacing:2px">Remu Gestión</div>
    </div>
    <div style="padding:32px">
      <p style="color:#f5f0e8;font-size:1.1rem;font-weight:600;margin:0 0 12px">⏰ Tu período de prueba vence ${diasText}</p>
      <p style="color:#a89880;font-size:.9rem;line-height:1.7;margin:0 0 20px">
        Hola${nombre ? ' ' + nombre : ''}, tu período de prueba gratuita de <strong style="color:#f5f0e8">Remu Gestión</strong> vence ${diasText}.
        Para seguir usando el sistema sin interrupciones, renová tu suscripción.
      </p>
      <div style="background:#0a0a0a;border:1px solid rgba(201,82,76,.3);border-left:3px solid #c9524c;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="color:#a89880;font-size:.85rem;margin:0;line-height:1.6">Si tu suscripción vence y no la renovás, <strong style="color:#f5f0e8">tus datos se conservan por 60 días</strong> — podés volver en cualquier momento.</p>
      </div>
      ${pagoBtn}
      <p style="color:#585044;font-size:.78rem;line-height:1.6;margin:16px 0 0">¿Tenés dudas? Escribinos por <a href="https://wa.me/5493472628087" style="color:#c9a84c">WhatsApp</a>.</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1e1e1e;text-align:center">
      <p style="color:#2a2a2a;font-size:.7rem;margin:0">© 2026 Remu Gestión · Argentina</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [owner.email],
        subject: `⏰ Tu trial de Remu Gestión vence ${diasText}`,
        html
      })
    });

    const body = await res.json();
    return new Response(JSON.stringify(body), { status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
