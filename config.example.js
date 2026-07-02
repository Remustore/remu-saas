/**
 * PLANTILLA DE CONFIGURACIÓN — remu-saas
 * =========================================
 * 1. Copiá este archivo a config.js
 * 2. Completá tus credenciales reales
 * 3. config.js está en .gitignore — NUNCA lo subas a git
 *
 * Para obtener tus credenciales:
 *   → Supabase Dashboard > Settings > API
 *
 * Para crear el superadmin:
 *   → Supabase Dashboard > Authentication > Users > Invite user
 *   → Luego en la consola SQL ejecutá:
 *     UPDATE auth.users
 *     SET raw_user_meta_data = raw_user_meta_data || '{"rol":"superadmin"}'::jsonb
 *     WHERE email = 'tu-superadmin@email.com';
 */
window.APP_CONFIG = {
  // URL de tu proyecto Supabase (ej: https://abcdefgh.supabase.co)
  supabaseUrl: 'REEMPLAZAR_CON_TU_SUPABASE_URL',

  // Clave pública "anon key" de Supabase (Settings > API > anon public)
  supabaseAnonKey: 'REEMPLAZAR_CON_TU_SUPABASE_ANON_KEY',

  // DSN de Sentry para monitoreo de errores (sentry.io > tu proyecto > Settings > Client Keys)
  sentryDsn: 'REEMPLAZAR_CON_TU_SENTRY_DSN',
};
