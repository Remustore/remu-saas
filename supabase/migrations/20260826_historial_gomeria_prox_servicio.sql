-- ─────────────────────────────────────────────────────────────
-- Agregar campos de próximo servicio a historial_gomeria
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

ALTER TABLE historial_gomeria
  ADD COLUMN IF NOT EXISTS prox_servicio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS prox_fecha    DATE,
  ADD COLUMN IF NOT EXISTS prox_km       INTEGER DEFAULT 0;
