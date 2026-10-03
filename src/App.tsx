import { useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { FeedPage } from "@/pages/FeedPage";
import { SourcesPage } from "@/pages/SourcesPage";
import { SettingsGeneralPage } from "@/pages/SettingsGeneralPage";
import { SettingsRulesPage } from "@/pages/SettingsRulesPage";
import { UsersPage } from "@/pages/UsersPage";
import { LoginPage } from "@/pages/LoginPage";
import { useAuth } from "@/context/AuthProvider";
import * as api from "@/lib/api";
import type { OrgData } from "@/lib/api";
import type { Materiality, MemberRole } from "@/data/mock";

// Formatea un string HH:mm a formato 12h (e.g. "08:00 AM")
function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Pantalla de carga a página completa
function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  const { session, loading, signOut } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <LoginPage />;

  return <Workspace signOut={signOut} />;
}

// -----------------------------------------------------------------------------
// Workspace: sólo se monta con sesión activa. Resuelve la org y carga sus datos.
// -----------------------------------------------------------------------------
function Workspace({ signOut }: { signOut: () => Promise<void> }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [data, setData] = useState<OrgData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Info del usuario para el sidebar (desde la sesión de auth)
  const userInfo = useMemo(() => {
    const name = (user?.user_metadata?.name as string) || user?.email || "User";
    const email = user?.email ?? "";
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase() ?? "")
      .join("");
    return { name, email, initials };
  }, [user]);

  // Carga inicial: resolver org + traer datos
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ctx = await api.resolveOrgContext();
        if (!ctx) {
          if (active) setLoadError("No organization found for this account.");
          return;
        }
        const bundle = await api.loadOrgData(ctx.orgId);
        if (!active) return;
        setOrgId(ctx.orgId);
        setData(bundle);
      } catch (e) {
        if (active) setLoadError((e as Error).message);
      } finally {
        if (active) setDataLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Próxima corrida = primer slot activo
  const nextRun = useMemo(() => {
    if (!data) return null;
    const enabled = data.schedules
      .filter((s) => s.enabled)
      .sort((a, b) => a.time.localeCompare(b.time));
    return enabled.length ? formatTime12(enabled[0].time) : null;
  }, [data]);

  // --- Handlers (actualizan la DB y luego el estado local) ---

  const handleRunCron = useCallback(async () => {
    if (!orgId) return;
    setIsRunning(true);
    const label = await api.runCron(orgId);
    setData((d) => (d ? { ...d, lastScrape: label } : d));
    setIsRunning(false);
  }, [orgId]);

  const addSourceH = useCallback(
    async (input: { name: string; tick: string; url: string }) => {
      if (!orgId) return;
      const s = await api.addSource(orgId, input);
      setData((d) => (d ? { ...d, sources: [...d.sources, s] } : d));
    },
    [orgId]
  );

  const addScheduleH = useCallback(async () => {
    if (!orgId) return;
    const s = await api.addSchedule(orgId);
    setData((d) =>
      d
        ? {
            ...d,
            schedules: [...d.schedules, s].sort((a, b) =>
              a.time.localeCompare(b.time)
            ),
          }
        : d
    );
  }, [orgId]);

  const removeScheduleH = useCallback(async (id: string) => {
    await api.removeSchedule(id);
    setData((d) =>
      d ? { ...d, schedules: d.schedules.filter((s) => s.id !== id) } : d
    );
  }, []);

  const changeScheduleTimeH = useCallback(async (id: string, time: string) => {
    await api.updateScheduleTime(id, time);
    setData((d) =>
      d
        ? {
            ...d,
            schedules: d.schedules.map((s) =>
              s.id === id ? { ...s, time } : s
            ),
          }
        : d
    );
  }, []);

  const toggleScheduleH = useCallback(
    async (id: string) => {
      const current = data?.schedules.find((s) => s.id === id);
      if (!current) return;
      await api.toggleSchedule(id, !current.enabled);
      setData((d) =>
        d
          ? {
              ...d,
              schedules: d.schedules.map((s) =>
                s.id === id ? { ...s, enabled: !s.enabled } : s
              ),
            }
          : d
      );
    },
    [data]
  );

  const addRecipientH = useCallback(
    async (email: string) => {
      if (!orgId || data?.recipients.includes(email)) return;
      await api.addRecipient(orgId, email);
      setData((d) => (d ? { ...d, recipients: [...d.recipients, email] } : d));
    },
    [orgId, data]
  );

  const removeRecipientH = useCallback(
    async (email: string) => {
      if (!orgId) return;
      await api.removeRecipient(orgId, email);
      setData((d) =>
        d ? { ...d, recipients: d.recipients.filter((e) => e !== email) } : d
      );
    },
    [orgId]
  );

  // Helper para persistir noise_rules con un patch y actualizar estado
  const patchNoise = useCallback(
    async (patch: Partial<OrgData["noiseRules"]>) => {
      if (!orgId) return;
      await api.updateNoiseRules(orgId, patch);
      setData((d) =>
        d ? { ...d, noiseRules: { ...d.noiseRules, ...patch } } : d
      );
    },
    [orgId]
  );

  const addExcludeTermH = useCallback(
    (term: string) => {
      if (data?.noiseRules.excludeTerms.includes(term)) return;
      patchNoise({
        excludeTerms: [...(data?.noiseRules.excludeTerms ?? []), term],
      });
    },
    [data, patchNoise]
  );

  const removeExcludeTermH = useCallback(
    (term: string) =>
      patchNoise({
        excludeTerms: (data?.noiseRules.excludeTerms ?? []).filter(
          (t) => t !== term
        ),
      }),
    [data, patchNoise]
  );

  const addExcludeDomainH = useCallback(
    (domain: string) => {
      if (data?.noiseRules.excludeDomains.includes(domain)) return;
      patchNoise({
        excludeDomains: [...(data?.noiseRules.excludeDomains ?? []), domain],
      });
    },
    [data, patchNoise]
  );

  const removeExcludeDomainH = useCallback(
    (domain: string) =>
      patchNoise({
        excludeDomains: (data?.noiseRules.excludeDomains ?? []).filter(
          (d) => d !== domain
        ),
      }),
    [data, patchNoise]
  );

  const setMinMaterialityH = useCallback(
    (level: Materiality) => patchNoise({ minMateriality: level }),
    [patchNoise]
  );

  const setMaxLookbackH = useCallback(
    (hours: number | null) => patchNoise({ maxLookbackHours: hours }),
    [patchNoise]
  );

  // Rúbrica: update local inmediato + persistencia (fire-and-forget)
  const setGuidelineH = useCallback(
    (level: Materiality, text: string) => {
      setData((d) =>
        d ? { ...d, guidelines: { ...d.guidelines, [level]: text } } : d
      );
      if (orgId) void api.updateGuideline(orgId, level, text);
    },
    [orgId]
  );

  // Organización: update local inmediato + persistencia
  const setOrgNameH = useCallback(
    (name: string) => {
      setData((d) =>
        d ? { ...d, organization: { ...d.organization, name } } : d
      );
      if (orgId) void api.updateOrganization(orgId, { name });
    },
    [orgId]
  );

  const setOrgLogoH = useCallback(
    (logoUrl: string | null) => {
      setData((d) =>
        d ? { ...d, organization: { ...d.organization, logoUrl } } : d
      );
      if (orgId) void api.updateOrganization(orgId, { logoUrl });
    },
    [orgId]
  );

  const inviteMemberH = useCallback(
    async (email: string, role: MemberRole) => {
      if (!orgId || data?.members.some((m) => m.email === email)) return;
      const m = await api.inviteMember(orgId, email, role);
      setData((d) => (d ? { ...d, members: [...d.members, m] } : d));
    },
    [orgId, data]
  );

  const removeMemberH = useCallback(async (id: string) => {
    await api.removeMember(id);
    setData((d) =>
      d ? { ...d, members: d.members.filter((m) => m.id !== id) } : d
    );
  }, []);

  const resendInviteH = useCallback((_id: string) => {
    // Mock: en un backend real re-dispararía el email de invitación
  }, []);

  // --- Render ---

  if (dataLoading) return <FullScreenLoader />;

  if (loadError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {loadError ?? "Something went wrong."}
        </p>
        <button
          onClick={signOut}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        organization={data.organization}
        user={userInfo}
        onSignOut={signOut}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          lastScrape={data.lastScrape}
          nextRun={nextRun}
          isRunning={isRunning}
          onRunCron={handleRunCron}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
            <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route
                path="/feed"
                element={
                  <FeedPage items={data.feedItems} noiseRules={data.noiseRules} />
                }
              />
              <Route
                path="/sources"
                element={
                  <SourcesPage sources={data.sources} onAddSource={addSourceH} />
                }
              />
              <Route
                path="/users"
                element={
                  <UsersPage
                    members={data.members}
                    onInviteMember={inviteMemberH}
                    onResendInvite={resendInviteH}
                    onCancelInvite={removeMemberH}
                    onRevokeMember={removeMemberH}
                  />
                }
              />
              <Route
                path="/settings"
                element={<Navigate to="/settings/general" replace />}
              />
              <Route
                path="/settings/general"
                element={
                  <SettingsGeneralPage
                    organization={data.organization}
                    schedules={data.schedules}
                    recipients={data.recipients}
                    onChangeOrgName={setOrgNameH}
                    onChangeOrgLogo={setOrgLogoH}
                    onAdd={addScheduleH}
                    onRemove={removeScheduleH}
                    onChangeTime={changeScheduleTimeH}
                    onToggle={toggleScheduleH}
                    onAddRecipient={addRecipientH}
                    onRemoveRecipient={removeRecipientH}
                  />
                }
              />
              <Route
                path="/settings/rules"
                element={
                  <SettingsRulesPage
                    noiseRules={data.noiseRules}
                    guidelines={data.guidelines}
                    onAddExcludeTerm={addExcludeTermH}
                    onRemoveExcludeTerm={removeExcludeTermH}
                    onAddExcludeDomain={addExcludeDomainH}
                    onRemoveExcludeDomain={removeExcludeDomainH}
                    onChangeMinMateriality={setMinMaterialityH}
                    onChangeMaxLookback={setMaxLookbackH}
                    onChangeGuideline={setGuidelineH}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
