import { useState } from "react";
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

interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { name: string; tick: string; url: string }) => void;
}

// Modal para agregar una nueva fuente al scraper
export function AddSourceModal({
  open,
  onOpenChange,
  onAdd,
}: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [tick, setTick] = useState("");
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tick.trim() || !url.trim()) return;
    onAdd({
      name: name.trim(),
      tick: tick.trim().toUpperCase(),
      url: url.trim(),
    });
    onOpenChange(false);
    setName("");
    setTick("");
    setUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Register a new origin for the scraper to crawl on each cron run.
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
            <Label htmlFor="tick">Tick</Label>
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

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add source</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
