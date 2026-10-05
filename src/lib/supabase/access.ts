import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireUser() {
  const { supabase, user } = await getAuthedUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// RLS de platform_admins ya limita a la fila del usuario actual.
export async function isPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .maybeSingle();
  return !!data;
}
