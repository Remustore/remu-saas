-- Soporte para múltiples servicios por turno.
-- Idempotente: IF NOT EXISTS permite correrlo más de una vez sin error.
ALTER TABLE turnos_solicitudes ADD COLUMN IF NOT EXISTS servicios jsonb;
