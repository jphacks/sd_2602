import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/components/admin/DashboardPage";
import { getDashboardData } from "@/lib/admin/server";

export const Route = createFileRoute("/_admin/dashboard")({
  loader: () => getDashboardData(),
  pendingComponent: () => (
    <p role="status" className="text-sm text-muted-foreground">
      同期状態を読み込んでいます…
    </p>
  ),
  head: () => ({ meta: [{ title: "同期ダッシュボード | リスケRisuke" }] }),
  component: Page,
});

function Page() {
  return <DashboardPage data={Route.useLoaderData()} />;
}