// La URL de la fuente no se crawlea: identifica a la empresa.
// Las noticias salen de una búsqueda acotada a la ventana de frescura.

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

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    )
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")
  );
  return match ? decodeXml(match[1]) : "";
}

function attr(block: string, tagName: string, attribute: string): string {
  const match = block.match(
    new RegExp(`<${tagName}\\b[^>]*\\b${attribute}="([^"]+)"`, "i")
  );
  return match ? decodeXml(match[1]) : "";
}

function stripTags(value: string): string {
  return decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Bing envuelve la nota real en un redirect; nos quedamos con esa URL.
function articleUrl(link: string): string {
  try {
    const parsed = new URL(link);
    const inner = parsed.searchParams.get("url");
    if (inner && /^https?:\/\//i.test(inner)) return inner;
  } catch {
    // El link no es una URL absoluta.
  }
  return link;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Nombres de una sola palabra que también son palabras comunes. Sin tick ni
// contexto de empresa, "Big Apple" no cuenta como Apple Inc.
const AMBIGUOUS = new Set([
  "apple",
  "meta",
  "amazon",
  "shell",
  "target",
  "visa",
  "block",
  "snap",
]);
const COMPANY_CUE =
  /\b(inc|corp|shares|stock|nasdaq|nyse|earnings|ceo|cfo|guidance|revenue|profit|announces|unveils|launches|launch|acquire|merger|lawsuit|recall|iphone|macbook)\b/i;

function mentionsCompany(text: string, company: CompanyRef): boolean {
  const haystack = text.toLowerCase();
  if (
    company.tick &&
    new RegExp(`\\b${company.tick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
  ) {
    return true;
  }
  const tokens = company.name
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
  if (tokens.length === 0) return true;
  if (!tokens.every((token) => haystack.includes(token))) return false;
  if (tokens.length >= 2) return true;
  if (!AMBIGUOUS.has(tokens[0])) return true;
  return (
    COMPANY_CUE.test(text) ||
    (company.domain !== "" && haystack.includes(company.domain))
  );
}

function parseRss(xml: string): NewsHit[] {
  const hits: NewsHit[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const chunk = block.split(/<\/item>/i)[0] ?? "";
    const title = stripTags(tag(chunk, "title"));
    const link = tag(chunk, "link") || tag(chunk, "guid");
    const summary = stripTags(tag(chunk, "description")).slice(0, 1000);
    const published = Date.parse(tag(chunk, "pubDate"));
    if (!title || !link || Number.isNaN(published)) continue;
    const url = articleUrl(link);
    if (!/^https?:\/\//i.test(url)) continue;
    const outlet = attr(chunk, "source", "url");
    hits.push({
      title: title.slice(0, 500),
      url,
      outletUrl: /^https?:\/\//i.test(outlet) ? outlet : "",
      summary,
      publishedAt: new Date(published).toISOString(),
    });
  }
  return hits;
}

function googleWhen(hours: number): string {
  if (hours <= 1) return "1h";
  if (hours <= 12) return "12h";
  if (hours <= 24) return "1d";
  if (hours <= 48) return "2d";
  return `${Math.min(7, Math.ceil(hours / 24))}d`;
}

// Busca cobertura reciente. La URL de la fuente no se descarga.
export async function searchCompanyNews(
  company: CompanyRef,
  windowMs: number
): Promise<NewsHit[]> {
  const hours = windowMs / 3_600_000;
  const quoted = company.tick ? `"${company.name}" OR ${company.tick}` : `"${company.name}"`;
  const primary = await fetchGoogleNews(`${quoted} when:${googleWhen(hours)}`);
  const hits = filterHits(primary, company, windowMs);
  if (hits.length > 0 || hours >= 48) return hits.slice(0, 12);
  // when:12h a veces vuelve vacío; se reintenta más ancho y se recorta por fecha.
  const wider = await fetchGoogleNews(`${quoted} when:2d`);
  return filterHits(wider, company, windowMs).slice(0, 12);
}

async function fetchGoogleNews(query: string): Promise<NewsHit[]> {
  const endpoint = new URL("https://news.google.com/rss/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("hl", "en-US");
  endpoint.searchParams.set("gl", "US");
  endpoint.searchParams.set("ceid", "US:en");

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "Tickwise/1.0 (company news monitor)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) {
    throw new Error(`News search failed (${response.status})`);
  }
  return parseRss(await response.text());
}

function filterHits(hits: NewsHit[], company: CompanyRef, windowMs: number): NewsHit[] {
  const since = Date.now() - windowMs;
  const seen = new Set<string>();
  const kept: NewsHit[] = [];
  for (const hit of hits) {
    if (new Date(hit.publishedAt).getTime() < since) continue;
    if (!mentionsCompany(`${hit.title} ${hit.summary}`, company)) continue;
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
