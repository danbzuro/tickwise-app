import { useRef, useState } from "react";
import { Building2, Upload, ImageIcon, X } from "lucide-react";
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

interface OrganizationCardProps {
  name: string;
  logoUrl: string | null;
  onNameChange: (name: string) => void;
  onLogoChange: (url: string | null) => void;
}

export function OrganizationCard({
  name,
  logoUrl,
  onNameChange,
  onLogoChange,
}: OrganizationCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Convierte el archivo a una URL local para previsualizar (mock)
  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    onLogoChange(URL.createObjectURL(file));
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
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
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
              "group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors",
              dragOver
                ? "border-primary bg-accent"
                : "border-input hover:bg-accent/50"
            )}
          >
            {logoUrl ? (
              <>
                <img
                  src={logoUrl}
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

          {logoUrl && (
            <button
              type="button"
              onClick={() => onLogoChange(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          />
        </div>

        {/* Nombre de la organización */}
        <div className="grid flex-1 gap-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Tickwise"
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            Drag &amp; drop an image onto the logo, or click to upload. PNG or
            JPG.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
