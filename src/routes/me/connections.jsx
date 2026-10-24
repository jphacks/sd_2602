import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "@/features/account/components/ConnectionsPage";

export const Route = createFileRoute("/me/connections")({
  head: () => ({ meta: [{ title: "データ連携 | リスケRisuke" }] }),
  component: ConnectionsPage,
});
