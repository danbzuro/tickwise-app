"use client";

import { SourcesPage } from "@/screens/SourcesPage";
import { useWorkspace } from "@/context/WorkspaceProvider";

export default function SourcesRoute() {
  const { data, saveSourceH, deleteSourceH } = useWorkspace();
  return (
    <SourcesPage
      sources={data.sources}
      onSaveSource={saveSourceH}
      onDeleteSource={deleteSourceH}
    />
  );
}
