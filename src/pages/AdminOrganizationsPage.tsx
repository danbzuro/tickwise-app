import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Rss,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrgFormModal, type OrgFormValues } from "@/components/admin/OrgFormModal";
import { DeleteOrgDialog } from "@/components/admin/DeleteOrgDialog";
import * as api from "@/lib/api";
import type { AdminOrg } from "@/lib/api";

// Formatea una fecha ISO a algo legible y corto
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado de los modales
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOrg | null>(null);
  const [deleting, setDeleting] = useState<AdminOrg | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.listOrganizations();
      setOrgs(rows);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // --- Handlers CRUD ---

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(org: AdminOrg) {
    setEditing(org);
    setFormOpen(true);
  }

  const handleSubmit = useCallback(
    async (values: OrgFormValues) => {
      if (editing) {
        await api.updateOrganizationAdmin(editing.id, {
          name: values.name.trim(),
          slug: values.slug.trim() || null,
          supportEmail: values.supportEmail.trim() || null,
          primaryColor: values.primaryColor.trim() || null,
        });
      } else {
        await api.createOrganization({
          name: values.name.trim(),
          slug: values.slug.trim() || undefined,
          ownerEmail: values.ownerEmail.trim() || undefined,
        });
      }
      await refresh();
    },
    [editing, refresh]
  );

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    await api.deleteOrganization(deleting.id);
    await refresh();
  }, [deleting, refresh]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organizations
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage every tenant on the platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New organization
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            All organizations
          </CardTitle>
          <CardDescription>
            {orgs.length} {orgs.length === 1 ? "tenant" : "tenants"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-destructive">
              {error}
            </div>
          ) : orgs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No organizations yet. Create your first tenant.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New organization
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: org.primaryColor ?? "#94a3b8",
                          }}
                        />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.slug ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {org.slug}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {org.memberCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Rss className="h-3.5 w-3.5" />
                        {org.sourceCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(org)}
                          aria-label={`Edit ${org.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleting(org)}
                          aria-label={`Delete ${org.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <OrgFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        org={editing}
        onSubmit={handleSubmit}
      />
      <DeleteOrgDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        org={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
