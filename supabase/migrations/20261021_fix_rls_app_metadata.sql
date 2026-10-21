-- ================================================================
--  MIGRACIÓN: user_metadata → app_metadata en políticas RLS
--
--  PROBLEMA: Las políticas usaban auth.jwt() -> 'user_metadata'
--  para verificar 'rol' y 'tenant_id'. user_metadata es editable
--  por los propios usuarios → un usuario podría ponerse
--  rol='superadmin' y ver todos los datos de todos los tenants.
--
--  SOLUCIÓN: app_metadata solo puede ser modificado por el
--  service role (servidor), nunca por el usuario final.
--
--  PASOS PARA EJECUTAR:
--    1. Ejecutar este script completo en Supabase → SQL Editor
--    2. Pedir a los usuarios que cierren sesión y vuelvan a entrar
--       (o esperar que los tokens expiren — máx. 1 hora)
--
--  IMPORTANTE: Este script primero copia los datos de
--  user_metadata → app_metadata para todos los usuarios existentes,
--  así nadie queda bloqueado.
-- ================================================================


-- ================================================================
--  PASO 1: Copiar tenant_id y rol de user_metadata a app_metadata
--  en todos los usuarios que aún no lo tienen en app_metadata.
-- ================================================================

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data ||
  jsonb_strip_nulls(jsonb_build_object(
    'tenant_id', CASE
      WHEN raw_app_meta_data->>'tenant_id' IS NULL
       AND raw_user_meta_data->>'tenant_id' IS NOT NULL
      THEN raw_user_meta_data->>'tenant_id'
      ELSE NULL
    END,
    'rol', CASE
      WHEN raw_app_meta_data->>'rol' IS NULL
       AND raw_user_meta_data->>'rol' IS NOT NULL
      THEN raw_user_meta_data->>'rol'
      ELSE NULL
    END
  ))
WHERE
  (raw_user_meta_data ? 'tenant_id' OR raw_user_meta_data ? 'rol');


-- ================================================================
--  HELPER: expresión reutilizable (comentario para legibilidad)
--
--  Patrón estándar para todas las políticas:
--    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
--    OR tenant_id = COALESCE(
--      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
--      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
--    )
-- ================================================================


-- ================================================================
--  PASO 2: Reescribir todas las políticas con app_metadata
-- ================================================================


-- ────────────────────────────────────────────────────────────────
--  tenants
-- ────────────────────────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_anon"        ON tenants;
DROP POLICY IF EXISTS "tenants_select_own"          ON tenants;
DROP POLICY IF EXISTS "tenants_select_superadmin"   ON tenants;
DROP POLICY IF EXISTS "tenants_update_own"          ON tenants;
DROP POLICY IF EXISTS "tenants_update_superadmin"   ON tenants;
DROP POLICY IF EXISTS "superadmin_update_tenants"   ON tenants;
DROP POLICY IF EXISTS "tenants_insert_superadmin"   ON tenants;
DROP POLICY IF EXISTS "tenants_delete_superadmin"   ON tenants;

CREATE POLICY "tenants_select_anon" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );

CREATE POLICY "tenants_insert_superadmin" ON tenants
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  );

CREATE POLICY "tenants_delete_superadmin" ON tenants
  FOR DELETE USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  );


-- ────────────────────────────────────────────────────────────────
--  ventas
-- ────────────────────────────────────────────────────────────────
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_own"       ON ventas;
DROP POLICY IF EXISTS "ventas_tenant_all" ON ventas;

CREATE POLICY "ventas_own" ON ventas FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  stock
-- ────────────────────────────────────────────────────────────────
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_own"    ON stock;
DROP POLICY IF EXISTS "stock_select" ON stock;
DROP POLICY IF EXISTS "stock_insert" ON stock;
DROP POLICY IF EXISTS "stock_update" ON stock;
DROP POLICY IF EXISTS "stock_delete" ON stock;

CREATE POLICY "stock_own" ON stock FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  stock_movimientos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movimientos_own" ON stock_movimientos;
DROP POLICY IF EXISTS "tenant_access"         ON stock_movimientos;

CREATE POLICY "stock_movimientos_own" ON stock_movimientos FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  equipos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipos_own"       ON equipos;
DROP POLICY IF EXISTS "equipos_tenant_all" ON equipos;

CREATE POLICY "equipos_own" ON equipos FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  reparaciones
-- ────────────────────────────────────────────────────────────────
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reparaciones_own"       ON reparaciones;
DROP POLICY IF EXISTS "reparaciones_tenant_all" ON reparaciones;

CREATE POLICY "reparaciones_own" ON reparaciones FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  gastos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gastos_own"       ON gastos;
DROP POLICY IF EXISTS "gastos_tenant_all" ON gastos;

CREATE POLICY "gastos_own" ON gastos FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  inversores
-- ────────────────────────────────────────────────────────────────
ALTER TABLE inversores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inversores_own"       ON inversores;
DROP POLICY IF EXISTS "inversores_tenant_all" ON inversores;

CREATE POLICY "inversores_own" ON inversores FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  movimientos_inv
-- ────────────────────────────────────────────────────────────────
ALTER TABLE movimientos_inv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movimientos_inv_own"       ON movimientos_inv;
DROP POLICY IF EXISTS "movimientos_inv_tenant_all" ON movimientos_inv;

CREATE POLICY "movimientos_inv_own" ON movimientos_inv FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  pedidos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_own"             ON pedidos;
DROP POLICY IF EXISTS "tenant isolation pedidos" ON pedidos;

CREATE POLICY "pedidos_own" ON pedidos FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  cubiertas
-- ────────────────────────────────────────────────────────────────
ALTER TABLE cubiertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cubiertas_own"         ON cubiertas;
DROP POLICY IF EXISTS "cubiertas_write_tenant" ON cubiertas;

CREATE POLICY "cubiertas_own" ON cubiertas FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  historial_gomeria
-- ────────────────────────────────────────────────────────────────
ALTER TABLE historial_gomeria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_gomeria_own"         ON historial_gomeria;
DROP POLICY IF EXISTS "historial_gomeria_tenant_all"   ON historial_gomeria;
DROP POLICY IF EXISTS "historial_gomeria_write_tenant" ON historial_gomeria;

CREATE POLICY "historial_gomeria_own" ON historial_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  pedidos_gomeria
-- ────────────────────────────────────────────────────────────────
ALTER TABLE pedidos_gomeria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_gomeria_own"       ON pedidos_gomeria;
DROP POLICY IF EXISTS "pedidos_gomeria_tenant_all" ON pedidos_gomeria;

CREATE POLICY "pedidos_gomeria_own" ON pedidos_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  clientes_gomeria
-- ────────────────────────────────────────────────────────────────
ALTER TABLE clientes_gomeria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_gomeria_own"         ON clientes_gomeria;
DROP POLICY IF EXISTS "clientes_gomeria_tenant_all"   ON clientes_gomeria;
DROP POLICY IF EXISTS "clientes_gomeria_write_tenant" ON clientes_gomeria;

CREATE POLICY "clientes_gomeria_own" ON clientes_gomeria FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  mov_caja
-- ────────────────────────────────────────────────────────────────
ALTER TABLE mov_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mov_caja_own"   ON mov_caja;
DROP POLICY IF EXISTS "tenant_access"  ON mov_caja;

CREATE POLICY "mov_caja_own" ON mov_caja FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  cierres_caja
-- ────────────────────────────────────────────────────────────────
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cierres_caja_own" ON cierres_caja;
DROP POLICY IF EXISTS "tenant_access"    ON cierres_caja;

CREATE POLICY "cierres_caja_own" ON cierres_caja FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  auditorias
-- ────────────────────────────────────────────────────────────────
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditorias_own" ON auditorias;
DROP POLICY IF EXISTS "tenant_access"  ON auditorias;

CREATE POLICY "auditorias_own" ON auditorias FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  precios
-- ────────────────────────────────────────────────────────────────
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "precios_select_anon"    ON precios;
DROP POLICY IF EXISTS "precios_insert_own"     ON precios;
DROP POLICY IF EXISTS "precios_update_own"     ON precios;
DROP POLICY IF EXISTS "precios_delete_own"     ON precios;
DROP POLICY IF EXISTS "precios_write_superadmin" ON precios;
DROP POLICY IF EXISTS "precios_write_tenant"   ON precios;

CREATE POLICY "precios_select_anon" ON precios FOR SELECT USING (true);

CREATE POLICY "precios_insert_own" ON precios FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "precios_update_own" ON precios FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id IS NULL
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
) WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "precios_delete_own" ON precios FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id IS NULL
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);


-- ────────────────────────────────────────────────────────────────
--  turnos_solicitudes
-- ────────────────────────────────────────────────────────────────
ALTER TABLE turnos_solicitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_select_anon"                     ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_insert_anon"                     ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_update_own"                      ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_delete_own"                      ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_delete_tenant"                   ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_solicitudes_tenant_manage"        ON turnos_solicitudes;
DROP POLICY IF EXISTS "turnos_solicitudes_admin_externo_manage" ON turnos_solicitudes;

CREATE POLICY "turnos_select_anon" ON turnos_solicitudes FOR SELECT USING (true);
CREATE POLICY "turnos_insert_anon" ON turnos_solicitudes FOR INSERT WITH CHECK (true);

CREATE POLICY "turnos_update_own" ON turnos_solicitudes FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "turnos_delete_own" ON turnos_solicitudes FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);


-- ────────────────────────────────────────────────────────────────
--  horas_luna
-- ────────────────────────────────────────────────────────────────
ALTER TABLE horas_luna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horas_luna_select_anon"  ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_insert_own"   ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_update_own"   ON horas_luna;
DROP POLICY IF EXISTS "horas_luna_delete_own"   ON horas_luna;
DROP POLICY IF EXISTS "tenant_full_access"      ON horas_luna;

CREATE POLICY "horas_luna_select_anon" ON horas_luna FOR SELECT USING (true);

CREATE POLICY "horas_luna_insert_own" ON horas_luna FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "horas_luna_update_own" ON horas_luna FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);

CREATE POLICY "horas_luna_delete_own" ON horas_luna FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  OR tenant_id = COALESCE(
    NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
    (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  )
);


-- ────────────────────────────────────────────────────────────────
--  precios_backups
-- ────────────────────────────────────────────────────────────────
ALTER TABLE precios_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_only" ON precios_backups;

CREATE POLICY "superadmin_only" ON precios_backups FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  );


-- ────────────────────────────────────────────────────────────────
--  config
-- ────────────────────────────────────────────────────────────────
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_only" ON config;

CREATE POLICY "superadmin_only" ON config FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
  );


-- ────────────────────────────────────────────────────────────────
--  presupuestos
-- ────────────────────────────────────────────────────────────────
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_full_access" ON presupuestos;

CREATE POLICY "tenant_full_access" ON presupuestos FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ────────────────────────────────────────────────────────────────
--  pedidos_reparto
-- ────────────────────────────────────────────────────────────────
ALTER TABLE pedidos_reparto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_full_access" ON pedidos_reparto;

CREATE POLICY "tenant_full_access" ON pedidos_reparto FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
    OR tenant_id = COALESCE(
      NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid,
      (SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    )
  );


-- ================================================================
--  FIN
--  Después de correr este script:
--  1. Verificar que los usuarios existentes pueden iniciar sesión
--  2. Si algún usuario no puede entrar: hacer que cierre sesión
--     y vuelva a entrar (el JWT viejo no tendrá app_metadata)
--  3. Cuando se creen nuevos usuarios, setear tenant_id/rol
--     en app_metadata (no en user_metadata)
-- ================================================================
