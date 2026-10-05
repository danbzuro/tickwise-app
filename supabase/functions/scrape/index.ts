import { createClient } from "npm:@supabase/supabase-js@2";
import {
  companyRef,
  scoreHeuristic,
  screenReason,
  searchCompanyNews,
  windowHours,
  type FeedCategory,
  type Materiality,
  type ScoredHit,
} from "./news.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const result = await scrape(req);
    return Response.json(result, { headers: cors });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Scrape failed";
    return Response.json({ error: message }, { status, headers: cors });
  }
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function scrape(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new HttpError(500, "Missing Supabase credentials");
  }

  const body = await req.json().catch(() => ({}));
  const orgId = typeof body?.orgId === "string" ? body.orgId : body?.org_id;
  if (typeof orgId !== "string" || !UUID.test(orgId)) {
    throw new HttpError(400, "orgId is required");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) throw new HttpError(401, "Not authenticated");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    admin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!member && !platformAdmin) throw new HttpError(403, "Not a member of this organization");

  const [{ data: rules }, { data: sources }, { data: lastRun }, { data: guides }] =
    await Promise.all([
      admin.from("noise_rules").select("*").eq("org_id", orgId).single(),
      admin.from("sources").select("id, name, tick, url").eq("org_id", orgId),
      admin
        .from("cron_runs")
        .select("finished_at")
        .eq("org_id", orgId)
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("materiality_guidelines")
        .select("level, content")
        .eq("org_id", orgId),
    ]);

  if (!rules) throw new HttpError(500, "Noise rules are missing");

  const hours = windowHours(rules.max_lookback_hours, lastRun?.finished_at ?? null);
  const noise = {
    excludeTerms: rules.exclude_terms ?? [],
    excludeDomains: rules.exclude_domains ?? [],
    minMateriality: rules.min_materiality as Materiality,
    windowHours: hours,
  };

  const { data: run, error: runError } = await admin
    .from("cron_runs")
    .insert({ org_id: orgId, status: "running" })
    .select("id")
    .single();
  if (runError || !run) throw new HttpError(500, runError?.message ?? "Could not start run");

  try {
    const found = await collect(sources ?? [], hours);
    const scored = await scoreWithModel(found, guides ?? [], Deno.env.get("OPENAI_API_KEY"));
    const rows = scored
      .filter((item) => item.hit.aboutCompany)
      .map((item) => {
        const reason = screenReason(item.hit, noise);
        return {
          org_id: orgId,
          source_id: item.sourceId,
          run_id: run.id,
          tick: item.tick,
          title: item.hit.title,
          summary: item.hit.summary,
          content: item.hit.summary,
          why_it_matters: item.hit.whyItMatters || null,
          url: item.hit.url,
          outlet_url: item.hit.outletUrl || null,
          published_at: item.hit.publishedAt,
          category: item.hit.category,
          materiality: item.hit.materiality,
          screened: reason != null,
          screened_reason: reason,
          // dismissed no se manda: un upsert no debe revivir una nota descartada
        };
      });

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("feed_items")
        .upsert(rows, { onConflict: "org_id,url" });
      if (upsertError) throw new Error(upsertError.message);
    }

    const itemsKept = rows.filter((row) => !row.screened).length;
    await admin
      .from("cron_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        items_found: rows.length,
        items_kept: itemsKept,
      })
      .eq("id", run.id);

    return {
      ok: true,
      itemsFound: rows.length,
      itemsKept,
      windowHours: hours,
    };
  } catch (error) {
    await admin
      .from("cron_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

interface Collected {
  sourceId: string;
  tick: string | null;
  companyName: string;
  domain: string;
  hit: ScoredHit;
}

async function collect(
  sources: { id: string; name: string; tick: string | null; url: string }[],
  hours: number
): Promise<Collected[]> {
  const windowMs = hours * 3_600_000;
  const failures: string[] = [];
  const batches = await Promise.all(
    sources.map(async (source) => {
      const company = companyRef(source);
      try {
        const hits = await searchCompanyNews(company, windowMs);
        return hits.map((hit) => ({
          sourceId: source.id,
          tick: source.tick,
          companyName: company.name,
          domain: company.domain,
          hit: scoreHeuristic(hit),
        }));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "News search failed");
        return [];
      }
    })
  );
  if (sources.length > 0 && failures.length === sources.length) {
    throw new Error(failures[0]);
  }

  const seen = new Set<string>();
  const collected: Collected[] = [];
  for (const item of batches.flat()) {
    if (seen.has(item.hit.url)) continue;
    seen.add(item.hit.url);
    collected.push(item);
  }
  collected.sort((a, b) => b.hit.publishedAt.localeCompare(a.hit.publishedAt));
  return collected.slice(0, 40);
}

// Si hay OPENAI_API_KEY, la rúbrica de la org reemplaza la lectura heurística.
async function scoreWithModel(
  items: Collected[],
  guides: { level: string; content: string }[],
  apiKey: string | undefined
): Promise<Collected[]> {
  if (!apiKey || items.length === 0) return items;

  const guideText = guides
    .map((guide) => `## ${guide.level}\n${guide.content}`)
    .join("\n\n");

  const payload = items.map((item) => ({
    url: item.hit.url,
    company: item.companyName,
    tick: item.tick,
    domain: item.domain,
    title: item.hit.title,
    summary: item.hit.summary,
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You score company news for an investment desk. Reply with JSON {\"items\":[{\"url\":string,\"materiality\":\"material\"|\"potentially\"|\"noteworthy\",\"category\":\"Earnings\"|\"Product\"|\"M&A\"|\"Regulation\"|\"Market\",\"whyItMatters\":string,\"aboutCompany\":boolean}]}. aboutCompany is false when the story is not about that company. whyItMatters is one sentence on estimates, margins, or valuation. Use the rubric.",
          },
          {
            role: "user",
            content: `Rubric:\n${guideText}\n\nItems:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!response.ok) return items;
    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") return items;
    const parsed = JSON.parse(text) as {
      items?: {
        url?: string;
        materiality?: Materiality;
        category?: FeedCategory;
        whyItMatters?: string;
        aboutCompany?: boolean;
      }[];
    };
    const byUrl = new Map(
      (parsed.items ?? [])
        .filter((item) => item.url)
        .map((item) => [item.url as string, item])
    );
    return items.map((item) => {
      const scored = byUrl.get(item.hit.url);
      if (!scored) return item;
      return {
        ...item,
        hit: {
          ...item.hit,
          materiality: isMateriality(scored.materiality)
            ? scored.materiality
            : item.hit.materiality,
          category: isCategory(scored.category)
            ? scored.category
            : item.hit.category,
          whyItMatters:
            typeof scored.whyItMatters === "string"
              ? scored.whyItMatters.slice(0, 500)
              : item.hit.whyItMatters,
          aboutCompany: scored.aboutCompany !== false,
        },
      };
    });
  } catch {
    return items;
  }
}

function isMateriality(value: unknown): value is Materiality {
  return value === "material" || value === "potentially" || value === "noteworthy";
}

function isCategory(value: unknown): value is FeedCategory {
  return (
    value === "Earnings" ||
    value === "Product" ||
    value === "M&A" ||
    value === "Regulation" ||
    value === "Market"
  );
}
