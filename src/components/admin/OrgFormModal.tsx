"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Payload que entrega el formulario al confirmar (crear o editar)
export interface OrgFormValues {
  name: string;
  slug: string;
  ownerEmail: string; // sólo relevante al crear
  supportEmail: string;
  primaryColor: string;
}

interface OrgFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Si viene una org, el modal edita; si no, crea.
  org?: AdminOrg | null;
  onSubmit: (values: OrgFormValues) => Promise<void>;
}

const EMPTY: OrgFormValues = {
  name: "",
  slug: "",
  ownerEmail: "",
  supportEmail: "",
  primaryColor: "",
};

export function OrgFormModal({
  open,
  onOpenChange,
  org,
  onSubmit,
}: OrgFormModalProps) {
  const isEdit = !!org;
  const [values, setValues] = useState<OrgFormValues>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reinicia el formulario cada vez que se abre (con o sin org)
  useEffect(() => {
    if (!open) return;
    setError("");
    setValues(
      org
        ? {
            name: org.name,
            slug: org.slug ?? "",
            ownerEmail: "",
            supportEmail: org.supportEmail ?? "",
            primaryColor: org.primaryColor ?? "",
          }
        : EMPTY
    );
  }, [open, org]);

  function set<K extends keyof OrgFormValues>(key: K, value: OrgFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("Organization name is required");
      return;
    }
    if (values.ownerEmail.trim() && !EMAIL_RE.test(values.ownerEmail.trim())) {
      setError("Enter a valid owner email");
      return;
    }
    if (values.supportEmail.trim() && !EMAIL_RE.test(values.supportEmail.trim())) {
      setError("Enter a valid support email");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
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
          <DialogTitle>
            {isEdit ? "Edit organization" : "Create organization"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the tenant's name, slug and white-label settings."
              : "Add a new tenant to the platform."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              placeholder="e.g. Acme Capital"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              placeholder="auto from name (e.g. acme-capital)"
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for the tenant subdomain. Leave empty to auto-generate.
            </p>
          </div>

          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="org-owner">Initial owner email</Label>
              <Input
                id="org-owner"
                type="email"
                placeholder="owner@company.com (optional)"
                value={values.ownerEmail}
                onChange={(e) => set("ownerEmail", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Creates a pending owner invite for this organization.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="org-support">Support email</Label>
            <Input
              id="org-support"
              type="email"
              placeholder="support@company.com (optional)"
              value={values.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-color">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="org-color"
                type="color"
                value={values.primaryColor || "#4f46e5"}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
              <Input
                placeholder="#4f46e5 (optional)"
                value={values.primaryColor}
                onChange={(e) => set("primaryColor", e.target.value)}
                className="max-w-[160px]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

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
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
