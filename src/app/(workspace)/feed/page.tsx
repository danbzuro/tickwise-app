"use client";

import { FeedPage } from "@/screens/FeedPage";
import { useWorkspace } from "@/context/WorkspaceProvider";

export default function FeedRoute() {
  const { data, markFeedH, dismissFeedH } = useWorkspace();
  return (
    <FeedPage
      items={data.feedItems}
      noiseRules={data.noiseRules}
      onMarkRead={markFeedH}
      onDismiss={dismissFeedH}
    />
  );
}
