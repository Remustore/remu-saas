import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };

const TABLAS_TENANT = [
  'ventas', 'stock', 'equipos', 'reparaciones', 'gastos',
  'precios', 'inversores', 'movimientos_inv', 'turnos_solicitudes'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verificar que quien llama es superadmin
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || userData?.user?.user_metadata?.rol !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { tenantId } = await req.json();
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Falta tenantId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: tenant } = await sb.from('tenants').select('id, nombre').eq('id', tenantId).maybeSingle();
    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Negocio no encontrado' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Borrar datos de todas las tablas del tenant
    for (const tabla of TABLAS_TENANT) {
      await sb.from(tabla).delete().eq('tenant_id', tenantId);
    }

    // Borrar usuarios de Auth asociados a este tenant
    let usuariosBorrados = 0;
    const { data: usersPage } = await sb.auth.admin.listUsers({ perPage: 1000 });
    for (const u of (usersPage?.users || [])) {
      if (u.user_metadata?.tenant_id === tenantId) {
        await sb.auth.admin.deleteUser(u.id);
        usuariosBorrados++;
      }
    }

    // Borrar el tenant
    await sb.from('tenants').delete().eq('id', tenantId);

    return new Response(JSON.stringify({ ok: true, nombre: tenant.nombre, usuariosBorrados }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('[admin-delete-tenant] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
