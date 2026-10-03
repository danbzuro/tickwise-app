import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";

// Variables de entorno (ver .env / `supabase status`)
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno (.env)"
  );
}

// Cliente tipado único para toda la app
export const supabase = createClient<Database>(url, anonKey);
