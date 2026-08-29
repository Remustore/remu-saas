-- ================================================================
--  RLS (Row Level Security) — remugestion.ar
--  Ejecutar en: Supabase → SQL Editor → New Query → Run All
--  Es idempotente: podés correrlo más de una vez sin problemas.
--
--  Lógica de acceso (inlineada en cada política):
--    • Superadmin: user_metadata.rol = 'superadmin' → acceso total
--    • Admin:      email coincide con tenants.email → acceso a su tenant
--    • Empleado:   user_metadata.tenant_id está seteado → acceso a ese tenant
--    • Anon:       solo tablas marcadas como públicas
-- ================================================================


-- ================================================================
--  TABLA: tenants
--  Anon puede leer (página pública necesita datos del negocio).
-- ================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_anon"        ON tenants;
DROP POLICY IF EXISTS "tenants_update_own"          ON tenants;
DROP POLICY IF EXISTS "tenants_insert_superadmin"   ON tenants;
DROP POLICY IF EXISTS "tenants_delete_superadmin"   ON tenants;

CREATE POLICY "tenants_select_anon" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

CREATE POLICY "tenants_insert_superadmin" ON tenants
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  );

CREATE POLICY "tenants_delete_superadmin" ON tenants
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  );


-- ================================================================
--  MACRO local (no es SQL real, es comentario para legibilidad)
--  Cada política privada usa la misma expresión:
--    USING / WITH CHECK:
--      (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
--      OR tenant_id = COALESCE(
--        NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
--        (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
--      )
-- ================================================================


-- ================================================================
--  TABLAS PRIVADAS (solo el tenant dueño + superadmin)
-- ================================================================

-- ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ventas_own" ON ventas;
CREATE POLICY "ventas_own" ON ventas FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- stock
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_own" ON stock;
CREATE POLICY "stock_own" ON stock FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- stock_movimientos
ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movimientos_own" ON stock_movimientos;
CREATE POLICY "stock_movimientos_own" ON stock_movimientos FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- equipos
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipos_own" ON equipos;
CREATE POLICY "equipos_own" ON equipos FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- reparaciones
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reparaciones_own" ON reparaciones;
CREATE POLICY "reparaciones_own" ON reparaciones FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gastos_own" ON gastos;
CREATE POLICY "gastos_own" ON gastos FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- inversores
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inversores_own" ON inversores;
CREATE POLICY "inversores_own" ON inversores FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- movimientos_inv
ALTER TABLE movimientos_inv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movimientos_inv_own" ON movimientos_inv;
CREATE POLICY "movimientos_inv_own" ON movimientos_inv FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- pedidos
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_own" ON pedidos;
CREATE POLICY "pedidos_own" ON pedidos FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- cubiertas
ALTER TABLE cubiertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cubiertas_own" ON cubiertas;
CREATE POLICY "cubiertas_own" ON cubiertas FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- historial_gomeria
ALTER TABLE historial_gomeria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "historial_gomeria_own" ON historial_gomeria;
CREATE POLICY "historial_gomeria_own" ON historial_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- pedidos_gomeria
ALTER TABLE pedidos_gomeria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_gomeria_own" ON pedidos_gomeria;
CREATE POLICY "pedidos_gomeria_own" ON pedidos_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- clientes_gomeria
ALTER TABLE clientes_gomeria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_gomeria_own" ON clientes_gomeria;
CREATE POLICY "clientes_gomeria_own" ON clientes_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- mov_caja
ALTER TABLE mov_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mov_caja_own" ON mov_caja;
CREATE POLICY "mov_caja_own" ON mov_caja FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- cierres_caja
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cierres_caja_own" ON cierres_caja;
CREATE POLICY "cierres_caja_own" ON cierres_caja FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

-- auditorias
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditorias_own" ON auditorias;
CREATE POLICY "auditorias_own" ON auditorias FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ================================================================
--  TABLAS SEMI-PÚBLICAS (anon necesita leer para la página pública)
-- ================================================================

-- precios: anon lee (muestra servicios en la página del negocio)
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "precios_select_anon" ON precios;
DROP POLICY IF EXISTS "precios_insert_own"  ON precios;
DROP POLICY IF EXISTS "precios_update_own"  ON precios;
DROP POLICY IF EXISTS "precios_delete_own"  ON precios;

CREATE POLICY "precios_select_anon" ON precios FOR SELECT USING (true);

CREATE POLICY "precios_insert_own" ON precios FOR INSERT WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

-- UPDATE: también permite actualizar filas con tenant_id=NULL (migración de datos legacy).
-- WITH CHECK obliga a que el nuevo valor sea el tenant del usuario, así la fila queda "reclamada".
CREATE POLICY "precios_update_own" ON precios FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id IS NULL
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
) WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "precios_delete_own" ON precios FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id IS NULL
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

-- turnos_solicitudes: anon ve disponibilidad y puede crear turno
ALTER TABLE turnos_solicitudes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turnos_select_anon" ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_insert_anon" ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_update_own"  ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_delete_own"  ON turnos_solicitudes;

CREATE POLICY "turnos_select_anon" ON turnos_solicitudes FOR SELECT USING (true);
CREATE POLICY "turnos_insert_anon" ON turnos_solicitudes FOR INSERT WITH CHECK (true);

CREATE POLICY "turnos_update_own" ON turnos_solicitudes FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "turnos_delete_own" ON turnos_solicitudes FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

-- horas_luna: disponibilidad del negocio (anon la lee para mostrar horarios)
ALTER TABLE horas_luna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "horas_luna_select_anon" ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_insert_own"  ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_update_own"  ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_delete_own"  ON horas_luna;

CREATE POLICY "horas_luna_select_anon" ON horas_luna FOR SELECT USING (true);

CREATE POLICY "horas_luna_insert_own" ON horas_luna FOR INSERT WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "horas_luna_update_own" ON horas_luna FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "horas_luna_delete_own" ON horas_luna FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'user_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);


-- ================================================================
--  FIN — después de ejecutar, probá:
--  1. Entrar como admin de algún negocio → debe ver solo sus datos
--  2. Entrar como superadmin → debe ver todos los tenants
--  3. Abrir la página pública de algún negocio → debe cargar normalmente
-- ================================================================
