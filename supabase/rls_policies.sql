-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES — remu-saas
-- ═══════════════════════════════════════════════════════════════════════
-- Cómo aplicar:
--   Supabase Dashboard → SQL Editor → pegá y ejecutá este script.
--
-- Qué hace:
--   - Habilita Row Level Security en todas las tablas de datos.
--   - Cada usuario sólo puede ver/modificar filas de SU tenant.
--   - El tenant_id del usuario viene del JWT claim (user_metadata.tenant_id).
--   - turnos_solicitudes permite INSERT público (para booking online).
--
-- IMPORTANTE: el superadmin usa la anon key con políticas RLS basadas en JWT.
--   El JWT del superadmin contiene user_metadata.rol = 'superadmin'.
--   Las funciones auth.is_superadmin() y auth.tenant_id() extraen estos valores.
-- ═══════════════════════════════════════════════════════════════════════


-- ── Helper: obtener tenant_id del JWT del usuario autenticado ──────────
-- Supabase almacena los user_metadata en auth.jwt() -> user_metadata
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS text
  LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id');
$$;

-- ── Helper: verificar si el usuario es superadmin ─────────────────────
CREATE OR REPLACE FUNCTION auth.is_superadmin() RETURNS boolean
  LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin';
$$;


-- ══════════════════════════════════════════════
-- TABLA: tenants
-- Los usuarios sólo ven su propio tenant.
-- El superadmin puede ver y modificar todos los tenants.
-- ══════════════════════════════════════════════
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Tenant ve su propio registro
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT USING (id = auth.tenant_id());

-- Superadmin ve todos los tenants
DROP POLICY IF EXISTS "tenants_select_superadmin" ON tenants;
CREATE POLICY "tenants_select_superadmin" ON tenants
  FOR SELECT USING (auth.is_superadmin());

-- Auto-registro: cualquier usuario (incluso anon) puede insertar su propio tenant
-- Esto es necesario para el flujo de registro desde la landing page
DROP POLICY IF EXISTS "tenants_insert_registro" ON tenants;
CREATE POLICY "tenants_insert_registro" ON tenants
  FOR INSERT WITH CHECK (true);

-- Superadmin puede actualizar cualquier tenant (activar/desactivar, pago, trial)
DROP POLICY IF EXISTS "tenants_update_superadmin" ON tenants;
CREATE POLICY "tenants_update_superadmin" ON tenants
  FOR UPDATE USING (auth.is_superadmin()) WITH CHECK (true);

-- Tenant puede actualizar su propio registro (configuración, personalización)
DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (id = auth.tenant_id()) WITH CHECK (id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: stock
-- ══════════════════════════════════════════════
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_tenant_all" ON stock;
CREATE POLICY "stock_tenant_all" ON stock
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: equipos
-- ══════════════════════════════════════════════
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipos_tenant_all" ON equipos;
CREATE POLICY "equipos_tenant_all" ON equipos
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: ventas
-- ══════════════════════════════════════════════
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_tenant_all" ON ventas;
CREATE POLICY "ventas_tenant_all" ON ventas
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: gastos
-- ══════════════════════════════════════════════
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gastos_tenant_all" ON gastos;
CREATE POLICY "gastos_tenant_all" ON gastos
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: reparaciones
-- ══════════════════════════════════════════════
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reparaciones_tenant_all" ON reparaciones;
CREATE POLICY "reparaciones_tenant_all" ON reparaciones
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

-- SELECT público para la página de estado de equipo (?estado=TENANT_UUID)
-- Permite a los clientes consultar el estado de su reparación sin login
DROP POLICY IF EXISTS "reparaciones_select_public" ON reparaciones;
CREATE POLICY "reparaciones_select_public" ON reparaciones
  FOR SELECT USING (true);


-- ══════════════════════════════════════════════
-- TABLA: precios
-- SELECT público (para la página de booking online del tenant).
-- INSERT/UPDATE/DELETE sólo para el tenant dueño o superadmin.
-- ══════════════════════════════════════════════
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "precios_select_public" ON precios;
CREATE POLICY "precios_select_public" ON precios
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "precios_write_tenant" ON precios;
CREATE POLICY "precios_write_tenant" ON precios
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());

-- Superadmin puede escribir precios (necesario para precargar servicios al crear tenant)
DROP POLICY IF EXISTS "precios_write_superadmin" ON precios;
CREATE POLICY "precios_write_superadmin" ON precios
  FOR ALL USING (auth.is_superadmin()) WITH CHECK (auth.is_superadmin());


-- ══════════════════════════════════════════════
-- TABLA: inversores
-- ══════════════════════════════════════════════
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inversores_tenant_all" ON inversores;
CREATE POLICY "inversores_tenant_all" ON inversores
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: movimientos_inv
-- ══════════════════════════════════════════════
ALTER TABLE movimientos_inv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_inv_tenant_all" ON movimientos_inv;
CREATE POLICY "movimientos_inv_tenant_all" ON movimientos_inv
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ══════════════════════════════════════════════
-- TABLA: turnos_solicitudes
-- INSERT público (clientes sin cuenta piden turno online).
-- SELECT/UPDATE/DELETE sólo para el tenant.
-- ══════════════════════════════════════════════
ALTER TABLE turnos_solicitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_solicitudes_insert_public" ON turnos_solicitudes;
CREATE POLICY "turnos_solicitudes_insert_public" ON turnos_solicitudes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "turnos_solicitudes_tenant_manage" ON turnos_solicitudes;
CREATE POLICY "turnos_solicitudes_tenant_manage" ON turnos_solicitudes
  FOR ALL USING (tenant_id = auth.tenant_id())
  WITH CHECK (tenant_id = auth.tenant_id());


-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (ejecutá esto después para confirmar que RLS está activo)
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
