import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "@/components/personal/ConnectionsPage";

export const Route = createFileRoute("/me/connections")({
  head: () => ({ meta: [{ title: "データ連携 | リスケRisuke" }] }),
  component: ConnectionsPage,
});
