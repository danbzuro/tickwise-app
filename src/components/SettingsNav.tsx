import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

// Sub-navegación de Settings (tabs General / Rules)
const tabs = [
  { to: "/settings/general", label: "General" },
  { to: "/settings/rules", label: "Rules" },
];

export function SettingsNav() {
  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
