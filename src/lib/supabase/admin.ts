import { createClient } from "@supabase/supabase-js";

/**
 * Сервисный клиент с service_role ключом. ОБХОДИТ RLS — использовать только
 * на сервере и только там, где это действительно нужно (поиск пользователя
 * по email при приглашении в организацию). Никогда не импортировать в клиент.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
