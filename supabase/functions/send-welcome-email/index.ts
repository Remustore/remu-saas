import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Remu Gestión <noreply@remugestion.ar>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://remugestion.ar';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { email, nombre, tenantId } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#131313 0%,#1a1612 100%);padding:32px 32px 24px;border-bottom:1px solid #1e1e1e;text-align:center">
      <div style="font-family:Georgia,serif;font-size:1.8rem;font-weight:800;color:#c9a84c;letter-spacing:2px">Remu Gestión</div>
      <div style="font-size:.78rem;color:#585044;margin-top:4px;letter-spacing:.5px">Sistema de gestión profesional</div>
    </div>
    <div style="padding:32px">
      <p style="color:#f5f0e8;font-size:1.1rem;font-weight:600;margin:0 0 12px">¡Bienvenido${nombre ? ', ' + nombre : ''}! 🎉</p>
      <p style="color:#a89880;font-size:.9rem;line-height:1.7;margin:0 0 20px">Tu cuenta en Remu Gestión fue creada exitosamente. Tenés <strong style="color:#c9a84c">30 días de prueba gratuita</strong> con acceso completo a todas las funcionalidades.</p>
      <div style="background:#080808;border:1px solid #1e1e1e;border-radius:8px;padding:16px;margin-bottom:24px">
        <div style="font-size:.72rem;color:#585044;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Tus datos de acceso</div>
        <div style="font-size:.88rem;color:#f5f0e8">📧 ${email}</div>
      </div>
      <a href="${APP_URL}" style="display:inline-block;background:#c9a84c;color:#080808;font-weight:700;font-size:.9rem;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">Ingresar al sistema →</a>
      <p style="color:#585044;font-size:.78rem;line-height:1.6;margin:0">¿Necesitás ayuda? Escribinos por <a href="https://wa.me/5493472628087" style="color:#c9a84c">WhatsApp</a> o respondé este email.</p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1e1e1e;text-align:center">
      <p style="color:#2a2a2a;font-size:.7rem;margin:0">© 2026 Remu Gestión · Argentina · <a href="${APP_URL}/terminos.html" style="color:#2a2a2a">Términos</a> · <a href="${APP_URL}/privacidad.html" style="color:#2a2a2a">Privacidad</a></p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '¡Bienvenido a Remu Gestión! Tu cuenta está lista',
        html
      })
    });

    const body = await res.json();
    return new Response(JSON.stringify(body), { status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});
