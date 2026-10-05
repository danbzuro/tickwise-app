"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/data/database.types";

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return { url, anonKey };
}

// Cliente de browser (cookies). Un singleton comparte la sesión con api.ts.
export function createClient() {
  const { url, anonKey } = publicEnv();
  return createBrowserClient<Database>(url, anonKey);
}

export const supabase = createClient();
