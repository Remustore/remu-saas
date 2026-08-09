import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL      = Deno.env.get('FROM_EMAIL') ?? 'Remu Gestión <noreply@remugestion.ar>';
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { tenantId, emailDestino, nombreNegocio } = await req.json();
    if (!tenantId || !emailDestino) {
      return new Response(JSON.stringify({ error: 'tenantId y emailDestino requeridos' }), { status: 400, headers: CORS });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const hoy = new Date().toISOString().slice(0, 10);
    const mesActual = hoy.slice(0, 7); // "2026-08"

    // Turnos del mes actual terminados
    const { data: turnos } = await sb
      .from('turnos_solicitudes')
      .select('fecha, hora, cliente, servicio, precio, empleado_nombre, estado, metodo_pago')
      .eq('tenant_id', tenantId)
      .eq('estado', 'terminado')
      .gte('fecha', mesActual + '-01')
      .order('fecha').order('hora');

    // Turnos próximos 7 días (pendientes/confirmados)
    const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { data: proximos } = await sb
      .from('turnos_solicitudes')
      .select('fecha, hora, cliente, servicio, empleado_nombre, estado')
      .eq('tenant_id', tenantId)
      .in('estado', ['confirmado', 'pendiente'])
      .gte('fecha', hoy)
      .lte('fecha', en7dias)
      .order('fecha').order('hora');

    const lista = turnos ?? [];
    const listaProx = proximos ?? [];

    // Agrupar por empleada
    const porEmp: Record<string, { turnos: number; total: number }> = {};
    let totalMes = 0;
    for (const t of lista) {
      const emp = t.empleado_nombre || 'Sin asignar';
      if (!porEmp[emp]) porEmp[emp] = { turnos: 0, total: 0 };
      porEmp[emp].turnos++;
      porEmp[emp].total += Number(t.precio) || 0;
      totalMes += Number(t.precio) || 0;
    }

    const empRows = Object.entries(porEmp)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([nombre, d]) => `
        <tr>
          <td style="padding:10px 14px;color:#f5f0e8;font-weight:600">${nombre}</td>
          <td style="padding:10px 14px;color:#a89880;text-align:center">${d.turnos}</td>
          <td style="padding:10px 14px;color:#c9a84c;font-weight:700;text-align:right">${fmt(d.total)}</td>
        </tr>`).join('');

    const proxRows = listaProx.slice(0, 15).map(t => `
      <tr>
        <td style="padding:7px 14px;color:#a89880;font-size:.82rem">${t.fecha} ${t.hora}</td>
        <td style="padding:7px 14px;color:#f5f0e8;font-size:.82rem">${t.cliente || ''}</td>
        <td style="padding:7px 14px;color:#a89880;font-size:.82rem">${t.empleado_nombre || ''}</td>
        <td style="padding:7px 14px;font-size:.82rem"><span style="background:${t.estado==='confirmado'?'rgba(76,175,125,.15)':'rgba(201,168,76,.12)'};color:${t.estado==='confirmado'?'#4caf7d':'#c9a84c'};padding:2px 8px;border-radius:10px">${t.estado}</span></td>
      </tr>`).join('');

    const mesNombre = new Date(mesActual + '-01').toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#131313 0%,#1a1612 100%);padding:28px 32px;border-bottom:1px solid #1e1e1e;text-align:center">
    <div style="font-family:Georgia,serif;font-size:1.6rem;font-weight:800;color:#c9a84c;letter-spacing:2px">Remu Gestión</div>
    <div style="color:#585044;font-size:.8rem;margin-top:4px">Backup diario automático · ${hoy}</div>
  </div>

  <div style="padding:28px 32px">
    <p style="color:#f5f0e8;font-size:1rem;font-weight:600;margin:0 0 4px">📊 Resumen de ${mesNombre}</p>
    <p style="color:#585044;font-size:.82rem;margin:0 0 20px">${nombreNegocio || 'Tu negocio'}</p>

    <!-- Total mes -->
    <div style="background:#0a0a0a;border:1px solid #1e1e1e;border-radius:10px;padding:18px 20px;margin-bottom:20px;text-align:center">
      <div style="color:#585044;font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Total facturado este mes</div>
      <div style="font-family:Georgia,serif;font-size:2rem;font-weight:800;color:#c9a84c">${fmt(totalMes)}</div>
      <div style="color:#585044;font-size:.78rem;margin-top:4px">${lista.length} servicios terminados</div>
    </div>

    <!-- Por empleada -->
    ${empRows ? `
    <p style="color:#a89880;font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;margin:0 0 8px;font-weight:600">Por profesional</p>
    <table style="width:100%;border-collapse:collapse;background:#0a0a0a;border:1px solid #1e1e1e;border-radius:10px;overflow:hidden;margin-bottom:24px">
      <thead>
        <tr style="border-bottom:1px solid #1e1e1e">
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:left;font-weight:600;text-transform:uppercase">Profesional</th>
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:center;font-weight:600;text-transform:uppercase">Turnos</th>
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:right;font-weight:600;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>${empRows}</tbody>
    </table>` : ''}

    <!-- Próximos turnos -->
    ${proxRows ? `
    <p style="color:#a89880;font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;margin:0 0 8px;font-weight:600">Próximos turnos (7 días)</p>
    <table style="width:100%;border-collapse:collapse;background:#0a0a0a;border:1px solid #1e1e1e;border-radius:10px;overflow:hidden;margin-bottom:24px">
      <thead>
        <tr style="border-bottom:1px solid #1e1e1e">
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:left;font-weight:600;text-transform:uppercase">Fecha</th>
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:left;font-weight:600;text-transform:uppercase">Cliente</th>
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:left;font-weight:600;text-transform:uppercase">Profesional</th>
          <th style="padding:8px 14px;color:#585044;font-size:.7rem;text-align:left;font-weight:600;text-transform:uppercase">Estado</th>
        </tr>
      </thead>
      <tbody>${proxRows}</tbody>
    </table>` : '<p style="color:#585044;font-size:.82rem;margin-bottom:24px">Sin turnos agendados para los próximos 7 días.</p>'}

    <div style="background:#0a0a0a;border:1px solid rgba(76,175,125,.2);border-left:3px solid #4caf7d;border-radius:8px;padding:14px 16px">
      <p style="color:#4caf7d;font-size:.82rem;margin:0;font-weight:600">✓ Datos respaldados en la nube</p>
      <p style="color:#585044;font-size:.78rem;margin:4px 0 0;line-height:1.5">Todos los turnos están guardados en Supabase. Este email es un resumen adicional de seguridad.</p>
    </div>
  </div>

  <div style="padding:16px 32px;border-top:1px solid #1e1e1e;text-align:center">
    <p style="color:#2a2a2a;font-size:.7rem;margin:0">Remu Gestión · remugestion.ar · Backup automático diario</p>
  </div>
</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(emailDestino) ? emailDestino : [emailDestino], subject: `📊 Backup diario — ${nombreNegocio || 'Remu'} · ${hoy}`, html })
    });

    const body = await res.json();
    return new Response(JSON.stringify(body), { status: res.status, headers: { 'Content-Type': 'application/json', ...CORS } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
});
