import { CheckCircle2, Menu, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reloj con agujas. Giran mientras el scrape está en curso.
function RunClock({ running }: { running: boolean }) {
  const hand = (seconds: string) =>
    running
      ? {
          transformBox: "view-box" as const,
          transformOrigin: "center",
          animationDuration: seconds,
        }
      : undefined;

  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <g className={running ? "animate-spin" : undefined} style={hand("8s")}>
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <g className={running ? "animate-spin" : undefined} style={hand("2s")}>
        <line
          x1="12"
          y1="12"
          x2="16"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

interface TopbarProps {
  lastScrape: string;
  nextRun: string | null;
  isRunning: boolean;
  onRunCron: () => void;
  onMenuClick: () => void;
}

// Barra superior: hamburguesa (mobile) + estado del último scrape a la derecha
export function Topbar({
  lastScrape,
  nextRun,
  isRunning,
  onRunCron,
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-8">
      {/* Hamburguesa (sólo mobile) */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="hidden text-muted-foreground sm:inline">
            Last scrape
          </span>
          <span className="font-medium">{lastScrape}</span>
        </div>

        {nextRun && (
          <div className="group relative hidden sm:block">
            <div
              className={
                isRunning
                  ? "flex items-center gap-2 rounded-md border border-primary/40 bg-card px-3 py-1.5 text-xs text-foreground"
                  : "flex cursor-default items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors group-hover:border-primary/40"
              }
              aria-live="polite"
              aria-label={isRunning ? "Scrape running" : `Next run ${nextRun}`}
            >
              <RunClock running={isRunning} />
              <span className={isRunning ? undefined : "text-muted-foreground"}>
                {isRunning ? "Running" : "Next run"}
              </span>
              {!isRunning && <span className="font-medium text-foreground">{nextRun}</span>}
            </div>

            {/* Popover en hover con "Run now" */}
            <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-60 rounded-lg border bg-card p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Next scheduled run
                  </span>
                  <span className="text-xs font-medium">{nextRun}</span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Don't want to wait? Trigger the scraper now.
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={onRunCron}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
