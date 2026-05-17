import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
}

declare global {
  // eslint-disable-next-line no-var
  var __revaisonSupabaseClient: SupabaseClient | undefined;
}

export const supabase: SupabaseClient =
  globalThis.__revaisonSupabaseClient ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__revaisonSupabaseClient = supabase;
}
