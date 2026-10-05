import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";
import { requireUser, isPlatformAdmin } from "@/lib/supabase/access";

export const metadata = { title: "Workspace" };

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase } = await requireUser();
  if (await isPlatformAdmin(supabase)) redirect("/admin");
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
