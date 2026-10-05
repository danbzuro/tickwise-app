import { useState } from "react";
import { Plus, Save, X, Filter, Bot, Globe, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SettingsNav } from "@/components/SettingsNav";
import { useToast } from "@/components/ui/toast";
import type {
  NoiseRules,
  Materiality,
  MaterialityGuidelines,
} from "@/data/mock";

interface SettingsRulesPageProps {
  noiseRules: NoiseRules;
  guidelines: MaterialityGuidelines;
  onAddExcludeTerm: (term: string) => void;
  onRemoveExcludeTerm: (term: string) => void;
  onAddExcludeDomain: (domain: string) => void;
  onRemoveExcludeDomain: (domain: string) => void;
  onChangeMinMateriality: (level: Materiality) => void;
  onChangeMaxLookback: (hours: number | null) => void;
  onChangeGuideline: (level: Materiality, text: string) => void;
  onSave: () => Promise<void>;
}

// Presets de ventana de frescura (null = "Since last run")
const LOOKBACK_PRESETS: { label: string; hours: number | null }[] = [
  { label: "Since last run", hours: null },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
];

const MATERIALITY_OPTIONS: { value: Materiality; label: string }[] = [
  { value: "noteworthy", label: "Noteworthy (keep everything)" },
  { value: "potentially", label: "Potentially material" },
  { value: "material", label: "Material only (strictest)" },
];

// Niveles de materialidad para la rúbrica del agente
const MATERIALITY_LEVELS: {
  value: Materiality;
  label: string;
  dotClassName: string;
}[] = [
  { value: "material", label: "Material", dotClassName: "bg-emerald-600" },
  {
    value: "potentially",
    label: "Potentially material",
    dotClassName: "bg-amber-500",
  },
  {
    value: "noteworthy",
    label: "Noteworthy",
    dotClassName: "bg-muted-foreground",
  },
];

export function SettingsRulesPage({
  noiseRules,
  guidelines,
  onAddExcludeTerm,
  onRemoveExcludeTerm,
  onAddExcludeDomain,
  onRemoveExcludeDomain,
  onChangeMinMateriality,
  onChangeMaxLookback,
  onChangeGuideline,
  onSave,
}: SettingsRulesPageProps) {
  const [termDraft, setTermDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const notify = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
      notify("Saved successfully");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const lookback = noiseRules.maxLookbackHours;
  // "custom" = hay un valor que no coincide con ningún preset
  const isCustom =
    lookback != null && !LOOKBACK_PRESETS.some((p) => p.hours === lookback);

  function submitTerm() {
    const term = termDraft.trim().toLowerCase();
    if (!term) return;
    onAddExcludeTerm(term);
    setTermDraft("");
  }

  function submitDomain() {
    // Normaliza: saca protocolo, "www." y cualquier path para quedarnos con el dominio
    const domain = domainDraft
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    if (!domain) return;
    onAddExcludeDomain(domain);
    setDomainDraft("");
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Tune how the agent filters noise across every source.
        </p>
      </div>

      <SettingsNav />

      {/* Reglas de ruido globales: materialidad mínima + términos + dominios */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Noise rules
          </CardTitle>
          <CardDescription>
            Applied to every source on each run. Items that don't pass are moved
            to "Screened out".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Frescura de la data: ventana máxima de lookback */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              Data freshness
            </Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Max age of items relative to the cron run. "Since last run" lets
              the schedule define the window; a cap is a safety net against stale
              or back-dated news.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {LOOKBACK_PRESETS.map((preset) => {
                const active = !isCustom && lookback === preset.hours;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChangeMaxLookback(preset.hours)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-primary bg-accent font-medium text-foreground"
                        : "border-input text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom en horas */}
              <button
                type="button"
                onClick={() => onChangeMaxLookback(isCustom ? lookback : 72)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  isCustom
                    ? "border-primary bg-accent font-medium text-foreground"
                    : "border-input text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                Custom
              </button>

              {isCustom && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={lookback ?? ""}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      onChangeMaxLookback(Number.isFinite(n) && n > 0 ? n : 1);
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              )}
            </div>
          </div>

          {/* Umbral de materialidad */}
          <div className="grid gap-2">
            <Label htmlFor="min-materiality">Minimum materiality</Label>
            <div className="relative w-full max-w-xs">
              <select
                id="min-materiality"
                value={noiseRules.minMateriality}
                onChange={(e) =>
                  onChangeMinMateriality(e.target.value as Materiality)
                }
                className="h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {MATERIALITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Anything below this level is screened out as noise.
            </p>
          </div>

          {/* Rúbrica de materialidad: contexto para el agente */}
          <div className="grid gap-3">
            <div>
              <Label className="flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                Materiality rubric
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Context given to the agent to classify each item. Markdown
                supported.
              </p>
            </div>

            {MATERIALITY_LEVELS.map((level) => (
              <div key={level.value} className="grid gap-1.5">
                <Label
                  htmlFor={`guide-${level.value}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${level.dotClassName}`}
                  />
                  {level.label}
                </Label>
                <Textarea
                  id={`guide-${level.value}`}
                  value={guidelines[level.value]}
                  onChange={(e) =>
                    onChangeGuideline(level.value, e.target.value)
                  }
                  rows={4}
                  className="font-mono text-xs leading-relaxed"
                  placeholder={`Define what counts as "${level.label}"...`}
                />
              </div>
            ))}
          </div>

          {/* Términos bloqueados */}
          <div className="grid gap-2">
            <Label>
              Blocked terms{" "}
              <span className="font-normal text-muted-foreground">
                ({noiseRules.excludeTerms.length})
              </span>
            </Label>

            {noiseRules.excludeTerms.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {noiseRules.excludeTerms.map((term) => (
                  <Badge
                    key={term}
                    variant="secondary"
                    className="gap-1 pr-1 font-normal"
                  >
                    {term}
                    <button
                      type="button"
                      onClick={() => onRemoveExcludeTerm(term)}
                      className="rounded-sm text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${term}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                No blocked terms yet. Add one to drop noisy items.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="e.g. webinar, sponsored, giveaway"
                value={termDraft}
                onChange={(e) => setTermDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitTerm();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" onClick={submitTerm}>
                <Plus className="h-4 w-4" />
                Add term
              </Button>
            </div>
          </div>

          {/* Dominios bloqueados */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              Blocked domains{" "}
              <span className="font-normal text-muted-foreground">
                ({noiseRules.excludeDomains.length})
              </span>
            </Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              Drop every item whose source URL matches these domains (subdomains
              included).
            </p>

            {noiseRules.excludeDomains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {noiseRules.excludeDomains.map((domain) => (
                  <Badge
                    key={domain}
                    variant="secondary"
                    className="gap-1 pr-1 font-normal"
                  >
                    {domain}
                    <button
                      type="button"
                      onClick={() => onRemoveExcludeDomain(domain)}
                      className="rounded-sm text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${domain}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                No blocked domains yet. Add one to drop noisy sources.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="e.g. prnewswire.com"
                value={domainDraft}
                onChange={(e) => setDomainDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitDomain();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" onClick={submitDomain}>
                <Plus className="h-4 w-4" />
                Add domain
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

    </div>
  );
}
