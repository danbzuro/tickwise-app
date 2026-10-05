import { useState } from "react";
import { Clock, Plus, Trash2, Mail, X } from "lucide-react";
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
import { OrganizationCard } from "@/components/OrganizationCard";
import { SettingsNav } from "@/components/SettingsNav";
import type { CronSchedule, Organization } from "@/data/mock";

interface SettingsGeneralPageProps {
  organization: Organization;
  schedules: CronSchedule[];
  recipients: string[];
  onChangeOrgName: (name: string) => void;
  onChangeOrgLogo: (file: File | null) => Promise<void>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChangeTime: (id: string, time: string) => void;
  onToggle: (id: string) => void;
  onAddRecipient: (email: string) => void;
  onRemoveRecipient: (email: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SettingsGeneralPage({
  organization,
  schedules,
  recipients,
  onChangeOrgName,
  onChangeOrgLogo,
  onAdd,
  onRemove,
  onChangeTime,
  onToggle,
  onAddRecipient,
  onRemoveRecipient,
}: SettingsGeneralPageProps) {
  const enabledCount = schedules.filter((s) => s.enabled).length;
  const [draft, setDraft] = useState("");

  function submitEmail() {
    const email = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    onAddRecipient(email);
    setDraft("");
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure when the scraper cron runs and who receives the feed.
        </p>
      </div>

      <SettingsNav />

      {/* Organización (branding) */}
      <OrganizationCard
        name={organization.name}
        logoUrl={organization.logoUrl}
        onNameChange={onChangeOrgName}
        onLogoChange={onChangeOrgLogo}
      />

      {/* Horarios del cron */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Cron schedule
          </CardTitle>
          <CardDescription>
            {enabledCount} active {enabledCount === 1 ? "run" : "runs"} per day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {schedules.length === 0 && (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              No run slots yet. Add one to schedule the cron.
            </p>
          )}

          {schedules.map((schedule, index) => (
            <div
              key={schedule.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>

              <div className="grid flex-1 gap-1.5">
                <Label htmlFor={`time-${schedule.id}`} className="text-xs">
                  Run time
                </Label>
                <Input
                  id={`time-${schedule.id}`}
                  type="time"
                  value={schedule.time}
                  onChange={(e) => onChangeTime(schedule.id, e.target.value)}
                  className="w-36"
                />
              </div>

              {/* Toggle enabled/disabled */}
              <button
                type="button"
                onClick={() => onToggle(schedule.id)}
                role="switch"
                aria-checked={schedule.enabled}
                aria-label="Toggle run"
                className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent px-0.5 transition-colors ${
                  schedule.enabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-background shadow transition-transform ${
                    schedule.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(schedule.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={onAdd}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add run slot
          </Button>
        </CardContent>
      </Card>

      {/* Destinatarios globales: reciben el feed en cada corrida */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Recipients
          </CardTitle>
          <CardDescription>
            Everyone on this list gets the feed on every cron run ·{" "}
            {recipients.length}{" "}
            {recipients.length === 1 ? "recipient" : "recipients"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Chips de emails */}
          {recipients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {recipients.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="gap-1 pr-1 font-normal"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => onRemoveRecipient(email)}
                    className="rounded-sm text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              No recipients yet. Add an email to start sending the feed.
            </p>
          )}

          {/* Agregar email */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@company.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitEmail();
                }
              }}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" onClick={submitEmail}>
              <Plus className="h-4 w-4" />
              Add email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
