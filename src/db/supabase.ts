/* Клиент Supabase — синглтон. Ключи из .env (VITE_SUPABASE_*).
   anon key публичный, данные защищает RLS (см. supabase/migrations). */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true, когда бэкенд настроен. До этого приложение работает чисто локально. */
export const backendConfigured = Boolean(url && anon);

export const supabase = backendConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // возврат по magic link
      },
    })
  : null;
