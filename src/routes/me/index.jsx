import { createFileRoute } from "@tanstack/react-router";
import { PersonalPage } from "@/features/personal/components/PersonalPage";
import { getPersonalDemo } from "@/features/personal/server/server";

export const Route = createFileRoute("/me/")({
  loader: () => getPersonalDemo(),
  pendingComponent: () => <p role="status">テスト予定を読み込んでいます…</p>,
  head: () => ({ meta: [{ title: "個人ページ | リスケRisuke" }] }),
  component: Page,
});

function Page() {
  const data = Route.useLoaderData();
  return <PersonalPage key={data.today} data={data} />;
}
