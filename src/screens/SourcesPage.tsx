"use client";

import { useState } from "react";
import { Pencil, Plus, Rss, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AddSourceModal,
  type SourceInput,
} from "@/components/AddSourceModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  onSaveSource: (id: string | null, input: SourceInput) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
}

export function SourcesPage({
  sources,
  onSaveSource,
  onDeleteSource,
}: SourcesPageProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [deleting, setDeleting] = useState<Source | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(source: Source) {
    setEditing(source);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await onDeleteSource(deleting.id);
      setDeleting(null);
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Company references for each run · {sources.length} sources
          </p>
        </div>
        <Button onClick={openAdd}>
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
                    {source.tick ? (
                      <Badge variant="outline" className="font-mono">
                        {source.tick}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {source.url}
                    </a>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(source)}
                        aria-label={`Edit ${source.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(source);
                        }}
                        aria-label={`Delete ${source.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
        source={editing}
        onSubmit={(input) => onSaveSource(editing?.id ?? null, input)}
      />

      <Dialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) setDeleting(null);
        }}
      >
        <DialogContent onClose={() => !deletingBusy && setDeleting(null)}>
          <DialogHeader>
            <DialogTitle>Delete source</DialogTitle>
            <DialogDescription>
              {deleting
                ? `${deleting.name} will stop being searched on the next run. News already in the feed stays.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={deletingBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingBusy}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
