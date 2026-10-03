import { useState } from "react";
import { ExternalLink, Plus, Rss } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddSourceModal } from "@/components/AddSourceModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Source } from "@/data/mock";

interface SourcesPageProps {
  sources: Source[];
  onAddSource: (input: { name: string; tick: string; url: string }) => void;
}

export function SourcesPage({ sources, onAddSource }: SourcesPageProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Origins the cron scrapes on every run · {sources.length} sources
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add source
        </Button>
      </div>

      {/* Tabla de fuentes */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rss className="h-4 w-4" />
            Source list
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="pl-6 font-medium">
                    {source.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {source.tick}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {source.url}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddSourceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={onAddSource}
      />
    </div>
  );
}
