import type { FeedItem, Materiality, NoiseRules } from "@/data/mock";

// Ranking de materialidad (mayor = más importante)
const RANK: Record<Materiality, number> = {
  noteworthy: 0,
  potentially: 1,
  material: 2,
};

export interface Screened {
  item: FeedItem;
  reason: string; // por qué se filtró (para mostrarlo en la UI)
}

export interface TriageResult {
  kept: FeedItem[];
  screened: Screened[];
}

// Normaliza una URL a su hostname sin "www." (en minúsculas)
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Separa las noticias en "kept" (se muestran) y "screened" (ruido) según las reglas
export function triage(items: FeedItem[], rules: NoiseRules): TriageResult {
  const kept: FeedItem[] = [];
  const screened: Screened[] = [];

  for (const item of items) {
    const haystack =
      `${item.title} ${item.summary} ${item.content}`.toLowerCase();
    const term = rules.excludeTerms.find(
      (t) => t.trim() && haystack.includes(t.trim().toLowerCase())
    );

    const host = hostOf(item.url);
    const domain = rules.excludeDomains.find((d) => {
      const needle = d.trim().replace(/^www\./, "").toLowerCase();
      // coincide el dominio exacto o cualquier subdominio
      return needle && (host === needle || host.endsWith(`.${needle}`));
    });

    // Antigüedad del item en horas (relativa a ahora)
    const ageHours =
      (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000;
    const tooOld =
      rules.maxLookbackHours != null && ageHours > rules.maxLookbackHours;

    if (term) {
      screened.push({ item, reason: `Matched blocked term "${term}"` });
    } else if (domain) {
      screened.push({ item, reason: `Blocked domain "${domain}"` });
    } else if (tooOld) {
      screened.push({
        item,
        reason: `Older than ${rules.maxLookbackHours}h lookback`,
      });
    } else if (RANK[item.materiality] < RANK[rules.minMateriality]) {
      screened.push({
        item,
        reason: `Below "${rules.minMateriality}" materiality threshold`,
      });
    } else {
      kept.push(item);
    }
  }

  return { kept, screened };
}
