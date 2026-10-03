import { Clock, CheckCircle2, Menu, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <div className="flex cursor-default items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs transition-colors group-hover:border-primary/40">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Next run</span>
              <span className="font-medium">{nextRun}</span>
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
