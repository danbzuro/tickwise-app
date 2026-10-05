"use client";

import { MembersCard } from "@/components/MembersCard";
import type { Member, MemberRole } from "@/data/mock";

interface UsersPageProps {
  members: Member[];
  onInviteMember: (email: string, role: MemberRole) => void;
  onResendInvite: (id: string) => void;
  onCancelInvite: (id: string) => void;
  onRevokeMember: (id: string) => void;
}

export function UsersPage({
  members,
  onInviteMember,
  onResendInvite,
  onCancelInvite,
  onRevokeMember,
}: UsersPageProps) {
  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can access this organization and pending invitations.
        </p>
      </div>

      {/* Miembros de la organización */}
      <MembersCard
        members={members}
        onInvite={onInviteMember}
        onResendInvite={onResendInvite}
        onCancelInvite={onCancelInvite}
        onRevoke={onRevokeMember}
      />
    </div>
  );
}
