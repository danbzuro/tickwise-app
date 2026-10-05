"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Rss, Settings, Users, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Organization } from "@/data/mock";

interface UserInfo {
  name: string;
  email: string;
  initials: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function supabaseEnvLabel(): "Local" | "Prod" | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || process.env.NODE_ENV === "production") return null;
  try {
    const host = new URL(url).hostname;
    if (host === "127.0.0.1" || host === "localhost") return "Local";
    return "Prod";
  } catch {
    return null;
  }
}

const navItems: NavItem[] = [
  { to: "/feed", label: "Feed", icon: <Newspaper className="h-4 w-4" /> },
  { to: "/sources", label: "Sources", icon: <Rss className="h-4 w-4" /> },
  { to: "/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

interface SidebarProps {
  organization: Organization;
  user: UserInfo;
  onSignOut: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  organization,
  user,
  onSignOut,
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const envLabel = supabaseEnvLabel();

  return (
    <>
      {/* Overlay (sólo mobile cuando está abierto) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / marca */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Newspaper className="h-4 w-4" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-none">
              {organization.name}
            </span>
            <span className="text-xs text-muted-foreground">
              Market intel{envLabel ? ` · ${envLabel}` : ""}
            </span>
          </div>
          {/* Cerrar (sólo mobile) */}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.to === "/settings"
                ? pathname.startsWith("/settings")
                : pathname === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Usuario (avatar) + sign out */}
        <div className="border-t p-3">
          <div className="flex w-full items-center gap-3 rounded-md px-2 py-2">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
