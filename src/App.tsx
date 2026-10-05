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
import { LandingPage } from "@/pages/LandingPage";
import { AdminApp } from "@/components/AdminApp";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/components/ui/toast";
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

  // Resuelve si el usuario logueado es super admin de plataforma para decidir
  // entre el panel de super admin (CRUD de orgs) y el workspace de una org.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!session) {
      setIsAdmin(null);
      return;
    }
    void (async () => {
      const admin = await api.isPlatformAdmin();
      if (active) setIsAdmin(admin);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) return <FullScreenLoader />;
  // Sin sesión: landing pública en "/" y login en "/login"
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }
  // Esperamos a saber el rol antes de montar un árbol u otro
  if (isAdmin === null) return <FullScreenLoader />;

  return isAdmin ? (
    <AdminApp signOut={signOut} />
  ) : (
    <Workspace signOut={signOut} />
  );
}

// -----------------------------------------------------------------------------
// Workspace: sólo se monta con sesión activa. Resuelve la org y carga sus datos.
// -----------------------------------------------------------------------------
function Workspace({ signOut }: { signOut: () => Promise<void> }) {
  const notify = useToast();
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [data, setData] = useState<OrgData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Corre una mutación y avisa el resultado. Relanza el error para el modal.
  const report = useCallback(
    async (success: string, action: () => Promise<void>) => {
      try {
        await action();
        notify(success);
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Something went wrong",
          "error"
        );
        throw error;
      }
    },
    [notify]
  );

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

  const [runError, setRunError] = useState<string | null>(null);

  const handleRunCron = useCallback(async () => {
    if (!orgId) return;
    setIsRunning(true);
    setRunError(null);
    try {
      const bundle = await api.runCron(orgId);
      setData(bundle);
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setIsRunning(false);
    }
  }, [orgId]);

  const saveSourceH = useCallback(
    async (
      id: string | null,
      input: { name: string; tick: string | null; url: string }
    ) => {
      if (!orgId) return;
      await report(id ? "Source updated" : "Source added", async () => {
        if (id) {
          const updated = await api.updateSource(id, input);
          setData((d) =>
            d
              ? {
                  ...d,
                  sources: d.sources.map((s) => (s.id === id ? updated : s)),
                }
              : d
          );
          return;
        }
        const created = await api.addSource(orgId, input);
        setData((d) => (d ? { ...d, sources: [...d.sources, created] } : d));
      });
    },
    [orgId, report]
  );

  const deleteSourceH = useCallback(
    async (id: string) => {
      await report("Source deleted", async () => {
        await api.removeSource(id);
        setData((d) =>
          d ? { ...d, sources: d.sources.filter((s) => s.id !== id) } : d
        );
      });
    },
    [report]
  );

  const addScheduleH = useCallback(async () => {
    if (!orgId) return;
    await report("Run added", async () => {
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
    });
  }, [orgId, report]);

  const removeScheduleH = useCallback(
    async (id: string) => {
      await report("Run deleted", async () => {
        await api.removeSchedule(id);
        setData((d) =>
          d ? { ...d, schedules: d.schedules.filter((s) => s.id !== id) } : d
        );
      });
    },
    [report]
  );

  const changeScheduleTimeH = useCallback(
    async (id: string, time: string) => {
      await report("Run updated", async () => {
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
      });
    },
    [report]
  );

  const toggleScheduleH = useCallback(
    async (id: string) => {
      const current = data?.schedules.find((s) => s.id === id);
      if (!current) return;
      const next = !current.enabled;
      await report(next ? "Run enabled" : "Run disabled", async () => {
        await api.toggleSchedule(id, next);
        setData((d) =>
          d
            ? {
                ...d,
                schedules: d.schedules.map((s) =>
                  s.id === id ? { ...s, enabled: next } : s
                ),
              }
            : d
        );
      });
    },
    [data, report]
  );

  const addRecipientH = useCallback(
    async (email: string) => {
      if (!orgId || data?.recipients.includes(email)) return;
      await report("Recipient added", async () => {
        await api.addRecipient(orgId, email);
        setData((d) =>
          d ? { ...d, recipients: [...d.recipients, email] } : d
        );
      });
    },
    [orgId, data, report]
  );

  const removeRecipientH = useCallback(
    async (email: string) => {
      if (!orgId) return;
      await report("Recipient removed", async () => {
        await api.removeRecipient(orgId, email);
        setData((d) =>
          d ? { ...d, recipients: d.recipients.filter((e) => e !== email) } : d
        );
      });
    },
    [orgId, report]
  );

  // Helper para persistir noise_rules con un patch y actualizar estado
  const patchNoise = useCallback(
    async (patch: Partial<OrgData["noiseRules"]>, success?: string) => {
      if (!orgId) return;
      try {
        await api.updateNoiseRules(orgId, patch);
        setData((d) =>
          d ? { ...d, noiseRules: { ...d.noiseRules, ...patch } } : d
        );
        if (success) notify(success);
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Something went wrong",
          "error"
        );
        throw error;
      }
    },
    [orgId, notify]
  );

  const addExcludeTermH = useCallback(
    (term: string) => {
      if (data?.noiseRules.excludeTerms.includes(term)) return;
      void patchNoise(
        {
          excludeTerms: [...(data?.noiseRules.excludeTerms ?? []), term],
        },
        "Blocked term added"
      );
    },
    [data, patchNoise]
  );

  const removeExcludeTermH = useCallback(
    (term: string) =>
      void patchNoise(
        {
          excludeTerms: (data?.noiseRules.excludeTerms ?? []).filter(
            (t) => t !== term
          ),
        },
        "Blocked term removed"
      ),
    [data, patchNoise]
  );

  const addExcludeDomainH = useCallback(
    (domain: string) => {
      if (data?.noiseRules.excludeDomains.includes(domain)) return;
      void patchNoise(
        {
          excludeDomains: [...(data?.noiseRules.excludeDomains ?? []), domain],
        },
        "Blocked domain added"
      );
    },
    [data, patchNoise]
  );

  const removeExcludeDomainH = useCallback(
    (domain: string) =>
      void patchNoise(
        {
          excludeDomains: (data?.noiseRules.excludeDomains ?? []).filter(
            (d) => d !== domain
          ),
        },
        "Blocked domain removed"
      ),
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

  const saveRulesH = useCallback(async () => {
    if (!orgId || !data) return;
    await api.updateNoiseRules(orgId, {
      excludeTerms: data.noiseRules.excludeTerms,
      excludeDomains: data.noiseRules.excludeDomains,
      maxLookbackHours: data.noiseRules.maxLookbackHours,
      minMateriality: data.noiseRules.minMateriality,
    });
    await Promise.all(
      (["material", "potentially", "noteworthy"] as const).map((level) =>
        api.updateGuideline(orgId, level, data.guidelines[level])
      )
    );
  }, [orgId, data]);

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
    async (file: File | null) => {
      if (!orgId) return;
      if (!file) {
        await report("Logo removed", async () => {
          await api.removeOrganizationLogo(orgId);
          setData((d) =>
            d ? { ...d, organization: { ...d.organization, logoUrl: null } } : d
          );
        });
        return;
      }
      await report("Logo updated", async () => {
        const logoUrl = await api.uploadOrganizationLogo(orgId, file);
        setData((d) =>
          d ? { ...d, organization: { ...d.organization, logoUrl } } : d
        );
      });
    },
    [orgId, report]
  );

  const inviteMemberH = useCallback(
    async (email: string, role: MemberRole) => {
      if (!orgId || data?.members.some((m) => m.email === email)) return;
      await report("Invite sent", async () => {
        const m = await api.inviteMember(orgId, email, role);
        setData((d) => (d ? { ...d, members: [...d.members, m] } : d));
      });
    },
    [orgId, data, report]
  );

  const removeMemberH = useCallback(
    async (id: string) => {
      await report("Member removed", async () => {
        await api.removeMember(id);
        setData((d) =>
          d ? { ...d, members: d.members.filter((m) => m.id !== id) } : d
        );
      });
    },
    [report]
  );

  const dismissFeedH = useCallback(
    async (ids: string[]) => {
      await report(
        ids.length === 1 ? "News removed" : `${ids.length} news removed`,
        async () => {
          await api.dismissFeedItems(ids);
          const gone = new Set(ids);
          setData((d) =>
            d
              ? { ...d, feedItems: d.feedItems.filter((item) => !gone.has(item.id)) }
              : d
          );
        }
      );
    },
    [report]
  );

  const markFeedH = useCallback(
    async (ids: string[], read: boolean) => {
      await report(read ? "Marked as read" : "Marked as unread", async () => {
        if (read) await api.markFeedRead(ids);
        else await api.markFeedUnread(ids);
        const touched = new Set(ids);
        setData((d) =>
          d
            ? {
                ...d,
                feedItems: d.feedItems.map((item) =>
                  touched.has(item.id) ? { ...item, read } : item
                ),
              }
            : d
        );
      });
    },
    [report]
  );

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
            {runError && (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {runError}
              </p>
            )}
            <Routes>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route
                path="/feed"
                element={
                  <FeedPage
                    items={data.feedItems}
                    noiseRules={data.noiseRules}
                    onMarkRead={markFeedH}
                    onDismiss={dismissFeedH}
                  />
                }
              />
              <Route
                path="/sources"
                element={
                  <SourcesPage
                    sources={data.sources}
                    onSaveSource={saveSourceH}
                    onDeleteSource={deleteSourceH}
                  />
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
                    onSave={saveRulesH}
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
