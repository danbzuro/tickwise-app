"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Clock,
  Search,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  EyeOff,
  Check,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { decodeEntities, extraCopy } from "@/lib/feedText";
import { triage } from "@/lib/rules";
import type { FeedItem, NoiseRules } from "@/data/mock";

// Mapea categoría -> variante visual de la badge
const categoryVariant: Record<
  FeedItem["category"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  Earnings: "default",
  Product: "secondary",
  "M&A": "default",
  Regulation: "destructive",
  Market: "outline",
};

// Estilo de la badge de materialidad
const materialityBadge: Record<
  FeedItem["materiality"],
  { label: string; className: string }
> = {
  material: { label: "Material", className: "bg-emerald-600 text-white" },
  potentially: {
    label: "Potentially material",
    className: "bg-amber-500 text-white",
  },
  noteworthy: {
    label: "Noteworthy",
    className: "bg-muted text-muted-foreground",
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Devuelve "YYYY-MM-DD" a partir de un ISO
function dayKey(iso: string) {
  return iso.slice(0, 10);
}

// Etiqueta relativa para el selector de día (Today / Yesterday / fecha)
function dayLabel(key: string) {
  const date = new Date(`${key}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface FeedPageProps {
  items: FeedItem[];
  noiseRules: NoiseRules;
  onMarkRead: (ids: string[], read: boolean) => Promise<void>;
  onDismiss: (ids: string[]) => Promise<void>;
}

// Select estilizado reutilizable para los filtros
function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={`Filter by ${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 appearance-none rounded-md border bg-transparent pl-3 pr-7 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          value !== "all" ? "border-primary/40 bg-accent" : "border-input"
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

const CATEGORIES: FeedItem["category"][] = [
  "Earnings",
  "Product",
  "M&A",
  "Regulation",
  "Market",
];

const MATERIALITIES: FeedItem["materiality"][] = [
  "material",
  "potentially",
  "noteworthy",
];

// Marca como "cayendo" las cards que aparecen después del primer render
function useFallingItemIds(items: FeedItem[]) {
  const seenRef = useRef<Set<string> | null>(null);
  const [fallingIds, setFallingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = items.map((item) => item.id);
    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
      return;
    }

    const fresh = ids.filter((id) => !seenRef.current!.has(id));
    const live = new Set(ids);
    for (const id of seenRef.current) {
      if (!live.has(id)) seenRef.current.delete(id);
    }
    if (fresh.length === 0) return;

    fresh.forEach((id) => seenRef.current!.add(id));
    setFallingIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      return next;
    });
  }, [items]);

  const onFell = useCallback((id: string) => {
    setFallingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { fallingIds, onFell };
}

export function FeedPage({
  items,
  noiseRules,
  onMarkRead,
  onDismiss,
}: FeedPageProps) {
  const [selectedDay, setSelectedDay] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Filtros por los 3 criterios de los badges
  const [company, setCompany] = useState("all");
  const [category, setCategory] = useState("all");
  const [materiality, setMateriality] = useState("all");
  const [inbox, setInbox] = useState<"unread" | "read">("unread");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { fallingIds, onFell } = useFallingItemIds(items);

  // Días disponibles (únicos, ordenados desc)
  const days = useMemo(() => {
    const keys = Array.from(new Set(items.map((i) => dayKey(i.publishedAt))));
    return keys.sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Empresas disponibles (ticks únicos, ordenados)
  const companies = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.tick))).sort();
  }, [items]);

  // Aplica filtros de día + 3 criterios
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (selectedDay !== "all" && dayKey(i.publishedAt) !== selectedDay)
        return false;
      if (company !== "all" && i.tick !== company) return false;
      if (category !== "all" && i.category !== category) return false;
      if (materiality !== "all" && i.materiality !== materiality) return false;
      return true;
    });
  }, [items, selectedDay, company, category, materiality]);

  // Aplica las reglas de ruido sobre el set filtrado
  const { kept, screened } = useMemo(
    () => triage(filtered, noiseRules),
    [filtered, noiseRules]
  );

  const visible = useMemo(
    () => kept.filter((item) => (inbox === "read" ? item.read : !item.read)),
    [kept, inbox]
  );

  // El filtro Unread/Read también aplica al ruido
  const visibleScreened = useMemo(
    () =>
      screened.filter(({ item }) => (inbox === "read" ? item.read : !item.read)),
    [screened, inbox]
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function mark(ids: string[], read: boolean) {
    await onMarkRead(ids, read);
    setSelected(new Set());
  }

  async function dismiss(ids: string[]) {
    await onDismiss(ids);
    setSelected(new Set());
  }

  const readLabel = inbox === "read" ? "Mark as unread" : "Mark as read";

  return (
    <div className="space-y-6 pb-24">
      {/* Encabezado de página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} {inbox === "read" ? "read" : "unread"} ·{" "}
            {visibleScreened.length} screened as noise
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador */}
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8" />
          </div>

          {/* Filtro por día */}
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="h-9 appearance-none rounded-md border border-input bg-transparent pl-8 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All days</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Filtros por los 3 criterios: Company, Category, Materiality */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Filter by
        </span>

        <div className="flex rounded-md border border-input p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setInbox("unread");
              setSelected(new Set());
            }}
            className={cn(
              "rounded px-2 py-1",
              inbox === "unread" ? "bg-accent font-medium" : "text-muted-foreground"
            )}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => {
              setInbox("read");
              setSelected(new Set());
            }}
            className={cn(
              "rounded px-2 py-1",
              inbox === "read" ? "bg-accent font-medium" : "text-muted-foreground"
            )}
          >
            Read
          </button>
        </div>

        <FilterSelect value={company} onChange={setCompany} label="company">
          <option value="all">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={category} onChange={setCategory} label="category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={materiality}
          onChange={setMateriality}
          label="materiality"
        >
          <option value="all">All materiality</option>
          {MATERIALITIES.map((m) => (
            <option key={m} value={m}>
              {materialityBadge[m].label}
            </option>
          ))}
        </FilterSelect>

        {(company !== "all" ||
          category !== "all" ||
          materiality !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCompany("all");
              setCategory("all");
              setMateriality("all");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 md:left-64">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              onClick={() => mark([...selected], inbox !== "read")}
            >
              <Check className="h-3.5 w-3.5" />
              {readLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => dismiss([...selected])}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lista de noticias relevantes */}
      <div className="grid gap-4">
        {visible.length === 0 && (
          <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            {inbox === "read"
              ? "No read news for this selection."
              : "No unread news for this selection."}
          </p>
        )}

        {visible.map((item) => {
          const isOpen = expanded[item.id];
          const mat = materialityBadge[item.materiality];
          const title = decodeEntities(item.title);
          const summary = extraCopy(item.summary, title);
          const body = extraCopy(item.content, title, item.summary);
          const why = item.whyItMatters ? decodeEntities(item.whyItMatters) : "";
          const canExpand = Boolean(why || body);
          return (
            <Card
              key={item.id}
              className={cn(
                "transition-shadow hover:shadow-md",
                fallingIds.has(item.id) && "animate-feed-card-fall"
              )}
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget) onFell(item.id);
              }}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Badge variant="outline" className="font-mono">
                    {item.tick}
                  </Badge>
                  <Badge variant={categoryVariant[item.category]}>
                    {item.category}
                  </Badge>
                  <Badge className={mat.className}>{mat.label}</Badge>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(item.publishedAt)}
                  </span>
                </div>
                <CardTitle className="text-lg leading-snug">{title}</CardTitle>
                {summary && <CardDescription>{summary}</CardDescription>}
              </CardHeader>

              {/* Contenido expandido: "¿y qué?" + detalle que no repite el titular */}
              {isOpen && canExpand && (
                <CardContent className="space-y-3 pt-0">
                  {why && (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        Why it matters
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {why}
                      </p>
                    </div>
                  )}
                  {body && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  )}
                </CardContent>
              )}

              <CardContent className="flex items-center justify-between gap-2 pt-0">
                {canExpand ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(item.id)}
                    className="-ml-2"
                  >
                    {isOpen ? (
                      <>
                        Show less <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mark([item.id], !item.read)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {item.read ? "Mark as unread" : "Mark as read"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => dismiss([item.id])}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sección "Screened out" (ruido filtrado) */}
      {visibleScreened.length > 0 && (
        <details className="group rounded-lg border border-dashed">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm text-muted-foreground">
            <EyeOff className="h-4 w-4" />
            <span className="font-medium">
              {visibleScreened.length} items screened out as noise
            </span>
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t p-4 pt-3">
            {visibleScreened.map(({ item, reason }) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md px-1 py-1.5"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="mt-0.5 h-4 w-4 rounded border-input"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.tick}
                      </span>
                      <span className="truncate text-sm">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {reason}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mark([item.id], !item.read)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {item.read ? "Mark as unread" : "Mark as read"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => dismiss([item.id])}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Open"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
