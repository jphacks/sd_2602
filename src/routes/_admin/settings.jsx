import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/features/admin/components/SettingsPage";
import { getSettingsData } from "@/features/admin/server";

export const Route = createFileRoute("/_admin/settings")({
  loader: () => getSettingsData(),
  pendingComponent: () => (
    <p role="status" className="text-sm text-muted-foreground">
      連携設定を読み込んでいます…
    </p>
  ),
  head: () => ({ meta: [{ title: "連携設定 | リスケRisuke" }] }),
  component: Page,
});

function Page() {
  return <SettingsPage data={Route.useLoaderData()} />;
}