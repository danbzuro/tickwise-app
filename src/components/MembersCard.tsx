"use client";

import { useState } from "react";
import { Users, UserPlus, MoreHorizontal, Send, X, Ban } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { initialsOf, type Member, type MemberRole } from "@/data/mock";

interface MembersCardProps {
  members: Member[];
  onInvite: (email: string, role: MemberRole) => void;
  onResendInvite: (id: string) => void;
  onCancelInvite: (id: string) => void;
  onRevoke: (id: string) => void;
}

export function MembersCard({
  members,
  onInvite,
  onResendInvite,
  onCancelInvite,
  onRevoke,
}: MembersCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  function closeMenu() {
    setOpenMenu(null);
  }

  // Menú de 3 puntos por fila
  function RowMenu({ member }: { member: Member }) {
    const isPending = member.status === "pending";
    const isOwner = member.role === "Owner";
    const open = openMenu === member.id;

    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpenMenu(open ? null : member.id)}
          aria-label="Open actions"
          disabled={isOwner}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {open && (
          <>
            {/* Overlay para cerrar al hacer click afuera */}
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-md border bg-card p-1 shadow-md">
              {isPending ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onResendInvite(member.id);
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Resend invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelInvite(member.id);
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel invite
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onRevoke(member.id);
                    closeMenu();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Revoke access
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  function MemberRow({ member }: { member: Member }) {
    const isPending = member.status === "pending";
    return (
      <div className="flex items-center gap-3 px-1 py-2.5">
        <Avatar>
          <AvatarFallback
            className={
              isPending ? "" : "bg-primary text-primary-foreground"
            }
          >
            {initialsOf(member)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {member.name || member.email}
          </span>
          {member.name && (
            <span className="truncate text-xs text-muted-foreground">
              {member.email}
            </span>
          )}
        </div>

        <Badge variant="outline" className="shrink-0">
          {member.role}
        </Badge>

        {isPending && (
          <Badge
            variant="secondary"
            className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-600"
          >
            Pending
          </Badge>
        )}

        <RowMenu member={member} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Members
          </CardTitle>
          <CardDescription>
            {active.length} active · {pending.length} pending
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Usuarios activos */}
        <div className="divide-y">
          {active.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </div>

        {/* Invites pendientes */}
        {pending.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pending invites
            </p>
            <div className="divide-y">
              {pending.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <InviteMemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onInvite={onInvite}
      />
    </Card>
  );
}
