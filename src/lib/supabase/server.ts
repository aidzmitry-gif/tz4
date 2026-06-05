import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Supabase-клиент для Server Components, Server Actions и Route Handlers.
 * Сессия пользователя берётся из cookie, поэтому ВСЕ запросы выполняются
 * под его JWT — а значит, под действием RLS-политик.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Вызов из Server Component — запись cookie невозможна.
            // Обновление сессии берёт на себя middleware.
          }
        },
      },
    },
  );
}
