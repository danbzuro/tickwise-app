import { redirect } from "next/navigation";
import { requireUser, isPlatformAdmin } from "@/lib/supabase/access";

export const metadata = { title: "Platform admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase } = await requireUser();
  if (!(await isPlatformAdmin(supabase))) redirect("/feed");
  return <>{children}</>;
}
