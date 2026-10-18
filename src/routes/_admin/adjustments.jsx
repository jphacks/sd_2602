import { createFileRoute } from "@tanstack/react-router";
import AdjustmentsPage from "@/components/admin/AdjustmentsPage";
import { listAdjustments } from "@/lib/admin/server";

export const Route = createFileRoute("/_admin/adjustments")({
  loader: () => listAdjustments(),
  pendingComponent: () => (
    <p role="status" className="text-sm text-muted-foreground">
      調整ルールを読み込んでいます…
    </p>
  ),
  head: () => ({ meta: [{ title: "調整ルール設定 | リスケRisuke" }] }),
  component: Page,
});

function Page() {
  return <AdjustmentsPage adjustments={Route.useLoaderData()} />;
}