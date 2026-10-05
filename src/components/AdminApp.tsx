"use client";

import { useMemo } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminOrganizationsPage } from "@/screens/AdminOrganizationsPage";
import { useAuth } from "@/context/AuthProvider";

// -----------------------------------------------------------------------------
// AdminApp: shell del super admin de plataforma.
// Sólo se monta para usuarios en platform_admins. Enfocado en el CRUD de orgs.
// -----------------------------------------------------------------------------
export function AdminApp({ signOut }: { signOut: () => Promise<void> }) {
  const { user } = useAuth();

  const userInfo = useMemo(() => {
    const name = (user?.user_metadata?.name as string) || user?.email || "Admin";
    const email = user?.email ?? "";
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase() ?? "")
      .join("");
    return { name, email, initials };
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold">Tickwise</span>
            <span className="text-xs text-muted-foreground">Platform admin</span>
          </div>
          <Badge
            variant="secondary"
            className="ml-2 border-primary/30 bg-primary/10 text-primary"
          >
            Super admin
          </Badge>
        </div>

        {/* Usuario + sign out */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden flex-col items-end leading-none sm:flex">
            <span className="text-sm font-medium">{userInfo.name}</span>
            <span className="text-xs text-muted-foreground">
              {userInfo.email}
            </span>
          </div>
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userInfo.initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Cuerpo */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
          <AdminOrganizationsPage />
        </div>
      </main>
    </div>
  );
}
