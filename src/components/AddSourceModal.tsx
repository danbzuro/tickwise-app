"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Source } from "@/data/mock";

export interface SourceInput {
  name: string;
  tick: string | null;
  url: string;
}

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: Source | null;
  onSubmit: (input: SourceInput) => Promise<void> | void;
}

// Modal para crear o editar una fuente
export function AddSourceModal({
  open,
  onOpenChange,
  source,
  onSubmit,
}: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [tick, setTick] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(source);

  useEffect(() => {
    if (!open) return;
    setName(source?.name ?? "");
    setTick(source?.tick ?? "");
    setUrl(source?.url ?? "");
    setError(null);
    setSaving(false);
  }, [open, source]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        tick: tick.trim() ? tick.trim().toUpperCase() : null,
        url: url.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit source" : "Add source"}</DialogTitle>
          <DialogDescription>
            The URL identifies the company. Each run searches recent news about
            it and applies your noise rules. A ticker is optional context.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Apple Newsroom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tick">Tick (optional)</Label>
            <Input
              id="tick"
              placeholder="e.g. AAPL"
              className="font-mono uppercase"
              value={tick}
              onChange={(e) => setTick(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {editing ? "Save" : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
