import { createFileRoute } from "@tanstack/react-router";
import { getGooglePreview } from "@/features/google-calendar/server/preview-rpc";
import { PreviewPage } from "@/features/google-calendar/components/PreviewPage";
export const Route = createFileRoute("/me/preview")({
  loader: () => getGooglePreview({ data: { scenario: "success" } }),
  pendingComponent: () => <p role="status">固定データを読み込んでいます…</p>,
  head: () => ({ meta: [{ title: "連携プレビュー | リスケRisuke" }] }),
  component: Page,
});
function Page() {
  return <PreviewPage initial={Route.useLoaderData()} />;
}
