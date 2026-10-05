"use client";

import { SettingsGeneralPage } from "@/screens/SettingsGeneralPage";
import { useWorkspace } from "@/context/WorkspaceProvider";

export default function SettingsGeneralRoute() {
  const {
    data,
    setOrgNameH,
    setOrgLogoH,
    addScheduleH,
    removeScheduleH,
    changeScheduleTimeH,
    toggleScheduleH,
    addRecipientH,
    removeRecipientH,
  } = useWorkspace();

  return (
    <SettingsGeneralPage
      organization={data.organization}
      schedules={data.schedules}
      recipients={data.recipients}
      onChangeOrgName={setOrgNameH}
      onChangeOrgLogo={setOrgLogoH}
      onAdd={addScheduleH}
      onRemove={removeScheduleH}
      onChangeTime={changeScheduleTimeH}
      onToggle={toggleScheduleH}
      onAddRecipient={addRecipientH}
      onRemoveRecipient={removeRecipientH}
    />
  );
}
