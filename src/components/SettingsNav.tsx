"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/settings/general", label: "General" },
  { to: "/settings/rules", label: "Rules" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            href={tab.to}
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              pathname === tab.to
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
