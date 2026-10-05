// Datos de ejemplo (mock) para el mockup de UI

export interface Source {
  id: string;
  name: string;
  tick: string | null;
  url: string;
}

// Nivel de materialidad de una noticia (gatea si se muestra o se filtra como ruido)
export type Materiality = "material" | "potentially" | "noteworthy";

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  content: string; // texto largo para "Show more"
  whyItMatters: string; // el "¿y qué?" para el inversor
  tick: string;
  source: string;
  url: string;
  outletUrl?: string;
  publishedAt: string; // ISO
  category: "Earnings" | "Product" | "M&A" | "Regulation" | "Market";
  materiality: Materiality;
  read?: boolean;
}

export interface CronSchedule {
  id: string;
  time: string; // formato HH:mm
  enabled: boolean;
}

// Reglas globales de ruido (se editan en Settings, estado en App)
export interface NoiseRules {
  excludeTerms: string[];
  excludeDomains: string[];
  // Ventana máxima de antigüedad en horas. null = "Since last run" (sin tope,
  // los slots del cron definen la ventana). Red de seguridad para no traer data vieja.
  maxLookbackHours: number | null;
  minMateriality: Materiality;
}

export const defaultNoiseRules: NoiseRules = {
  excludeTerms: ["webinar", "sponsored", "job fair"],
  excludeDomains: ["prnewswire.com", "businesswire.com"],
  maxLookbackHours: null, // por defecto: la ventana la definen los slots del cron
  minMateriality: "potentially", // por defecto ocultamos lo "noteworthy"
};

// Rúbrica por nivel de materialidad: contexto (markdown) que guía al agente
// para clasificar y no traer cualquier cosa.
export type MaterialityGuidelines = Record<Materiality, string>;

export const defaultMaterialityGuidelines: MaterialityGuidelines = {
  material: `Events that can move valuation or estimates. Include:
- Earnings, revenue, guidance changes
- M&A (confirmed), financings, buybacks/dividends
- Major regulatory or legal actions, investigations
- C-suite / board changes
- Significant operational disruptions or safety incidents
- Large customer wins/losses`,
  potentially: `Could matter but needs confirmation or has unclear magnitude. Include:
- M&A rumors, early-stage partnerships
- Capex programs and strategic pivots
- Product launches with uncertain revenue impact
- Pricing actions pending more data`,
  noteworthy: `Minor but relevant color. Keep for context, not action:
- Routine PR and marketing
- Small operational notes (store hours, minor updates)
- Re-packaged prior announcements`,
};

// Usuario mock (para el avatar del sidebar)
export const currentUser = {
  name: "Dan Bzurovski",
  email: "dan@tickwise.io",
  initials: "DB",
};

// Organización (branding editable en Settings)
export interface Organization {
  name: string;
  logoUrl: string | null;
}

export const defaultOrganization: Organization = {
  name: "Tickwise",
  logoUrl: null,
};

// Miembros de la organización (activos + invites pendientes)
export type MemberRole = "Owner" | "Admin" | "Member";
export type MemberStatus = "active" | "pending";

export interface Member {
  id: string;
  name: string; // vacío si todavía no aceptó la invitación
  email: string;
  role: MemberRole;
  status: MemberStatus;
}

export const defaultMembers: Member[] = [
  {
    id: "m1",
    name: "Dan Bzurovski",
    email: "dan@tickwise.io",
    role: "Owner",
    status: "active",
  },
  {
    id: "m2",
    name: "María López",
    email: "maria@tickwise.io",
    role: "Admin",
    status: "active",
  },
  {
    id: "m3",
    name: "James Carter",
    email: "james@tickwise.io",
    role: "Member",
    status: "active",
  },
  {
    id: "m4",
    name: "",
    email: "investor@fund.com",
    role: "Member",
    status: "pending",
  },
  {
    id: "m5",
    name: "",
    email: "analyst@fund.com",
    role: "Admin",
    status: "pending",
  },
];

// Devuelve las iniciales a partir de un nombre o email
export function initialsOf(member: Member) {
  const base = member.name.trim() || member.email;
  const parts = member.name.trim() ? member.name.split(/\s+/) : [base];
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Fuentes que usa el cron para scrapear
export const sources: Source[] = [
  {
    id: "1",
    name: "Apple Newsroom",
    tick: "AAPL",
    url: "https://www.apple.com/newsroom/",
  },
  {
    id: "2",
    name: "NVIDIA Blog",
    tick: "NVDA",
    url: "https://blogs.nvidia.com/",
  },
  {
    id: "3",
    name: "Tesla Press",
    tick: "TSLA",
    url: "https://www.tesla.com/blog",
  },
  {
    id: "4",
    name: "Microsoft Source",
    tick: "MSFT",
    url: "https://news.microsoft.com/",
  },
  {
    id: "5",
    name: "Amazon News",
    tick: "AMZN",
    url: "https://www.aboutamazon.com/news",
  },
  {
    id: "6",
    name: "Meta Newsroom",
    tick: "META",
    url: "https://about.fb.com/news/",
  },
];

// Horarios en los que corre el cron (slots configurables)
export const defaultSchedules: CronSchedule[] = [
  { id: "s1", time: "08:00", enabled: true },
  { id: "s2", time: "14:00", enabled: true },
  { id: "s3", time: "20:00", enabled: false },
];

// Lista global de destinatarios: reciben el feed en CADA corrida del cron
export const defaultRecipients: string[] = [
  "dan@tickwise.io",
  "team@tickwise.io",
  "investors@tickwise.io",
];

const LONG = (topic: string) =>
  `${topic} The report highlights a broad set of signals that analysts have been tracking over the last few quarters, including shifts in demand, supply-chain dynamics and competitive positioning. Executives reiterated their guidance and pointed to several initiatives expected to contribute to margins in the coming periods. Observers note that the move aligns with the company's longer-term strategy and could influence peers across the sector. Additional details are expected to be shared in upcoming investor communications.`;

// Noticias recopiladas por el cron (a lo largo de varios días)
export const feedItems: FeedItem[] = [
  {
    id: "f1",
    title: "Apple unveils new M-series chips focused on on-device AI",
    summary:
      "The company announced a new generation of silicon with dedicated accelerators for local inference, promising significant efficiency gains.",
    content: LONG("Apple's new silicon doubles down on on-device inference."),
    whyItMatters:
      "On-device inference lowers cloud costs and strengthens Apple's hardware moat, supporting pricing power and services attach in the next cycle.",
    tick: "AAPL",
    source: "Apple Newsroom",
    url: "https://www.apple.com/newsroom/",
    publishedAt: "2026-10-03T08:00:00",
    category: "Product",
    materiality: "potentially",
  },
  {
    id: "f2",
    title: "NVIDIA expands its data center platform for cloud customers",
    summary:
      "New deals with hyperscale providers drive demand for GPUs for large-scale training and inference.",
    content: LONG("NVIDIA deepens its hyperscale relationships."),
    whyItMatters:
      "Locked-in hyperscale demand underpins data-center revenue durability and defends margins against emerging accelerator competition.",
    tick: "NVDA",
    source: "NVIDIA Blog",
    url: "https://blogs.nvidia.com/",
    publishedAt: "2026-10-03T08:00:00",
    category: "Market",
    materiality: "material",
  },
  {
    id: "f3",
    title: "Tesla reports record delivery figures for the quarter",
    summary:
      "The automaker beat analyst estimates with sustained growth across its main markets.",
    content: LONG("Tesla's delivery beat surprised the street."),
    whyItMatters:
      "A delivery beat pressures bears on demand concerns and could drive upward revisions to revenue and gross-margin estimates.",
    tick: "TSLA",
    source: "Tesla Press",
    url: "https://www.tesla.com/blog",
    publishedAt: "2026-10-02T08:00:00",
    category: "Earnings",
    materiality: "material",
  },
  {
    id: "f4",
    title: "Microsoft hosts sponsored Copilot webinar for enterprise admins",
    summary:
      "A marketing session walking through productivity features already announced earlier this year.",
    content: LONG("Microsoft re-packages existing Copilot messaging."),
    whyItMatters:
      "Largely promotional; no new product, pricing or customer data disclosed, so limited read-through to fundamentals.",
    tick: "MSFT",
    source: "Microsoft Source",
    url: "https://news.microsoft.com/",
    publishedAt: "2026-10-02T08:00:00",
    category: "Product",
    materiality: "noteworthy",
  },
  {
    id: "f5",
    title: "Amazon announces logistics network expansion in Latin America",
    summary:
      "The investment aims to reduce delivery times and strengthen the company's regional presence.",
    content: LONG("Amazon bets on regional logistics capacity."),
    whyItMatters:
      "Capex into regional fulfillment can expand the addressable market and improve unit economics, but pressures near-term free cash flow.",
    tick: "AMZN",
    source: "Amazon News",
    url: "https://www.aboutamazon.com/news",
    publishedAt: "2026-10-01T08:00:00",
    category: "Market",
    materiality: "potentially",
  },
  {
    id: "f6",
    title: "Meta under regulatory review over new privacy policies",
    summary:
      "Regulators are assessing the impact of the announced changes to user data handling.",
    content: LONG("Meta faces fresh scrutiny over data handling."),
    whyItMatters:
      "Regulatory action is a tail risk to ad targeting and could carry fines or operational constraints that weigh on the core business.",
    tick: "META",
    source: "Meta Newsroom",
    url: "https://about.fb.com/news/",
    publishedAt: "2026-10-01T08:00:00",
    category: "Regulation",
    materiality: "material",
  },
  {
    id: "f7",
    title: "Tesla shares minor update on retail store hours for the holidays",
    summary:
      "A routine operational note on seasonal showroom schedules across select regions.",
    content: LONG("Tesla adjusts seasonal retail hours."),
    whyItMatters:
      "Operationally trivial with no impact on deliveries, pricing or guidance; included only for completeness.",
    tick: "TSLA",
    source: "Tesla Press",
    url: "https://www.tesla.com/blog",
    publishedAt: "2026-10-03T08:00:00",
    category: "Market",
    materiality: "noteworthy",
  },
];
