import { createFileRoute } from "@tanstack/react-router";
import { getPairDemo } from "@/features/pair/server";
import { PairPage } from "@/features/pair/components/PairPage";
export const Route = createFileRoute("/me/pair")({
  loader: () => getPairDemo(),
  pendingComponent: () => (
    <p role="status">比較用のテスト予定を読み込んでいます…</p>
  ),
  head: () => ({ meta: [{ title: "2人リスケ | リスケRisuke" }] }),
  component: Page,
});
function Page() {
  const share = Route.useLoaderData();
  return <PairPage key={share.version} share={share} />;
}
