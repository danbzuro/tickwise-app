"use client";

import { SettingsRulesPage } from "@/screens/SettingsRulesPage";
import { useWorkspace } from "@/context/WorkspaceProvider";

export default function SettingsRulesRoute() {
  const {
    data,
    addExcludeTermH,
    removeExcludeTermH,
    addExcludeDomainH,
    removeExcludeDomainH,
    setMinMaterialityH,
    setMaxLookbackH,
    setGuidelineH,
    saveRulesH,
  } = useWorkspace();

  return (
    <SettingsRulesPage
      noiseRules={data.noiseRules}
      guidelines={data.guidelines}
      onAddExcludeTerm={addExcludeTermH}
      onRemoveExcludeTerm={removeExcludeTermH}
      onAddExcludeDomain={addExcludeDomainH}
      onRemoveExcludeDomain={removeExcludeDomainH}
      onChangeMinMateriality={setMinMaterialityH}
      onChangeMaxLookback={setMaxLookbackH}
      onChangeGuideline={setGuidelineH}
      onSave={saveRulesH}
    />
  );
}
