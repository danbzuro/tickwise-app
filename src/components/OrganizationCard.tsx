"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Upload, ImageIcon, X, Loader2, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ACCEPTED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

interface OrganizationCardProps {
  name: string;
  logoUrl: string | null;
  onNameChange: (name: string) => void;
  onLogoChange: (file: File | null) => Promise<void>;
}

export function OrganizationCard({
  name,
  logoUrl,
  onNameChange,
  onLogoChange,
}: OrganizationCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Draft local del nombre: la UI responde en cada tecla, pero sólo persiste on-blur
  const [nameDraft, setNameDraft] = useState(name);
  const [showSaved, setShowSaved] = useState(false);

  const storedLogoUrl = logoUrl?.startsWith("http") ? logoUrl : null;

  // Sincroniza el draft si el nombre cambia desde afuera (p. ej. recarga de datos)
  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  // Persiste el nombre si cambió; revierte si quedó vacío
  function commitName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(name);
      return;
    }
    if (trimmed === name) return;
    onNameChange(trimmed);
    setShowSaved(true);
  }

  // Oculta el indicador "Saved" después de un rato
  useEffect(() => {
    if (!showSaved) return;
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [showSaved]);

  // Sube el archivo a Storage. El padre persiste la URL pública.
  async function handleFile(file: File | undefined) {
    if (!file || !ACCEPTED_LOGO_TYPES.has(file.type) || uploading) return;
    setUploading(true);
    try {
      await onLogoChange(file);
    } catch {
      // El padre ya muestra el error.
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (uploading) return;
    setUploading(true);
    try {
      await onLogoChange(null);
    } catch {
      // El padre ya muestra el error.
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Organization
        </CardTitle>
        <CardDescription>
          Change your organization's logo and name.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-start">
        {/* Dropzone del logo */}
        <div className="flex flex-col items-center gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!uploading) inputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (uploading) return;
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border transition-colors",
              dragOver
                ? "border-primary bg-accent"
                : storedLogoUrl
                  ? // Fondo oscuro igual que el sidebar, para que los PNG con logo blanco se vean
                    "border-primary bg-primary"
                  : "border-dashed border-input hover:bg-accent/50"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : storedLogoUrl ? (
              <>
                <img
                  src={storedLogoUrl}
                  alt="Organization logo"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[10px]">Drop logo</span>
              </div>
            )}
          </div>

          {storedLogoUrl && (
            <button
              type="button"
              onClick={() => void removeLogo()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? undefined)}
          />
        </div>

        {/* Nombre de la organización */}
        <div className="grid flex-1 gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            {showSaved && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
          <Input
            id="org-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitName();
                e.currentTarget.blur();
              }
            }}
            placeholder="e.g. Tickwise"
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            Drag &amp; drop an image onto the logo, or click to upload. PNG,
            JPG, or WEBP. Max 2 MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
