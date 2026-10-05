"use client";

import { UsersPage } from "@/screens/UsersPage";
import { useWorkspace } from "@/context/WorkspaceProvider";

export default function UsersRoute() {
  const { data, inviteMemberH, resendInviteH, removeMemberH } = useWorkspace();
  return (
    <UsersPage
      members={data.members}
      onInviteMember={inviteMemberH}
      onResendInvite={resendInviteH}
      onCancelInvite={removeMemberH}
      onRevokeMember={removeMemberH}
    />
  );
}
