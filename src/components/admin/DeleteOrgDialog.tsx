import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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
import type { AdminOrg } from "@/lib/api";

interface DeleteOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: AdminOrg | null;
  onConfirm: () => Promise<void>;
}

// Confirmación destructiva: exige escribir el nombre exacto para borrar.
export function DeleteOrgDialog({
  open,
  onOpenChange,
  org,
  onConfirm,
}: DeleteOrgDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setError("");
    }
  }, [open]);

  if (!org) return null;

  const canDelete = confirmText.trim() === org.name;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete organization
          </DialogTitle>
          <DialogDescription>
            This permanently deletes <strong>{org.name}</strong> and{" "}
            <strong>all of its data</strong> (members, sources, recipients,
            schedules, rules, runs and feed items). This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor="confirm-name">
            Type <span className="font-semibold">{org.name}</span> to confirm
          </Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError("");
            }}
            placeholder={org.name}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
