import { redirect } from "next/navigation";
import { LoginPage } from "@/screens/LoginPage";
import { getAuthedUser, isPlatformAdmin } from "@/lib/supabase/access";

export const metadata = { title: "Sign in" };

export default async function LoginRoute() {
  const { supabase, user } = await getAuthedUser();
  if (user) {
    redirect((await isPlatformAdmin(supabase)) ? "/admin" : "/feed");
  }
  return <LoginPage />;
}
