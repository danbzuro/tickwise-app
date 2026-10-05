// La URL de la fuente no se crawlea: identifica a la empresa.
// Con PERPLEXITY_API_KEY busca ahí. Si no está, cae a Google News.

export type Materiality = "material" | "potentially" | "noteworthy";
export type FeedCategory = "Earnings" | "Product" | "M&A" | "Regulation" | "Market";

export interface CompanyRef {
  name: string;
  tick: string | null;
  domain: string;
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
  return {
    name,
    tick: source.tick?.trim() ? source.tick.trim() : null,
    domain,
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

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
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

function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Google News pone el titular otra vez en la descripción, más el nombre del medio.
function summaryIfNew(title: string, summary: string): string {
  const next = squash(summary);
  const prev = squash(title);
  if (!next || !prev) return next ? summary : "";
  if (next === prev) return "";
  const [shorter, longer] =
    next.length < prev.length ? [next, prev] : [prev, next];
  if (longer.includes(shorter) && longer.length - shorter.length <= 60) {
    return "";
  }
  return summary;
}

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

// Marcas de una sola palabra: Google las resuelve, pero en el texto hace falta otra pista.
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

// Palabras comunes que no identifican a la empresa si se buscan solas.
// "Strategy" es el nombre de MSTR y también un sustantivo cualquiera.
const GENERIC = new Set([
  "strategy",
  "strategies",
  "capital",
  "group",
  "global",
  "general",
  "national",
  "international",
  "american",
  "united",
  "first",
  "digital",
  "advanced",
  "energy",
  "health",
  "power",
  "financial",
  "finance",
  "holdings",
  "partners",
  "solutions",
  "services",
  "systems",
  "technology",
  "software",
  "network",
  "media",
  "management",
  "investment",
  "investments",
  "resources",
  "industries",
  "properties",
  "communications",
  "focus",
  "ventures",
  "enterprise",
  "enterprises",
  "security",
  "payments",
]);

const COMPANY_CUE =
  /\b(inc|corp|shares|stock|nasdaq|nyse|earnings|ceo|cfo|guidance|revenue|profit|announces|unveils|launches|launch|acquire|merger|lawsuit|recall|iphone|macbook)\b/i;

// Verbo o rol que indica que el nombre genérico es el sujeto de la nota.
const ROLE_AFTER =
  /^(announces?|announce|buys?|bought|buying|purchases?|purchased|reports?|adds?|added|adding|plans?|planned|acquires?|acquired|acquiring|posts?|posted|names?|named|appoints?|appointed|launches?|launched|unveils?|unveiled|beats?|misses?|missed|guides?|slides?|jumps?|falls?|rises?|surges?|drops?|tumbles?|soars?|raises?|raised|cuts?|cut|sells?|sold|files?|filed|settles?|settled|recalls?|recalled|holds?|held|holding|owns?|owned|expands?|expanded|boosts?|boosted|warns?|warned|faces?|faced|seeks?|sought|considers?|weighs?|eyes|eyed|targets?|forecasts?|forecasted)$/i;
const CORPORATE_AFTER =
  /^(inc|incorporated|corp|corporation|ltd|plc|co|company|holdings|group)$/i;
const BRIDGE_AFTER =
  /^(is|are|was|were|has|have|had|will|now|just|still|also|today|recently|keeps?|continues?)$/i;
// Palabra previa que vuelve común al nombre: "investment strategy", "picks and strategy".
const MODIFIER_BEFORE =
  /^(investment|investing|trading|betting|marketing|business|exit|growth|pricing|product|data|risk|game|nfl|dfs|fantasy|football|content|brand|media|military|political|legal|winning|picks?|showdown|best|good|great|new|our|your|their|this|that|a|an|the|and|or|of|for|in|on|to|with|its|his|her|my|national|global|corporate|overall)$/i;
const POSSESSIVE = /^['\u2018\u2019\u02BC]s\b/i;
// Si el titular empieza por el nombre, estas continuaciones siguen siendo la palabra común.
const GENERIC_NOISE_AFTER =
  /^(for|guide|tips|vs|versus|of|fest|festival)$/i;
const AMBIGUOUS_NOISE_AFTER =
  /^(pie|pies|fest|festival|recipe|recipes|cider|juice|orchard|orchards|season|crop|crops|harvest|picking|crisp|butter|tart|sauce|crumble)$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

// Un solo token y es una palabra de diccionario, no una marca.
export function isGenericName(name: string): boolean {
  const tokens = nameTokens(name);
  return tokens.length === 1 && GENERIC.has(tokens[0]);
}

function hasTicker(text: string, tick: string | null): boolean {
  if (!tick || tick.length < 3) return false;
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(tick)}([^A-Za-z0-9]|$)`, "i").test(
    text
  );
}

function nextWord(text: string): { word: string; rest: string } | null {
  const match = text.match(/^[^A-Za-z0-9]*([A-Za-z0-9]+)/);
  if (!match || match.index == null) return null;
  return {
    word: match[1],
    rest: text.slice(match.index + match[0].length),
  };
}

function previousWord(before: string): string {
  const trimmed = before.replace(/['’]s\s*$/i, "").trim();
  const parts = trimmed.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

// "Strategy announces…" sí. "investment strategy" o "picks and strategy" no.
function genericNameIsSubject(
  text: string,
  name: string,
  tick: string | null
): boolean {
  const re = new RegExp(
    `(^|[^A-Za-z0-9])(${escapeRegExp(name)})(?=[^A-Za-z0-9]|$)`,
    "gi"
  );
  for (const match of text.matchAll(re)) {
    const start = (match.index ?? 0) + match[1].length;
    const prev = previousWord(text.slice(0, start));
    if (prev && MODIFIER_BEFORE.test(prev)) continue;

    const after = text.slice(start + name.length);
    // "Strategy's bitcoin" es la empresa. "the strategy's" ya se descartó por el modificador.
    if (POSSESSIVE.test(after)) return true;

    if (
      tick &&
      new RegExp(`^\\W{0,3}\\(?\\s*${escapeRegExp(tick)}\\b`, "i").test(after)
    ) {
      return true;
    }

    const first = nextWord(after);
    if (!first) continue;
    if (CORPORATE_AFTER.test(first.word) || ROLE_AFTER.test(first.word)) return true;
    if (!BRIDGE_AFTER.test(first.word)) continue;
    const second = nextWord(first.rest);
    if (second && (CORPORATE_AFTER.test(second.word) || ROLE_AFTER.test(second.word))) {
      return true;
    }
  }
  return false;
}

// El nombre abre el titular: "Apple and Google…", no "Apple pie" ni "Strategy for Monday".
function nameLeads(text: string, name: string, generic: boolean): boolean {
  const match = text.match(/^\s*["“']*([A-Za-z0-9]+)/);
  if (!match || match[1].toLowerCase() !== name.toLowerCase()) return false;
  const rest = text.slice((match.index ?? 0) + match[0].length).replace(POSSESSIVE, "");
  const second = nextWord(rest);
  if (!second) return true;
  const noise = generic ? GENERIC_NOISE_AFTER : AMBIGUOUS_NOISE_AFTER;
  return !noise.test(second.word);
}

function nameRefersToCompany(
  text: string,
  name: string,
  tick: string | null,
  generic: boolean
): boolean {
  return nameLeads(text, name, generic) || genericNameIsSubject(text, name, tick);
}

export function mentionsCompany(text: string, company: CompanyRef): boolean {
  const haystack = text.toLowerCase();
  if (hasTicker(text, company.tick)) return true;
  if (company.domain && haystack.includes(company.domain)) return true;

  const tokens = nameTokens(company.name);
  if (tokens.length === 0) return false;
  if (!tokens.every((token) => haystack.includes(token))) return false;
  if (tokens.length >= 2) return true;
  if (isGenericName(company.name)) {
    return nameRefersToCompany(text, tokens[0], company.tick, true);
  }
  if (!AMBIGUOUS.has(tokens[0])) return true;
  return COMPANY_CUE.test(text) || nameRefersToCompany(text, tokens[0], company.tick, false);
}

function parseRss(xml: string): NewsHit[] {
  const hits: NewsHit[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const chunk = block.split(/<\/item>/i)[0] ?? "";
    const title = stripTags(tag(chunk, "title"));
    const link = tag(chunk, "link") || tag(chunk, "guid");
    const summary = summaryIfNew(
      title,
      stripTags(tag(chunk, "description")).slice(0, 1000)
    );
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

async function fetchGoogleNews(query: string): Promise<NewsHit[]> {
  const endpoint = new URL("https://news.google.com/rss/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("hl", "en-US");
  endpoint.searchParams.set("gl", "US");
  endpoint.searchParams.set("ceid", "US:en");

  const response = await fetch(endpoint, {
    headers: {
      // Google News a veces devuelve 200 vacío a UAs "bot".
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!response.ok) {
    throw new Error(`News search failed (${response.status})`);
  }
  const xml = await response.text();
  if (!/<item[\s>]/i.test(xml)) {
    throw new Error("News search returned no RSS items");
  }
  return parseRss(xml);
}

function quoteTerm(value: string): string {
  return `"${value.replace(/"/g, "")}"`;
}

// Cláusulas que identifican a la empresa. Un nombre genérico no va suelto.
function identityClauses(company: CompanyRef): string[] {
  const clauses: string[] = [];
  const name = company.name.trim();
  const tick = company.tick?.trim() ?? "";
  const generic = name !== "" && isGenericName(name);

  if (tick.length >= 3) clauses.push(quoteTerm(tick));
  else if (tick && name) clauses.push(`${quoteTerm(name)} ${quoteTerm(tick)}`);

  if (company.domain) clauses.push(quoteTerm(company.domain));

  if (name && !generic) {
    clauses.push(quoteTerm(name));
  } else if (name && generic) {
    for (const suffix of ["Inc", "Corp", "Corporation"]) {
      clauses.push(quoteTerm(`${name} ${suffix}`));
    }
  }

  return [...new Set(clauses)];
}

export function googleNewsQuery(company: CompanyRef, when: string): string {
  const clauses = identityClauses(company);
  const core =
    clauses.length === 0
      ? quoteTerm(company.name.trim() || company.domain || company.tick || "company")
      : clauses.length === 1
        ? clauses[0]
        : `(${clauses.join(" OR ")})`;
  return `${core} when:${when}`;
}

export function perplexityNewsQuery(company: CompanyRef): string {
  const parts = [`the public company ${company.name}`];
  if (company.tick) parts.push(`ticker ${company.tick}`);
  if (company.domain) parts.push(`website ${company.domain}`);
  const caution = isGenericName(company.name)
    ? ` The word "${company.name}" by itself is not this company; skip articles that only use it as an ordinary word.`
    : "";
  return `Recent news about ${parts.join(", ")}.${caution} Only stories about that company: its stock, earnings, products, regulation, deals, or leadership.`;
}

async function searchGoogleNews(
  company: CompanyRef,
  windowMs: number
): Promise<NewsHit[]> {
  const hours = windowMs / 3_600_000;
  const primary = await fetchGoogleNews(googleNewsQuery(company, googleWhen(hours)));
  const hits = filterHits(primary, windowMs, company);
  if (hits.length > 0 || hours >= 48) return hits.slice(0, 12);
  const wider = await fetchGoogleNews(googleNewsQuery(company, "2d"));
  return filterHits(wider, windowMs, company).slice(0, 12);
}

// MM/DD/YYYY, formato del filtro de fecha de Perplexity.
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
  apiKey: string | undefined
): Promise<NewsHit[]> {
  if (!apiKey) return searchGoogleNews(company, windowMs);
  try {
    const hits = await searchPerplexityNews(company, windowMs, apiKey);
    // Vacío tras el filtro no es error: igual caemos a Google.
    if (hits.length > 0) return hits;
  } catch {
    // Si Perplexity falla, Google News sigue siendo usable.
  }
  return searchGoogleNews(company, windowMs);
}

async function searchPerplexityNews(
  company: CompanyRef,
  windowMs: number,
  apiKey: string
): Promise<NewsHit[]> {
  const query = perplexityNewsQuery(company);

  const response = await fetch("https://api.perplexity.ai/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 10,
      // Perplexity no acepta recency junto con el filtro de fecha.
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
      summary: summaryIfNew(
        title,
        summary.replace(/\s+/g, " ").trim().slice(0, 1000)
      ),
      publishedAt: published ?? new Date().toISOString(),
    });
  }
  return filterHits(hits, windowMs, company).slice(0, 12);
}

// Perplexity a menudo manda solo la fecha (00:00:00Z). Esa marca no sirve
// para recortar por hora: si no, después del mediodía UTC un lookback de 12h
// tira todas las notas de "hoy".
export function isDateOnlyUtc(iso: string): boolean {
  const date = new Date(iso);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export function publishedInWindow(
  publishedAt: string,
  windowMs: number,
  now = Date.now()
): boolean {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return false;
  const since = now - windowMs;
  if (isDateOnlyUtc(publishedAt)) {
    return published + 86_400_000 - 1 >= since;
  }
  return published >= since;
}

function filterHits(
  hits: NewsHit[],
  windowMs: number,
  company?: CompanyRef
): NewsHit[] {
  const seen = new Set<string>();
  const kept: NewsHit[] = [];
  for (const hit of hits) {
    if (!publishedInWindow(hit.publishedAt, windowMs)) continue;
    if (company && !mentionsCompany(`${hit.title} ${hit.summary}`, company)) continue;
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

  if (!publishedInWindow(hit.publishedAt, rules.windowHours * 3_600_000)) {
    return `Older than ${rules.windowHours}h lookback`;
  }

  if (RANK[hit.materiality] < RANK[rules.minMateriality]) {
    return `Below "${rules.minMateriality}" materiality threshold`;
  }
  return null;
}
