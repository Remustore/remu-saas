import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };

// Piloto: asistente habilitado solo para estos tenants (Rocaspana, peluquería + manicura)
const TENANTS_PERMITIDOS = [
  '53ff91e9-27ba-4337-a5cd-c3c70fa9d862',
  'eb2cba64-e143-42fc-8178-c03678400281'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { tenantId, pregunta } = await req.json();
    if (!tenantId || !pregunta) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!TENANTS_PERMITIDOS.includes(tenantId)) {
      return new Response(JSON.stringify({ error: 'El asistente todavía no está disponible para este negocio' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: 'El asistente no está configurado todavía' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tenant } = await sb.from('tenants').select('nombre, rubro').eq('id', tenantId).maybeSingle();

    const hoy    = new Date().toISOString().slice(0, 10);
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const en14   = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const { data: turnos } = await sb.from('turnos_solicitudes')
      .select('nombre,fecha,hora,estado,precio,servicio_nombre,empleado_nombre')
      .eq('tenant_id', tenantId)
      .neq('estado', 'bloqueado')
      .gte('fecha', hace30).lte('fecha', en14)
      .order('fecha', { ascending: true }).order('hora', { ascending: true })
      .limit(500);

    const datos = (turnos || []).map(t => ({
      f: t.fecha, h: (t.hora || '').substring(0, 5), cli: t.nombre,
      srv: t.servicio_nombre, emp: t.empleado_nombre, estado: t.estado, precio: t.precio
    }));

    // Catálogo de servicios y precios cargados (para presupuestos)
    const cfgRowId = parseInt(tenantId.replace(/-/g, '').substring(0, 8), 16) % 1000000 + 9999;
    const { data: cfgRow } = await sb.from('precios').select('data').eq('id', cfgRowId).maybeSingle();
    const servicios = (cfgRow?.data?.__turnosCfg?.servicios || []).map((s: any) => ({
      nombre: s.nombre, sector: s.sector, duracion: s.duracion, precio: s.precio
    }));

    const guiaApp = `Guía rápida de Remu Gestión (para ayudar al dueño a usar la app):
- "Turnos": agenda diaria/semanal de citas. Se pueden crear, editar, cancelar y marcar como "terminado".
- "Turnos fijos": citas recurrentes (mismo día y hora cada semana) que se generan automáticamente.
- "Link público / reservas online": cada negocio tiene un link (sección "Link público") para que sus clientes reserven turnos solos, eligiendo servicio, profesional, fecha y horario disponible.
- "Servicios": catálogo de servicios con precio y duración, configurable en "Configuración" o "Servicios".
- "Empleados/Profesionales": se agregan en "Equipo" o "Empleados", y se les puede asignar turnos y horarios.
- "Clientes": ficha de cada cliente con historial de turnos.
- "Ventas": registro de ventas de productos (si el negocio vende productos además de servicios).
- "Gastos": registro de gastos del negocio.
- "Stock": control de inventario de productos.
- "Configuración": datos del negocio, horarios de atención, mensajes para clientes, etc.`;

    const system = `Sos el asistente de gestión de "${tenant?.nombre || 'el negocio'}" (${tenant?.rubro || ''}) dentro de Remu Gestión.
Hoy es ${hoy}. Tenés acceso a los turnos del negocio entre ${hace30} y ${en14} en formato JSON (f=fecha, h=hora, cli=cliente, srv=servicio, emp=empleado/profesional, estado, precio).
También tenés el catálogo de servicios con sus precios y duraciones (nombre, sector, duracion en minutos, precio).

${guiaApp}

Respondé en español, de forma breve, clara y concreta.
- Para preguntas sobre los turnos/agenda del negocio, basate SOLO en los datos JSON. Si no se puede responder con esos datos, decilo honestamente y no inventes números.
- Para preguntas sobre cómo usar la app (dónde está tal función, cómo configurar algo), usá la guía de arriba. Si la guía no cubre lo que preguntan, decí que no tenés esa información y sugerí consultar con soporte.
- Si te piden redactar un mensaje (recordatorio, aviso, promo) para enviarle a un cliente, redactalo con buena onda y profesional, usando los datos reales del turno si corresponde.
- Si ves patrones útiles en los datos (días con pocos turnos, servicios poco pedidos, huecos libres), podés sugerir ideas o consejos de gestión, dejando claro que son sugerencias basadas en los datos disponibles.
- Si te piden armar un presupuesto/cotización (por ejemplo para un evento o casamiento), usá los precios del catálogo de servicios, sumá los que correspondan y mostrá el detalle ítem por ítem y el total. Si algún servicio pedido no está en el catálogo, decilo en lugar de inventar un precio.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system,
        messages: [{ role: 'user', content: `Catálogo de servicios y precios (JSON): ${JSON.stringify(servicios)}\n\nDatos de turnos (JSON): ${JSON.stringify(datos)}\n\nPregunta del dueño: ${pregunta}` }]
      })
    });

    if (!aiRes.ok) {
      console.error('[ai-asistente] Anthropic error:', await aiRes.text());
      return new Response(JSON.stringify({ error: 'Error consultando al asistente' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const aiJson = await aiRes.json();
    const respuesta = aiJson?.content?.[0]?.text || 'No pude generar una respuesta.';

    return new Response(JSON.stringify({ ok: true, respuesta }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[ai-asistente] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
