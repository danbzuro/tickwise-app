// La URL de la fuente no se crawlea: identifica a la empresa.
// Perplexity busca la cobertura reciente. El modelo clasifica después.

export type Materiality = "material" | "potentially" | "noteworthy";
export type FeedCategory = "Earnings" | "Product" | "M&A" | "Regulation" | "Market";

export interface CompanyRef {
  name: string;
  tick: string | null;
  domain: string;
  query: string;
}

export interface NewsHit {
  title: string;
  url: string;
  outletUrl: string;
  summary: string;
  publishedAt: string;
}

export interface ScoredHit extends NewsHit {
  materiality: Materiality;
  category: FeedCategory;
  whyItMatters: string;
  aboutCompany: boolean;
}

export interface NoiseRules {
  excludeTerms: string[];
  excludeDomains: string[];
  minMateriality: Materiality;
  windowHours: number;
}

const RANK: Record<Materiality, number> = {
  noteworthy: 0,
  potentially: 1,
  material: 2,
};

const MATERIAL =
  /\b(earnings|guidance|revenue|profit|margin|acquisition|merger|acquires|buyout|lawsuit|sued|investigation|ceo|cfo|resign|recall|bankruptcy|fda|sec|buyback|dividend|layoff|antitrust|settlement)\b/i;
const FLUFF =
  /\b(fest|festival|recipe|podcast|roundup|recap|gift guide|horoscope|deal of the day|what to watch)\b/i;

// Arma la identidad de búsqueda a partir del nombre, el tick y el dominio de la URL.
export function companyRef(source: {
  name: string;
  tick: string | null;
  url: string;
}): CompanyRef {
  let domain = "";
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    domain = "";
  }
  const brand = domain.split(".")[0] ?? "";
  const cleaned = source.name
    .replace(
      /\b(newsroom|news room|press room|press|blog|official|investor relations|news)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  const name = cleaned.length >= 2 ? cleaned : brand || source.name.trim();
  const parts = [name];
  if (source.tick) parts.push(source.tick);
  if (domain) parts.push(domain);
  return {
    name,
    tick: source.tick,
    domain,
    query: parts.join(" "),
  };
}

// Horas hacia atrás. Un tope explícito gana; si no, entre 12 h y 48 h desde la última corrida.
export function windowHours(
  maxLookbackHours: number | null,
  lastSuccessAt: string | null
): number {
  if (maxLookbackHours != null && maxLookbackHours > 0) return maxLookbackHours;
  if (!lastSuccessAt) return 48;
  const elapsed =
    (Date.now() - new Date(lastSuccessAt).getTime()) / 3_600_000;
  return Math.min(48, Math.max(12, elapsed));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function recency(hours: number): "hour" | "day" | "week" {
  if (hours <= 1) return "hour";
  if (hours <= 24) return "day";
  return "week";
}

// MM/DD/YYYY, que es el formato que pide el filtro de fecha de Perplexity.
function usDate(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function parsePublished(value: string | null | undefined): string | null {
  if (!value) return null;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!us) return null;
  const parsed = Date.parse(`${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

// Busca cobertura reciente. La URL de la fuente no se descarga.
export async function searchCompanyNews(
  company: CompanyRef,
  windowMs: number,
  apiKey: string
): Promise<NewsHit[]> {
  const hours = windowMs / 3_600_000;
  const who = company.tick ? `${company.name} (${company.tick})` : company.name;
  const query = company.domain
    ? `Recent news about the company ${who}, ${company.domain}`
    : `Recent news about the company ${who}`;

  const response = await fetch("https://api.perplexity.ai/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 10,
      search_recency_filter: recency(hours),
      search_after_date_filter: usDate(Date.now() - windowMs),
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`News search failed (${response.status}) ${detail}`);
  }

  const json = await response.json();
  const pages = Array.isArray(json?.results) ? json.results : [];
  const hits: NewsHit[] = [];
  for (const page of pages) {
    const title = typeof page?.title === "string" ? page.title.trim() : "";
    const url = typeof page?.url === "string" ? page.url.trim() : "";
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const summary = typeof page?.snippet === "string" ? page.snippet : "";
    const published =
      parsePublished(page?.date) ?? parsePublished(page?.last_updated);
    hits.push({
      title: title.slice(0, 500),
      url,
      outletUrl: `https://${hostOf(url)}`,
      summary: summary.replace(/\s+/g, " ").trim().slice(0, 1000),
      publishedAt: published ?? new Date().toISOString(),
    });
  }
  return filterHits(hits, windowMs).slice(0, 12);
}

function filterHits(hits: NewsHit[], windowMs: number): NewsHit[] {
  const since = Date.now() - windowMs;
  const seen = new Set<string>();
  const kept: NewsHit[] = [];
  for (const hit of hits) {
    if (new Date(hit.publishedAt).getTime() < since) continue;
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    kept.push(hit);
  }
  kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return kept;
}

// Primera lectura de materialidad, sin modelo. El modelo la pisa si hay API key.
export function scoreHeuristic(hit: NewsHit): ScoredHit {
  const text = `${hit.title} ${hit.summary}`;
  let materiality: Materiality = "potentially";
  if (MATERIAL.test(text)) materiality = "material";
  else if (FLUFF.test(text)) materiality = "noteworthy";

  let category: FeedCategory = "Market";
  if (/\b(earnings|revenue|guidance|profit|margin)\b/i.test(text)) {
    category = "Earnings";
  } else if (/\b(acqui|merger|buyout|stake)\b/i.test(text)) {
    category = "M&A";
  } else if (/\b(fda|sec|regulat|antitrust|lawsuit|sued|fine)\b/i.test(text)) {
    category = "Regulation";
  } else if (/\b(launch|product|chip|model|release)\b/i.test(text)) {
    category = "Product";
  }

  return { ...hit, materiality, category, whyItMatters: "", aboutCompany: true };
}

// Misma prioridad que src/lib/rules.ts: término, dominio, antigüedad, materialidad.
export function screenReason(
  hit: ScoredHit,
  rules: NoiseRules
): string | null {
  const haystack = `${hit.title} ${hit.summary}`.toLowerCase();
  const term = rules.excludeTerms.find(
    (value) => value.trim() && haystack.includes(value.trim().toLowerCase())
  );
  if (term) return `Matched blocked term "${term}"`;

  const hosts = [hit.url, hit.outletUrl].map(hostOf);
  const domain = rules.excludeDomains.find((value) => {
    const needle = value.trim().replace(/^www\./, "").toLowerCase();
    return (
      needle &&
      hosts.some((host) => host === needle || host.endsWith(`.${needle}`))
    );
  });
  if (domain) return `Blocked domain "${domain}"`;

  const ageHours = (Date.now() - new Date(hit.publishedAt).getTime()) / 3_600_000;
  if (ageHours > rules.windowHours) {
    return `Older than ${rules.windowHours}h lookback`;
  }

  if (RANK[hit.materiality] < RANK[rules.minMateriality]) {
    return `Below "${rules.minMateriality}" materiality threshold`;
  }
  return null;
}
