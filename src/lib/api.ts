import { supabase } from "@/lib/supabase";
import type { Database } from "@/data/database.types";
import type {
  Source,
  FeedItem,
  CronSchedule,
  NoiseRules,
  MaterialityGuidelines,
  Organization,
  Member,
  MemberRole,
  Materiality,
} from "@/data/mock";

type NoiseUpdate = Database["public"]["Tables"]["noise_rules"]["Update"];
type OrgUpdate = Database["public"]["Tables"]["organizations"]["Update"];

// --- Helpers de mapeo entre DB (lowercase/snake) y tipos de la app ---

function toAppRole(r: string): MemberRole {
  return (r.charAt(0).toUpperCase() + r.slice(1)) as MemberRole;
}

function toDbRole(r: MemberRole): "owner" | "admin" | "member" {
  return r.toLowerCase() as "owner" | "admin" | "member";
}

// "08:00:00" -> "08:00"
function toHHmm(time: string): string {
  return time.slice(0, 5);
}

// Resultado de resolver la org del usuario actual
export interface OrgContext {
  orgId: string;
  role: MemberRole;
  isPlatformAdmin: boolean;
}

// Bundle con todo lo que necesita la app para una org
export interface OrgData {
  organization: Organization;
  sources: Source[];
  feedItems: FeedItem[];
  schedules: CronSchedule[];
  recipients: string[];
  noiseRules: NoiseRules;
  guidelines: MaterialityGuidelines;
  members: Member[];
  lastScrape: string;
}

// -----------------------------------------------------------------------------
// Resuelve en qué organización está parado el usuario.
// - Si es miembro activo: esa org + su rol.
// - Si es super admin sin membresía: cae en la primera org (fallback).
// -----------------------------------------------------------------------------
export async function resolveOrgContext(): Promise<OrgContext | null> {
  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .maybeSingle();
  const isPlatformAdmin = !!adminRow;

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership) {
    return {
      orgId: membership.org_id,
      role: toAppRole(membership.role),
      isPlatformAdmin,
    };
  }

  // Super admin sin membresía: usa la primera org disponible
  if (isPlatformAdmin) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (org) return { orgId: org.id, role: "Owner", isPlatformAdmin };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Carga todos los datos de una organización en paralelo.
// -----------------------------------------------------------------------------
export async function loadOrgData(orgId: string): Promise<OrgData> {
  const [
    orgRes,
    sourcesRes,
    feedRes,
    schedulesRes,
    recipientsRes,
    noiseRes,
    guideRes,
    membersRes,
    runRes,
  ] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("sources").select("*").eq("org_id", orgId).order("created_at"),
    supabase
      .from("feed_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("dismissed", false)
      .order("published_at", { ascending: false }),
    supabase
      .from("cron_schedules")
      .select("*")
      .eq("org_id", orgId)
      .order("run_time"),
    supabase.from("recipients").select("email").eq("org_id", orgId),
    supabase.from("noise_rules").select("*").eq("org_id", orgId).single(),
    supabase.from("materiality_guidelines").select("*").eq("org_id", orgId),
    supabase
      .from("org_members")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at"),
    supabase
      .from("cron_runs")
      .select("finished_at, started_at, status")
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const org = orgRes.data!;
  const noise = noiseRes.data!;

  // Rúbrica: filas -> Record por nivel
  const guidelines: MaterialityGuidelines = {
    material: "",
    potentially: "",
    noteworthy: "",
  };
  for (const g of guideRes.data ?? []) {
    guidelines[g.level as Materiality] = g.content;
  }

  // Último scrape (para el topbar)
  let lastScrape = "No runs yet";
  const run = runRes.data;
  if (run) {
    const iso = run.finished_at ?? run.started_at;
    lastScrape = new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const { data: auth } = await supabase.auth.getUser();
  const readIds = new Set<string>();
  if (auth.user) {
    const { data: reads } = await supabase
      .from("feed_item_reads")
      .select("feed_item_id")
      .eq("user_id", auth.user.id);
    for (const row of reads ?? []) readIds.add(row.feed_item_id);
  }

  const sourceNameById = new Map(
    (sourcesRes.data ?? []).map((s) => [s.id, s.name])
  );

  return {
    organization: { name: org.name, logoUrl: org.logo_url },
    sources: (sourcesRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      tick: s.tick,
      url: s.url,
    })),
    feedItems: (feedRes.data ?? []).map((f) => {
      const company = (f.source_id && sourceNameById.get(f.source_id)) || "";
      return {
        id: f.id,
        title: f.title,
        summary: f.summary ?? "",
        content: f.content ?? "",
        whyItMatters: f.why_it_matters ?? "",
        tick: f.tick || company || "—",
        source: company,
        url: f.url,
        outletUrl: f.outlet_url ?? undefined,
        publishedAt: f.published_at,
        category: f.category,
        materiality: f.materiality,
        read: readIds.has(f.id),
      };
    }),
    schedules: (schedulesRes.data ?? []).map((s) => ({
      id: s.id,
      time: toHHmm(s.run_time),
      enabled: s.enabled,
    })),
    recipients: (recipientsRes.data ?? []).map((r) => r.email),
    noiseRules: {
      excludeTerms: noise.exclude_terms,
      excludeDomains: noise.exclude_domains,
      maxLookbackHours: noise.max_lookback_hours,
      minMateriality: noise.min_materiality,
    },
    guidelines,
    members: (membersRes.data ?? []).map((m) => ({
      id: m.id,
      name: m.name ?? "",
      email: m.email,
      role: toAppRole(m.role),
      status: m.status,
    })),
    lastScrape,
  };
}

// -----------------------------------------------------------------------------
// Super admin de plataforma: CRUD de organizaciones (tenants).
// Las policies "platform full access" habilitan estas operaciones y el borrado
// en cascada lo resuelven las FKs ON DELETE CASCADE del esquema.
// -----------------------------------------------------------------------------

// Fila de organización tal como la ve el panel de super admin
export interface AdminOrg {
  id: string;
  name: string;
  slug: string | null;
  supportEmail: string | null;
  primaryColor: string | null;
  createdAt: string;
  memberCount: number;
  sourceCount: number;
}

// ¿El usuario actual es super admin de plataforma?
export async function isPlatformAdmin(): Promise<boolean> {
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .maybeSingle();
  return !!data;
}

// Lista todas las organizaciones con conteos de miembros y fuentes
export async function listOrganizations(): Promise<AdminOrg[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*, org_members(count), sources(count)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    supportEmail: o.support_email,
    primaryColor: o.primary_color,
    createdAt: o.created_at,
    // Supabase devuelve el agregado como [{ count }]
    memberCount:
      (o.org_members as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    sourceCount:
      (o.sources as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

// Crea una organización vía RPC (valida super admin del lado del servidor)
export async function createOrganization(input: {
  name: string;
  slug?: string;
  ownerEmail?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_organization", {
    _name: input.name,
    _slug: input.slug?.trim() || undefined,
    _owner_email: input.ownerEmail?.trim() || undefined,
  });
  if (error) throw error;
  return data as string;
}

// Edita campos de una organización (nombre, slug y branding white-label)
export async function updateOrganizationAdmin(
  id: string,
  patch: {
    name?: string;
    slug?: string | null;
    supportEmail?: string | null;
    primaryColor?: string | null;
  }
): Promise<void> {
  const row: OrgUpdate = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.supportEmail !== undefined) row.support_email = patch.supportEmail;
  if (patch.primaryColor !== undefined) row.primary_color = patch.primaryColor;

  const { error } = await supabase
    .from("organizations")
    .update(row)
    .eq("id", id);
  if (error) throw error;
}

// Borra una organización. El cascade de las FKs elimina todos sus datos.
export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw error;
}

// -----------------------------------------------------------------------------
// Mutaciones (cada una devuelve la fila creada cuando aplica)
// -----------------------------------------------------------------------------

export async function addSource(
  orgId: string,
  input: { name: string; tick: string | null; url: string }
): Promise<Source> {
  const { data, error } = await supabase
    .from("sources")
    .insert({
      org_id: orgId,
      name: input.name,
      url: input.url,
      tick: input.tick,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, tick: data.tick, url: data.url };
}

export async function updateSource(
  id: string,
  input: { name: string; tick: string | null; url: string }
): Promise<Source> {
  const { data, error } = await supabase
    .from("sources")
    .update({
      name: input.name,
      tick: input.tick,
      url: input.url,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, tick: data.tick, url: data.url };
}

export async function removeSource(id: string): Promise<void> {
  const { error } = await supabase.from("sources").delete().eq("id", id);
  if (error) throw error;
}

export async function addSchedule(orgId: string): Promise<CronSchedule> {
  const { data, error } = await supabase
    .from("cron_schedules")
    .insert({ org_id: orgId, run_time: "12:00", enabled: true })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, time: toHHmm(data.run_time), enabled: data.enabled };
}

export async function removeSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("cron_schedules").delete().eq("id", id);
  if (error) throw error;
}

export async function updateScheduleTime(id: string, time: string): Promise<void> {
  const { error } = await supabase
    .from("cron_schedules")
    .update({ run_time: time })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleSchedule(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("cron_schedules")
    .update({ enabled })
    .eq("id", id);
  if (error) throw error;
}

export async function addRecipient(orgId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from("recipients")
    .insert({ org_id: orgId, email });
  if (error) throw error;
}

export async function removeRecipient(orgId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from("recipients")
    .delete()
    .eq("org_id", orgId)
    .eq("email", email);
  if (error) throw error;
}

export async function updateNoiseRules(
  orgId: string,
  patch: Partial<{
    excludeTerms: string[];
    excludeDomains: string[];
    maxLookbackHours: number | null;
    minMateriality: Materiality;
  }>
): Promise<void> {
  const row: NoiseUpdate = {};
  if (patch.excludeTerms !== undefined) row.exclude_terms = patch.excludeTerms;
  if (patch.excludeDomains !== undefined)
    row.exclude_domains = patch.excludeDomains;
  if (patch.maxLookbackHours !== undefined)
    row.max_lookback_hours = patch.maxLookbackHours;
  if (patch.minMateriality !== undefined)
    row.min_materiality = patch.minMateriality;

  const { error } = await supabase
    .from("noise_rules")
    .update(row)
    .eq("org_id", orgId);
  if (error) throw error;
}

export async function updateGuideline(
  orgId: string,
  level: Materiality,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("materiality_guidelines")
    .update({ content })
    .eq("org_id", orgId)
    .eq("level", level);
  if (error) throw error;
}

export async function updateOrganization(
  orgId: string,
  patch: { name?: string; logoUrl?: string | null }
): Promise<void> {
  const row: OrgUpdate = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  const { error } = await supabase
    .from("organizations")
    .update(row)
    .eq("id", orgId);
  if (error) throw error;
}

const LOGO_BUCKET = "logos";
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function logoObjectPath(orgId: string, ext: string) {
  return `${orgId}/logo.${ext}`;
}

// Sube el archivo a Storage y persiste la URL pública en la organización.
export async function uploadOrganizationLogo(
  orgId: string,
  file: File
): Promise<string> {
  const ext = LOGO_TYPES[file.type];
  if (!ext) throw new Error("Use a PNG, JPG, or WEBP image");
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo must be 2 MB or smaller");
  }

  const path = logoObjectPath(orgId, ext);
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
  if (uploadError) throw uploadError;

  // Otras extensiones quedan huérfanas si el formato cambia.
  const stale = Object.values(LOGO_TYPES)
    .filter((other) => other !== ext)
    .map((other) => logoObjectPath(orgId, other));
  await supabase.storage.from(LOGO_BUCKET).remove(stale);

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const logoUrl = `${data.publicUrl}?v=${Date.now()}`;
  await updateOrganization(orgId, { logoUrl });
  return logoUrl;
}

export async function removeOrganizationLogo(orgId: string): Promise<void> {
  const paths = Object.values(LOGO_TYPES).map((ext) =>
    logoObjectPath(orgId, ext)
  );
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove(paths);
  if (error) throw error;
  await updateOrganization(orgId, { logoUrl: null });
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: MemberRole
): Promise<Member> {
  const { data, error } = await supabase
    .from("org_members")
    .insert({
      org_id: orgId,
      email,
      role: toDbRole(role),
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name ?? "",
    email: data.email,
    role: toAppRole(data.role),
    status: data.status,
  };
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("org_members").delete().eq("id", id);
  if (error) throw error;
}

export async function markFeedRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Not authenticated");
  // ignoreDuplicates: remarcar como leída no necesita UPDATE (no hay policy)
  const { error } = await supabase.from("feed_item_reads").upsert(
    ids.map((id) => ({ feed_item_id: id, user_id: auth.user.id })),
    { onConflict: "feed_item_id,user_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function markFeedUnread(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("feed_item_reads")
    .delete()
    .eq("user_id", auth.user.id)
    .in("feed_item_id", ids);
  if (error) throw error;
}

export async function dismissFeedItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.rpc("dismiss_feed_items", { _ids: ids });
  if (error) throw error;
}
export interface ScrapeSummary {
  itemsFound: number;
  itemsKept: number;
  windowHours: number;
  emailsSent: number;
  emailError?: string;
}

export async function runCron(
  orgId: string
): Promise<{ org: OrgData; summary: ScrapeSummary }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("scrape", {
    body: { orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(await messageFromInvokeError(error));
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }

  const summary: ScrapeSummary = {
    itemsFound:
      data && typeof data === "object" && typeof data.itemsFound === "number"
        ? data.itemsFound
        : 0,
    itemsKept:
      data && typeof data === "object" && typeof data.itemsKept === "number"
        ? data.itemsKept
        : 0,
    windowHours:
      data && typeof data === "object" && typeof data.windowHours === "number"
        ? data.windowHours
        : 0,
    emailsSent:
      data && typeof data === "object" && typeof data.emailsSent === "number"
        ? data.emailsSent
        : 0,
    emailError:
      data &&
      typeof data === "object" &&
      typeof data.emailError === "string" &&
      data.emailError
        ? data.emailError
        : undefined,
  };
  return { org: await loadOrgData(orgId), summary };
}

async function messageFromInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
    } catch {
      // El body no era JSON.
    }
  }
  const message = error instanceof Error ? error.message : "Scrape failed";
  if (/failed to send|fetch|not found|404|503/i.test(message)) {
    return "Scrape function is not reachable. Local: npm run functions. Prod: deploy scrape.";
  }
  return message;
}
